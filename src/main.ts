import rateLimit from 'express-rate-limit';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/transform.interceptor';
import { HttpExceptionFilter } from './common/http-exceptions-filter';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { mw as requestIpMw } from 'request-ip';

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
  app.use(helmet());

  // 获取真实 ip
  app.use(requestIpMw({ attributeName: 'ip' }));

  // 全局参数验证
  app.useGlobalPipes(new ValidationPipe());
  // 全局返回结果拦截器
  app.useGlobalInterceptors(new TransformInterceptor());
  // http错误过滤器
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(3000);
}
bootstrap();
