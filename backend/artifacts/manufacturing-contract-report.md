# Manufacturing Contract Report

Generated: 2026-08-08T23:11:34.560Z
Database: tallysync_e2e_test

## Routes

| Method | Route | Handler | Guards | Roles |
|---|---|---|---|---|
| POST | /bill-of-materials | create | UseGuards(JwtAuthGuard) |  |
| GET | /bill-of-materials | findAll | UseGuards(JwtAuthGuard) |  |
| GET | /bill-of-materials/:id | findOne | UseGuards(JwtAuthGuard) |  |
| PATCH | /bill-of-materials/:id | update | UseGuards(JwtAuthGuard) |  |
| POST | /bill-of-materials/:id/activate | activate | UseGuards(JwtAuthGuard) |  |
| POST | /bill-of-materials/:id/deactivate | deactivate | UseGuards(JwtAuthGuard) |  |
| DELETE | /bill-of-materials/:id | remove | UseGuards(JwtAuthGuard) |  |
| POST | /production-orders | create | UseGuards(JwtAuthGuard) |  |
| GET | /production-orders | findAll | UseGuards(JwtAuthGuard) |  |
| GET | /production-orders/:id | findOne | UseGuards(JwtAuthGuard) |  |
| PATCH | /production-orders/:id | update | UseGuards(JwtAuthGuard) |  |
| POST | /production-orders/:id/release | release | UseGuards(JwtAuthGuard) |  |
| POST | /production-orders/:id/start | start | UseGuards(JwtAuthGuard) |  |
| POST | /production-orders/:id/cancel | cancel | UseGuards(JwtAuthGuard) |  |
| DELETE | /production-orders/:id | remove | UseGuards(JwtAuthGuard) |  |
| POST | /material-consumptions | create | UseGuards(JwtAuthGuard) |  |
| GET | /material-consumptions | findAll | UseGuards(JwtAuthGuard) |  |
| GET | /material-consumptions/:id | findOne | UseGuards(JwtAuthGuard) |  |
| GET | /manufacturing/mrp/plan | getPlan | UseGuards(JwtAuthGuard) |  |
| GET | /production-variances/settings | getSettings | UseGuards(JwtAuthGuard) |  |
| PUT | /production-variances/settings | upsertSettings | UseGuards(JwtAuthGuard) |  |
| POST | /production-variances/production-orders/:productionOrderId/calculate | calculate | UseGuards(JwtAuthGuard) |  |
| POST | /production-variances/:id/post | post | UseGuards(JwtAuthGuard) |  |
| GET | /production-variances | list | UseGuards(JwtAuthGuard) |  |
| GET | /production-variances/:id | findOne | UseGuards(JwtAuthGuard) |  |
| POST | /costing-variance | create | UseGuards(JwtAuthGuard) |  |
| GET | /costing-variance | findAll | UseGuards(JwtAuthGuard) |  |
| GET | /costing-variance/profitability | profitability | UseGuards(JwtAuthGuard) |  |
| GET | /costing-variance/:id | findOne | UseGuards(JwtAuthGuard) |  |
| PATCH | /costing-variance/:id | update | UseGuards(JwtAuthGuard) |  |
| POST | /costing-variance/:id/finalize | finalize | UseGuards(JwtAuthGuard) |  |
| POST | /costing-variance/:id/cancel | cancel | UseGuards(JwtAuthGuard) |  |
| POST | /production-schedules | create | UseGuards(JwtAuthGuard) |  |
| GET | /production-schedules | findAll | UseGuards(JwtAuthGuard) |  |
| GET | /production-schedules/gantt | gantt | UseGuards(JwtAuthGuard) |  |
| GET | /production-schedules/:id | findOne | UseGuards(JwtAuthGuard) |  |
| PATCH | /production-schedules/:id | update | UseGuards(JwtAuthGuard) |  |
| POST | /production-schedules/:id/schedule | schedule | UseGuards(JwtAuthGuard) |  |
| POST | /production-schedules/:id/start | start | UseGuards(JwtAuthGuard) |  |
| POST | /production-schedules/:id/complete | complete | UseGuards(JwtAuthGuard) |  |
| POST | /production-schedules/:id/cancel | cancel | UseGuards(JwtAuthGuard) |  |
| POST | /production-schedules/:id/reschedule | reschedule | UseGuards(JwtAuthGuard) |  |
| POST | /capacity-planning/work-centers | createWorkCenter | UseGuards(JwtAuthGuard) |  |
| GET | /capacity-planning/work-centers | listWorkCenters | UseGuards(JwtAuthGuard) |  |
| PATCH | /capacity-planning/work-centers/:id | updateWorkCenter | UseGuards(JwtAuthGuard) |  |
| POST | /capacity-planning/work-centers/:id/overrides | setCapacityOverride | UseGuards(JwtAuthGuard) |  |
| GET | /capacity-planning/report | getReport | UseGuards(JwtAuthGuard) |  |
| POST | /quality-inspections | create | UseGuards(JwtAuthGuard) |  |
| GET | /quality-inspections | findAll | UseGuards(JwtAuthGuard) |  |
| GET | /quality-inspections/report | report | UseGuards(JwtAuthGuard) |  |
| GET | /quality-inspections/:id | findOne | UseGuards(JwtAuthGuard) |  |
| PATCH | /quality-inspections/:id | update | UseGuards(JwtAuthGuard) |  |
| POST | /quality-inspections/:id/start | start | UseGuards(JwtAuthGuard) |  |
| PATCH | /quality-inspections/:inspectionId/checks/:checkId/result | recordCheckResult | UseGuards(JwtAuthGuard) |  |
| POST | /quality-inspections/:id/complete | complete | UseGuards(JwtAuthGuard) |  |
| POST | /quality-inspections/:id/cancel | cancel | UseGuards(JwtAuthGuard) |  |

## DTOs

### BillOfMaterialFilterDto

File: `src/bill-of-materials/dto/bill-of-material-filter.dto.ts`

- `finishedItemId?: string`
- `status?: BillOfMaterialStatus`
- `search?: string`
- `page: number`
- `limit: number`

### BillOfMaterialComponentResponseDto

File: `src/bill-of-materials/dto/bill-of-material-response.dto.ts`

