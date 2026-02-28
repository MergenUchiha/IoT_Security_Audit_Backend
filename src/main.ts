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

// ─── Global Exception Filter ────────────────────────────────────────────────
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

    // Всегда логируем — видно в терминале бэкенда
    this.logger.error(
      `[${req.method}] ${req.url} → ${status} | body: ${JSON.stringify(req.body)} | error: ${JSON.stringify(message)}`,
    );

    res.status(status).json({
      statusCode: status,
      path: req.url,
      message,
    });
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

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
        valLogger.warn(`Validation failed → ${messages.join(' | ')}`);
        return new BadRequestException(messages);
      },
    }),
  );

  // Глобальный фильтр — должен быть ПОСЛЕ ValidationPipe
  app.useGlobalFilters(new AllExceptionsFilter());

  const config = app.get(ConfigService);
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
  console.log(`✅ API listening on http://localhost:${port}`);
  console.log(`📖 Swagger: http://localhost:${port}/docs`);
}

bootstrap();
