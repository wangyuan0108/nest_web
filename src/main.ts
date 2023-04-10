import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 参数验证拦截器
  app.useGlobalPipes(new ValidationPipe());
  // 返回结果拦截器
  app.useGlobalInterceptors(new TransformInterceptor());
  // 错误过滤器

  await app.listen(3000);
}
bootstrap();
