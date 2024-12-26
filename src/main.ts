import rateLimit from 'express-rate-limit';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TransformInterceptor } from './interceptors/tranform.interceptor';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';

import helmet from 'helmet';
import { mw as requestIpMw } from 'request-ip';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';

import * as Chalk from 'chalk';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
async function bootstrap() {
  // 实例化并开启跨域 NestExpressApplication是为了使用express的中间件
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    logger: false,
  });

  // 设置访问频率
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 1000, // 限制15分钟内最多只能访问1000次
      message: 'Too many requests from this IP, please try again later',
      keyGenerator: req => requestIpMw.getClientIp(req),
    }),
  );

  // 获取配置文件
  const config = app.get(ConfigService);


  // 跨域
  app.enableCors();

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

  // 压缩
  app.use(compression());
  // 设置swagger文档
  const swaggerConfig = new DocumentBuilder()
    .setTitle('管理后台')
    .setDescription('管理后台接口文档')
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'JWT认证',
      in: 'header',
    })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

   // 导出 OpenAPI JSON 文件
   fs.writeFileSync('./openapi.json', JSON.stringify(document, null, 2));

  SwaggerModule.setup(`${prefix}/docs`, app, document,{
    jsonDocumentUrl: `${prefix}/docs-json`,
    swaggerOptions: {
      urls: [
        {
          url: `${prefix}/docs-json`,  // JSON文档URL
          name: 'API JSON'
        }
      ],
    }
  });


  // 获取真实 ip
  app.use(requestIpMw({ attributeName: 'ip' }));

  // 设置静态文件
  app.useStaticAssets(join(__dirname, '..', 'public'), { prefix: '/static' });

  // 解析请求体
  app.use(express.json());

  // 解析表单
  app.use(express.urlencoded({ extended: true }));
  
  // 全局参数验证
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    // forbidNonWhitelisted: true,

  }));
  // 全局返回结果拦截器
  app.useGlobalInterceptors(new TransformInterceptor());
  // 所有异常
  // app.useGlobalFilters(new ExceptionsFilter());
  // http错误过滤器
  // app.useGlobalFilters(new HttpExceptionFilter(), new ExceptionsFilter());
  app.useGlobalFilters(new HttpExceptionFilter());

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // 获取配置文件中的端口号
  const port = config.get<number>('app.port');
  await app.listen(port);

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);

  logger.log(
    `${Chalk.green(`nest_web_api 服务启动成功 `)}\n${Chalk.green('服务地址')}                http://localhost:${port}${prefix}/\n${Chalk.green('swagger 文档地址        ')}http://localhost:${port}${prefix}/docs/\n${Chalk.green('静态文件地址        ')}http://localhost:${port}/static/`,
    '\n',
    Chalk.green('静态文件地址        '),
    `http://localhost:${port}/static/`,
  );
}

bootstrap();
