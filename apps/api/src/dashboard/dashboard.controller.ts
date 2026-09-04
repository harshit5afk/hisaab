import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('monthly')
  getMonthlySummary(@Query('months') months?: string) {
    return this.dashboardService.getMonthlySummary(months ? +months : 6);
  }
}
