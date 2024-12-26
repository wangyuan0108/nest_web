import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from './modules/user/user.module';
import configuration from './config/index';
import * as Joi from 'joi';
import * as dayjs from 'dayjs';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { RedisModule } from './common/shared/redis/redis.module';
import { RedisClientOptions } from '@liaoliaots/nestjs-redis';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { APP_FILTER } from '@nestjs/core';
import { ExceptionsFilter } from './filters/exceptions.filter';
import LoggerMiddleware from './middleware/logger.middleware';
import * as chalk from 'chalk';
import { User } from './modules/user/entities/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      load: [configuration],
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),
      }),
      validationOptions: {
        // 控制是否允许环境变量中未知的键 默认为true
        allowUnknown: true,
        // 在遇到第一个错误时就停止验证,如果为false就返回所有错误，默认为false
        abortEarly: true,
      },
    }),
    // 数据库
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          type: 'mysql',
          // 可能不再支持这种方式，entities 将改成接收 实体类的引用
          // entities: [`${__dirname}/**/*.entity{.ts,.js}`],
          entities: [User],
          autoLoadEntities: true,
          keepConnectionAlive: true,
          connectTimeout: 10000,
          retryAttempts: 3,
          retryDelay: 1000,
          ...config.get('db.mysql'),
          // cache: {
          //   type: 'ioredis',
          //   ...config.get('redis'),
          //   alwaysEnabled: true,
          //   duration: 3 * 1000, // 缓存3s
          // },
          extra: {
            connectionLimit: 10,
          },
        } as TypeOrmModuleOptions;
      },
    }),
    // redis
    RedisModule.forRootAsync(
      {
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => {
          return {
            closeClient: true,
            readyLog: true,
            errorLog: true,
            config: config.get<RedisClientOptions>('redis'),
          };
        },
      },
      true,
    ),
    WinstonModule.forRoot({
      transports: [
        // 控制台输出
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp }) => {
              const nest = chalk.green('[Nest]');
              const time = chalk.yellow(
                `${dayjs(timestamp as string).format('YYYY-MM-DD HH:mm:ss')}`,
              );
              // 根据不同的日志级别使用不同的颜色
              const levelColor =
                {
                  error: chalk.red,
                  warn: chalk.yellow,
                  info: chalk.green,
                  debug: chalk.blue,
                  verbose: chalk.cyan,
                  silly: chalk.gray,
                }[level] || chalk.white;
              const levelStr = levelColor(`[${level}]`);
              return `${nest} ${time} ${levelStr} : ${chalk.green(message)}`;
            }),
          ),
        }),
        new winston.transports.DailyRotateFile({
          dirname: `logs/system`,
          filename: 'system-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          // 只记录系统相关的日志
          level: 'info',
          // 添加日志过滤
          format: winston.format.combine(
            winston.format.timestamp({
              format: 'YYYY-MM-DD HH:mm:ss',
            }),
            winston.format.json(),
            winston.format.printf((info) => {
              if (info.level === 'info') {
                return JSON.stringify(info);
              }
              return '';
            }),
          ),
        }),
        // Application logs
        new winston.transports.DailyRotateFile({
          dirname: `logs/app`,
          filename: 'app-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          // 只记录应用相关的日志
          level: 'info',
          // 添加日志过滤
          format: winston.format.combine(
            winston.format.timestamp({
              format: 'YYYY-MM-DD HH:mm:ss',
            }),
            winston.format.json(),
            winston.format.printf((info) => {
              if (info.level === 'info') {
                return JSON.stringify(info);
              }
              return '';
            }),
          ),
        }),
        // Error logs
        new winston.transports.DailyRotateFile({
          dirname: `logs/error`,
          filename: 'error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.combine(
            winston.format.timestamp({
              format: 'YYYY-MM-DD HH:mm:ss',
            }),
            winston.format.json(),
          ),
          // 只记录错误日志
          level: 'error',
        }),
      ],
    }),
    // 业务模块
    UserModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ExceptionsFilter,
    },
  ],
})
export class AppModule {
  // 全局中间件
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
