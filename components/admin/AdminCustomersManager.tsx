"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  deactivateCustomer,
  reactivateCustomer,
} from "@/lib/data/customerMutations";
import type {
  Customer,
  CustomerMetrics,
  CustomerType,
} from "@/lib/types/customer";
import {
  getCustomerContactName,
  getCustomerDisplaySummary,
  isBusinessCustomer,
} from "@/lib/utils/customerDisplay";

type AdminCustomersManagerProps = {
  customers: Customer[];
  metrics: CustomerMetrics;
};

const inputClass =
  "min-h-11 border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function getCustomerTypeLabel(
  customerType: CustomerType,
  labels: ReturnType<typeof useLanguage>["t"]["admin"]["customers"],
) {
  switch (customerType) {
    case "walk_in":
      return labels.filters.walkIn;
    case "registered":
      return labels.filters.registered;
    case "vip":
      return labels.filters.vip;
    case "wholesale":
      return labels.filters.wholesale;
  }
}

export default function AdminCustomersManager({
  customers,
  metrics,
}: AdminCustomersManagerProps) {
  const { t } = useLanguage();
  const labels = t.admin.customers;
  const [search, setSearch] = useState("");
  const [customerType, setCustomerType] = useState<"all" | CustomerType>("all");
  const [activeStatus, setActiveStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [orderStatus, setOrderStatus] = useState<
    "all" | "with_orders" | "no_orders"
  >("all");
  const [minimumValue, setMinimumValue] = useState("");
  const [maximumValue, setMaximumValue] = useState("");
  const [message, setMessage] = useState("");
  const [workingCustomerId, setWorkingCustomerId] = useState<string | null>(null);

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const minimum = minimumValue ? Number(minimumValue) : null;
    const maximum = maximumValue ? Number(maximumValue) : null;

    return customers.filter((customer) => {
      const searchable = [
        getCustomerDisplaySummary(customer).primaryName,
        getCustomerContactName(customer),
        customer.customer_number,
        customer.email,
        customer.phone,
        customer.company_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch =
        !normalizedSearch || searchable.includes(normalizedSearch);
      const matchesType =
        customerType === "all" || customer.customer_type === customerType;
      const matchesActive =
        activeStatus === "all" ||
        (activeStatus === "active" ? customer.active : !customer.active);
      const matchesOrders =
        orderStatus === "all" ||
        (orderStatus === "with_orders"
          ? customer.order_count > 0
          : customer.order_count === 0);
      const matchesMinimum =
        minimum === null || customer.lifetime_value >= minimum;
      const matchesMaximum =
        maximum === null || customer.lifetime_value <= maximum;

      return (
        matchesSearch &&
        matchesType &&
        matchesActive &&
        matchesOrders &&
        matchesMinimum &&
        matchesMaximum
      );
    });
  }, [
    activeStatus,
    customerType,
    customers,
    maximumValue,
    minimumValue,
    orderStatus,
    search,
  ]);

  async function toggleActive(customer: Customer) {
    setWorkingCustomerId(customer.id);
    setMessage(
      customer.active
        ? labels.messages.deactivating
        : labels.messages.reactivating,
    );

    const result = customer.active
      ? await deactivateCustomer(customer.id)
      : await reactivateCustomer(customer.id);

    setWorkingCustomerId(null);
    setMessage(
      result.ok
        ? customer.active
          ? labels.messages.deactivated
          : labels.messages.reactivated
        : result.error,
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          [labels.metrics.totalCustomers, metrics.totalCustomers],
          [labels.metrics.registered, metrics.registeredCustomers],
          [labels.metrics.vip, metrics.vipCustomers],
          [labels.metrics.wholesale, metrics.wholesaleCustomers],
          [labels.metrics.customersWithOrders, metrics.customersWithOrders],
          [
            labels.metrics.totalCustomerRevenue,
            formatCurrency(metrics.totalCustomerRevenue),
          ],
          [
            labels.metrics.averageCustomerValue,
            formatCurrency(metrics.averageCustomerValue),
          ],
          [labels.metrics.activeCustomers, metrics.activeCustomers],
        ].map(([label, value]) => (
          <article
            key={label}
            className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]"
          >
            <p className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
              {label}
            </p>
            <p className="mt-3 font-serif text-3xl font-semibold text-[#f7ead2]">
              {value}
            </p>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-[#e8dcc8]/58">
          {labels.privacyNotice}
        </p>
        <Link
          href="/admin/customers/new"
          className="inline-flex min-h-12 items-center justify-center border border-[#d8a344]/45 bg-[#d8a344] px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#0f0b07] transition duration-500 hover:shadow-[0_0_36px_rgba(216,163,68,0.24)]"
        >
          {labels.newCustomer}
        </Link>
      </div>

      <div className="grid gap-3 border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] md:grid-cols-2 xl:grid-cols-6">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={labels.filters.searchCustomers}
          className={inputClass}
        />
        <select
          value={customerType}
          onChange={(event) =>
            setCustomerType(event.target.value as "all" | CustomerType)
          }
          className={inputClass}
        >
          <option value="all">{labels.filters.customerType}</option>
          <option value="walk_in">{labels.filters.walkIn}</option>
          <option value="registered">{labels.filters.registered}</option>
          <option value="vip">{labels.filters.vip}</option>
          <option value="wholesale">{labels.filters.wholesale}</option>
        </select>
        <select
          value={activeStatus}
          onChange={(event) =>
            setActiveStatus(event.target.value as typeof activeStatus)
          }
          className={inputClass}
        >
          <option value="all">{labels.filters.activeInactive}</option>
          <option value="active">{labels.filters.active}</option>
          <option value="inactive">{labels.filters.inactive}</option>
        </select>
        <select
          value={orderStatus}
          onChange={(event) =>
            setOrderStatus(event.target.value as typeof orderStatus)
          }
          className={inputClass}
        >
          <option value="all">{labels.filters.orderStatus}</option>
          <option value="with_orders">{labels.filters.hasOrders}</option>
          <option value="no_orders">{labels.filters.noOrders}</option>
        </select>
        <input
          type="number"
          min="0"
          step="0.01"
          value={minimumValue}
          onChange={(event) => setMinimumValue(event.target.value)}
          placeholder={labels.filters.minimumLifetimeValue}
          className={inputClass}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={maximumValue}
          onChange={(event) => setMaximumValue(event.target.value)}
          placeholder={labels.filters.maximumLifetimeValue}
          className={inputClass}
        />
      </div>

      {message ? (
        <p className="border border-[#d8a344]/30 bg-[#0f0b07] px-4 py-3 text-sm text-[#d8a344]">
          {message}
        </p>
      ) : null}

      <section className="overflow-x-auto border border-[#f7ead2]/10 bg-[#120d08] shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <table className="w-full min-w-[1220px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#f7ead2]/10 text-[0.68rem] uppercase tracking-[0.2em] text-[#d8a344]">
              <th className="px-5 py-4">{labels.table.customerNumber}</th>
              <th className="px-5 py-4">{labels.table.customer}</th>
              <th className="px-5 py-4">{labels.table.type}</th>
              <th className="px-5 py-4">{labels.table.email}</th>
              <th className="px-5 py-4">{labels.table.phone}</th>
              <th className="px-5 py-4">{labels.table.orders}</th>
              <th className="px-5 py-4">{labels.table.lifetimeValue}</th>
              <th className="px-5 py-4">{labels.table.lastOrder}</th>
              <th className="px-5 py-4">{labels.table.status}</th>
              <th className="px-5 py-4">{labels.table.action}</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-[#f7ead2]/8 text-sm text-[#e8dcc8]/72 last:border-b-0"
                >
                  <td className="px-5 py-4 font-medium text-[#f7ead2]">
                    {customer.customer_number}
                  </td>
                  <td className="px-5 py-4">
                    {(() => {
                      const display = getCustomerDisplaySummary(customer);

                      return (
                        <div className="flex items-start gap-3">
                          {isBusinessCustomer(customer) ? (
                            <span className="mt-1 inline-flex h-7 min-w-7 items-center justify-center border border-[#d8a344]/30 text-[0.55rem] font-bold uppercase tracking-[0.12em] text-[#d8a344]">
                              Co
                            </span>
                          ) : null}
                          <div>
                            <p className="font-medium text-[#f7ead2]">
                              {display.primaryName}
                            </p>
                            {display.contactName ? (
                              <p className="mt-1 text-xs text-[#e8dcc8]/52">
                                {labels.table.primaryContact}:{" "}
                                {display.contactName}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-4 capitalize">
                    {getCustomerTypeLabel(customer.customer_type, labels)}
                  </td>
                  <td className="px-5 py-4">
                    {customer.email ?? labels.table.pending}
                  </td>
                  <td className="px-5 py-4">
                    {customer.phone ?? labels.table.pending}
                  </td>
                  <td className="px-5 py-4">{customer.order_count}</td>
                  <td className="px-5 py-4">
                    {formatCurrency(customer.lifetime_value)}
                  </td>
                  <td className="px-5 py-4">
                    {customer.last_order_at
                      ? new Date(customer.last_order_at).toLocaleDateString()
                      : labels.table.pending}
                  </td>
                  <td className="px-5 py-4">
                    {customer.active ? labels.table.active : labels.table.inactive}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="inline-flex min-h-10 items-center justify-center border border-[#d8a344]/45 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
                      >
                        {labels.table.view}
                      </Link>
                      <Link
                        href={`/admin/customers/${customer.id}/edit`}
                        className="inline-flex min-h-10 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344]"
                      >
                        {labels.table.edit}
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleActive(customer)}
                        disabled={
                          workingCustomerId === customer.id ||
                          customer.customer_type === "walk_in"
                        }
                        className="inline-flex min-h-10 items-center justify-center border border-[#f7ead2]/12 px-4 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344] disabled:cursor-not-allowed disabled:text-[#e8dcc8]/32"
                      >
                        {customer.active
                          ? labels.table.deactivate
                          : labels.table.reactivate}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={10}
                  className="px-5 py-14 text-center text-sm text-[#e8dcc8]/54"
                >
                  {labels.table.noMatches}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
