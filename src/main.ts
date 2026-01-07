import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, BadRequestException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const logger = new Logger('Bootstrap');

  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.FRONTEND_URL ?? 'http://localhost:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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
      errorHttpStatusCode: 400,
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => ({
          field: error.property,
          value: error.value,
          errors: Object.values(error.constraints || {}),
        }));
        
        logger.error('❌ Validation failed:', JSON.stringify(messages, null, 2));
        
        return new BadRequestException({
          statusCode: 400,
          message: 'Validation failed',
          errors: messages,
        });
      },
    }),
  );

  // HTTP request logging
  app.use((req, res, next) => {
    const start = Date.now();
    const requestId = Math.random().toString(36).substr(2, 9);
    
    logger.log(`🔵 [${requestId}] ${req.method} ${req.url}`);
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const statusEmoji = res.statusCode >= 500 ? '🔴' : res.statusCode >= 400 ? '🟡' : '🟢';
      
      logger.log(`${statusEmoji} [${requestId}] ${res.statusCode} - ${duration}ms`);
    });
    
    next();
  });

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('IoT Security Audit System API')
    .setDescription(
      'IoT Device Security Audit and Vulnerability Management Platform powered by NestJS, Prisma & PostgreSQL',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('devices', 'Device inventory management')
    .addTag('scans', 'Security scanning endpoints')
    .addTag('vulnerabilities', 'CVE vulnerability database')
    .addTag('reports', 'Report generation')
    .addTag('analytics', 'Analytics and statistics')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`
  ┌─────────────────────────────────────────────────────────┐
  │                                                         │
  │   🛡️  IoT Security Audit System Backend API            │
  │      Device Security & Vulnerability Management        │
  │                                                         │
  │   Server:  http://localhost:${port}                        │
  │   API:     http://localhost:${port}/api                    │
  │   Docs:    http://localhost:${port}/api/docs               │
  │   DB:      PostgreSQL with Prisma ORM                   │
  │                                                         │
  │   📡 WebSocket enabled for real-time updates            │
  │   📝 HTTP Request logging enabled                       │
  │   ✅ Validation enabled with class-validator            │
  │                                                         │
  └─────────────────────────────────────────────────────────┘
  `);

  logger.log(`🚀 Application running on: http://localhost:${port}`);
  logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  logger.log(`✅ Ready to accept requests!`);
}

bootstrap();