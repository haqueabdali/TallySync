# Manufacturing E2E Live Contract

Generated: 2026-08-10T09:47:30.220Z

## production-orders.controller.ts

Path: `src/production-orders/production-orders.controller.ts`

Kind: controller

Exists: true

### Decorators / routes

```text
@ApiTags('Production Orders')
@ApiBearerAuth()
@Controller('production-orders')
@UseGuards(JwtAuthGuard)
create: @Post()
create: @ApiOperation({
    summary:
      'Create a draft production order from an active BOM',
  })
create: @ApiCreatedResponse({
    type:
      ProductionOrderResponseDto,
  })
findAll: @Get()
findAll: @ApiOperation({
    summary:
      'List production orders',
  })
findAll: @ApiOkResponse({
    type:
      PaginatedProductionOrdersResponseDto,
  })
findOne: @Get(':id')
findOne: @ApiOperation({
    summary:
      'Get a production order',
  })
findOne: @ApiOkResponse({
    type:
      ProductionOrderResponseDto,
  })
update: @Patch(':id')
update: @ApiOperation({
    summary:
      'Update a draft production order',
  })
update: @ApiOkResponse({
    type:
      ProductionOrderResponseDto,
  })
release: @Post(':id/release')
release: @ApiOperation({
    summary:
      'Release a draft production order',
  })
release: @ApiOkResponse({
    type:
      ProductionOrderResponseDto,
  })
start: @Post(':id/start')
start: @ApiOperation({
    summary:
      'Start a released production order',
  })
start: @ApiOkResponse({
    type:
      ProductionOrderResponseDto,
  })
complete: @Post(':id/complete')
complete: @ApiOperation({
    summary:
      'Complete an in-progress production order',
  })
complete: @ApiOkResponse({
    type:
      ProductionOrderResponseDto,
  })
cancel: @Post(':id/cancel')
cancel: @ApiOperation({
    summary:
      'Cancel a draft or released production order',
  })
cancel: @ApiOkResponse({
    type:
      ProductionOrderResponseDto,
  })
remove: @Delete(':id')
remove: @ApiOperation({
    summary:
      'Soft-delete a draft production order',
  })
remove: @ApiOkResponse()
```

### Methods

- `create(@Body()
    dto:
      CreateProductionOrderDto, @Req()
    request:
      AuthenticatedProductionOrderRequest)` — line 45 — returns `Promise<ProductionOrderResponseDto>`
- `findAll(@Query()
    filter:
      ProductionOrderFilterDto, @Req()
    request:
      AuthenticatedProductionOrderRequest)` — line 69 — returns `Promise<PaginatedProductionOrdersResponseDto>`
- `findOne(@Param(
      'id',
      ParseUUIDPipe,
    )
    id: string, @Req()
    request:
      AuthenticatedProductionOrderRequest)` — line 92 — returns `Promise<ProductionOrderResponseDto>`
- `update(@Param(
      'id',
      ParseUUIDPipe,
    )
    id: string, @Body()
    dto:
      UpdateProductionOrderDto, @Req()
    request:
      AuthenticatedProductionOrderRequest)` — line 117 — returns `Promise<ProductionOrderResponseDto>`
- `release(@Param(
      'id',
      ParseUUIDPipe,
    )
    id: string, @Req()
    request:
      AuthenticatedProductionOrderRequest)` — line 147 — returns `Promise<ProductionOrderResponseDto>`
- `start(@Param(
      'id',
      ParseUUIDPipe,
    )
    id: string, @Req()
    request:
      AuthenticatedProductionOrderRequest)` — line 173 — returns `Promise<ProductionOrderResponseDto>`
- `complete(@Param(
      'id',
      ParseUUIDPipe,
    )
    id: string, @Req()
    request:
      AuthenticatedProductionOrderRequest)` — line 199 — returns `Promise<ProductionOrderResponseDto>`
- `cancel(@Param(
      'id',
      ParseUUIDPipe,
    )
    id: string, @Req()
    request:
      AuthenticatedProductionOrderRequest)` — line 225 — returns `Promise<ProductionOrderResponseDto>`
- `remove(@Param(
      'id',
      ParseUUIDPipe,
    )
    id: string, @Req()
    request:
      AuthenticatedProductionOrderRequest)` — line 251 — returns `Promise<{
    message: string;
  }>`

