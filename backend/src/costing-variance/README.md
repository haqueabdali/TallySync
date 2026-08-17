# Costing & Variance Analysis

Final manufacturing roadmap module.

This module intentionally does NOT invent fields on ProductionOrder, BOM,
MaterialConsumption, FinishedGoodsReceipt, or inventory costing entities.

Instead it stores a production costing snapshot keyed by a generic verified UUID
`productionReferenceId`.

Variance formulas:
- Material quantity variance =
  (Actual Qty - Standard Qty) × Standard Unit Cost
- Material price variance =
  (Actual Unit Cost - Standard Unit Cost) × Actual Qty
- Total material variance =
  Actual Material Cost - Standard Material Cost
- Conversion variance =
  Actual Conversion Cost - Standard Conversion Cost
- Overhead variance =
  Actual Overhead - Standard Overhead
- Total cost variance =
  Total Actual Cost - Total Standard Cost
- Gross profit =
  Revenue - Actual Cost
- Gross margin % =
  Gross Profit / Revenue × 100

Once current manufacturing entity fields are verified, those services can feed
this module without changing its calculation engine.
