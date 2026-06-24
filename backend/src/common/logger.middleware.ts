import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      const msg = `${req.method} ${req.originalUrl} ${res.statusCode} - ${ms}ms`;
      if (res.statusCode >= 400) this.logger.warn(msg);
      else this.logger.log(msg);
    });
    next();
  }
}