## production-orders.service.ts

Path: `src/production-orders/production-orders.service.ts`

Kind: service

Exists: true

### Methods

- `create(dto: CreateProductionOrderDto, companyId: string, userId: string)` — line 52 — returns `Promise<ProductionOrderResponseDto>`
- `findAll(filter: ProductionOrderFilterDto, companyId: string)` — line 191 — returns `Promise<PaginatedProductionOrdersResponseDto>`
- `findOne(id: string, companyId: string)` — line 319 — returns `Promise<ProductionOrderResponseDto>`
- `update(id: string, dto: UpdateProductionOrderDto, companyId: string, userId: string)` — line 360 — returns `Promise<ProductionOrderResponseDto>`
- `release(id: string, companyId: string, userId: string)` — line 528 — returns `Promise<ProductionOrderResponseDto>`
- `start(id: string, companyId: string, userId: string)` — line 567 — returns `Promise<ProductionOrderResponseDto>`
- `complete(id: string, companyId: string, userId: string)` — line 608 — returns `Promise<ProductionOrderResponseDto>`
- `cancel(id: string, companyId: string, userId: string)` — line 787 — returns `Promise<ProductionOrderResponseDto>`
- `remove(id: string, companyId: string)` — line 830 — returns `Promise<{
    message: string;
  }>`
- `autoPostProductionCompletionIfEnabled(sourceId: string, companyId: string, userId: string)` — line 861 — returns `Promise<void>`
- `getEntity(id: string, companyId: string)` — line 888 — returns `Promise<ProductionOrderEntity>`
- `getActiveBom(id: string, companyId: string)` — line 909 — returns `Promise<BillOfMaterialEntity>`
- `getWarehouse(id: string, companyId: string)` — line 945 — returns `Promise<WarehouseEntity>`
- `validateDates(start?: string, end?: string)` — line 968 — returns `void`
- `roundQuantity(value: number)` — line 983 — returns `number`
- `roundMoney(value: number)` — line 998 — returns `number`
- `toResponse(entity: ProductionOrderEntity)` — line 1012 — returns `ProductionOrderResponseDto`

## create-production-order.dto.ts

Path: `src/production-orders/dto/create-production-order.dto.ts`

Kind: dto

Exists: true

### DTO fields

```ts
@ApiProperty({ minLength: 1, maxLength: 50 })
  @IsString()
  @Length(1, 50)
  orderNumber!: string;
@ApiProperty({ format: 'uuid' })
  @IsUUID()
  billOfMaterialId!: string;
@ApiProperty({ format: 'uuid' })
  @IsUUID()
  warehouseId!: string;
@ApiProperty({ minimum: 0.000001 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  plannedQuantity!: number;
@ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  plannedStartDate?: string;
@ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  plannedEndDate?: string;
@ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
```

## material-consumption.controller.ts

Path: `src/material-consumption/material-consumption.controller.ts`

Kind: controller

Exists: true

### Decorators / routes

```text
@ApiTags('Material Consumption')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('material-consumptions')
create: @Post()
create: @ApiCreatedResponse({ description: 'Material consumption posted.' })
findAll: @Get()
findAll: @ApiOkResponse({ description: 'Paginated material consumptions.' })
findOne: @Get(':id')
findOne: @ApiOkResponse({ description: 'Material consumption details.' })
```

### Methods

- `create(@Req() request: AuthenticatedRequest, @Body() dto: CreateMaterialConsumptionDto)` — line 16
- `findAll(@Req() request: AuthenticatedRequest, @Query() filter: MaterialConsumptionFilterDto)` — line 22
- `findOne(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string)` — line 28

## material-consumption.service.ts

Path: `src/material-consumption/material-consumption.service.ts`

Kind: service

Exists: true

### Methods

- `create(companyId: string, userId: string, dto: CreateMaterialConsumptionDto)` — line 27 — returns `Promise<MaterialConsumptionEntity>`
- `findAll(companyId: string, filter: MaterialConsumptionFilterDto)` — line 37 — returns `Promise<{
    data: MaterialConsumptionEntity[];
    total: number;
    page: number;
    limit: number;
  }>`
