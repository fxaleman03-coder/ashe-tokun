export const shippingFromConfig = {
  company: process.env.SHIPPING_FROM_COMPANY ?? "ASHE TOKUN",
  firstName: "",
  lastName: "",
  address1: process.env.SHIPPING_FROM_ADDRESS1 ?? "",
  address2: process.env.SHIPPING_FROM_ADDRESS2 ?? "",
  city: process.env.SHIPPING_FROM_CITY ?? "",
  state: process.env.SHIPPING_FROM_STATE ?? "",
  postalCode: process.env.SHIPPING_FROM_POSTAL_CODE ?? "",
  country: process.env.SHIPPING_FROM_COUNTRY ?? "US",
  phone: process.env.SHIPPING_FROM_PHONE ?? "",
  email: process.env.SHIPPING_FROM_EMAIL ?? "",
};

export function isShippingFromConfigured() {
  return Boolean(
    shippingFromConfig.company &&
      shippingFromConfig.address1 &&
      shippingFromConfig.city &&
      shippingFromConfig.state &&
      shippingFromConfig.postalCode &&
      shippingFromConfig.country,
  );
}