- `id: string`
- `componentItemId: string`
- `componentItemName: string`
- `componentItemSku: string | null`
- `quantity: number`
- `scrapPercentage: number`
- `effectiveQuantity: number`
- `notes: string | null`

### BillOfMaterialResponseDto

File: `src/bill-of-materials/dto/bill-of-material-response.dto.ts`

- `id: string`
- `companyId: string`
- `finishedItemId: string`
- `finishedItemName: string`
- `finishedItemSku: string | null`
- `code: string`
- `name: string`
- `version: number`
- `outputQuantity: number`
- `status: BillOfMaterialStatus`
- `effectiveFrom: string | null`
- `effectiveTo: string | null`
- `notes: string | null`
- `components: BillOfMaterialComponentResponseDto[]`
- `createdAt: Date`
- `updatedAt: Date`

### PaginatedBillsOfMaterialResponseDto

File: `src/bill-of-materials/dto/bill-of-material-response.dto.ts`

- `data: BillOfMaterialResponseDto[]`
- `total: number`
- `page: number`
- `limit: number`
- `totalPages: number`

### CreateBillOfMaterialComponentDto

File: `src/bill-of-materials/dto/create-bill-of-material.dto.ts`

- `componentItemId: string`
- `quantity: number`
- `scrapPercentage?: number`
- `notes?: string`

### CreateBillOfMaterialDto

File: `src/bill-of-materials/dto/create-bill-of-material.dto.ts`

- `finishedItemId: string`
- `code: string`
- `name: string`
- `version?: number`
- `outputQuantity: number`
- `effectiveFrom?: string`
- `effectiveTo?: string`
- `notes?: string`
- `components: CreateBillOfMaterialComponentDto[]`

### CreateProductionOrderDto

File: `src/production-orders/dto/create-production-order.dto.ts`

- `orderNumber: string`
- `billOfMaterialId: string`
- `warehouseId: string`
- `plannedQuantity: number`
- `plannedStartDate?: string`
- `plannedEndDate?: string`
- `notes?: string`

### ProductionOrderFilterDto

File: `src/production-orders/dto/production-order-filter.dto.ts`

- `page: unknown`
- `limit: unknown`
- `status?: ProductionOrderStatus`
- `warehouseId?: string`
- `finishedItemId?: string`
- `search?: string`

### ProductionOrderComponentResponseDto

File: `src/production-orders/dto/production-order-response.dto.ts`

- `id: string`
- `componentItemId: string`
- `componentItemName: string`
- `componentItemSku: string | null`
- `bomQuantity: number`
- `scrapPercentage: number`
- `requiredQuantity: number`
- `consumedQuantity: number`
- `notes: string | null`

### ProductionOrderResponseDto

File: `src/production-orders/dto/production-order-response.dto.ts`

- `id: string`
- `companyId: string`
- `orderNumber: string`
- `billOfMaterialId: string`
- `billOfMaterialCode: string`
- `finishedItemId: string`
- `finishedItemName: string`
- `finishedItemSku: string | null`
- `warehouseId: string`
- `warehouseName: string`
- `status: ProductionOrderStatus`
- `plannedQuantity: number`
- `completedQuantity: number`
- `plannedStartDate: string | null`
- `plannedEndDate: string | null`
- `actualStartDate: Date | null`
- `actualEndDate: Date | null`
- `notes: string | null`
- `components: ProductionOrderComponentResponseDto[]`
- `createdAt: Date`
- `updatedAt: Date`

### PaginatedProductionOrdersResponseDto

File: `src/production-orders/dto/production-order-response.dto.ts`

- `data: ProductionOrderResponseDto[]`
- `total: number`
- `page: number`
- `limit: number`
- `totalPages: number`

### CreateMaterialConsumptionLineDto

File: `src/material-consumption/dto/create-material-consumption-line.dto.ts`

- `productionOrderComponentId: string`
- `quantity: number`
- `notes?: string`

### CreateMaterialConsumptionDto

File: `src/material-consumption/dto/create-material-consumption.dto.ts`

- `consumptionNumber: string`
- `productionOrderId: string`
- `consumptionDate: string`
- `notes?: string`
- `lines: CreateMaterialConsumptionLineDto[]`

### MaterialConsumptionFilterDto

File: `src/material-consumption/dto/material-consumption-filter.dto.ts`

- `productionOrderId?: string`
- `status?: MaterialConsumptionStatus`
- `dateFrom?: string`
- `dateTo?: string`
- `page: number`
- `limit: number`

### MrpPlanLineResponseDto

File: `src/manufacturing-mrp/dto/mrp-plan-line-response.dto.ts`

- `itemId: string`
- `itemName: string`
- `sku: string | null`
- `unit: string`
- `warehouseId: string`
- `warehouseCode: string`
- `warehouseName: string`
- `onHandQuantity: number`
- `reorderLevel: number`
- `shortageQuantity: number`
- `recommendedReplenishmentQuantity: number`
- `averageUnitCost: number`
- `estimatedReplenishmentValue: number`

### MrpPlanPageResponseDto

File: `src/manufacturing-mrp/dto/mrp-plan-page-response.dto.ts`

- `data: MrpPlanLineResponseDto[]`
- `summary: MrpPlanSummaryResponseDto`
- `page: number`
- `limit: number`
- `total: number`
- `totalPages: number`

### MrpPlanQueryDto

File: `src/manufacturing-mrp/dto/mrp-plan-query.dto.ts`

- `itemId?: string`
- `warehouseId?: string`
- `shortagesOnly: boolean`
- `page: number`
- `limit: number`

### MrpPlanSummaryResponseDto

File: `src/manufacturing-mrp/dto/mrp-plan-summary-response.dto.ts`

- `itemWarehouseCount: number`
- `shortageCount: number`
- `totalShortageQuantity: number`
- `totalRecommendedReplenishmentQuantity: number`
- `estimatedReplenishmentValue: number`

### CalculateProductionVarianceDto

File: `src/production-variance/dto/calculate-production-variance.dto.ts`

- `varianceDate?: string`
- `notes?: string`

### ProductionVarianceFilterDto

File: `src/production-variance/dto/production-variance-filter.dto.ts`

- `page: unknown`
- `limit: unknown`
- `productionOrderId?: string`
- `status?: ProductionVarianceStatus`

### UpsertProductionVarianceSettingsDto

File: `src/production-variance/dto/upsert-production-variance-settings.dto.ts`

