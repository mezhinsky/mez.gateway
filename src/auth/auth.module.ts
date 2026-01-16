import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthMiddleware } from './auth.middleware';

@Module({
  imports: [ConfigModule, JwtModule.register({})],
  providers: [AuthService, AuthMiddleware],
  exports: [AuthService, AuthMiddleware],
})
export class AuthModule {}
