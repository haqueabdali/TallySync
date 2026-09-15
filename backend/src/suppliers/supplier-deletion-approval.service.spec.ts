import {
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

import { SupplierEntity } from './entities/supplier.entity';
import {
  SupplierDeletionApprovalRow,
  SupplierDeletionApprovalService,
} from './supplier-deletion-approval.service';

describe('SupplierDeletionApprovalService', () => {
  const companyId = '11111111-1111-4111-8111-111111111111';
  const supplierId = '22222222-2222-4222-8222-222222222222';
  const requestId = '33333333-3333-4333-8333-333333333333';
  const adminId = '44444444-4444-4444-8444-444444444444';
  const ownerId = '55555555-5555-4555-8555-555555555555';

  let service: SupplierDeletionApprovalService;

  let manager: {
    query: jest.Mock;
    transaction: jest.Mock;
  };

  let repository: {
    findOne: jest.Mock;
    manager: typeof manager;
  };

  const supplier = {
    id: supplierId,
    companyId,
    supplierCode: 'SUP-TEST',
    name: 'Approval Test Supplier',
    companyName: 'Approval Test Company',
    email: 'approval@example.com',
    phone: null,
    mobile: null,
    taxNumber: null,
    vatNumber: null,
  } as SupplierEntity;

  const pendingRequest = (): SupplierDeletionApprovalRow => ({
    id: requestId,
    companyId,
    supplierId,
    supplierSnapshot: {
      id: supplierId,
      supplierCode: 'SUP-TEST',
      name: 'Approval Test Supplier',
    },
    reason: 'Controlled test',
    requestedBy: adminId,
    requestedAt: new Date(),
    adminApprovedBy: null,
    adminApprovedAt: null,
    ownerApprovedBy: null,
    ownerApprovedAt: null,
    executedBy: null,
    executedAt: null,
    status: 'pending',
  });

  beforeEach(() => {
    manager = {
      query: jest.fn(),
      transaction: jest.fn(),
    };

    repository = {
      findOne: jest.fn(),
      manager,
    };

    service = new SupplierDeletionApprovalService(
      repository as any,
    );
  });

  it('rejects users who are neither admin nor company owner', async () => {
    await expect(
      service.requestPermanentDeletion(
        companyId,
        'user-1',
        'sales_rep',
        supplierId,
        'test',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('creates a pending permanent deletion request', async () => {
    repository.findOne.mockResolvedValue(supplier);

    const created = pendingRequest();

    manager.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([created]);

    await expect(
      service.requestPermanentDeletion(
        companyId,
        adminId,
        'admin',
        supplierId,
        'Controlled test',
      ),
    ).resolves.toEqual(created);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: {
        id: supplierId,
        companyId,
      },
      withDeleted: true,
    });

    expect(manager.query).toHaveBeenCalledTimes(2);
  });

  it('keeps request pending after admin approval only', async () => {
    const before = pendingRequest();

    const after: SupplierDeletionApprovalRow = {
      ...before,
      adminApprovedBy: adminId,
      adminApprovedAt: new Date(),
      status: 'pending',
    };

    manager.query
      .mockResolvedValueOnce([before])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([after]);

    const result = await service.approve(
      companyId,
      adminId,
      'admin',
      requestId,
    );

    expect(result.status).toBe('pending');
    expect(result.adminApprovedBy).toBe(adminId);
    expect(result.ownerApprovedBy).toBeNull();

    expect(
      manager.query.mock.calls.some(([sql]) =>
        String(sql).includes('admin_approved_by = $1'),
      ),
    ).toBe(true);
  });

  it('becomes approved only after company owner also approves', async () => {
    const before: SupplierDeletionApprovalRow = {
      ...pendingRequest(),
      adminApprovedBy: adminId,
      adminApprovedAt: new Date(),
    };

    const after: SupplierDeletionApprovalRow = {
      ...before,
      ownerApprovedBy: ownerId,
      ownerApprovedAt: new Date(),
      status: 'approved',
    };

    manager.query
      .mockResolvedValueOnce([before])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([after]);

    const result = await service.approve(
      companyId,
      ownerId,
      'company_owner',
      requestId,
    );

    expect(result.status).toBe('approved');
    expect(result.adminApprovedBy).toBe(adminId);
    expect(result.ownerApprovedBy).toBe(ownerId);
  });

  it('does not allow the same user to satisfy both approvals', async () => {
    const existing: SupplierDeletionApprovalRow = {
      ...pendingRequest(),
      ownerApprovedBy: adminId,
      ownerApprovedAt: new Date(),
    };

    manager.query.mockResolvedValueOnce([existing]);

    await expect(
      service.approve(
        companyId,
        adminId,
        'admin',
        requestId,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not execute before both approvals exist', async () => {
    manager.query.mockResolvedValueOnce([
      pendingRequest(),
    ]);

    await expect(
      service.execute(
        companyId,
        adminId,
        'admin',
        requestId,
      ),
    ).rejects.toThrow(
      'Permanent deletion requires approval from both an Admin and a Company Owner.',
    );

    expect(manager.transaction).not.toHaveBeenCalled();
  });

  it('still blocks permanent deletion when business history exists', async () => {
    const approved: SupplierDeletionApprovalRow = {
      ...pendingRequest(),
      adminApprovedBy: adminId,
      adminApprovedAt: new Date(),
      ownerApprovedBy: ownerId,
      ownerApprovedAt: new Date(),
      status: 'approved',
    };

    manager.query
      .mockResolvedValueOnce([approved])
      .mockResolvedValueOnce([{ exists: true }]);

    await expect(
      service.execute(
        companyId,
        adminId,
        'admin',
        requestId,
      ),
    ).rejects.toThrow(
      'Permanent deletion is prohibited because this supplier has purchase or accounting history.',
    );

    expect(manager.transaction).not.toHaveBeenCalled();
  });

  it('permanently deletes a no-history supplier after both approvals', async () => {
    const approved: SupplierDeletionApprovalRow = {
      ...pendingRequest(),
      adminApprovedBy: adminId,
      adminApprovedAt: new Date(),
      ownerApprovedBy: ownerId,
      ownerApprovedAt: new Date(),
      status: 'approved',
    };

    manager.query
      .mockResolvedValueOnce([approved])
      .mockResolvedValueOnce([{ exists: false }]);

    const transactionManager = {
      delete: jest.fn().mockResolvedValue({
        affected: 1,
      }),
      query: jest.fn().mockResolvedValue([]),
    };

    manager.transaction.mockImplementation(
      async (callback: any) =>
        callback(transactionManager),
    );

    await expect(
      service.execute(
        companyId,
        adminId,
        'admin',
        requestId,
      ),
    ).resolves.toEqual({
      message: 'Supplier permanently deleted successfully.',
      requestId,
    });

    expect(transactionManager.delete).toHaveBeenCalledWith(
      SupplierEntity,
      {
        id: supplierId,
        companyId,
      },
    );

    expect(
      transactionManager.query.mock.calls.some(([sql]) =>
        String(sql).includes("status = 'executed'"),
      ),
    ).toBe(true);
  });
});