- `favorableVarianceAccountId: string`
- `unfavorableVarianceAccountId: string`

### CostingAnalysisQueryDto

File: `src/costing-variance/dto/costing-analysis-query.dto.ts`

- `page: unknown`
- `limit: unknown`
- `status?: CostingAnalysisStatus`
- `productionReferenceId?: string`
- `finishedItemId?: string`
- `dateFrom?: string`
- `dateTo?: string`

### MaterialVarianceLineResponseDto

File: `src/costing-variance/dto/costing-variance-response.dto.ts`

- `itemId: string`
- `standardQuantity: number`
- `actualQuantity: number`
- `standardUnitCost: number`
- `actualUnitCost: number`
- `standardMaterialCost: number`
- `actualMaterialCost: number`
- `quantityVariance: number`
- `priceVariance: number`
- `totalMaterialVariance: number`

### CostingVarianceSummaryResponseDto

File: `src/costing-variance/dto/costing-variance-response.dto.ts`

- `analysisId: string`
- `productionReferenceId: string`
- `analysisNumber: string`
- `analysisDate: string`
- `status: CostingAnalysisStatus`
- `plannedOutputQuantity: number`
- `actualOutputQuantity: number`
- `outputQuantityVariance: number`
- `standardMaterialCost: number`
- `actualMaterialCost: number`
- `materialQuantityVariance: number`
- `materialPriceVariance: number`
- `totalMaterialVariance: number`
- `standardConversionCost: number`
- `actualConversionCost: number`
- `conversionCostVariance: number`
- `standardOverheadCost: number`
- `actualOverheadCost: number`
- `overheadVariance: number`
- `totalStandardCost: number`
- `totalActualCost: number`
- `totalCostVariance: number`
- `standardUnitCost: number`
- `actualUnitCost: number`
- `revenueAmount: number`
- `grossProfit: number`
- `grossMarginPercent: number`
- `materials: MaterialVarianceLineResponseDto[]`

### CostingAnalysisListMetaDto

File: `src/costing-variance/dto/costing-variance-response.dto.ts`

- `page: number`
- `limit: number`
- `total: number`
- `totalPages: number`

### PaginatedCostingVarianceResponseDto

File: `src/costing-variance/dto/costing-variance-response.dto.ts`

- `data: CostingVarianceSummaryResponseDto[]`
- `meta: CostingAnalysisListMetaDto`

### CreateProductionCostAnalysisDto

File: `src/costing-variance/dto/create-production-cost-analysis.dto.ts`

- `productionReferenceId: string`
- `analysisDate: string`
- `finishedItemId?: string`
- `plannedOutputQuantity: number`
- `actualOutputQuantity: number`
- `standardConversionCost?: number`
- `actualConversionCost?: number`
- `standardOverheadCost?: number`
- `actualOverheadCost?: number`
- `revenueAmount?: number`
- `notes?: string`
- `materialLines: ProductionCostMaterialLineDto[]`

### ProductionCostMaterialLineDto

File: `src/costing-variance/dto/production-cost-material-line.dto.ts`

- `itemId: string`
- `standardQuantity: number`
- `actualQuantity: number`
- `standardUnitCost: number`
- `actualUnitCost: number`
- `description?: string`

### ProfitabilityReportQueryDto

File: `src/costing-variance/dto/profitability-report-query.dto.ts`

- `dateFrom: string`
- `dateTo: string`

### ProfitabilityReportResponseDto

File: `src/costing-variance/dto/profitability-report-response.dto.ts`

- `dateFrom: string`
- `dateTo: string`
- `finalizedAnalyses: number`
- `totalRevenue: number`
- `totalStandardCost: number`
- `totalActualCost: number`
- `totalCostVariance: number`
- `grossProfit: number`
- `grossMarginPercent: number`

### CreateProductionScheduleDto

File: `src/production-scheduling/dto/create-production-schedule.dto.ts`

- `productionOrderId: string`
- `plannedStartAt: string`
- `plannedEndAt: string`
- `priority?: ProductionSchedulePriority`
- `workCenterCode?: string`
- `notes?: string`

### ProductionScheduleQueryDto

File: `src/production-scheduling/dto/production-schedule-query.dto.ts`

- `page: unknown`
- `limit: unknown`
- `productionOrderId?: string`
- `status?: ProductionScheduleStatus`
- `priority?: ProductionSchedulePriority`
- `workCenterCode?: string`
- `dateFrom?: string`
- `dateTo?: string`

### ProductionScheduleResponseDto

File: `src/production-scheduling/dto/production-schedule-response.dto.ts`

- `id: string`
- `companyId: string`
- `productionOrderId: string`
- `scheduleNumber: string`
- `plannedStartAt: Date`
- `plannedEndAt: Date`
- `actualStartAt: Date | null`
- `actualEndAt: Date | null`
- `status: ProductionScheduleStatus`
- `priority: ProductionSchedulePriority`
- `workCenterCode: string | null`
- `notes: string | null`
- `createdBy: string | null`
- `updatedBy: string | null`
- `createdAt: Date`
- `updatedAt: Date`

### ProductionScheduleMetaDto

File: `src/production-scheduling/dto/production-schedule-response.dto.ts`

- `page: number`
- `limit: number`
- `total: number`
- `totalPages: number`

### PaginatedProductionSchedulesResponseDto

File: `src/production-scheduling/dto/production-schedule-response.dto.ts`

- `data: ProductionScheduleResponseDto[]`
- `meta: ProductionScheduleMetaDto`

### RescheduleProductionDto

File: `src/production-scheduling/dto/reschedule-production.dto.ts`

- `plannedStartAt: string`
- `plannedEndAt: string`
- `reason?: string`

### CapacityReportQueryDto

File: `src/capacity-planning/dto/capacity-report-query.dto.ts`

- `dateFrom: string`
- `dateTo: string`
- `workCenterCode?: string`

### CapacityDayDto

File: `src/capacity-planning/dto/capacity-report-response.dto.ts`

- `date: string`
- `nominalMinutes: number`
- `effectiveCapacityMinutes: number`
- `scheduledMinutes: number`
- `availableMinutes: number`
- `utilizationPercent: number`
- `overloadMinutes: number`
- `isBottleneck: boolean`

### WorkCenterCapacityDto

