# Manufacturing Posting Contract

Generated: 2026-08-09T08:23:35.869Z

## Detected entity fields

```json
{
  "materialConsumption": {
    "id": "id",
    "companyId": "companyId",
    "status": "status",
    "documentNumber": "consumptionNumber",
    "productionOrderId": "productionOrderId",
    "totalCost": null
  },
  "materialConsumptionLine": {
    "quantity": "quantity",
    "unitCost": "unitCost",
    "lineCost": "totalCost",
    "itemId": "itemId"
  },
  "productionOrder": {
    "id": "id",
    "companyId": "companyId",
    "status": "status",
    "orderNumber": "orderNumber",
    "itemId": "finishedItemId",
    "completedQuantity": "completedQuantity",
    "actualMaterialCost": "actualMaterialCost",
    "actualLaborCost": "actualLaborCost",
    "actualOverheadCost": "actualOverheadCost",
    "actualTotalCost": "actualTotalCost"
  },
  "productionVariance": {
    "id": "id",
    "companyId": "companyId",
    "status": "status",
    "productionOrderId": "productionOrderId",
    "varianceNumber": null,
    "totalVariance": "totalVariance"
  }
}
```

## Findings

No blocking posting-contract gaps detected.