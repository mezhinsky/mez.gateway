import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Disable body parsing - let http-proxy-middleware handle it
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  const port = process.env.PORT || 3000;

  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    credentials: true,
  });

  await app.listen(port);
  logger.log(`Gateway is running on port ${port}`);
}

bootstrap();
