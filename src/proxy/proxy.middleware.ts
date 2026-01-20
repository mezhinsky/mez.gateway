import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, RequestHandler } from 'http-proxy-middleware';

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ProxyMiddleware.name);
  private readonly memBackendProxy: RequestHandler;
  private readonly tgPublisherProxy: RequestHandler;
  private readonly mezAuthProxy: RequestHandler;

  constructor(private configService: ConfigService) {
    const memBackendUrl = this.configService.getOrThrow<string>('MEM_BACKEND_URL');
    const tgPublisherUrl = this.configService.getOrThrow<string>('TG_PUBLISHER_URL');
    const mezAuthUrl = this.configService.getOrThrow<string>('MEZ_AUTH_URL');

    // Proxy for mem.backend: /api/* -> mem.backend/api/*
    this.memBackendProxy = createProxyMiddleware({
      target: memBackendUrl,
      changeOrigin: true,
      pathRewrite: undefined, // Keep path as-is
      on: {
        proxyReq: (proxyReq, req) => {
          this.logger.debug(`Proxying to mem.backend: ${req.method} ${req.url}`);
        },
        error: (err, req, res) => {
          this.logger.error(`mem.backend proxy error: ${err.message}`);
          (res as Response).status(502).json({
            statusCode: 502,
            message: 'Backend service unavailable',
            error: 'Bad Gateway',
          });
        },
      },
    });

    // Proxy for tg.publisher: /tg/* -> tg.publisher/api/*
    this.tgPublisherProxy = createProxyMiddleware({
      target: tgPublisherUrl,
      changeOrigin: true,
      pathRewrite: {
        '^/tg': '/api', // /tg/channels -> /api/channels
      },
      on: {
        proxyReq: (proxyReq, req) => {
          this.logger.debug(`Proxying to tg.publisher: ${req.method} ${req.url}`);
        },
        error: (err, req, res) => {
          this.logger.error(`tg.publisher proxy error: ${err.message}`);
          (res as Response).status(502).json({
            statusCode: 502,
            message: 'Telegram publisher service unavailable',
            error: 'Bad Gateway',
          });
        },
      },
    });

    // Proxy for mez.auth: /auth/*, /users/* -> mez.auth
    this.mezAuthProxy = createProxyMiddleware({
      target: mezAuthUrl,
      changeOrigin: true,
      pathRewrite: undefined, // Keep path as-is
      on: {
        proxyReq: (proxyReq, req) => {
          this.logger.debug(`Proxying to mez.auth: ${req.method} ${req.url}`);
        },
        error: (err, req, res) => {
          this.logger.error(`mez.auth proxy error: ${err.message}`);
          (res as Response).status(502).json({
            statusCode: 502,
            message: 'Auth service unavailable',
            error: 'Bad Gateway',
          });
        },
      },
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    const path = req.path;

    // Route to mez.auth for /auth/* and /users/* paths
    if (path.startsWith('/auth/') || path.startsWith('/auth') || path.startsWith('/users/') || path.startsWith('/users')) {
      return this.mezAuthProxy(req, res, next);
    }

    // Route to tg.publisher for /tg/* paths
    if (path.startsWith('/tg/')) {
      return this.tgPublisherProxy(req, res, next);
    }

    // Route everything else to mem.backend
    return this.memBackendProxy(req, res, next);
  }
}