- `findOne(companyId: string, id: string)` — line 63 — returns `Promise<MaterialConsumptionEntity>`
- `autoPostMaterialConsumptionIfEnabled(sourceId: string, companyId: string, userId: string)` — line 71 — returns `Promise<void>`
- `createWithManager(manager: EntityManager, companyId: string, userId: string, dto: CreateMaterialConsumptionDto)` — line 89 — returns `Promise<MaterialConsumptionEntity>`
- `assertUniqueComponentLines(dto: CreateMaterialConsumptionDto)` — line 176 — returns `void`
- `round6(value: number)` — line 183 — returns `number`

## create-material-consumption.dto.ts

Path: `src/material-consumption/dto/create-material-consumption.dto.ts`

Kind: dto

Exists: true

### DTO fields

```ts
@ApiProperty({ maxLength: 50 })
  @IsString()
  @MaxLength(50)
  consumptionNumber!: string;
@ApiProperty({ format: 'uuid' })
  @IsUUID()
  productionOrderId!: string;
@ApiProperty({ example: '2026-08-05' })
  @IsDateString()
  consumptionDate!: string;
@ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
@ApiProperty({ type: [CreateMaterialConsumptionLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateMaterialConsumptionLineDto)
  lines!: CreateMaterialConsumptionLineDto[];
```

## production-variance.controller.ts

Path: `src/production-variance/production-variance.controller.ts`

Kind: controller

Exists: true

### Decorators / routes

```text
@ApiTags('Production Variance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('production-variances')
getSettings: @Get('settings')
getSettings: @ApiOkResponse()
upsertSettings: @Put('settings')
upsertSettings: @ApiOkResponse()
calculate: @Post('production-orders/:productionOrderId/calculate')
calculate: @ApiOperation({ summary: 'Calculate usage and WIP variance for a completed production order' })
calculate: @ApiCreatedResponse()
post: @Post(':id/post')
post: @ApiOkResponse()
list: @Get()
list: @ApiOkResponse()
findOne: @Get(':id')
findOne: @ApiOkResponse()
```

### Methods

- `getSettings(@Req() request: AuthenticatedRequest)` — line 17
- `upsertSettings(@Req() request: AuthenticatedRequest, @Body() dto: UpsertProductionVarianceSettingsDto)` — line 20
- `calculate(@Req() request: AuthenticatedRequest, @Param('productionOrderId', ParseUUIDPipe) productionOrderId: string, @Body() dto: CalculateProductionVarianceDto)` — line 25
- `post(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string)` — line 34
- `list(@Req() request: AuthenticatedRequest, @Query() filter: ProductionVarianceFilterDto)` — line 39
- `findOne(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string)` — line 44

## production-variance.service.ts

Path: `src/production-variance/production-variance.service.ts`

Kind: service

Exists: true

### Methods

- `getSettings(companyId: string)` — line 67 — returns `Promise<ProductionVarianceSettingsEntity>`
- `upsertSettings(companyId: string, userId: string, dto: UpsertProductionVarianceSettingsDto)` — line 88 — returns `Promise<ProductionVarianceSettingsEntity>`
- `calculate(companyId: string, userId: string, productionOrderId: string, dto: CalculateProductionVarianceDto)` — line 141 — returns `Promise<ProductionVarianceEntity>`
- `post(companyId: string, userId: string, id: string)` — line 281 — returns `Promise<ProductionVarianceEntity>`
- `findOne(companyId: string, id: string)` — line 381 — returns `Promise<ProductionVarianceEntity>`
- `list(companyId: string, filter: ProductionVarianceFilterDto)` — line 411
- `autoPostProductionVarianceIfEnabled(sourceId: string, companyId: string, userId: string)` — line 460 — returns `Promise<void>`
- `getWipCosts(companyId: string, productionOrderId: string)` — line 487 — returns `Promise<{
    materialCost: number;
    finishedGoodsCost: number;
  }>`
- `getComponentActualCosts(productionOrderId: string)` — line 547 — returns `Promise<
    Map<string, number>
  >`
- `validateAccount(companyId: string, accountId: string, type: AccountType, label: string)` — line 598 — returns `Promise<void>`
- `money(value: number)` — line 630 — returns `number`
- `quantity(value: number)` — line 644 — returns `number`
- `isUniqueViolation(error: unknown)` — line 659 — returns `boolean`

## calculate-production-variance.dto.ts

Path: `src/production-variance/dto/calculate-production-variance.dto.ts`

