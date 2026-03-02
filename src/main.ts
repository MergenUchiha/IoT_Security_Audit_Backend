import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';
import {
  ValidationPipe,
  Logger,
  BadRequestException,
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { SelfLogLogger } from './common/logger/self-log.logger';
import { PrismaService } from './modules/prisma/prisma.service';
import { StreamService } from './ingest/stream/stream.service';

@Catch()
class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: unknown = 'Internal server error';
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    } else if (exception instanceof Error) {
      message = exception.message;
    }
    this.logger.error(
      `[${req.method}] ${req.url} → ${status} | body: ${JSON.stringify(req.body)} | error: ${JSON.stringify(message)}`,
    );
    res.status(status).json({ statusCode: status, path: req.url, message });
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
    bufferLogs: true,
  });

  const selfLogger = app.get(SelfLogLogger);
  const config = app.get(ConfigService);
  const prisma = app.get(PrismaService);
  const stream = app.get(StreamService);
  selfLogger.init(config, prisma, stream);

  app.use(helmet());
  app.use(compression());

  const valLogger = new Logger('ValidationPipe');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const messages = errors.map(
          (e) =>
            `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`,
        );
        valLogger.warn(`Validation failed: ${messages.join(' | ')}`);
        return new BadRequestException(messages);
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const port = Number(config.get('PORT') ?? 3000);
  const swaggerEnabled =
    String(config.get('SWAGGER_ENABLED') ?? 'true') === 'true';

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('IoT Security Audit API')
      .setDescription(
        'Backend for agentless IoT security audit + realtime logs',
      )
      .setVersion('0.1.0')
      .build();
    const doc = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, doc);
  }

  await app.listen(port);

  // Подключаем логгер ПОСЛЕ listen — теперь UI успеет подключиться к SSE
  app.useLogger(selfLogger);

  console.log(`API listening on http://localhost:${port}`);
  console.log(`Swagger: http://localhost:${port}/docs`);
}

bootstrap();
