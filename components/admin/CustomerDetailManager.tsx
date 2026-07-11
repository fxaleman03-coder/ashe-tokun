"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  addCustomerNote,
  createCustomerAddress,
  deactivateCustomer,
  deleteCustomerAddress,
  reactivateCustomer,
  setDefaultCustomerAddress,
  updateCustomerAddress,
} from "@/lib/data/customerMutations";
import type {
  Customer,
  CustomerAddress,
  CustomerAddressType,
  CustomerOrderSummary,
} from "@/lib/types/customer";
import {
  getCustomerContactName,
  getCustomerDisplaySummary,
  isBusinessCustomer,
} from "@/lib/utils/customerDisplay";

type CustomerDetailManagerProps = {
  customer: Customer;
  addresses: CustomerAddress[];
  orders: CustomerOrderSummary[];
};

type AddressFormState = {
  id?: string;
  address_type: CustomerAddressType;
  first_name: string;
  last_name: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  default_address: boolean;
};

const emptyAddress: AddressFormState = {
  address_type: "shipping",
  first_name: "",
  last_name: "",
  company: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "United States",
  default_address: false,
};

const inputClass =
  "min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function toAddressState(address: CustomerAddress): AddressFormState {
  return {
    id: address.id,
    address_type: address.address_type,
    first_name: address.first_name ?? "",
    last_name: address.last_name ?? "",
    company: address.company ?? "",
    address1: address.address1,
    address2: address.address2 ?? "",
    city: address.city,
    state: address.state ?? "",
    postal_code: address.postal_code ?? "",
    country: address.country,
    default_address: address.default_address,
  };
}

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] sm:p-6">
      <h2 className="font-serif text-2xl font-semibold text-[#f7ead2]">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function CustomerDetailManager({
  customer,
  addresses,
  orders,
}: CustomerDetailManagerProps) {
  const router = useRouter();
  const isWalkInCustomer = customer.customer_type === "walk_in";
  const customerDisplay = getCustomerDisplaySummary(customer);
  const customerContactName = getCustomerContactName(customer);
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [addressForm, setAddressForm] =
    useState<AddressFormState>(emptyAddress);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  function updateAddressField<Key extends keyof AddressFormState>(
    key: Key,
    value: AddressFormState[Key],
  ) {
    setAddressForm((currentForm) => ({ ...currentForm, [key]: value }));
  }

  async function runAction(action: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setIsWorking(true);
    const result = await action();
    setIsWorking(false);
    setMessage(result.ok ? result.message ?? "Updated." : result.error ?? "Action failed.");

    if (result.ok) {
      router.refresh();
    }
  }

  async function handleAddressSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await runAction(async () => {
      if (addressForm.id) {
        return updateCustomerAddress(addressForm.id, {
          address_type: addressForm.address_type,
          first_name: addressForm.first_name,
          last_name: addressForm.last_name,
          company: addressForm.company,
          address1: addressForm.address1,
          address2: addressForm.address2,
          city: addressForm.city,
          state: addressForm.state,
          postal_code: addressForm.postal_code,
          country: addressForm.country,
          default_address: addressForm.default_address,
        });
      }

      return createCustomerAddress({
        customer_id: customer.id,
        address_type: addressForm.address_type,
        first_name: addressForm.first_name,
        last_name: addressForm.last_name,
        company: addressForm.company,
        address1: addressForm.address1,
        address2: addressForm.address2,
        city: addressForm.city,
        state: addressForm.state,
        postal_code: addressForm.postal_code,
        country: addressForm.country,
        default_address: addressForm.default_address,
      });
    });

    setAddressForm(emptyAddress);
    setIsAddressFormOpen(false);
  }

  async function handleAddNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await runAction(() => addCustomerNote(customer.id, note));
    setNote("");
  }

  return (
    <div className="space-y-6">
      <section className="border border-[#d8a344]/20 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
              Customer Header
            </p>
            <h1 className="mt-3 font-serif text-4xl font-semibold text-[#f7ead2]">
              {customerDisplay.primaryName}
            </h1>
            {customerDisplay.contactName ? (
              <p className="mt-3 text-sm text-[#e8dcc8]/72">
                Primary Contact: {customerDisplay.contactName}
              </p>
            ) : null}
            <p className="mt-3 text-sm capitalize text-[#e8dcc8]/62">
              {customer.customer_number} / {customerDisplay.typeLabel}
            </p>
          </div>
          <div className="grid gap-3 text-sm text-[#e8dcc8]/72 sm:grid-cols-2">
            {[
              ...(isBusinessCustomer(customer)
                ? [
                    ["Company", customer.company_name ?? "Pending"],
                    ...(customerContactName
                      ? [["Primary Contact", customerContactName]]
                      : []),
                  ]
                : [["Customer Name", customerDisplay.primaryName]]),
              ["Customer Type", customerDisplay.typeLabel],
              ["Customer Number", customer.customer_number],
              ["Status", customer.active ? "Active" : "Inactive"],
              ["Email", customer.email ?? "Pending"],
              ["Phone", customer.phone ?? "Pending"],
              ["Created", new Date(customer.created_at).toLocaleDateString()],
              [
                "Last Order",
                customer.last_order_at
                  ? new Date(customer.last_order_at).toLocaleDateString()
                  : "Pending",
              ],
            ].map(([label, value]) => (
              <div key={label} className="border border-[#f7ead2]/10 bg-[#0f0b07] p-3">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
                  {label}
                </p>
                <p className="mt-2">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/customers"
          className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
        >
          Back to Customers
        </Link>
        <Link
          href={`/admin/customers/${customer.id}/edit`}
          className="inline-flex min-h-11 items-center justify-center border border-[#f7ead2]/12 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344]"
        >
          Edit Customer
        </Link>
        <button
          type="button"
          disabled={isWalkInCustomer || isWorking}
          onClick={() =>
            runAction(() =>
              customer.active
                ? deactivateCustomer(customer.id)
                : reactivateCustomer(customer.id),
            )
          }
          className="inline-flex min-h-11 items-center justify-center border border-[#f7ead2]/12 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:cursor-not-allowed disabled:text-[#e8dcc8]/32"
        >
          {customer.active ? "Deactivate" : "Reactivate"}
        </button>
      </div>

      {message ? (
        <p className="border border-[#d8a344]/30 bg-[#0f0b07] px-4 py-3 text-sm text-[#d8a344]">
          {message}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-4">
        {[
          ["Order Count", customer.order_count],
          ["Lifetime Value", formatCurrency(customer.lifetime_value)],
          ["Average Order", formatCurrency(customer.average_order_value)],
          [
            "Last Order",
            customer.last_order_at
              ? new Date(customer.last_order_at).toLocaleDateString()
              : "Pending",
          ],
          ["Favorite Brand", "Pending"],
          ["Favorite Category", "Pending"],
        ].map(([label, value]) => (
          <article
            key={label}
            className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]"
          >
            <p className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
              {label}
            </p>
            <p className="mt-3 font-serif text-2xl font-semibold text-[#f7ead2]">
              {value}
            </p>
          </article>
        ))}
      </div>

      <DetailCard title="Addresses">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setAddressForm(emptyAddress);
              setIsAddressFormOpen((isOpen) => !isOpen);
            }}
            className="inline-flex min-h-10 items-center justify-center border border-[#d8a344]/45 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
          >
            Add Address
          </button>
        </div>

        {isAddressFormOpen ? (
          <form
            onSubmit={handleAddressSubmit}
            className="mt-5 grid gap-4 border border-[#f7ead2]/10 bg-[#0f0b07] p-4 md:grid-cols-2"
          >
            <select
              value={addressForm.address_type}
              onChange={(event) =>
                updateAddressField(
                  "address_type",
                  event.target.value as CustomerAddressType,
                )
              }
              className={inputClass}
            >
              <option value="billing">Billing</option>
              <option value="shipping">Shipping</option>
              <option value="other">Other</option>
            </select>
            <label className="flex items-center gap-3 border border-[#f7ead2]/10 px-3">
              <input
                type="checkbox"
                checked={addressForm.default_address}
                onChange={(event) =>
                  updateAddressField("default_address", event.target.checked)
                }
                className="h-4 w-4 accent-[#d8a344]"
              />
              <span className="text-sm text-[#f7ead2]">Default address</span>
            </label>
            <input
              value={addressForm.first_name}
              onChange={(event) =>
                updateAddressField("first_name", event.target.value)
              }
              placeholder="First name"
              className={inputClass}
            />
            <input
              value={addressForm.last_name}
              onChange={(event) =>
                updateAddressField("last_name", event.target.value)
              }
              placeholder="Last name"
              className={inputClass}
            />
            <input
              value={addressForm.company}
              onChange={(event) =>
                updateAddressField("company", event.target.value)
              }
              placeholder="Company"
              className={inputClass}
            />
            <input
              value={addressForm.address1}
              onChange={(event) =>
                updateAddressField("address1", event.target.value)
              }
              placeholder="Address line 1"
              className={inputClass}
            />
            <input
              value={addressForm.address2}
              onChange={(event) =>
                updateAddressField("address2", event.target.value)
              }
              placeholder="Address line 2"
              className={inputClass}
            />
            <input
              value={addressForm.city}
              onChange={(event) => updateAddressField("city", event.target.value)}
              placeholder="City"
              className={inputClass}
            />
            <input
              value={addressForm.state}
              onChange={(event) =>
                updateAddressField("state", event.target.value)
              }
              placeholder="State"
              className={inputClass}
            />
            <input
              value={addressForm.postal_code}
              onChange={(event) =>
                updateAddressField("postal_code", event.target.value)
              }
              placeholder="Postal code"
              className={inputClass}
            />
            <input
              value={addressForm.country}
              onChange={(event) =>
                updateAddressField("country", event.target.value)
              }
              placeholder="Country"
              className={inputClass}
            />
            <div className="flex flex-wrap gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={isWorking}
                className="inline-flex min-h-10 items-center justify-center border border-[#d8a344]/45 bg-[#d8a344] px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#0f0b07] transition duration-500 disabled:opacity-50"
              >
                {addressForm.id ? "Update Address" : "Create Address"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddressForm(emptyAddress);
                  setIsAddressFormOpen(false);
                }}
                className="inline-flex min-h-10 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344]"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {addresses.length > 0 ? (
            addresses.map((address) => (
              <article
                key={address.id}
                className="border border-[#f7ead2]/10 bg-[#0f0b07] p-4 text-sm text-[#e8dcc8]/70"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-serif text-xl text-[#f7ead2]">
                      {address.address_type}
                    </p>
                    {address.default_address ? (
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#d8a344]">
                        Default
                      </p>
                    ) : null}
                  </div>
                </div>
                <p className="mt-4">{address.address1}</p>
                {address.address2 ? <p>{address.address2}</p> : null}
                <p>
                  {address.city}, {address.state} {address.postal_code}
                </p>
                <p>{address.country}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAddressForm(toAddressState(address));
                      setIsAddressFormOpen(true);
                    }}
                    className="inline-flex min-h-9 items-center justify-center border border-[#f7ead2]/12 px-3 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#f7ead2] transition hover:border-[#d8a344]/70 hover:text-[#d8a344]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      runAction(() =>
                        setDefaultCustomerAddress(customer.id, address.id),
                      )
                    }
                    disabled={address.default_address}
                    className="inline-flex min-h-9 items-center justify-center border border-[#f7ead2]/12 px-3 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#f7ead2] transition hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:cursor-not-allowed disabled:text-[#e8dcc8]/32"
                  >
                    Set Default
                  </button>
                  <button
                    type="button"
                    onClick={() => runAction(() => deleteCustomerAddress(address.id))}
                    className="inline-flex min-h-9 items-center justify-center border border-[#f7ead2]/12 px-3 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#f7ead2] transition hover:border-[#d8a344]/70 hover:text-[#d8a344]"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm text-[#e8dcc8]/54">No addresses found.</p>
          )}
        </div>
      </DetailCard>

      <DetailCard title="Purchase History">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#f7ead2]/10 text-[0.68rem] uppercase tracking-[0.2em] text-[#d8a344]">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">View</th>
              </tr>
            </thead>
            <tbody>
              {orders.length > 0 ? (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-[#f7ead2]/8 text-sm text-[#e8dcc8]/72 last:border-b-0"
                  >
                    <td className="px-4 py-3 font-medium text-[#f7ead2]">
                      {order.order_number}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">{order.sales_channel}</td>
                    <td className="px-4 py-3">{order.item_count}</td>
                    <td className="px-4 py-3">
                      {formatCurrency(order.grand_total)}
                    </td>
                    <td className="px-4 py-3">{order.payment_status}</td>
                    <td className="px-4 py-3">{order.order_status}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-[#d8a344] transition hover:text-[#f7ead2]"
                      >
                        View Order
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-sm text-[#e8dcc8]/54"
                  >
                    No purchase history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DetailCard>

      <DetailCard title="Notes">
        <form onSubmit={handleAddNote} className="space-y-3">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
            placeholder="Add customer note"
            className={`${inputClass} py-3`}
          />
          <button
            type="submit"
            disabled={isWorking}
            className="inline-flex min-h-10 items-center justify-center border border-[#d8a344]/45 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07] disabled:opacity-50"
          >
            Add Note
          </button>
        </form>
        <pre className="mt-5 whitespace-pre-wrap border border-[#f7ead2]/10 bg-[#0f0b07] p-4 text-sm leading-6 text-[#e8dcc8]/68">
          {customer.notes ?? "No customer notes yet."}
        </pre>
      </DetailCard>
    </div>
  );
}