Kind: dto

Exists: true

### DTO fields

```ts
@ApiPropertyOptional({ example: '2026-08-31' }) @IsOptional() @IsDateString() varianceDate?: string;
@ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
```

## bill-of-materials.controller.ts

Path: `src/bill-of-materials/bill-of-materials.controller.ts`

Kind: controller

Exists: true

### Decorators / routes

```text
@ApiTags('Bill of Materials')
@ApiBearerAuth()
@Controller('bill-of-materials')
@UseGuards(JwtAuthGuard)
create: @Post()
create: @ApiOperation({ summary: 'Create a draft bill of materials' })
create: @ApiCreatedResponse({ type: BillOfMaterialResponseDto })
findAll: @Get()
findAll: @ApiOperation({ summary: 'List bills of material' })
findAll: @ApiOkResponse({ type: PaginatedBillsOfMaterialResponseDto })
findOne: @Get(':id')
findOne: @ApiOperation({ summary: 'Get a bill of materials' })
findOne: @ApiOkResponse({ type: BillOfMaterialResponseDto })
update: @Patch(':id')
update: @ApiOperation({ summary: 'Update a draft bill of materials' })
update: @ApiOkResponse({ type: BillOfMaterialResponseDto })
activate: @Post(':id/activate')
activate: @ApiOperation({ summary: 'Activate a bill of materials' })
activate: @ApiOkResponse({ type: BillOfMaterialResponseDto })
deactivate: @Post(':id/deactivate')
deactivate: @ApiOperation({ summary: 'Deactivate a bill of materials' })
deactivate: @ApiOkResponse({ type: BillOfMaterialResponseDto })
remove: @Delete(':id')
remove: @ApiOperation({ summary: 'Soft-delete a non-active bill of materials' })
remove: @ApiOkResponse()
```

### Methods

- `create(@Body() dto: CreateBillOfMaterialDto, @Req() request: AuthenticatedBillOfMaterialRequest)` — line 40 — returns `Promise<BillOfMaterialResponseDto>`
- `findAll(@Query() filter: BillOfMaterialFilterDto, @Req() request: AuthenticatedBillOfMaterialRequest)` — line 47 — returns `Promise<PaginatedBillsOfMaterialResponseDto>`
- `findOne(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedBillOfMaterialRequest)` — line 54 — returns `Promise<BillOfMaterialResponseDto>`
- `update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBillOfMaterialDto, @Req() request: AuthenticatedBillOfMaterialRequest)` — line 61 — returns `Promise<BillOfMaterialResponseDto>`
- `activate(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedBillOfMaterialRequest)` — line 68 — returns `Promise<BillOfMaterialResponseDto>`
- `deactivate(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedBillOfMaterialRequest)` — line 75 — returns `Promise<BillOfMaterialResponseDto>`
- `remove(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedBillOfMaterialRequest)` — line 82 — returns `Promise<{ message: string }>`

## create-bill-of-material.dto.ts

Path: `src/bill-of-materials/dto/create-bill-of-material.dto.ts`

Kind: dto

Exists: true

### DTO fields

```ts
@ApiProperty({ format: 'uuid' })
  @IsUUID()
  componentItemId!: string;
@ApiProperty({ minimum: 0.000001 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  quantity!: number;
@ApiPropertyOptional({ minimum: 0, maximum: 100, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  scrapPercentage?: number;
@ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
@ApiProperty({ format: 'uuid' })
  @IsUUID()
  finishedItemId!: string;
@ApiProperty({ minLength: 1, maxLength: 50 })
  @IsString()
  @Length(1, 50)
  code!: string;
@ApiProperty({ minLength: 1, maxLength: 255 })
  @IsString()
  @Length(1, 255)
  name!: string;
@ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;
@ApiProperty({ minimum: 0.000001 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  outputQuantity!: number;
@ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;
@ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
@ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
@ApiProperty({ type: [CreateBillOfMaterialComponentDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBillOfMaterialComponentDto)
  components!: CreateBillOfMaterialComponentDto[];
```

## accounts.controller.ts

Path: `src/accounts/accounts.controller.ts`

Kind: controller

Exists: true

### Decorators / routes

