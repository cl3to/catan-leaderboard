import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMatchDto } from './dto/match.dto';
import { MatchStatus } from '@prisma/client';

@Injectable()
export class MatchesService {
  constructor(private prisma: PrismaService) {}

  async getMatches(status?: MatchStatus) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const matches = await this.prisma.matchSubmission.findMany({
      where,
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
        submittedBy: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return matches.map((match) => ({
      ...match,
      id: match.id,
      submittedByUserId: match.submittedByUserId?.toString(),
      reviewedByUserId: match.reviewedByUserId?.toString(),
      players: match.players.map((player) => ({
        ...player,
        userId: player.userId.toString(),
      })),
    }));
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
        submittedBy: {
          include: {
            profile: true,
          },
        },
        reviewedBy: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    return {
      ...match,
      submittedByUserId: match.submittedByUserId?.toString(),
      reviewedByUserId: match.reviewedByUserId?.toString(),
      players: match.players.map((player) => ({
        ...player,
        userId: player.userId.toString(),
      })),
    };
  }

  async createSubmission(userId: string, dto: CreateMatchDto) {
    // Validate all users exist
    const userIds = dto.players.map((p) => BigInt(p.userId));
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
    });

    if (users.length !== userIds.length) {
      throw new BadRequestException('One or more players not found');
    }

    const overLimitPlayers = dto.players.filter((p) => p.victoryPoints > 10);
    if (overLimitPlayers.length > 0) {
      throw new BadRequestException('No jogador pode ter mais de 10 pontos');
    }

    const winners = dto.players.filter((p) => p.victoryPoints === 10);
    if (winners.length !== 1) {
      throw new BadRequestException('A partida deve ter exatamente um jogador com 10 pontos');
    }

    const match = await this.prisma.matchSubmission.create({
      data: {
        submittedByUserId: BigInt(userId),
        matchDate: new Date(dto.matchDate),
        notes: dto.notes,
        status: 'pending',
        players: {
          create: dto.players.map((player) => ({
            userId: BigInt(player.userId),
            placement: player.placement,
            victoryPoints: player.victoryPoints,
            isWinner: player.victoryPoints === 10,
          })),
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
      players: match.players.map((player) => ({
        ...player,
        userId: player.userId.toString(),
      })),
    };
  }
}