File: `src/capacity-planning/dto/capacity-report-response.dto.ts`

- `workCenterId: string`
- `workCenterCode: string`
- `workCenterName: string`
- `days: CapacityDayDto[]`
- `totalCapacityMinutes: number`
- `totalScheduledMinutes: number`
- `utilizationPercent: number`
- `bottleneckDays: number`

### CapacityReportResponseDto

File: `src/capacity-planning/dto/capacity-report-response.dto.ts`

- `dateFrom: string`
- `dateTo: string`
- `workCenters: WorkCenterCapacityDto[]`
- `totalCapacityMinutes: number`
- `totalScheduledMinutes: number`
- `utilizationPercent: number`
- `bottleneckWorkCenters: number`

### CreateWorkCenterDto

File: `src/capacity-planning/dto/create-work-center.dto.ts`

- `code: string`
- `name: string`
- `dailyCapacityMinutes: number`
- `efficiencyPercent?: number`
- `workingDays?: number[]`
- `isActive?: boolean`
- `notes?: string`

### SetCapacityOverrideDto

File: `src/capacity-planning/dto/set-capacity-override.dto.ts`

- `capacityDate: string`
- `availableMinutes: number`
- `reason?: string`

### WorkCenterResponseDto

File: `src/capacity-planning/dto/work-center-response.dto.ts`

- `id: string`
- `companyId: string`
- `code: string`
- `name: string`
- `dailyCapacityMinutes: number`
- `efficiencyPercent: number`
- `workingDays: number[]`
- `isActive: boolean`
- `notes: string | null`
- `createdBy: string | null`
- `updatedBy: string | null`
- `createdAt: Date`
- `updatedAt: Date`
- `deletedAt: Date | null`

### CompleteQualityInspectionDto

File: `src/quality-management/dto/complete-quality-inspection.dto.ts`

- `acceptedQuantity: number`
- `rejectedQuantity: number`
- `failureReason?: string`

### CreateQualityInspectionDto

File: `src/quality-management/dto/create-quality-inspection.dto.ts`

- `inspectionDate: string`
- `sourceType: QualityInspectionSourceType`
- `sourceId?: string`
- `itemId?: string`
- `warehouseId?: string`
- `inspectedQuantity: number`
- `inspectorId?: string`
- `notes?: string`
- `checks: QualityCheckDto[]`

### QualityCheckDto

File: `src/quality-management/dto/quality-check.dto.ts`

- `checkName: string`
- `specification?: string`
- `minimumValue?: number`
- `maximumValue?: number`
- `expectedText?: string`
- `isMandatory?: boolean`
- `remarks?: string`

### QualityInspectionQueryDto

File: `src/quality-management/dto/quality-inspection-query.dto.ts`

- `page: unknown`
- `limit: unknown`
- `status?: QualityInspectionStatus`
- `sourceType?: QualityInspectionSourceType`
- `sourceId?: string`
- `itemId?: string`
- `warehouseId?: string`
- `dateFrom?: string`
- `dateTo?: string`

### QualityInspectionCheckResponseDto

File: `src/quality-management/dto/quality-inspection-response.dto.ts`

- `id: string`
- `checkName: string`
- `specification: string | null`
- `minimumValue: number | null`
- `maximumValue: number | null`
- `actualNumericValue: number | null`
- `expectedText: string | null`
- `actualText: string | null`
- `result: QualityCheckResult`
- `isMandatory: boolean`
- `remarks: string | null`

### QualityInspectionResponseDto

File: `src/quality-management/dto/quality-inspection-response.dto.ts`

- `id: string`
- `companyId: string`
- `inspectionNumber: string`
- `inspectionDate: string`
- `sourceType: QualityInspectionSourceType`
- `sourceId: string | null`
- `itemId: string | null`
- `warehouseId: string | null`
- `status: QualityInspectionStatus`
- `inspectedQuantity: number`
- `acceptedQuantity: number`
- `rejectedQuantity: number`
- `inspectorId: string | null`
- `completedAt: Date | null`
- `failureReason: string | null`
- `notes: string | null`
- `checks: QualityInspectionCheckResponseDto[]`
- `createdAt: Date`
- `updatedAt: Date`

### QualityInspectionMetaDto

File: `src/quality-management/dto/quality-inspection-response.dto.ts`

- `page: number`
- `limit: number`
- `total: number`
- `totalPages: number`

### PaginatedQualityInspectionsResponseDto

File: `src/quality-management/dto/quality-inspection-response.dto.ts`

- `data: QualityInspectionResponseDto[]`
- `meta: QualityInspectionMetaDto`

### QualityReportQueryDto

File: `src/quality-management/dto/quality-report-query.dto.ts`

- `dateFrom: string`
- `dateTo: string`

### QualityReportResponseDto

File: `src/quality-management/dto/quality-report-response.dto.ts`

- `dateFrom: string`
- `dateTo: string`
- `totalInspections: number`
- `passedInspections: number`
- `failedInspections: number`
- `cancelledInspections: number`
- `openInspections: number`
- `totalInspectedQuantity: number`
- `totalAcceptedQuantity: number`
- `totalRejectedQuantity: number`
- `passRatePercent: number`
- `rejectionRatePercent: number`

### RecordQualityCheckResultDto

File: `src/quality-management/dto/record-quality-check-result.dto.ts`

- `actualNumericValue?: number`
- `actualText?: string`
- `remarks?: string`

### UpdateQualityInspectionDto

File: `src/quality-management/dto/update-quality-inspection.dto.ts`

- `acceptedQuantity?: number`
- `rejectedQuantity?: number`
- `inspectorId?: string`

## Entities

### BillOfMaterialComponentEntity

Table: `bill_of_material_components`

- `id: string` → `(implicit name)`
- `billOfMaterialId: string` → `bill_of_material_id`
- `componentItemId: string` → `component_item_id`
- `quantity: number` → `(implicit name)`
- `scrapPercentage: number` → `scrap_percentage`
- `notes: string | null` → `(implicit name)`
- `createdAt: Date` → `created_at`
- `updatedAt: Date` → `updated_at`

### BillOfMaterialEntity

Table: `bills_of_material`

