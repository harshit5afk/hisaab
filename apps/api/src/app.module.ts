import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { CustomersModule } from './customers/customers.module';
import { SalesModule } from './sales/sales.module';
import { PurchasesModule } from './purchases/purchases.module';
import { PaymentsModule } from './payments/payments.module';
import { ReceivablesModule } from './receivables/receivables.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AiModule } from './ai/ai.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/api/.env', '../../.env'],
    }),
    // Rate limiting: max 200 requests per minute per IP globally
    // Login endpoint adds extra @Throttle({ default: { limit: 10, ttl: 60000 } })
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,   // 1 minute window
        limit: 200,   // 200 requests per minute
      },
    ]),
    // Serve Angular production build from NestJS (single URL setup)
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'web', 'dist', 'web', 'browser'),
      exclude: ['/api{/*path}'],
    }),
    PrismaModule,
    AuthModule,
    CustomersModule,
    ProductsModule,
    SalesModule,
    PurchasesModule,
    PaymentsModule,
    ReceivablesModule,
    DashboardModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [
    // Rate limiting guard
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Apply JWT guard globally - use @Public() to exempt routes
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
