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

  // CORS: Allow localhost/127.0.0.1 on all ports for development & unified mode
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // SPA fallback: any GET request that doesn't match /api serves Angular index.html
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use((req: any, res: any, next: any) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.includes('.')) {
      const indexPath = require('path').join(__dirname, '..', '..', 'web', 'dist', 'web', 'browser', 'index.html');
      return res.sendFile(indexPath, { dotfiles: 'allow' }, (err: any) => {
        if (err) next();
      });
    }
    next();
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Ion Shift Engineering running on http://localhost:${port}`);
}
bootstrap();