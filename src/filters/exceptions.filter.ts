import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';

// import { Logger } from './log4j.util';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

// 所有错误异常过滤器
@Catch()
export class ExceptionsFilter implements ExceptionFilter {
  // 注入日志服务相关依赖
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const logFormat = `winston
##############################################################################################################
Request original url: ${request.originalUrl}
Method: ${request.method}
IP: ${request.ip}
Status code: ${status}
Response: ${exception}
##############################################################################################################
`;
    // Logger.error(logFormat);
    this.logger.error(logFormat);
    response.status(status).json({
      code: status,
      msg: `Service Error: ${exception}`,
    });
  }
}
