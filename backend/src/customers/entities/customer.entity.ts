/**
 * Compatibility re-export.
 *
 * Your existing project already defines CustomerEntity inside the
 * sales-orders module. Re-exporting the same class avoids registering two
 * TypeORM entities for the same "customers" table.
 */
export { CustomerEntity } from '../../sales-orders/entities/customer.entity';
