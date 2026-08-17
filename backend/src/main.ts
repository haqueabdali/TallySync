import {
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  DocumentBuilder,
  SwaggerModule,
} from '@nestjs/swagger';
import {
  json,
  urlencoded,
} from 'express';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/observability/global-exception.filter';
import { requestContextMiddleware } from './common/observability/request-context.middleware';
import { RequestLoggingInterceptor } from './common/observability/request-logging.interceptor';
import { securityHeadersMiddleware } from './common/security/security-headers.middleware';
import { loadRuntimeConfig } from './config/runtime-config';

function readSlowRequestThreshold(): number {
  const raw =
    process.env.SLOW_REQUEST_MS;

  if (!raw) {
    return 1_500;
  }

  const parsed =
    Number.parseInt(raw, 10);

  return Number.isInteger(parsed) &&
    parsed > 0
    ? parsed
    : 1_500;
}

async function bootstrap(): Promise<void> {
  const runtime =
    loadRuntimeConfig();

  const app =
    await NestFactory.create(
      AppModule,
      {
        bodyParser: false,
      },
    );

  app.enableShutdownHooks();

  app.use(
    requestContextMiddleware,
  );

  app.use(
    securityHeadersMiddleware,
  );

  app.use(
    json({
      limit: runtime.bodyLimit,
    }),
  );

  app.use(
    urlencoded({
      extended: true,
      limit: runtime.bodyLimit,
    }),
  );

  app.enableCors({
    origin:
      runtime.corsOrigins.length > 0
        ? runtime.corsOrigins
        : true,
    credentials: true,
    methods: [
      'GET',
      'HEAD',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],
  });

  app.setGlobalPrefix(
    'api/v1',
    {
      exclude: [
        {
          path: 'health/live',
          method: RequestMethod.GET,
        },
        {
          path: 'health/ready',
          method: RequestMethod.GET,
        },
      ],
    },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  app.useGlobalFilters(
    new GlobalExceptionFilter(
      runtime.nodeEnv,
    ),
  );

  app.useGlobalInterceptors(
    new RequestLoggingInterceptor(
      readSlowRequestThreshold(),
    ),
  );

  if (runtime.enableSwagger) {
    const swaggerConfig =
      new DocumentBuilder()
        .setTitle('TallySync API')
        .setDescription(
          'TallySync Backend API documentation',
        )
        .setVersion('1.0')
        .addBearerAuth(
          {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'Authorization',
            in: 'header',
          },
          'access-token',
        )
        .build();

    const document =
      SwaggerModule.createDocument(
        app,
        swaggerConfig,
      );

    SwaggerModule.setup(
      'docs',
      app,
      document,
      {
        swaggerOptions: {
          persistAuthorization:
            runtime.nodeEnv !==
            'production',
        },
      },
    );
  }

  await app.listen(
    runtime.port,
    '0.0.0.0',
  );
}

void bootstrap();