```text
@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts')
create: @Post()
create: @ApiOperation({ summary: 'Create an account' })
create: @ApiCreatedResponse({ type: AccountResponseDto })
findAll: @Get()
findAll: @ApiOperation({ summary: 'List chart of accounts' })
findAll: @ApiOkResponse({ type: PaginatedAccountsResponseDto })
findTree: @Get('tree')
findTree: @ApiOperation({ summary: 'Get chart of accounts tree' })
findTree: @ApiOkResponse({
    type: AccountTreeNodeResponseDto,
    isArray: true,
  })
seedDefaultAccounts: @Post('seed-default')
seedDefaultAccounts: @ApiOperation({ summary: 'Create the default chart of accounts' })
seedDefaultAccounts: @ApiCreatedResponse({
    type: AccountResponseDto,
    isArray: true,
  })
findOne: @Get(':id')
findOne: @ApiOperation({ summary: 'Get account details' })
findOne: @ApiOkResponse({ type: AccountResponseDto })
update: @Patch(':id')
update: @ApiOperation({ summary: 'Update an account' })
update: @ApiOkResponse({ type: AccountResponseDto })
activate: @Post(':id/activate')
activate: @ApiOperation({ summary: 'Activate an account' })
activate: @ApiOkResponse({ type: AccountResponseDto })
deactivate: @Post(':id/deactivate')
deactivate: @ApiOperation({ summary: 'Deactivate an account' })
deactivate: @ApiOkResponse({ type: AccountResponseDto })
remove: @Delete(':id')
remove: @ApiOperation({ summary: 'Delete an account' })
```

### Methods

- `create(@Req() request: AuthenticatedRequest, @Body() dto: CreateAccountDto)` — line 43 — returns `Promise<AccountResponseDto>`
- `findAll(@Req() request: AuthenticatedRequest, @Query() filter: AccountFilterDto)` — line 57 — returns `Promise<PaginatedAccountsResponseDto>`
- `findTree(@Req() request: AuthenticatedRequest)` — line 70 — returns `Promise<AccountTreeNodeResponseDto[]>`
- `seedDefaultAccounts(@Req() request: AuthenticatedRequest)` — line 84 — returns `Promise<AccountResponseDto[]>`
- `findOne(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string)` — line 99 — returns `Promise<AccountResponseDto>`
- `update(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAccountDto)` — line 112 — returns `Promise<AccountResponseDto>`
- `activate(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string)` — line 128 — returns `Promise<AccountResponseDto>`
- `deactivate(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string)` — line 142 — returns `Promise<AccountResponseDto>`
- `remove(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string)` — line 156 — returns `Promise<{ message: string }>`

## create-account.dto.ts

Path: `src/accounts/dto/create-account.dto.ts`

Kind: dto

Exists: true

### DTO fields

```ts
@ApiProperty({ example: '1000' })
  @IsString()
  @MaxLength(30)
  code!: string;
@ApiProperty({ example: 'Cash' })
  @IsString()
  @MaxLength(180)
  name!: string;
@ApiProperty({ enum: AccountType })
  @IsEnum(AccountType)
  type!: AccountType;
@ApiProperty({ enum: AccountNormalBalance })
  @IsEnum(AccountNormalBalance)
  normalBalance!: AccountNormalBalance;
@ApiPropertyOptional({ enum: AccountStatus })
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;
@ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;
@ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isGroup?: boolean;
@ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isSystemAccount?: boolean;
@ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  allowManualEntry?: boolean;
@ApiPropertyOptional({ example: 'EUR' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
@ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
```

## accounting-settings.controller.ts

Path: `src/accounting-settings/accounting-settings.controller.ts`

Kind: controller

Exists: true

### Decorators / routes

```text
@ApiTags('Accounting Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounting-settings')
get: @Get()
get: @ApiOperation({ summary: 'Get company accounting settings' })
get: @ApiOkResponse({ type: AccountingSettingsResponseDto })
update: @Put()
update: @ApiOperation({ summary: 'Create or update accounting settings' })
update: @ApiOkResponse({ type: AccountingSettingsResponseDto })
seedDefaults: @Post('seed-defaults')
seedDefaults: @ApiOperation({
    summary: 'Create default accounting settings from chart of accounts',
  })
seedDefaults: @ApiCreatedResponse({ type: AccountingSettingsResponseDto })
validate: @Get('validate')
validate: @ApiOperation({
    summary: 'Validate accounting settings and account mappings',
  })
validate: @ApiOkResponse({
    type: AccountingSettingsValidationResponseDto,
  })
```

