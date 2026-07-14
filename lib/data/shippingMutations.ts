"use server";

import { revalidatePath } from "next/cache";
import { USE_SUPABASE } from "@/lib/config";
import { getOrderById } from "@/lib/data/ordersRepository";
import {
  getFulfillableOrderItems,
  getNextShipmentNumber,
  getShipmentById,
} from "@/lib/data/shippingRepository";
import {
  getDefaultShippingOrigin,
  getShippingOriginById,
} from "@/lib/data/shippingOriginsRepository";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireServerActionPermission } from "@/lib/staff/serverActionAuth";
import type { PermissionKey } from "@/lib/staff/permissionTypes";
import type {
  AddTrackingInput,
  CreateShipmentInput,
  FulfillmentType,
  PackageInput,
  ShipmentAddressInput,
  ShipmentEvent,
  ShipmentStatus,
  ShippingMutationResult,
  UpdateShipmentInput,
} from "@/lib/types/shipping";
import type { ShippingOrigin } from "@/lib/types/shippingOrigin";
import { deriveTrackingUrl } from "@/lib/utils/shippingTracking";

const allowedStatuses: ShipmentStatus[] = [
  "pending",
  "ready",
  "packed",
  "shipped",
  "in_transit",
  "delivered",
  "cancelled",
  "exception",
];

const allowedFulfillmentTypes: FulfillmentType[] = ["shipping", "local_pickup"];

const shippingTransitions: Record<ShipmentStatus, ShipmentStatus[]> = {
  pending: ["ready", "cancelled"],
  ready: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["in_transit", "delivered", "exception"],
  in_transit: ["delivered", "exception"],
  exception: ["in_transit", "delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

const pickupTransitions: Record<ShipmentStatus, ShipmentStatus[]> = {
  pending: ["ready", "cancelled"],
  ready: ["delivered", "cancelled"],
  packed: [],
  shipped: [],
  in_transit: [],
  exception: [],
  delivered: [],
  cancelled: [],
};

function disabledResult(): ShippingMutationResult {
  return {
    ok: false,
    error: "Live shipping requires Supabase mode.",
  };
}

function configError(): ShippingMutationResult {
  return {
    ok: false,
    error:
      "Supabase is enabled, but the Supabase client is not configured. Check environment variables.",
  };
}

function toMoney(value: number | undefined) {
  return Number.isFinite(value) ? Number(value?.toFixed(2)) : 0;
}

function appendNote(existingNotes: string | null, note?: string | null) {
  if (!note?.trim()) {
    return existingNotes;
  }

  const nextNote = `[${new Date().toISOString()}] ${note.trim()}`;

  return [existingNotes, nextNote].filter(Boolean).join("\n");
}

function getSupabaseClient() {
  return createSupabaseServiceClient();
}

async function requireShippingPermission(
  required: PermissionKey,
): Promise<ShippingMutationResult | null> {
  const auth = await requireServerActionPermission(required);

  return auth.ok ? null : { ok: false, error: auth.error };
}

function revalidateShippingPaths(shipmentId?: string | null) {
  revalidatePath("/admin");
  revalidatePath("/admin/shipping");
  revalidatePath("/admin/orders");

  if (shipmentId) {
    revalidatePath(`/admin/shipping/${shipmentId}`);
  }
}

async function writeAudit(action: string, shipmentId: string, details: unknown) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return;
  }

  await supabase.from("audit_logs").insert({
    staff_user_id: null,
    action,
    entity_type: "shipment",
    entity_id: shipmentId,
    details,
  });
}

async function addEvent(
  shipmentId: string,
  event_type: string,
  status: ShipmentStatus,
  description?: string | null,
) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return;
  }

  await supabase.from("shipment_events").insert({
    shipment_id: shipmentId,
    event_type,
    status,
    location: null,
    description: description ?? null,
    event_time: new Date().toISOString(),
  });
}

