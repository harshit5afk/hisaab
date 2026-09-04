import { Controller, Get, Param } from '@nestjs/common';
import { ReceivablesService } from './receivables.service';

@Controller('receivables')
export class ReceivablesController {
  constructor(private receivablesService: ReceivablesService) {}

  @Get()
  getBalances() {
    return this.receivablesService.getBalances();
  }

  @Get(':customerId/ledger')
  getLedger(@Param('customerId') customerId: string) {
    return this.receivablesService.getLedger(customerId);
  }
}
