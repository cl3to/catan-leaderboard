import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_BOT_KEY } from '../decorators/bot-token.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class BotTokenGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isBotRoute = this.reflector.getAllAndOverride<boolean>(IS_BOT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isBotRoute) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bot token');
    }

    const token = authHeader.substring(7);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const botToken = await this.prisma.botToken.findFirst({
      where: {
        tokenHash,
        isActive: true,
      },
      include: {
        botClient: true,
      },
    });

    if (!botToken) {
      throw new UnauthorizedException('Invalid bot token');
    }

    // Update last used
    await this.prisma.botToken.update({
      where: { id: botToken.id },
      data: { lastUsedAt: new Date() },
    });

    request.bot = {
      botClientId: botToken.botClientId,
      botClientName: botToken.botClient.name,
      scopes: botToken.scopes,
    };

    return true;
  }
}