- `id: string` → `(implicit name)`
- `companyId: string` → `company_id`
- `finishedItemId: string` → `finished_item_id`
- `code: string` → `(implicit name)`
- `name: string` → `(implicit name)`
- `version: number` → `(implicit name)`
- `outputQuantity: number` → `output_quantity`
- `status: BillOfMaterialStatus` → `(implicit name)`
- `effectiveFrom: string | null` → `effective_from`
- `effectiveTo: string | null` → `effective_to`
- `notes: string | null` → `(implicit name)`
- `createdBy: string | null` → `created_by`
- `updatedBy: string | null` → `updated_by`
- `createdAt: Date` → `created_at`
- `updatedAt: Date` → `updated_at`
- `deletedAt: Date | null` → `deleted_at`

### ProductionOrderComponentEntity

Table: `production_order_components`

- `id: string` → `(implicit name)`
- `productionOrderId: string` → `production_order_id`
- `componentItemId: string` → `component_item_id`
- `bomQuantity: number` → `bom_quantity`
- `scrapPercentage: number` → `scrap_percentage`
- `requiredQuantity: number` → `required_quantity`
- `consumedQuantity: number` → `consumed_quantity`
- `notes: string | null` → `(implicit name)`
- `createdAt: Date` → `created_at`
- `updatedAt: Date` → `updated_at`

### ProductionOrderEntity

Table: `production_orders`

- `id: string` → `(implicit name)`
- `companyId: string` → `company_id`
- `orderNumber: string` → `order_number`
- `billOfMaterialId: string` → `bill_of_material_id`
- `finishedItemId: string` → `finished_item_id`
- `warehouseId: string` → `warehouse_id`
- `status: ProductionOrderStatus` → `(implicit name)`
- `plannedQuantity: number` → `planned_quantity`
- `completedQuantity: number` → `completed_quantity`
- `plannedStartDate: string | null` → `planned_start_date`
- `plannedEndDate: string | null` → `planned_end_date`
- `actualStartDate: Date | null` → `actual_start_date`
- `actualEndDate: Date | null` → `actual_end_date`
- `notes: string | null` → `(implicit name)`
- `createdBy: string | null` → `created_by`
- `updatedBy: string | null` → `updated_by`
- `createdAt: Date` → `created_at`
- `updatedAt: Date` → `updated_at`
- `deletedAt: Date | null` → `deleted_at`

### MaterialConsumptionLineEntity

Table: `material_consumption_lines`

- `id: string` → `(implicit name)`
- `consumptionId: string` → `consumption_id`
- `productionOrderComponentId: string` → `production_order_component_id`
- `itemId: string` → `item_id`
- `quantity: number` → `(implicit name)`
- `unitCost: number` → `unit_cost`
- `totalCost: number` → `total_cost`
- `notes: string | null` → `(implicit name)`
- `createdAt: Date` → `created_at`

### MaterialConsumptionEntity

Table: `material_consumptions`

- `id: string` → `(implicit name)`
- `companyId: string` → `company_id`
- `consumptionNumber: string` → `consumption_number`
- `productionOrderId: string` → `production_order_id`
- `warehouseId: string` → `warehouse_id`
- `consumptionDate: string` → `consumption_date`
- `status: MaterialConsumptionStatus` → `(implicit name)`
- `notes: string | null` → `(implicit name)`
- `createdBy: string | null` → `created_by`
- `reversedAt: Date | null` → `reversed_at`
- `reversedBy: string | null` → `reversed_by`
- `createdAt: Date` → `created_at`
- `updatedAt: Date` → `updated_at`

### ProductionVarianceLineEntity

Table: `production_variance_lines`

- `id: string` → `(implicit name)`
- `productionVarianceId: string` → `production_variance_id`
- `productionOrderComponentId: string` → `production_order_component_id`
- `itemId: string` → `item_id`
- `requiredQuantity: number` → `required_quantity`
- `consumedQuantity: number` → `consumed_quantity`
- `quantityVariance: number` → `quantity_variance`
- `actualCost: number` → `actual_cost`

### ProductionVarianceSettingsEntity

Table: `production_variance_settings`

- `id: string` → `(implicit name)`
- `companyId: string` → `company_id`
- `favorableVarianceAccountId: string` → `favorable_variance_account_id`
- `unfavorableVarianceAccountId: string` → `unfavorable_variance_account_id`
- `createdBy: string | null` → `created_by`
- `updatedBy: string | null` → `updated_by`
- `createdAt: Date` → `created_at`
- `updatedAt: Date` → `updated_at`

### ProductionVarianceEntity

Table: `production_variances`

- `id: string` → `(implicit name)`
- `companyId: string` → `company_id`
- `productionOrderId: string` → `production_order_id`
- `varianceDate: string` → `variance_date`
- `materialCost: number` → `material_cost`
- `finishedGoodsCost: number` → `finished_goods_cost`
- `wipVariance: number` → `wip_variance`
- `status: ProductionVarianceStatus` → `(implicit name)`
- `journalEntryId: string | null` → `journal_entry_id`
- `notes: string | null` → `(implicit name)`
- `createdBy: string | null` → `created_by`
- `createdAt: Date` → `created_at`

### ProductionCostAnalysisEntity

Table: `production_cost_analyses`

- `id: string` → `(implicit name)`
- `companyId: string` → `company_id`
- `productionReferenceId: string` → `production_reference_id`
- `analysisNumber: string` → `analysis_number`
- `analysisDate: string` → `analysis_date`
- `finishedItemId: string | null` → `finished_item_id`
- `plannedOutputQuantity: number` → `planned_output_quantity`
- `actualOutputQuantity: number` → `actual_output_quantity`
- `standardConversionCost: number` → `standard_conversion_cost`
- `actualConversionCost: number` → `actual_conversion_cost`
- `standardOverheadCost: number` → `standard_overhead_cost`
- `actualOverheadCost: number` → `actual_overhead_cost`
- `revenueAmount: number` → `revenue_amount`
- `status: CostingAnalysisStatus` → `(implicit name)`
- `finalizedAt: Date | null` → `finalized_at`
- `notes: string | null` → `(implicit name)`
- `createdBy: string | null` → `created_by`
- `updatedBy: string | null` → `updated_by`
- `createdAt: Date` → `created_at`
- `updatedAt: Date` → `updated_at`
- `deletedAt: Date | null` → `deleted_at`

### ProductionCostMaterialLineEntity

Table: `production_cost_material_lines`