function validateAddress(address?: ShipmentAddressInput | null) {
  if (!address) {
    return "Shipping address is required.";
  }

  if (
    !address.address1?.trim() ||
    !address.city?.trim() ||
    !address.postal_code?.trim() ||
    !address.country?.trim()
  ) {
    return "Shipping address requires address, city, postal code, and country.";
  }

  return null;
}

function originToShipFromAddress(origin: ShippingOrigin): ShipmentAddressInput {
  return {
    first_name: origin.contact_first_name,
    last_name: origin.contact_last_name,
    company: origin.company_name,
    address1: origin.address1,
    address2: origin.address2,
    city: origin.city,
    state: origin.state,
    postal_code: origin.postal_code,
    country: origin.country,
    phone: origin.phone,
    email: origin.email,
  };
}

function makePackageRows(shipmentId: string, packages: PackageInput[]) {
  return packages.map((packageInput, index) => ({
    shipment_id: shipmentId,
    package_number:
      packageInput.package_number?.trim() || `PKG-${String(index + 1).padStart(2, "0")}`,
    length_in: packageInput.length_in ?? null,
    width_in: packageInput.width_in ?? null,
    height_in: packageInput.height_in ?? null,
    weight_lb: packageInput.weight_lb ?? null,
    package_type: packageInput.package_type ?? null,
    label_url: packageInput.label_url ?? null,
  }));
}

async function validateShipmentInput(input: CreateShipmentInput) {
  if (!allowedFulfillmentTypes.includes(input.fulfillment_type)) {
    return "Unsupported fulfillment type.";
  }

  const order = await getOrderById(input.order_id);

  if (!order) {
    return "Order was not found.";
  }

  if (order.order_status === "cancelled") {
    return "Cancelled orders cannot be fulfilled.";
  }

  if (input.items.length === 0) {
    return "Select at least one item to fulfill.";
  }

  const fulfillableItems = await getFulfillableOrderItems(input.order_id);
  const fulfillableById = new Map(
    fulfillableItems.map((item) => [item.id, item.remaining_fulfillable_quantity]),
  );

  for (const item of input.items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return "Shipment item quantities must be positive whole numbers.";
    }

    const remainingQuantity = fulfillableById.get(item.order_item_id) ?? 0;

    if (item.quantity > remainingQuantity) {
      return "Shipment quantity cannot exceed remaining fulfillable quantity.";
    }
  }

  if (input.fulfillment_type === "shipping") {
    if (!input.shippingOriginId) {
      return "Select a Ship From origin.";
    }

    const origin = await getShippingOriginById(input.shippingOriginId);

    if (!origin) {
      return "Ship From origin was not found.";
    }

    if (!origin.active) {
      return "Ship From origin is inactive.";
    }

    if (!origin.is_complete) {
      return "Ship From origin is incomplete.";
    }

    const addressError = validateAddress(input.ship_to);

    if (addressError) {
      return addressError;
    }

    if (!input.packages || input.packages.length < 1) {
      return "At least one package is required for shipping.";
    }

    if (!input.carrier?.trim()) {
      return "Select a carrier.";
    }

    const invalidPackage = input.packages.find((packageInput) => {
      const hasPackageNumber = Boolean(packageInput.package_number?.trim());
      const hasWeight = Number(packageInput.weight_lb) > 0;
      const hasLength = Number(packageInput.length_in) > 0;
      const hasWidth = Number(packageInput.width_in) > 0;
      const hasHeight = Number(packageInput.height_in) > 0;

      return !(
        hasPackageNumber &&
        hasWeight &&
        hasLength &&
        hasWidth &&
        hasHeight
      );
    });

    if (invalidPackage) {
      return "Each package requires a package number, dimensions, and weight.";
    }
  }

  return null;
}

