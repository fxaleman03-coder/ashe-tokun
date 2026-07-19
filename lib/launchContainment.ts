export const launchContainment = {
  posSaleCompletion: false,
  inventoryWrites: true,
  inventoryAdjustments: false,
  inventoryReceiving: false,
  inventoryReorderLevel: false,
  inventoryTransfers: false,
  shipmentCreation: true,
  returnCompletion: true,
  completedOrderCancellation: true,
} as const;

export const launchContainmentMessages = {
  posSaleCompletion:
    "POS sale completion is temporarily unavailable.",
  inventoryWrites:
    "Inventory write actions are temporarily read-only for launch.",
  shipmentCreation:
    "Shipment creation is temporarily unavailable.",
  returnCompletion:
    "Return completion is temporarily unavailable.",
  completedOrderCancellation:
    "Completed or paid orders cannot currently be canceled through the system.",
} as const;
