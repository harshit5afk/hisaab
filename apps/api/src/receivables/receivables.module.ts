import { Module } from '@nestjs/common';
import { ReceivablesController } from './receivables.controller';
import { ReceivablesService } from './receivables.service';

@Module({
  controllers: [ReceivablesController],
  providers: [ReceivablesService],
})
export class ReceivablesModule {}
