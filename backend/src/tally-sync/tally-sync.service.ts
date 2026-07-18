import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SalesOrderEntity } from '../sales-orders/entities/sales-order.entity';

@Injectable()
export class TallySyncService {
  constructor(
    @InjectRepository(SalesOrderEntity)
    private readonly salesOrderRepository: Repository<SalesOrderEntity>,

    private readonly configService: ConfigService,
  ) {}
private escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
  async checkTallyConnection(): Promise<{
  connected: boolean;
  tallyUrl: string;
  tallyCompanyName: string;
  responsePreview: string;
}> {
    const tallyUrl = this.configService.get<string>(
      'TALLY_URL',
      'http://localhost:9000',
    );

  const tallyCompanyName =
  this.configService.getOrThrow<string>('TALLY_COMPANY_NAME');

const requestXml = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Trial Balance</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${this.escapeXml(tallyCompanyName)}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>
`.trim();

    try {
      const response = await fetch(tallyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
        },
        body: requestXml,
        signal: AbortSignal.timeout(10_000),
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(
          `Tally returned HTTP ${response.status}: ${responseText}`,
        );
      }

      return {
        connected: true,
        tallyUrl,
        tallyCompanyName,
        responsePreview: responseText.substring(0, 500),
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown Tally connection error';

      throw new ServiceUnavailableException(
        `Unable to connect to Tally at ${tallyUrl}: ${message}`,
      );
    }
  }

  async findPendingSalesOrders() {
    const orders = await this.salesOrderRepository
      .createQueryBuilder('salesOrder')
      .where('salesOrder.status = :status', {
        status: 'fulfilled',
      })
      .andWhere('salesOrder.syncStatus = :syncStatus', {
        syncStatus: 'pending',
      })
      .andWhere('salesOrder.deletedAt IS NULL')
      .orderBy('salesOrder.createdAt', 'ASC')
      .getMany();

    return {
      count: orders.length,
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        syncStatus: order.syncStatus,
      })),
    };
  }
}