### Methods

- `get(@Req() request: AuthenticatedRequest)` — line 39 — returns `Promise<AccountingSettingsResponseDto>`
- `update(@Req() request: AuthenticatedRequest, @Body() dto: UpdateAccountingSettingsDto)` — line 50 — returns `Promise<AccountingSettingsResponseDto>`
- `seedDefaults(@Req() request: AuthenticatedRequest, @Body() dto: SeedAccountingSettingsDto)` — line 64 — returns `Promise<AccountingSettingsResponseDto>`
- `validate(@Req() request: AuthenticatedRequest)` — line 80 — returns `Promise<AccountingSettingsValidationResponseDto>`

## update-accounting-settings.dto.ts

Path: `src/accounting-settings/dto/update-accounting-settings.dto.ts`

Kind: dto

Exists: true

### DTO fields

```ts
@ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  accountsReceivableAccountId?: string;
@ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  accountsPayableAccountId?: string;
@ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  salesRevenueAccountId?: string;
@ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  salesReturnsAccountId?: string;
@ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  outputTaxAccountId?: string;
@ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  inputTaxAccountId?: string;
@ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  inventoryAccountId?: string;
@ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  costOfGoodsSoldAccountId?: string;
@ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cashAccountId?: string;
@ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bankAccountId?: string;
@ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cardClearingAccountId?: string;
@ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  goodsReceivedNotInvoicedAccountId?: string;
@ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  purchaseExpenseAccountId?: string;
@ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  roundingDifferenceAccountId?: string;
@ApiPropertyOptional({
    example: 'EUR',
    minLength: 3,
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  defaultCurrency?: string;
@ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoPostSalesInvoices?: boolean;
@ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoPostCustomerPayments?: boolean;
@ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoPostSalesReturns?: boolean;
@ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoPostGoodsReceipts?: boolean;
```

## items.controller.ts

Path: `src/items/items.controller.ts`

Kind: controller

Exists: true

### Decorators / routes

```text
@ApiTags('Items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('items')
create: @Post()
create: @ApiOperation({
    summary: 'Create a new item',
  })
create: @ApiCreatedResponse({
    description: 'Item created successfully',
  })
findAll: @Get()
findAll: @ApiOperation({
    summary:
      'List items with pagination, search and filters',
  })
findAll: @ApiOkResponse({
    description: 'Paginated item list',
  })
findLowStock: @Get('low-stock')
findLowStock: @ApiOperation({
    summary: 'List low-stock items',
  })
findOutOfStock: @Get('out-of-stock')
findOutOfStock: @ApiOperation({
    summary: 'List out-of-stock items',
  })
findBySku: @Get('sku/:sku')
findBySku: @ApiOperation({
    summary: 'Find an item by SKU',
  })
findByBarcode: @Get('barcode/:barcode')
findByBarcode: @ApiOperation({
    summary: 'Find an item by barcode',
  })
findOne: @Get(':id')
findOne: @ApiOperation({
    summary: 'Get one item',
  })
update: @Patch(':id')
update: @ApiOperation({
    summary: 'Update an item',
  })
updateStatus: @Patch(':id/status')
updateStatus: @ApiOperation({
    summary: 'Activate or deactivate an item',
  })
restore: @Patch(':id/restore')
restore: @ApiOperation({
    summary: 'Restore a soft-deleted item',
  })
remove: @Delete(':id')
remove: @ApiOperation({
    summary: 'Soft-delete an item',
  })
```

### Methods

- `create(@Req() request: AuthenticatedRequest, @Body() dto: CreateItemDto)` — line 38
- `findAll(@Req() request: AuthenticatedRequest, @Query() filter: ItemFilterDto)` — line 55
- `findLowStock(@Req() request: AuthenticatedRequest)` — line 77
- `findOutOfStock(@Req() request: AuthenticatedRequest)` — line 89
- `findBySku(@Req() request: AuthenticatedRequest, @Param('sku') sku: string)` — line 101
- `findByBarcode(@Req() request: AuthenticatedRequest, @Param('barcode') barcode: string)` — line 115
- `findOne(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string)` — line 129
- `update(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateItemDto)` — line 143
- `updateStatus(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateItemStatusDto)` — line 159
- `restore(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string)` — line 175
- `remove(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string)` — line 189

