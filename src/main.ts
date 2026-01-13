import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CRITICAL FIX: CORS Configuration
  // When using credentials: true, origin CANNOT be '*'
  // Must specify exact origins
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
    exposedHeaders: ['Authorization'],
    maxAge: 3600,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global prefix for API routes
  app.setGlobalPrefix('api');

  // Swagger documentation setup
  const config = new DocumentBuilder()
    .setTitle('IoT Security Audit System API')
    .setDescription('Comprehensive API documentation for IoT device security audit and monitoring system')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('devices', 'Device management endpoints')
    .addTag('scans', 'Security scan endpoints')
    .addTag('vulnerabilities', 'Vulnerability management endpoints')
    .addTag('reports', 'Report generation endpoints')
    .addTag('analytics', 'Analytics and metrics endpoints')
    .addTag('events', 'Real-time event endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // Start server
  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`
    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║   🚀 IoT Security Audit System - Backend Started             ║
    ║                                                               ║
    ║   🌐 Application: http://localhost:${port}                     ║
    ║   📚 API Docs:    http://localhost:${port}/api/docs            ║
    ║   🔌 WebSocket:   ws://localhost:${port}                       ║
    ║                                                               ║
    ║   Environment: ${process.env.NODE_ENV || 'development'}                                    ║
    ║   CORS: FIXED - credentials with specific origins            ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝
  `);
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start application:', err);
  process.exit(1);
});