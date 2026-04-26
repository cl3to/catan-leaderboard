import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BotCreateMatchDto } from './dto/bot.dto';

@Injectable()
export class BotService {
  constructor(private prisma: PrismaService) {}

  async getLeaderboard() {
    const users = await this.prisma.user.findMany({
      where: { isActive: true, deletedAt: null },
      include: {
        profile: true,
        scoreEvents: true,
      },
    });

    const leaderboard = users.map((user) => {
      const totalPoints = user.scoreEvents.reduce((sum, event) => sum + event.pointsDelta, 0);
      const wins = user.scoreEvents.filter((event) => event.isWin).length;
      const matches = user.scoreEvents.length;

      return {
        userId: user.id.toString(),
        nickname: user.profile?.nickname || '',
        fullName: user.profile?.fullName || '',
        category: user.profile?.category || 'graduacao',
        totalPoints,
        wins,
        matches,
      };
    });

    return leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
  }

  async getPlayers() {
    const profiles = await this.prisma.playerProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            isActive: true,
            deletedAt: true,
          },
        },
      },
      where: {
        user: {
          isActive: true,
          deletedAt: null,
        },
      },
    });

    return profiles.map((profile) => ({
      userId: profile.userId.toString(),
      nickname: profile.nickname,
      fullName: profile.fullName,
      category: profile.category,
      program: profile.program,
    }));
  }

  async createMatch(botClientId: bigint, dto: BotCreateMatchDto) {
    // Check for duplicate external match ID
    const existing = await this.prisma.matchSubmission.findFirst({
      where: {
        submittedByBotId: botClientId,
        externalMatchId: dto.externalMatchId,
      },
    });

    if (existing) {
      throw new ConflictException('Match with this external ID already exists');
    }

    // Resolve players by nickname
    const playerData = [];
    for (const player of dto.players) {
      const user = await this.prisma.user.findFirst({
        where: {
          profile: {
            nickname: {
              equals: player.nickname,
              mode: 'insensitive',
            },
          },
          isActive: true,
          deletedAt: null,
        },
      });

      if (!user) {
        throw new BadRequestException(`Player with nickname "${player.nickname}" not found`);
      }

      playerData.push({
        userId: user.id,
        placement: player.placement,
        victoryPoints: player.victoryPoints,
        isWinner: player.placement === 1,
      });
    }

    const match = await this.prisma.matchSubmission.create({
      data: {
        submittedByBotId: botClientId,
        externalMatchId: dto.externalMatchId,
        matchDate: new Date(dto.matchDate),
        notes: dto.notes,
        status: 'pending',
        players: {
          create: playerData,
        },
      },
      include: {
        players: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    return {
      ...match,
      id: match.id,
      players: match.players.map((p) => ({
        ...p,
        userId: p.userId.toString(),
      })),
    };
  }

  async getMatch(id: string) {
    const match = await this.prisma.matchSubmission.findUnique({
      where: { id },
      include: {
        players: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    return {
      ...match,
      players: match.players.map((p) => ({
        ...p,
        userId: p.userId.toString(),
      })),
    };
  }

  async initializeDefaultBot(token: string) {
    const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');

    const existing = await this.prisma.botToken.findFirst({
      where: { tokenHash },
    });

    if (existing) {
      return;
    }

    const client = await this.prisma.botClient.create({
      data: {
        name: 'Default Bot',
      },
    });

    await this.prisma.botToken.create({
      data: {
        botClientId: client.id,
        tokenHash,
        scopes: ['leaderboard:read', 'players:read', 'matches:write', 'matches:read'],
      },
    });
  }
}