- `id: string` → `(implicit name)`
- `analysisId: string` → `analysis_id`
- `itemId: string` → `item_id`
- `standardQuantity: number` → `standard_quantity`
- `actualQuantity: number` → `actual_quantity`
- `standardUnitCost: number` → `standard_unit_cost`
- `actualUnitCost: number` → `actual_unit_cost`
- `description: string | null` → `(implicit name)`
- `createdAt: Date` → `created_at`
- `updatedAt: Date` → `updated_at`

### ProductionScheduleEntity

Table: `production_schedules`

- `id: string` → `(implicit name)`
- `companyId: string` → `company_id`
- `productionOrderId: string` → `production_order_id`
- `scheduleNumber: string` → `schedule_number`
- `plannedStartAt: Date` → `planned_start_at`
- `plannedEndAt: Date` → `planned_end_at`
- `actualStartAt: Date | null` → `actual_start_at`
- `actualEndAt: Date | null` → `actual_end_at`
- `status: ProductionScheduleStatus` → `(implicit name)`
- `priority: ProductionSchedulePriority` → `(implicit name)`
- `workCenterCode: string | null` → `work_center_code`
- `notes: string | null` → `(implicit name)`
- `createdBy: string | null` → `created_by`
- `updatedBy: string | null` → `updated_by`
- `createdAt: Date` → `created_at`
- `updatedAt: Date` → `updated_at`
- `deletedAt: Date | null` → `deleted_at`

### WorkCenterCapacityOverrideEntity

Table: `work_center_capacity_overrides`

- `id: string` → `(implicit name)`
- `companyId: string` → `company_id`
- `workCenterId: string` → `work_center_id`
- `capacityDate: string` → `capacity_date`
- `availableMinutes: number` → `available_minutes`
- `reason: string | null` → `(implicit name)`
- `createdBy: string | null` → `created_by`
- `updatedBy: string | null` → `updated_by`
- `createdAt: Date` → `created_at`
- `updatedAt: Date` → `updated_at`

### WorkCenterEntity

Table: `work_centers`

- `id: string` → `(implicit name)`
- `companyId: string` → `company_id`
- `code: string` → `(implicit name)`
- `name: string` → `(implicit name)`
- `dailyCapacityMinutes: number` → `daily_capacity_minutes`
- `efficiencyPercent: number` → `efficiency_percent`
- `workingDays: number[]` → `working_days`
- `isActive: boolean` → `is_active`
- `notes: string | null` → `(implicit name)`
- `createdBy: string | null` → `created_by`
- `updatedBy: string | null` → `updated_by`
- `createdAt: Date` → `created_at`
- `updatedAt: Date` → `updated_at`
- `deletedAt: Date | null` → `deleted_at`

### QualityInspectionCheckEntity

Table: `quality_inspection_checks`

- `id: string` → `(implicit name)`
- `inspectionId: string` → `inspection_id`
- `checkName: string` → `check_name`
- `specification: string | null` → `specification`
- `minimumValue: number | null` → `minimum_value`
- `maximumValue: number | null` → `maximum_value`
- `actualNumericValue: number | null` → `actual_numeric_value`
- `expectedText: string | null` → `expected_text`
- `actualText: string | null` → `actual_text`
- `result: QualityCheckResult` → `(implicit name)`
- `isMandatory: boolean` → `is_mandatory`
- `remarks: string | null` → `(implicit name)`
- `createdAt: Date` → `created_at`
- `updatedAt: Date` → `updated_at`

### QualityInspectionEntity

Table: `quality_inspections`

- `id: string` → `(implicit name)`
- `companyId: string` → `company_id`
- `inspectionNumber: string` → `inspection_number`
- `inspectionDate: string` → `inspection_date`
- `sourceType: QualityInspectionSourceType` → `source_type`
- `sourceId: string | null` → `source_id`
- `itemId: string | null` → `item_id`
- `warehouseId: string | null` → `warehouse_id`
- `status: QualityInspectionStatus` → `(implicit name)`
- `inspectedQuantity: number` → `inspected_quantity`
- `acceptedQuantity: number` → `accepted_quantity`
- `rejectedQuantity: number` → `rejected_quantity`
- `inspectorId: string | null` → `inspector_id`
- `completedAt: Date | null` → `completed_at`
- `failureReason: string | null` → `failure_reason`
- `notes: string | null` → `(implicit name)`
- `createdBy: string | null` → `created_by`
- `updatedBy: string | null` → `updated_by`
- `createdAt: Date` → `created_at`
- `updatedAt: Date` → `updated_at`
- `deletedAt: Date | null` → `deleted_at`

## Status / domain enums

### BillOfMaterialStatus

- `DRAFT = draft`
- `ACTIVE = active`
- `INACTIVE = inactive`

### ProductionOrderStatus

- `DRAFT = draft`
- `RELEASED = released`
- `IN_PROGRESS = in_progress`
- `COMPLETED = completed`
- `CANCELLED = cancelled`

### MaterialConsumptionStatus

- `POSTED = posted`
- `REVERSED = reversed`

### ProductionVarianceStatus

- `CALCULATED = calculated`
- `POSTED = posted`

### CostingAnalysisStatus

- `DRAFT = draft`
- `FINALIZED = finalized`
- `CANCELLED = cancelled`

### ProductionSchedulePriority

- `LOW = low`
- `NORMAL = normal`
- `HIGH = high`
- `URGENT = urgent`

### ProductionScheduleStatus

- `PLANNED = planned`
- `SCHEDULED = scheduled`
- `IN_PROGRESS = in_progress`
- `COMPLETED = completed`
- `CANCELLED = cancelled`

### QualityCheckResult

- `PENDING = pending`
- `PASS = pass`
- `FAIL = fail`
- `NOT_APPLICABLE = not_applicable`

### QualityInspectionSourceType

- `PRODUCTION = production`
- `GOODS_RECEIPT = goods_receipt`
- `INVENTORY = inventory`
- `MANUAL = manual`

### QualityInspectionStatus

- `DRAFT = draft`
- `IN_PROGRESS = in_progress`
- `PASSED = passed`
- `FAILED = failed`
- `CANCELLED = cancelled`

## Service integrity signals

### BillOfMaterialsService

