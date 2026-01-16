import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProxyMiddleware } from './proxy.middleware';

@Module({
  imports: [ConfigModule],
  providers: [ProxyMiddleware],
  exports: [ProxyMiddleware],
})
export class ProxyModule {}
