import { AccountingEngineService } from './accounting-engine.service';

describe('AccountingEngineService auto-post policy', () => {
  const makeService = (settings: Record<string, unknown> | null) => {
    const settingsRepository = {
      findOne: jest.fn().mockResolvedValue(settings),
    };

    const service = new AccountingEngineService(
      {} as never,
      {} as never,
      settingsRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    return { service, settingsRepository };
  };

  it('skips sales-invoice auto-post when settings are absent', async () => {
    const { service } = makeService(null);
    const postSpy = jest.spyOn(service, 'postSalesInvoice');

    await expect(
      service.autoPostSalesInvoice('invoice-1', 'company-1', 'user-1'),
    ).resolves.toBeNull();

    expect(postSpy).not.toHaveBeenCalled();
  });

  it('skips sales-invoice auto-post when disabled', async () => {
    const { service } = makeService({
      autoPostSalesInvoices: false,
      autoPostCustomerPayments: true,
    });
    const postSpy = jest.spyOn(service, 'postSalesInvoice');

    await expect(
      service.autoPostSalesInvoice('invoice-1', 'company-1', 'user-1'),
    ).resolves.toBeNull();

    expect(postSpy).not.toHaveBeenCalled();
  });

  it('delegates sales-invoice auto-post when enabled', async () => {
    const { service } = makeService({
      autoPostSalesInvoices: true,
      autoPostCustomerPayments: true,
    });
    const expected = { created: true } as never;
    const postSpy = jest
      .spyOn(service, 'postSalesInvoice')
      .mockResolvedValue(expected);

    await expect(
      service.autoPostSalesInvoice('invoice-1', 'company-1', 'user-1'),
    ).resolves.toBe(expected);

    expect(postSpy).toHaveBeenCalledWith(
      'invoice-1',
      'company-1',
      'user-1',
    );
  });

  it('delegates customer-payment auto-post when enabled', async () => {
    const { service } = makeService({
      autoPostSalesInvoices: true,
      autoPostCustomerPayments: true,
    });
    const expected = { created: true } as never;
    const postSpy = jest
      .spyOn(service, 'postCustomerPayment')
      .mockResolvedValue(expected);

    await expect(
      service.autoPostCustomerPayment('payment-1', 'company-1', 'user-1'),
    ).resolves.toBe(expected);

    expect(postSpy).toHaveBeenCalledWith(
      'payment-1',
      'company-1',
      'user-1',
    );
  });
});