- `create`: transaction=true, stockMutation=false, lock=false, completion=true, consumption=false
- `findAll`: transaction=false, stockMutation=false, lock=false, completion=true, consumption=false
- `findOne`: transaction=false, stockMutation=false, lock=false, completion=true, consumption=false
- `update`: transaction=true, stockMutation=false, lock=false, completion=true, consumption=false
- `activate`: transaction=true, stockMutation=false, lock=false, completion=true, consumption=false
- `validateComponents`: transaction=false, stockMutation=false, lock=false, completion=true, consumption=false
- `validateItems`: transaction=false, stockMutation=false, lock=false, completion=true, consumption=false
- `toResponse`: transaction=false, stockMutation=false, lock=false, completion=true, consumption=false

### ProductionOrdersService

- `create`: transaction=true, stockMutation=false, lock=false, completion=true, consumption=true
- `findAll`: transaction=false, stockMutation=false, lock=false, completion=true, consumption=false
- `findOne`: transaction=false, stockMutation=false, lock=false, completion=true, consumption=false
- `update`: transaction=true, stockMutation=false, lock=false, completion=true, consumption=true
- `toResponse`: transaction=false, stockMutation=false, lock=false, completion=true, consumption=true

### MaterialConsumptionService

- `create`: transaction=true, stockMutation=false, lock=false, completion=false, consumption=true
- `findAll`: transaction=false, stockMutation=false, lock=false, completion=false, consumption=true
- `findOne`: transaction=false, stockMutation=false, lock=false, completion=false, consumption=true
- `createWithManager`: transaction=false, stockMutation=false, lock=true, completion=false, consumption=true
- `assertUniqueComponentLines`: transaction=false, stockMutation=false, lock=false, completion=false, consumption=true

### ProductionVarianceService

- `calculate`: transaction=false, stockMutation=false, lock=false, completion=true, consumption=true
- `post`: transaction=false, stockMutation=false, lock=false, completion=true, consumption=false
- `getWipCosts`: transaction=false, stockMutation=false, lock=false, completion=true, consumption=true
- `getComponentActualCosts`: transaction=false, stockMutation=false, lock=false, completion=false, consumption=true

### CostingVarianceService

- `create`: transaction=true, stockMutation=false, lock=false, completion=true, consumption=false
- `findAll`: transaction=false, stockMutation=false, lock=false, completion=true, consumption=false
- `update`: transaction=false, stockMutation=false, lock=false, completion=true, consumption=false

### ProductionSchedulingService

- `complete`: transaction=false, stockMutation=false, lock=false, completion=true, consumption=false
- `cancel`: transaction=false, stockMutation=false, lock=false, completion=true, consumption=false
- `ensureOrderHasNoOpenSchedule`: transaction=false, stockMutation=false, lock=false, completion=true, consumption=false

### CapacityPlanningService

- `getCapacityReport`: transaction=false, stockMutation=false, lock=false, completion=true, consumption=false

### QualityManagementService

- `create`: transaction=true, stockMutation=false, lock=false, completion=true, consumption=false
- `complete`: transaction=false, stockMutation=false, lock=false, completion=true, consumption=false
- `cancel`: transaction=false, stockMutation=false, lock=false, completion=true, consumption=false
- `getReport`: transaction=false, stockMutation=false, lock=false, completion=true, consumption=false
- `toResponse`: transaction=false, stockMutation=false, lock=false, completion=true, consumption=false

## DB manufacturing tables

### bill_of_material_components

- `id` — uuid, nullable=NO
- `bill_of_material_id` — uuid, nullable=NO
- `component_item_id` — uuid, nullable=NO
- `quantity` — numeric, nullable=NO
- `scrap_percentage` — numeric, nullable=NO
- `notes` — text, nullable=YES
- `created_at` — timestamp with time zone, nullable=NO
- `updated_at` — timestamp with time zone, nullable=NO

### bills_of_material

- `id` — uuid, nullable=NO
- `company_id` — uuid, nullable=NO
- `finished_item_id` — uuid, nullable=NO
- `code` — character varying, nullable=NO
- `name` — character varying, nullable=NO
- `version` — integer, nullable=NO
- `output_quantity` — numeric, nullable=NO
- `status` — USER-DEFINED, nullable=NO
- `effective_from` — date, nullable=YES
- `effective_to` — date, nullable=YES
- `notes` — text, nullable=YES
- `created_by` — uuid, nullable=YES
- `updated_by` — uuid, nullable=YES
- `created_at` — timestamp with time zone, nullable=NO
- `updated_at` — timestamp with time zone, nullable=NO
- `deleted_at` — timestamp with time zone, nullable=YES

### material_consumption_lines

- `id` — uuid, nullable=NO
- `consumption_id` — uuid, nullable=NO
- `production_order_component_id` — uuid, nullable=NO
- `item_id` — uuid, nullable=NO
- `quantity` — numeric, nullable=NO
- `unit_cost` — numeric, nullable=NO
- `total_cost` — numeric, nullable=NO
- `notes` — text, nullable=YES
- `created_at` — timestamp with time zone, nullable=NO

### material_consumptions

- `id` — uuid, nullable=NO
- `company_id` — uuid, nullable=NO
- `consumption_number` — character varying, nullable=NO
- `production_order_id` — uuid, nullable=NO
- `warehouse_id` — uuid, nullable=NO
- `consumption_date` — date, nullable=NO
- `status` — USER-DEFINED, nullable=NO
- `notes` — text, nullable=YES
- `created_by` — uuid, nullable=YES
- `reversed_at` — timestamp with time zone, nullable=YES
- `reversed_by` — uuid, nullable=YES
- `created_at` — timestamp with time zone, nullable=NO
- `updated_at` — timestamp with time zone, nullable=NO

### production_cost_analyses

- `id` — uuid, nullable=NO
- `company_id` — uuid, nullable=NO
- `production_reference_id` — uuid, nullable=NO
- `analysis_number` — character varying, nullable=NO
- `analysis_date` — date, nullable=NO
- `finished_item_id` — uuid, nullable=YES
- `planned_output_quantity` — numeric, nullable=NO
- `actual_output_quantity` — numeric, nullable=NO
- `standard_conversion_cost` — numeric, nullable=NO
- `actual_conversion_cost` — numeric, nullable=NO
- `standard_overhead_cost` — numeric, nullable=NO
- `actual_overhead_cost` — numeric, nullable=NO
- `revenue_amount` — numeric, nullable=NO
- `status` — USER-DEFINED, nullable=NO
- `finalized_at` — timestamp with time zone, nullable=YES
- `notes` — text, nullable=YES
- `created_by` — uuid, nullable=YES
- `updated_by` — uuid, nullable=YES
- `created_at` — timestamp with time zone, nullable=NO
- `updated_at` — timestamp with time zone, nullable=NO
- `deleted_at` — timestamp with time zone, nullable=YES

