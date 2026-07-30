import { Injectable } from '@nestjs/common';

@Injectable()
export class DashboardService {
  getDashboard() {
    return {
      todaySales: 0,
      monthlySales: 0,
      customers: 0,
      suppliers: 0,
      products: 0,
      lowStock: 0,
      pendingOrders: 0,
      pendingPurchases: 0,
    };
  }
}