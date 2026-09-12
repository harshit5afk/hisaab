import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
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
    // Serve Angular production build from NestJS (single URL setup)
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'web', 'dist', 'web', 'browser'),
      exclude: ['/api{/*path}'],
    }),
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
    // Apply JWT guard globally — use @Public() to exempt routes
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

