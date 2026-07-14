function normalizeCarrier(value: string) {
  return value.trim().toLowerCase();
}

export function deriveTrackingUrl(carrier: string, trackingNumber: string) {
  const normalizedCarrier = normalizeCarrier(carrier);
  const encodedTracking = encodeURIComponent(trackingNumber.trim());

  if (!encodedTracking) {
    return "";
  }

  if (normalizedCarrier === "usps") {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodedTracking}`;
  }

  if (normalizedCarrier === "ups") {
    return `https://www.ups.com/track?tracknum=${encodedTracking}`;
  }

  if (normalizedCarrier === "fedex") {
    return `https://www.fedex.com/fedextrack/?trknbr=${encodedTracking}`;
  }

  if (normalizedCarrier === "dhl") {
    return `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${encodedTracking}`;
  }

  return "";
}
