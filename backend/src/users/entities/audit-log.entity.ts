import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  ASSIGN_ROLE = 'assign_role',
  ASSIGN_COMPANY = 'assign_company',
  STATUS_CHANGE = 'status_change',
}

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * User who performed the action.
   */
  @Column({
    name: 'user_id',
    type: 'uuid',
    nullable: true,
  })
  @Index()
  userId: string | null;

  /**
   * Company under which the action was performed.
   */
  @Column({
    name: 'company_id',
    type: 'uuid',
    nullable: true,
  })
  @Index()
  companyId: string | null;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({
    name: 'entity_type',
    type: 'varchar',
    length: 100,
  })
  entityType: string;

  @Column({
    name: 'entity_id',
    type: 'uuid',
    nullable: true,
  })
  @Index()
  entityId: string | null;

  @Column({
    name: 'old_values',
    type: 'jsonb',
    nullable: true,
  })
  oldValues: Record<string, unknown> | null;

  @Column({
    name: 'new_values',
    type: 'jsonb',
    nullable: true,
  })
  newValues: Record<string, unknown> | null;

  @Column({
    name: 'ip_address',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  ipAddress: string | null;

  @Column({
    name: 'user_agent',
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  userAgent: string | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;
}