async function resolveShippingOrigin(input: CreateShipmentInput) {
  if (input.shippingOriginId) {
    return getShippingOriginById(input.shippingOriginId);
  }

  if (input.fulfillment_type === "local_pickup") {
    return getDefaultShippingOrigin();
  }

  return null;
}

export async function createShipment(
  input: CreateShipmentInput,
): Promise<ShippingMutationResult> {
  if (!USE_SUPABASE) {
    return disabledResult();
  }

  const authError = await requireShippingPermission("shipping.create");

  if (authError) {
    return authError;
  }

  const supabase = getSupabaseClient();

  if (!supabase) {
    return configError();
  }

  try {
    const validationError = await validateShipmentInput(input);

    if (validationError) {
      return { ok: false, error: validationError };
    }

    const shipmentNumber = await getNextShipmentNumber();
    const shippingOrigin = await resolveShippingOrigin(input);
    const packageCount =
      input.fulfillment_type === "shipping" ? input.packages?.length ?? 1 : 0;
    const { data: shipment, error: shipmentError } = await supabase
      .from("shipments")
      .insert({
        shipment_number: shipmentNumber,
        order_id: input.order_id,
        shipping_origin_id: shippingOrigin?.id ?? null,
        shipment_status: "pending",
        fulfillment_type: input.fulfillment_type,
        carrier: input.carrier ?? null,
        service_level: input.service_level ?? null,
        tracking_number: input.tracking_number ?? null,
        tracking_url:
          input.tracking_url ??
          (input.carrier && input.tracking_number
            ? deriveTrackingUrl(input.carrier, input.tracking_number)
            : null),
        shipping_cost: toMoney(input.shipping_cost),
        package_count: packageCount,
        notes: input.notes ?? null,
      })
      .select("id, shipment_number")
      .single();

    if (shipmentError || !shipment) {
      return {
        ok: false,
        error: "Shipment creation failed.",
      };
    }

    const shipmentId = shipment.id;
    const itemRows = input.items.map((item) => ({
      shipment_id: shipmentId,
      order_item_id: item.order_item_id,
      quantity: item.quantity,
    }));
    const { error: itemError } = await supabase
      .from("shipment_items")
      .insert(itemRows);

    if (itemError) {
      return {
        ok: false,
        critical: true,
        shipmentId,
        error:
          "Shipment was created, but shipment items failed. Manual review required.",
      };
    }

    if (input.fulfillment_type === "shipping") {
      const addressRows = [
        {
          shipment_id: shipmentId,
          address_role: "ship_from",
          ...originToShipFromAddress(shippingOrigin as ShippingOrigin),
        },
        {
          shipment_id: shipmentId,
          address_role: "ship_to",
          ...input.ship_to,
        },
      ];
      const { error: addressError } = await supabase
        .from("shipment_addresses")
        .insert(addressRows);

      if (addressError) {
        return {
          ok: false,
          critical: true,
          shipmentId,
          error:
            "Shipment was created, but address snapshots failed. Manual review required.",
        };
      }

      const { error: packageError } = await supabase
        .from("shipment_packages")
        .insert(makePackageRows(shipmentId, input.packages ?? []));

      if (packageError) {
        return {
          ok: false,
          critical: true,
          shipmentId,
          error:
            "Shipment was created, but packages failed. Manual review required.",
        };
      }
    }

    await addEvent(
      shipmentId,
      "shipment_created",
      "pending",
      input.fulfillment_type === "local_pickup"
        ? "Local pickup created."
        : "Shipment created.",
    );
    await writeAudit("shipment_created", shipmentId, input);
    revalidateShippingPaths(shipmentId);

    return {
      ok: true,
      message: "Shipment created.",
      shipmentId,
      shipmentNumber: shipment.shipment_number,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Shipment creation failed.",
    };
  }
}

