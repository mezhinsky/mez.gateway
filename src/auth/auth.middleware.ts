import { Injectable, NestMiddleware, UnauthorizedException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      gatewayUser?: {
        id: string;
        email: string | null;
        name: string | null;
        role: string;
      };
    }
  }
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);

  constructor(private authService: AuthService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Extract token from Authorization header
      const token = this.authService.extractToken(req.headers.authorization);

      if (!token) {
        throw new UnauthorizedException('Missing authorization token');
      }

      // Verify JWT token
      const payload = this.authService.verifyToken(token);

      // Fetch user info from mem.backend
      const userInfo = await this.authService.fetchUserInfo(payload.sub);

      // Attach user to request for logging/debugging
      req.gatewayUser = {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        role: userInfo.role,
      };

      // Set headers for upstream services
      req.headers['x-user-id'] = userInfo.id;
      req.headers['x-user-role'] = userInfo.role;
      req.headers['x-user-email'] = userInfo.email || '';
      req.headers['x-user-name'] = userInfo.name || '';

      this.logger.debug(`Authenticated user ${userInfo.id} (${userInfo.role})`);

      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        return res.status(401).json({
          statusCode: 401,
          message: error.message,
          error: 'Unauthorized',
        });
      }

      this.logger.error(`Auth middleware error: ${error}`);
      return res.status(500).json({
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      });
    }
  }
}
