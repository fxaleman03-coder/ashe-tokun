export type CustomerDisplaySource = {
  customer_number?: string | null;
  customerNumber?: string | null;
  first_name?: string | null;
  firstName?: string | null;
  last_name?: string | null;
  lastName?: string | null;
  company_name?: string | null;
  companyName?: string | null;
  customer_type?: string | null;
  customerType?: string | null;
};

function clean(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue || null;
}

function customerNumber(customer: CustomerDisplaySource) {
  return clean(customer.customer_number) ?? clean(customer.customerNumber);
}

export function getCustomerContactName(customer: CustomerDisplaySource) {
  return [
    clean(customer.first_name) ?? clean(customer.firstName),
    clean(customer.last_name) ?? clean(customer.lastName),
  ]
    .filter(Boolean)
    .join(" ") || null;
}

export function isBusinessCustomer(customer: CustomerDisplaySource) {
  return Boolean(clean(customer.company_name) ?? clean(customer.companyName));
}

export function getCustomerPrimaryName(customer: CustomerDisplaySource) {
  if (isBusinessCustomer(customer)) {
    return (
      clean(customer.company_name) ??
      clean(customer.companyName) ??
      customerNumber(customer) ??
      "Customer"
    );
  }

  return getCustomerContactName(customer) ?? customerNumber(customer) ?? "Customer";
}

export function getCustomerTypeLabel(customer: CustomerDisplaySource) {
  const typeValue =
    clean(customer.customer_type) ?? clean(customer.customerType) ?? "customer";

  return `${typeValue.replace("_", " ")} customer`
    .split(" ")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export function getCustomerDisplaySummary(customer: CustomerDisplaySource) {
  const primaryName = getCustomerPrimaryName(customer);
  const contactName = isBusinessCustomer(customer)
    ? getCustomerContactName(customer)
    : null;

  return {
    primaryName,
    contactName,
    isBusiness: isBusinessCustomer(customer),
    typeLabel: getCustomerTypeLabel(customer),
  };
}