### production_cost_material_lines

- `id` — uuid, nullable=NO
- `analysis_id` — uuid, nullable=NO
- `item_id` — uuid, nullable=NO
- `standard_quantity` — numeric, nullable=NO
- `actual_quantity` — numeric, nullable=NO
- `standard_unit_cost` — numeric, nullable=NO
- `actual_unit_cost` — numeric, nullable=NO
- `description` — character varying, nullable=YES
- `created_at` — timestamp with time zone, nullable=NO
- `updated_at` — timestamp with time zone, nullable=NO

### production_order_components

- `id` — uuid, nullable=NO
- `production_order_id` — uuid, nullable=NO
- `component_item_id` — uuid, nullable=NO
- `bom_quantity` — numeric, nullable=NO
- `scrap_percentage` — numeric, nullable=NO
- `required_quantity` — numeric, nullable=NO
- `consumed_quantity` — numeric, nullable=NO
- `notes` — text, nullable=YES
- `created_at` — timestamp with time zone, nullable=NO
- `updated_at` — timestamp with time zone, nullable=NO

### production_orders

- `id` — uuid, nullable=NO
- `company_id` — uuid, nullable=NO
- `order_number` — character varying, nullable=NO
- `bill_of_material_id` — uuid, nullable=NO
- `finished_item_id` — uuid, nullable=NO
- `warehouse_id` — uuid, nullable=NO
- `status` — USER-DEFINED, nullable=NO
- `planned_quantity` — numeric, nullable=NO
- `completed_quantity` — numeric, nullable=NO
- `planned_start_date` — date, nullable=YES
- `planned_end_date` — date, nullable=YES
- `actual_start_date` — timestamp with time zone, nullable=YES
- `actual_end_date` — timestamp with time zone, nullable=YES
- `notes` — text, nullable=YES
- `created_by` — uuid, nullable=YES
- `updated_by` — uuid, nullable=YES
- `created_at` — timestamp with time zone, nullable=NO
- `updated_at` — timestamp with time zone, nullable=NO
- `deleted_at` — timestamp with time zone, nullable=YES

### production_schedules

- `id` — uuid, nullable=NO
- `company_id` — uuid, nullable=NO
- `production_order_id` — uuid, nullable=NO
- `schedule_number` — character varying, nullable=NO
- `planned_start_at` — timestamp with time zone, nullable=NO
- `planned_end_at` — timestamp with time zone, nullable=NO
- `actual_start_at` — timestamp with time zone, nullable=YES
- `actual_end_at` — timestamp with time zone, nullable=YES
- `status` — USER-DEFINED, nullable=NO
- `priority` — USER-DEFINED, nullable=NO
- `work_center_code` — character varying, nullable=YES
- `notes` — text, nullable=YES
- `created_by` — uuid, nullable=YES
- `updated_by` — uuid, nullable=YES
- `created_at` — timestamp with time zone, nullable=NO
- `updated_at` — timestamp with time zone, nullable=NO
- `deleted_at` — timestamp with time zone, nullable=YES

### production_variance_lines

- `id` — uuid, nullable=NO
- `production_variance_id` — uuid, nullable=NO
- `production_order_component_id` — uuid, nullable=NO
- `item_id` — uuid, nullable=NO
- `required_quantity` — numeric, nullable=NO
- `consumed_quantity` — numeric, nullable=NO
- `quantity_variance` — numeric, nullable=NO
- `actual_cost` — numeric, nullable=NO

### production_variance_settings

- `id` — uuid, nullable=NO
- `company_id` — uuid, nullable=NO
- `favorable_variance_account_id` — uuid, nullable=NO
- `unfavorable_variance_account_id` — uuid, nullable=NO
- `created_by` — uuid, nullable=YES
- `updated_by` — uuid, nullable=YES
- `created_at` — timestamp with time zone, nullable=NO
- `updated_at` — timestamp with time zone, nullable=NO

### production_variances

- `id` — uuid, nullable=NO
- `company_id` — uuid, nullable=NO
- `production_order_id` — uuid, nullable=NO
- `variance_date` — date, nullable=NO
- `material_cost` — numeric, nullable=NO
- `finished_goods_cost` — numeric, nullable=NO
- `wip_variance` — numeric, nullable=NO
- `status` — USER-DEFINED, nullable=NO
- `journal_entry_id` — uuid, nullable=YES
- `notes` — text, nullable=YES
- `created_by` — uuid, nullable=YES
- `created_at` — timestamp with time zone, nullable=NO

### work_center_capacity_overrides

- `id` — uuid, nullable=NO
- `company_id` — uuid, nullable=NO
- `work_center_id` — uuid, nullable=NO
- `capacity_date` — date, nullable=NO
- `available_minutes` — integer, nullable=NO
- `reason` — character varying, nullable=YES
- `created_by` — uuid, nullable=YES
- `updated_by` — uuid, nullable=YES
- `created_at` — timestamp with time zone, nullable=NO
- `updated_at` — timestamp with time zone, nullable=NO

### work_centers

- `id` — uuid, nullable=NO
- `company_id` — uuid, nullable=NO
- `code` — character varying, nullable=NO
- `name` — character varying, nullable=NO
- `daily_capacity_minutes` — integer, nullable=NO
- `efficiency_percent` — numeric, nullable=NO
- `working_days` — jsonb, nullable=NO
- `is_active` — boolean, nullable=NO
- `notes` — text, nullable=YES
- `created_by` — uuid, nullable=YES
- `updated_by` — uuid, nullable=YES
- `created_at` — timestamp with time zone, nullable=NO
- `updated_at` — timestamp with time zone, nullable=NO
- `deleted_at` — timestamp with time zone, nullable=YES

## Findings

- **INFO** [summary] 56 routes, 55 DTO classes, 16 entities, 10 enums, 9 services analyzed.