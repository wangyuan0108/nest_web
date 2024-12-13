import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export default class LoggerMiddleware implements NestMiddleware {
  // 注入日志服务相关依赖
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const statusCode = res.statusCode;
    const logFormat = `winston
  ##############################################################################################################
  RequestOriginal: ${req.originalUrl}
  Method: ${req.method}
  IP: ${req.ip}
  StatusCode: ${statusCode}
  Params: ${JSON.stringify(req.params)}
  Query: ${JSON.stringify(req.query)}
  Body: ${JSON.stringify(req.body)}
  ##############################################################################################################
  `;
  
    next();
  
    if (statusCode >= 500) {
      console.log('error');
      this.logger.error(logFormat);
    } else if (statusCode >= 400) {
      console.log('warn');
      this.logger.warn(logFormat);
    } else {
      console.log('info',this.logger);
      this.logger.info(logFormat);
    }
  }
}