function validateTransition(
  fulfillmentType: FulfillmentType,
  currentStatus: ShipmentStatus,
  nextStatus: ShipmentStatus,
) {
  if (!allowedStatuses.includes(nextStatus)) {
    return "Unsupported shipment status.";
  }

  if (currentStatus === nextStatus) {
    return null;
  }

  const transitions =
    fulfillmentType === "local_pickup" ? pickupTransitions : shippingTransitions;

  if (!transitions[currentStatus].includes(nextStatus)) {
    return "Invalid shipment status transition.";
  }

  return null;
}

async function updateShipmentFields(
  shipmentId: string,
  fields: UpdateShipmentInput,
) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  const { error } = await supabase
    .from("shipments")
    .update(fields)
    .eq("id", shipmentId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateShipmentStatus(
  shipmentId: string,
  status: ShipmentStatus,
  notes?: string,
): Promise<ShippingMutationResult> {
  if (!USE_SUPABASE) {
    return disabledResult();
  }

  const authError = await requireShippingPermission("shipping.edit");

  if (authError) {
    return authError;
  }

  const supabase = getSupabaseClient();

  if (!supabase) {
    return configError();
  }

  try {
    const shipment = await getShipmentById(shipmentId);

    if (!shipment) {
      return { ok: false, error: "Shipment was not found." };
    }

    const transitionError = validateTransition(
      shipment.fulfillment_type,
      shipment.shipment_status,
      status,
    );

    if (transitionError) {
      return { ok: false, error: transitionError };
    }

    const updates: UpdateShipmentInput = {
      shipment_status: status,
      notes: appendNote(shipment.notes, notes),
    };

    if (status === "shipped") {
      updates.shipped_at = new Date().toISOString();
    }

    if (status === "delivered") {
      updates.delivered_at = new Date().toISOString();
    }

    if (status === "cancelled") {
      updates.cancelled_at = new Date().toISOString();
    }

    await updateShipmentFields(shipmentId, updates);
    await addEvent(shipmentId, "shipment_status_updated", status, notes);
    await writeAudit("shipment_status_updated", shipmentId, {
      from: shipment.shipment_status,
      to: status,
      notes: notes ?? null,
    });
    revalidateShippingPaths(shipmentId);

    return { ok: true, message: "Shipment status updated.", shipmentId };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Shipment status update failed.",
    };
  }
}

export async function addShipmentPackage(
  shipmentId: string,
  packageInput: PackageInput,
): Promise<ShippingMutationResult> {
  if (!USE_SUPABASE) {
    return disabledResult();
  }

  const authError = await requireShippingPermission("shipping.edit");

  if (authError) {
    return authError;
  }

  const supabase = getSupabaseClient();

  if (!supabase) {
    return configError();
  }

  const { error } = await supabase
    .from("shipment_packages")
    .insert(makePackageRows(shipmentId, [packageInput]));

  if (error) {
    return { ok: false, error: error.message };
  }

  await addEvent(shipmentId, "package_added", "pending", "Package added.");
  await writeAudit("package_added", shipmentId, packageInput);
  revalidateShippingPaths(shipmentId);

  return { ok: true, message: "Package added.", shipmentId };
}

export async function updateShipmentPackage(
  packageId: string,
  updates: PackageInput,
): Promise<ShippingMutationResult> {
  if (!USE_SUPABASE) {
    return disabledResult();
  }

  const authError = await requireShippingPermission("shipping.edit");

  if (authError) {
    return authError;
  }

  const supabase = getSupabaseClient();

  if (!supabase) {
    return configError();
  }

  const { error } = await supabase
    .from("shipment_packages")
    .update(updates)
    .eq("id", packageId);

  if (error) {
    return { ok: false, error: "Package update failed." };
  }

  revalidateShippingPaths();

  return { ok: true, message: "Package updated." };
}

