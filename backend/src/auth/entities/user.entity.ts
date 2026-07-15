import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';

import { RoleEntity } from './role.entity';
import { CompanyEntity } from './company.entity';
import { RefreshTokenEntity } from './refresh-token.entity';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('users')
@Index('idx_users_company_role', ['companyId', 'roleId'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'company_id',
    type: 'uuid',
    nullable: true,
  })
  @Index()
  companyId: string | null;

  @Column({
    name: 'role_id',
    type: 'uuid',
  })
  @Index()
  roleId: string;

  @Column({
    name: 'full_name',
    type: 'varchar',
    length: 255,
  })
  fullName: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
  })
  @Index()
  email: string;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
  })
  @Exclude()
  passwordHash: string;

  @Column({
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  phone: string | null;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({
    name: 'reset_token_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  @Exclude()
  resetTokenHash: string | null;

  @Column({
    name: 'reset_token_expires_at',
    type: 'timestamptz',
    nullable: true,
  })
  resetTokenExpiresAt: Date | null;

  @Column({
    name: 'last_login_at',
    type: 'timestamptz',
    nullable: true,
  })
  lastLoginAt: Date | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    nullable: true,
  })
  deletedAt: Date | null;

  @ManyToOne(
    () => RoleEntity,
    (role: RoleEntity) => role.users,
    {
      eager: true,
      nullable: false,
      onDelete: 'RESTRICT',
    },
  )
  @JoinColumn({ name: 'role_id' })
  role: RoleEntity;

  @ManyToOne(
    () => CompanyEntity,
    (company: CompanyEntity) => company.users,
    {
      nullable: true,
      onDelete: 'SET NULL',
    },
  )
  @JoinColumn({ name: 'company_id' })
  company: CompanyEntity | null;

  @OneToMany(
    () => RefreshTokenEntity,
    (token: RefreshTokenEntity) => token.user,
  )
  refreshTokens: RefreshTokenEntity[];
}