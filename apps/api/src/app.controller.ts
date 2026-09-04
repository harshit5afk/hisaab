import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  healthCheck() {
    return {
      status: 'ok',
      app: 'Hisaab API',
      version: '0.0.1',
      timestamp: new Date().toISOString(),
    };
  }
}
