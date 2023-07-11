import rateLimit from 'express-rate-limit';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/libs/log4js/transform.interceptor';
import { HttpExceptionFilter } from './common/libs/log4js/http-exceptions-filter';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { mw as requestIpMw } from 'request-ip';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ExceptionsFilter } from './common/libs/log4js/exceptions-filter';
import { logger } from './common/libs/log4js/logger.middleware';

async function bootstrap() {
  // 实例化并开启跨域
  const app = await NestFactory.create(AppModule, { cors: true });

  // 设置访问频率
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 1000, // 限制15分钟内最多只能访问1000次
    }),
  );

  const config = app.get(ConfigService);
  // 设置api访问前缀
  const prefix = config.get<string>('app.prefix');
  app.setGlobalPrefix(prefix);

  // web安全
  app.use(
    helmet({
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginResourcePolicy: false,
    }),
  );

  // 设置swagger文档
  const swaggerConfig = new DocumentBuilder()
    .setTitle('管理后台')
    .setDescription('管理后台接口文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // 获取真实 ip
  app.use(requestIpMw({ attributeName: 'ip' }));

  // 解析请求体
  app.use(express.json());

  // 解析表单
  app.use(express.urlencoded({ extended: true }));
  // 日志
  app.use(logger);
  // 全局参数验证
  app.useGlobalPipes(new ValidationPipe());
  // 全局返回结果拦截器
  app.useGlobalInterceptors(new TransformInterceptor());
  // 所有异常
  // app.useGlobalFilters(new ExceptionsFilter());
  // http错误过滤器
  app.useGlobalFilters(new HttpExceptionFilter(), new ExceptionsFilter());

  // 获取配置文件中的端口号
  const port = config.get<number>('app.port');
  await app.listen(port);
}

bootstrap();
