import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SupplierEntity } from './entities/supplier.entity';

type ApprovalRole = 'admin' | 'company_owner';

export interface SupplierDeletionApprovalRow {
  id: string;
  companyId: string;
  supplierId: string | null;
  supplierSnapshot: Record<string, unknown>;
  reason: string | null;
  requestedBy: string | null;
  requestedAt: Date | string;
  adminApprovedBy: string | null;
  adminApprovedAt: Date | string | null;
  ownerApprovedBy: string | null;
  ownerApprovedAt: Date | string | null;
  executedBy: string | null;
  executedAt: Date | string | null;
  status: 'pending' | 'approved' | 'executed' | 'cancelled';
}

@Injectable()
export class SupplierDeletionApprovalService {
  constructor(
    @InjectRepository(SupplierEntity)
    private readonly supplierRepository: Repository<SupplierEntity>,
  ) {}

  async requestPermanentDeletion(
    companyId: string,
    userId: string,
    role: string | undefined,
    supplierId: string,
    reason?: string,
  ) {
    this.assertApprovalRole(role);

    const supplier = await this.supplierRepository.findOne({
      where: {
        id: supplierId,
        companyId,
      },
      withDeleted: true,
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    const existing =
      await this.supplierRepository.manager.query<
        Array<{ id: string }>
      >(
        `
          SELECT id
          FROM supplier_deletion_approvals
          WHERE company_id = $1
            AND supplier_id = $2
            AND status IN ('pending', 'approved')
          LIMIT 1
        `,
        [companyId, supplierId],
      );

    if (existing.length > 0) {
      throw new ConflictException(
        'An active permanent deletion request already exists for this supplier.',
      );
    }

    const snapshot = {
      id: supplier.id,
      supplierCode: supplier.supplierCode,
      name: supplier.name,
      companyName: supplier.companyName,
      email: supplier.email,
      phone: supplier.phone,
      mobile: supplier.mobile,
      taxNumber: supplier.taxNumber,
      vatNumber: supplier.vatNumber,
      companyId: supplier.companyId,
    };

    const rows =
      await this.supplierRepository.manager.query<
        SupplierDeletionApprovalRow[]
      >(
        `
          INSERT INTO supplier_deletion_approvals (
            company_id,
            supplier_id,
            supplier_snapshot,
            reason,
            requested_by
          )
          VALUES ($1, $2, $3::jsonb, $4, $5)
          RETURNING
            id,
            company_id AS "companyId",
            supplier_id AS "supplierId",
            supplier_snapshot AS "supplierSnapshot",
            reason,
            requested_by AS "requestedBy",
            requested_at AS "requestedAt",
            admin_approved_by AS "adminApprovedBy",
            admin_approved_at AS "adminApprovedAt",
            owner_approved_by AS "ownerApprovedBy",
            owner_approved_at AS "ownerApprovedAt",
            executed_by AS "executedBy",
            executed_at AS "executedAt",
            status
        `,
        [
          companyId,
          supplierId,
          JSON.stringify(snapshot),
          this.optionalText(reason),
          userId,
        ],
      );

    return rows[0];
  }

  async approve(
    companyId: string,
    userId: string,
    role: string | undefined,
    requestId: string,
  ) {
    const approvalRole = this.assertApprovalRole(role);

    const request = await this.getRequest(companyId, requestId);

    if (request.status === 'executed') {
      throw new ConflictException(
        'This permanent deletion request has already been executed.',
      );
    }

    if (request.status === 'cancelled') {
      throw new ConflictException(
        'This permanent deletion request has been cancelled.',
      );
    }

    if (approvalRole === 'admin') {
      if (request.ownerApprovedBy === userId) {
        throw new ConflictException(
          'The same user cannot provide both required approvals.',
        );
      }

      if (request.adminApprovedBy && request.adminApprovedBy !== userId) {
        throw new ConflictException(
          'Admin approval has already been provided by another administrator.',
        );
      }

      if (!request.adminApprovedBy) {
        await this.supplierRepository.manager.query(
          `
            UPDATE supplier_deletion_approvals
            SET
              admin_approved_by = $1,
              admin_approved_at = now()
            WHERE id = $2
              AND company_id = $3
          `,
          [userId, requestId, companyId],
        );
      }
    } else {
      if (request.adminApprovedBy === userId) {
        throw new ConflictException(
          'The same user cannot provide both required approvals.',
        );
      }

      if (request.ownerApprovedBy && request.ownerApprovedBy !== userId) {
        throw new ConflictException(
          'Company Owner approval has already been provided by another owner.',
        );
      }

      if (!request.ownerApprovedBy) {
        await this.supplierRepository.manager.query(
          `
            UPDATE supplier_deletion_approvals
            SET
              owner_approved_by = $1,
              owner_approved_at = now()
            WHERE id = $2
              AND company_id = $3
          `,
          [userId, requestId, companyId],
        );
      }
    }

    await this.supplierRepository.manager.query(
      `
        UPDATE supplier_deletion_approvals
        SET status =
          CASE
            WHEN admin_approved_by IS NOT NULL
             AND owner_approved_by IS NOT NULL
              THEN 'approved'
            ELSE 'pending'
          END
        WHERE id = $1
          AND company_id = $2
      `,
      [requestId, companyId],
    );

    return this.getRequest(companyId, requestId);
  }

  async execute(
    companyId: string,
    userId: string,
    role: string | undefined,
    requestId: string,
  ) {
    this.assertApprovalRole(role);

    const request = await this.getRequest(companyId, requestId);

    if (request.status !== 'approved') {
      throw new ConflictException(
        'Permanent deletion requires approval from both an Admin and a Company Owner.',
      );
    }

    if (
      !request.adminApprovedBy ||
      !request.ownerApprovedBy ||
      request.adminApprovedBy === request.ownerApprovedBy
    ) {
      throw new ConflictException(
        'Permanent deletion requires two distinct approvers.',
      );
    }

    if (!request.supplierId) {
      throw new ConflictException(
        'The supplier has already been permanently deleted.',
      );
    }

    const hasHistory = await this.hasBusinessHistory(
      companyId,
      request.supplierId,
    );

    if (hasHistory) {
      throw new ConflictException(
        'Permanent deletion is prohibited because this supplier has purchase or accounting history. Deactivate the supplier instead.',
      );
    }

    return this.supplierRepository.manager.transaction(
      async (manager) => {
        const deleteResult = await manager.delete(
          SupplierEntity,
          {
            id: request.supplierId!,
            companyId,
          },
        );

        if (!deleteResult.affected) {
          throw new NotFoundException('Supplier not found');
        }

        await manager.query(
          `
            UPDATE supplier_deletion_approvals
            SET
              status = 'executed',
              executed_by = $1,
              executed_at = now()
            WHERE id = $2
              AND company_id = $3
          `,
          [userId, requestId, companyId],
        );

        return {
          message: 'Supplier permanently deleted successfully.',
          requestId,
        };
      },
    );
  }

  async findOne(companyId: string, requestId: string) {
    return this.getRequest(companyId, requestId);
  }

  private async hasBusinessHistory(
    companyId: string,
    supplierId: string,
  ): Promise<boolean> {
    const rows =
      await this.supplierRepository.manager.query<
        Array<{ exists: boolean }>
      >(
        `
          SELECT (
            EXISTS (
              SELECT 1
              FROM purchase_orders
              WHERE company_id = $1
                AND supplier_id = $2
            )
            OR EXISTS (
              SELECT 1
              FROM purchase_invoices
              WHERE company_id = $1
                AND supplier_id = $2
            )
            OR EXISTS (
              SELECT 1
              FROM purchase_returns
              WHERE company_id = $1
                AND supplier_id = $2
            )
            OR EXISTS (
              SELECT 1
              FROM supplier_payments
              WHERE company_id = $1
                AND supplier_id = $2
            )
            OR EXISTS (
              SELECT 1
              FROM landed_cost_charges
              WHERE supplier_id = $2
            )
          ) AS "exists"
        `,
        [companyId, supplierId],
      );

    return rows[0]?.exists === true;
  }

  private async getRequest(
    companyId: string,
    requestId: string,
  ): Promise<SupplierDeletionApprovalRow> {
    const rows =
      await this.supplierRepository.manager.query<
        SupplierDeletionApprovalRow[]
      >(
        `
          SELECT
            id,
            company_id AS "companyId",
            supplier_id AS "supplierId",
            supplier_snapshot AS "supplierSnapshot",
            reason,
            requested_by AS "requestedBy",
            requested_at AS "requestedAt",
            admin_approved_by AS "adminApprovedBy",
            admin_approved_at AS "adminApprovedAt",
            owner_approved_by AS "ownerApprovedBy",
            owner_approved_at AS "ownerApprovedAt",
            executed_by AS "executedBy",
            executed_at AS "executedAt",
            status
          FROM supplier_deletion_approvals
          WHERE id = $1
            AND company_id = $2
          LIMIT 1
        `,
        [requestId, companyId],
      );

    if (!rows[0]) {
      throw new NotFoundException(
        'Supplier permanent deletion request not found.',
      );
    }

    return rows[0];
  }

  private assertApprovalRole(
    role: string | undefined,
  ): ApprovalRole {
    if (role !== 'admin' && role !== 'company_owner') {
      throw new ForbiddenException(
        'Only an Admin or Company Owner may manage permanent supplier deletion requests.',
      );
    }

    return role;
  }

  private optionalText(value?: string): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
