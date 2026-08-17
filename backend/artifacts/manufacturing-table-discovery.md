# Manufacturing Table Discovery

Connected DB: `tallysync_e2e_test`

## Entity-declared tables

- `src/bill-of-materials/entities/bill-of-material.entity.ts` → `bills_of_material` → present=true
- `src/bill-of-materials/entities/bill-of-material-component.entity.ts` → `bill_of_material_components` → present=true
- `src/manufacturing-wip-accounting/entities/wip-posting.entity.ts` → `manufacturing_wip_postings` → present=true
- `src/manufacturing-wip-accounting/entities/wip-accounting-settings.entity.ts` → `manufacturing_wip_accounting_settings` → present=true

## Matching DB tables

- `bill_of_material_components`
- `bills_of_material`
- `manufacturing_wip_accounting_settings`
- `manufacturing_wip_postings`
- `material_consumption_lines`
- `material_consumptions`
- `production_cost_analyses`
- `production_cost_material_lines`
- `production_order_components`
- `production_orders`
- `production_schedules`
- `production_variance_lines`
- `production_variance_settings`
- `production_variances`

## Matching migration history

- 29: `CreateBillOfMaterials1787600000000` (1787600000000)
- 30: `CreateProductionOrders1787601000000` (1787601000000)
- 31: `CreateMaterialConsumptions1787602000000` (1787602000000)
- 41: `CreateManufacturingWipAccounting1787612000000` (1787612000000)
- 42: `CreateProductionVariance1787613000000` (1787613000000)
- 47: `CreateProductionSchedules1787618000000` (1787618000000)
- 63: `AddManufacturingAccountingFoundation1788100000000` (1788100000000)
- 64: `AddManufacturingActualCostContracts1788110000000` (1788110000000)

## Related foreign keys

- `bill_of_material_components.FK_bom_component_bom`: `FOREIGN KEY (bill_of_material_id) REFERENCES bills_of_material(id) ON DELETE CASCADE`
- `bill_of_material_components.FK_bom_component_item`: `FOREIGN KEY (component_item_id) REFERENCES items(id) ON DELETE RESTRICT`
- `bills_of_material.FK_bom_finished_item`: `FOREIGN KEY (finished_item_id) REFERENCES items(id) ON DELETE RESTRICT`
- `manufacturing_wip_accounting_settings.FK_manufacturing_wip_settings_account`: `FOREIGN KEY (wip_account_id) REFERENCES accounts(id) ON DELETE RESTRICT`
- `manufacturing_wip_postings.FK_manufacturing_wip_postings_journal`: `FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE RESTRICT`
- `manufacturing_wip_postings.FK_manufacturing_wip_postings_order`: `FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE RESTRICT`
- `material_consumption_lines.FK_material_consumption_lines_component`: `FOREIGN KEY (production_order_component_id) REFERENCES production_order_components(id) ON DELETE RESTRICT`
- `material_consumption_lines.FK_material_consumption_lines_consumption`: `FOREIGN KEY (consumption_id) REFERENCES material_consumptions(id) ON DELETE CASCADE`
- `material_consumption_lines.FK_material_consumption_lines_item`: `FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT`
- `material_consumptions.FK_material_consumptions_production_order`: `FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE RESTRICT`
- `material_consumptions.FK_material_consumptions_warehouse`: `FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT`
- `production_cost_material_lines.FK_production_cost_material_lines_analysis`: `FOREIGN KEY (analysis_id) REFERENCES production_cost_analyses(id) ON DELETE CASCADE`
- `production_order_components.FK_production_order_components_item`: `FOREIGN KEY (component_item_id) REFERENCES items(id) ON DELETE RESTRICT`
- `production_order_components.FK_production_order_components_order`: `FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE CASCADE`
- `production_orders.FK_production_orders_bom`: `FOREIGN KEY (bill_of_material_id) REFERENCES bills_of_material(id) ON DELETE RESTRICT`
- `production_orders.FK_production_orders_finished_item`: `FOREIGN KEY (finished_item_id) REFERENCES items(id) ON DELETE RESTRICT`
- `production_orders.FK_production_orders_warehouse`: `FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT`
- `production_variance_lines.FK_production_variance_lines_component`: `FOREIGN KEY (production_order_component_id) REFERENCES production_order_components(id) ON DELETE RESTRICT`
- `production_variance_lines.FK_production_variance_lines_item`: `FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT`
- `production_variance_lines.FK_production_variance_lines_variance`: `FOREIGN KEY (production_variance_id) REFERENCES production_variances(id) ON DELETE CASCADE`
- `production_variance_settings.FK_production_variance_settings_favorable`: `FOREIGN KEY (favorable_variance_account_id) REFERENCES accounts(id) ON DELETE RESTRICT`
- `production_variance_settings.FK_production_variance_settings_unfavorable`: `FOREIGN KEY (unfavorable_variance_account_id) REFERENCES accounts(id) ON DELETE RESTRICT`
- `production_variances.FK_production_variances_journal`: `FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE RESTRICT`
- `production_variances.FK_production_variances_order`: `FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE RESTRICT`
