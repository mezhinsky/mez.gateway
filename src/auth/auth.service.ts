import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export interface JwtPayload {
  sub: string; // userId
  email?: string;
  name?: string;
}

export interface UserInfo {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  isActive: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: string;
  private readonly mezAuthUrl: string;
  private readonly internalSecret: string;

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {
    this.jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    this.mezAuthUrl = this.configService.getOrThrow<string>('MEZ_AUTH_URL');
    this.internalSecret = this.configService.getOrThrow<string>('INTERNAL_SERVICE_SECRET');
  }

  /**
   * Verify JWT access token and return payload
   */
  verifyToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        secret: this.jwtSecret,
      });
    } catch (error) {
      this.logger.debug(`Token verification failed: ${error}`);
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  /**
   * Extract Bearer token from Authorization header
   */
  extractToken(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }

  /**
   * Fetch user info from mez.auth internal endpoint
   */
  async fetchUserInfo(userId: string): Promise<UserInfo> {
    try {
      const response = await fetch(`${this.mezAuthUrl}/internal/users/${userId}`, {
        headers: {
          'x-internal-secret': this.internalSecret,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new UnauthorizedException('User not found');
        }
        throw new UnauthorizedException('Failed to fetch user info');
      }

      const user = await response.json();

      if (!user.isActive) {
        throw new UnauthorizedException('User account is disabled');
      }

      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to fetch user info: ${error}`);
      throw new UnauthorizedException('Authentication service unavailable');
    }
  }
}
