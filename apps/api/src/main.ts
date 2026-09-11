import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix: all routes start with /api
  app.setGlobalPrefix('api');

  // Validation pipe: auto-validate DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // strip unknown properties
      forbidNonWhitelisted: true,
      transform: true,       // auto-transform payloads to DTO instances
    }),
  );

  // CORS: only needed in dev mode (Angular dev server on :4200)
  // In production, frontend is served from same NestJS server — no CORS needed
  if (process.env.NODE_ENV !== 'production') {
    app.enableCors({
      origin: ['http://localhost:4200'],
      credentials: true,
    });
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Hisaab running on http://localhost:${port}`);
}
bootstrap();