## create-item.dto.ts

Path: `src/items/dto/create-item.dto.ts`

Kind: dto

Exists: true

### DTO fields

```ts
@ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
@ApiProperty({ example: 'ITEM-0001', maxLength: 50 })
  @IsString()
  @Length(1, 50)
  @Matches(/^[A-Za-z0-9._/-]+$/, {
    message:
      'sku may contain letters, numbers, dots, underscores, slashes and hyphens',
  })
  sku!: string;
@ApiPropertyOptional({ example: '8901234567890', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string;
@ApiProperty({ example: 'Wireless Keyboard', maxLength: 200 })
  @IsString()
  @Length(2, 200)
  name!: string;
@ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
@ApiPropertyOptional({ example: 'PCS', default: 'PCS', maxLength: 30 })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  unit?: string;
@ApiPropertyOptional({ example: 20, default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  purchasePrice?: number;
@ApiPropertyOptional({ example: 29.99, default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  sellingPrice?: number;
@ApiPropertyOptional({ example: 22, default: 0, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxRate?: number;
@ApiPropertyOptional({ example: 100, default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  openingStock?: number;
@ApiPropertyOptional({ example: 10, default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  minimumStock?: number;
@ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;
@ApiPropertyOptional({ example: '84716040', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  hsnCode?: string;
@ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
```

## warehouses.controller.ts

Path: `src/warehouses/warehouses.controller.ts`

Kind: controller

Exists: true

### Decorators / routes

```text
@ApiTags('Warehouses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('warehouses')
create: @Post()
create: @ApiOperation({summary:'Create a warehouse'})
create: @ApiCreatedResponse({type:WarehouseResponseDto})
findAll: @Get()
findAll: @ApiOperation({summary:'List warehouses'})
findAll: @ApiOkResponse({type:PaginatedWarehousesResponseDto})
findByCode: @Get('code/:code')
findByCode: @ApiOkResponse({type:WarehouseResponseDto})
findOne: @Get(':id')
findOne: @ApiOkResponse({type:WarehouseResponseDto})
update: @Patch(':id')
update: @ApiOkResponse({type:WarehouseResponseDto})
status: @Patch(':id/status')
status: @ApiOkResponse({type:WarehouseResponseDto})
setDefault: @Patch(':id/default')
setDefault: @ApiOkResponse({type:WarehouseResponseDto})
restore: @Patch(':id/restore')
restore: @ApiOkResponse({type:WarehouseResponseDto})
remove: @Delete(':id')
```

### Methods

- `create(@Req() r:AuthenticatedRequest, @Body() d:CreateWarehouseDto)` — line 14
- `findAll(@Req() r:AuthenticatedRequest, @Query() f:WarehouseFilterDto)` — line 15
- `findByCode(@Req() r:AuthenticatedRequest, @Param('code') c:string)` — line 16
- `findOne(@Req() r:AuthenticatedRequest, @Param('id',ParseUUIDPipe) id:string)` — line 17
- `update(@Req() r:AuthenticatedRequest, @Param('id',ParseUUIDPipe) id:string, @Body() d:UpdateWarehouseDto)` — line 18
- `status(@Req() r:AuthenticatedRequest, @Param('id',ParseUUIDPipe) id:string, @Body() d:UpdateWarehouseStatusDto)` — line 19
- `setDefault(@Req() r:AuthenticatedRequest, @Param('id',ParseUUIDPipe) id:string)` — line 20
- `restore(@Req() r:AuthenticatedRequest, @Param('id',ParseUUIDPipe) id:string)` — line 21
- `remove(@Req() r:AuthenticatedRequest, @Param('id',ParseUUIDPipe) id:string)` — line 22

## create-warehouse.dto.ts

Path: `src/warehouses/dto/create-warehouse.dto.ts`

Kind: dto

Exists: true

### DTO fields

```ts
@ApiProperty({ example: 'Main Warehouse' }) @IsString() @MaxLength(150) name!: string;
@ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) description?: string;
@ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) contactPerson?: string;
@ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) phone?: string;
@ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(180) email?: string;
@ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) address?: string;
@ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) city?: string;
@ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) state?: string;
@ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) postalCode?: string;
@ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) country?: string;
@ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() isDefault?: boolean;
@ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
```
