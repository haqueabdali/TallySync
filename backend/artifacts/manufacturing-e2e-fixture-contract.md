# Manufacturing E2E Fixture Contract

Generated: 2026-08-10T22:29:54.971Z

Requested database: `tallysync_e2e_test`

Connected database: `tallysync_e2e_test`

Schema: `public`

## Table presence

All manufacturing E2E fixture tables were found.

## Required insert fields

These are NOT NULL columns with no database default.

### companies

| Column | Type |
|---|---|
| `name` | `character varying` |
| `tally_company_name` | `character varying` |

### users

| Column | Type |
|---|---|
| `role_id` | `uuid` |
| `email` | `character varying` |
| `password_hash` | `character varying` |
| `full_name` | `character varying` |

### accounts

| Column | Type |
|---|---|
| `company_id` | `uuid` |
| `code` | `character varying` |
| `name` | `character varying` |
| `type` | `accounts_type_enum` |
| `normal_balance` | `accounts_normal_balance_enum` |

### accounting_settings

| Column | Type |
|---|---|
| `company_id` | `uuid` |

### warehouses

| Column | Type |
|---|---|
| `company_id` | `uuid` |
| `warehouse_code` | `character varying` |
| `name` | `character varying` |

### items

| Column | Type |
|---|---|
| `company_id` | `uuid` |
| `name` | `character varying` |

### categories

| Column | Type |
|---|---|
| `company_id` | `uuid` |
| `name` | `character varying` |

### bills_of_material

| Column | Type |
|---|---|
| `company_id` | `uuid` |
| `finished_item_id` | `uuid` |
| `code` | `character varying` |
| `name` | `character varying` |
| `output_quantity` | `numeric` |

### bill_of_material_components

| Column | Type |
|---|---|
| `bill_of_material_id` | `uuid` |
| `component_item_id` | `uuid` |
| `quantity` | `numeric` |

### production_orders

| Column | Type |
|---|---|
| `company_id` | `uuid` |
| `order_number` | `character varying` |
| `bill_of_material_id` | `uuid` |
| `finished_item_id` | `uuid` |
| `warehouse_id` | `uuid` |
| `planned_quantity` | `numeric` |

### production_order_components

| Column | Type |
|---|---|
| `production_order_id` | `uuid` |
| `component_item_id` | `uuid` |
| `bom_quantity` | `numeric` |
| `required_quantity` | `numeric` |

### material_consumptions

| Column | Type |
|---|---|
| `company_id` | `uuid` |
| `consumption_number` | `character varying` |
| `production_order_id` | `uuid` |
| `warehouse_id` | `uuid` |
| `consumption_date` | `date` |

### material_consumption_lines

| Column | Type |
|---|---|
| `consumption_id` | `uuid` |
| `production_order_component_id` | `uuid` |
| `item_id` | `uuid` |
| `quantity` | `numeric` |
| `unit_cost` | `numeric` |
| `total_cost` | `numeric` |

### manufacturing_wip_accounting_settings

| Column | Type |
|---|---|
| `company_id` | `uuid` |
| `wip_account_id` | `uuid` |

### manufacturing_wip_postings

| Column | Type |
|---|---|
| `company_id` | `uuid` |
| `production_order_id` | `uuid` |
| `posting_type` | `manufacturing_wip_posting_type_enum` |
| `source_id` | `uuid` |
| `posting_date` | `date` |
| `amount` | `numeric` |
| `journal_entry_id` | `uuid` |

### production_variances

| Column | Type |
|---|---|
| `company_id` | `uuid` |
| `production_order_id` | `uuid` |
| `variance_date` | `date` |
| `material_cost` | `numeric` |
| `finished_goods_cost` | `numeric` |
| `wip_variance` | `numeric` |

### production_variance_lines

| Column | Type |
|---|---|
| `production_variance_id` | `uuid` |
| `production_order_component_id` | `uuid` |
| `item_id` | `uuid` |
| `required_quantity` | `numeric` |
| `consumed_quantity` | `numeric` |
| `quantity_variance` | `numeric` |
| `actual_cost` | `numeric` |

### journal_entries

| Column | Type |
|---|---|
| `company_id` | `uuid` |
| `entry_number` | `character varying` |
| `entry_date` | `date` |

### journal_entry_lines

| Column | Type |
|---|---|
| `journal_entry_id` | `uuid` |
| `account_id` | `uuid` |

## Journal-entry indexes

- `IDX_journal_entries_company`: `CREATE INDEX "IDX_journal_entries_company" ON public.journal_entries USING btree (company_id)`
- `IDX_journal_entries_entry_date`: `CREATE INDEX "IDX_journal_entries_entry_date" ON public.journal_entries USING btree (company_id, entry_date)`
- `IDX_journal_entries_source`: `CREATE INDEX "IDX_journal_entries_source" ON public.journal_entries USING btree (company_id, source_type, source_id)`
- `IDX_journal_entries_status`: `CREATE INDEX "IDX_journal_entries_status" ON public.journal_entries USING btree (company_id, status)`
- `PK_journal_entries`: `CREATE UNIQUE INDEX "PK_journal_entries" ON public.journal_entries USING btree (id)`
- `UQ_journal_entries_company_number`: `CREATE UNIQUE INDEX "UQ_journal_entries_company_number" ON public.journal_entries USING btree (company_id, entry_number) WHERE (deleted_at IS NULL)`
- `UQ_journal_entries_live_source`: `CREATE UNIQUE INDEX "UQ_journal_entries_live_source" ON public.journal_entries USING btree (company_id, source_type, source_id) WHERE ((source_id IS NOT NULL) AND (deleted_at IS NULL))`
