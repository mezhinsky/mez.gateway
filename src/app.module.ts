import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ProxyModule } from './proxy/proxy.module';
import { HealthModule } from './health/health.module';
import { AuthMiddleware } from './auth/auth.middleware';
import { ProxyMiddleware } from './proxy/proxy.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    ProxyModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Auth middleware for protected routes
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: 'tg/*', method: RequestMethod.ALL },
        { path: 'users', method: RequestMethod.ALL },
        { path: 'users/*', method: RequestMethod.ALL },
        { path: 'articles', method: RequestMethod.ALL },
        { path: 'articles/*', method: RequestMethod.ALL },
        { path: 'tags', method: RequestMethod.ALL },
        { path: 'tags/*', method: RequestMethod.ALL },
        { path: 'assets', method: RequestMethod.ALL },
        { path: 'assets/*', method: RequestMethod.ALL },
        { path: 'uploads/*', method: RequestMethod.ALL },
      );

    // Proxy middleware for all routes except /health
    consumer
      .apply(ProxyMiddleware)
      .exclude({ path: 'health', method: RequestMethod.GET })
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
