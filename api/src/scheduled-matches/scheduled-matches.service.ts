import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduledMatchDto } from './dto/scheduled-match.dto';
import { LeaderboardGateway } from '../gateway/leaderboard.gateway';

@Injectable()
export class ScheduledMatchesService {
  constructor(
    private prisma: PrismaService,
    private gateway: LeaderboardGateway,
  ) {}

  async getScheduledMatches() {
    const matches = await this.prisma.scheduledMatch.findMany({
      where: { status: 'open' },
      include: {
        creator: {
          include: {
            profile: true,
          },
        },
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
      orderBy: {
        scheduledDate: 'asc',
      },
    });

    return matches.map((match) => this.formatMatch(match));
  }

  async getScheduledMatch(id: string) {
    const match = await this.prisma.scheduledMatch.findUnique({
      where: { id },
      include: {
        creator: {
          include: {
            profile: true,
          },
        },
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
      throw new NotFoundException('Scheduled match not found');
    }

    return this.formatMatch(match);
  }

  async createMatch(userId: string, dto: CreateScheduledMatchDto) {
    const match = await this.prisma.scheduledMatch.create({
      data: {
        creatorId: BigInt(userId),
        title: dto.title,
        scheduledDate: new Date(dto.scheduledDate),
        minPlayers: dto.minPlayers || 3,
        maxPlayers: dto.maxPlayers || 4,
        status: 'open',
      },
      include: {
        creator: {
          include: {
            profile: true,
          },
        },
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

    this.gateway.emitScheduledMatchCreated(match.id);

    return this.formatMatch(match);
  }

  async deleteMatch(id: string, userId: string) {
    const match = await this.prisma.scheduledMatch.findUnique({
      where: { id },
    });

    if (!match) {
      throw new NotFoundException('Scheduled match not found');
    }

    if (match.creatorId.toString() !== userId) {
      throw new BadRequestException('Only the creator can delete this match');
    }

    await this.prisma.scheduledMatch.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    this.gateway.emitScheduledMatchCancelled(id);

    return { success: true };
  }

  async joinMatch(id: string, userId: string) {
    const match = await this.prisma.scheduledMatch.findUnique({
      where: { id },
      include: {
        players: true,
      },
    });

    if (!match) {
      throw new NotFoundException('Scheduled match not found');
    }

    if (match.status !== 'open') {
      throw new BadRequestException('Match is not open for joining');
    }

    const alreadyJoined = match.players.some(
      (p) => p.userId.toString() === userId,
    );

    if (alreadyJoined) {
      throw new ConflictException('Already joined this match');
    }

    if (match.players.length >= match.maxPlayers) {
      throw new BadRequestException('Match is full');
    }

    await this.prisma.scheduledMatchPlayer.create({
      data: {
        matchId: id,
        userId: BigInt(userId),
      },
    });

    const updatedMatch = await this.prisma.scheduledMatch.findUnique({
      where: { id },
      include: {
        creator: { include: { profile: true } },
        players: { include: { user: { include: { profile: true } } } },
      },
    });

    this.gateway.emitScheduledMatchUpdated(id);

    return this.formatMatch(updatedMatch);
  }

  async leaveMatch(id: string, userId: string) {
    const match = await this.prisma.scheduledMatch.findUnique({
      where: { id },
    });

    if (!match) {
      throw new NotFoundException('Scheduled match not found');
    }

    const player = await this.prisma.scheduledMatchPlayer.findFirst({
      where: {
        matchId: id,
        userId: BigInt(userId),
      },
    });

    if (!player) {
      throw new NotFoundException('Not joined in this match');
    }

    await this.prisma.scheduledMatchPlayer.delete({
      where: { id: player.id },
    });

    const updatedMatch = await this.prisma.scheduledMatch.findUnique({
      where: { id },
      include: {
        creator: { include: { profile: true } },
        players: { include: { user: { include: { profile: true } } } },
      },
    });

    this.gateway.emitScheduledMatchUpdated(id);

    return this.formatMatch(updatedMatch);
  }

  private formatMatch(match: any) {
    return {
      id: match.id,
      title: match.title,
      scheduledDate: match.scheduledDate,
      minPlayers: match.minPlayers,
      maxPlayers: match.maxPlayers,
      status: match.status,
      currentPlayers: match.players.length,
      creator: match.creator
        ? {
            userId: match.creator.id.toString(),
            nickname: match.creator.profile?.nickname || '',
          }
        : null,
      players: match.players.map((p: any) => ({
        userId: p.userId.toString(),
        nickname: p.user?.profile?.nickname || '',
        joinedAt: p.joinedAt,
      })),
    };
  }
}