export async function removeShipmentPackage(
  packageId: string,
): Promise<ShippingMutationResult> {
  if (!USE_SUPABASE) {
    return disabledResult();
  }

  const authError = await requireShippingPermission("shipping.edit");

  if (authError) {
    return authError;
  }

  const supabase = getSupabaseClient();

  if (!supabase) {
    return configError();
  }

  const { error } = await supabase
    .from("shipment_packages")
    .delete()
    .eq("id", packageId);

  if (error) {
    return { ok: false, error: "Package removal failed." };
  }

  revalidateShippingPaths();

  return { ok: true, message: "Package removed." };
}

export async function addTrackingInformation(
  shipmentId: string,
  input: AddTrackingInput,
): Promise<ShippingMutationResult> {
  const authError = await requireShippingPermission("shipping.edit");

  if (authError) {
    return authError;
  }

  const trackingUrl =
    input.tracking_url ||
    deriveTrackingUrl(input.carrier, input.tracking_number) ||
    null;
  const result = await updateShipmentFieldsSafely(shipmentId, {
    carrier: input.carrier,
    service_level: input.service_level ?? null,
    tracking_number: input.tracking_number,
    tracking_url: trackingUrl,
    shipped_at: input.shipped_at ?? null,
  });

  if (!result.ok) {
    return result;
  }

  await addEvent(shipmentId, "tracking_added", "shipped", "Tracking added.");
  await writeAudit("tracking_added", shipmentId, input);
  revalidateShippingPaths(shipmentId);

  return { ok: true, message: "Tracking information saved.", shipmentId };
}

async function updateShipmentFieldsSafely(
  shipmentId: string,
  fields: UpdateShipmentInput,
): Promise<ShippingMutationResult> {
  if (!USE_SUPABASE) {
    return disabledResult();
  }

  const authError = await requireShippingPermission("shipping.edit");

  if (authError) {
    return authError;
  }

  const supabase = getSupabaseClient();

  if (!supabase) {
    return configError();
  }

  try {
    await updateShipmentFields(shipmentId, fields);
    revalidateShippingPaths(shipmentId);

    return { ok: true, message: "Shipment updated.", shipmentId };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Shipment update failed.",
    };
  }
}

export async function addShipmentEvent(
  shipmentId: string,
  event: Pick<ShipmentEvent, "event_type" | "status" | "location" | "description">,
): Promise<ShippingMutationResult> {
  if (!USE_SUPABASE) {
    return disabledResult();
  }

  const authError = await requireShippingPermission("shipping.edit");

  if (authError) {
    return authError;
  }

  const supabase = getSupabaseClient();

  if (!supabase) {
    return configError();
  }

  const { error } = await supabase.from("shipment_events").insert({
    shipment_id: shipmentId,
    event_type: event.event_type,
    status: event.status,
    location: event.location,
    description: event.description,
    event_time: new Date().toISOString(),
  });

  if (error) {
    return { ok: false, error: "Shipment event creation failed." };
  }

  revalidateShippingPaths(shipmentId);

  return { ok: true, message: "Shipment event added.", shipmentId };
}

export async function cancelShipment(shipmentId: string, reason: string) {
  return updateShipmentStatus(shipmentId, "cancelled", reason);
}

export async function markShipmentDelivered(
  shipmentId: string,
  deliveredAt?: string,
) {
  if (deliveredAt) {
    return updateShipmentFieldsSafely(shipmentId, {
      shipment_status: "delivered",
      delivered_at: deliveredAt,
    });
  }

  return updateShipmentStatus(shipmentId, "delivered", "Shipment delivered.");
}

export async function createLocalPickup(
  orderId: string,
  input: Omit<CreateShipmentInput, "order_id" | "fulfillment_type">,
) {
  return createShipment({
    ...input,
    order_id: orderId,
    fulfillment_type: "local_pickup",
    packages: [],
  });
}

export async function markPickupReady(shipmentId: string) {
  return updateShipmentStatus(shipmentId, "ready", "Pickup is ready.");
}

export async function markPickupCompleted(shipmentId: string) {
  return updateShipmentStatus(shipmentId, "delivered", "Pickup completed.");
}
