import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeaderboardFilters } from './dto/leaderboard.dto';

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  async getLeaderboard(filters: LeaderboardFilters) {
    const where: any = {
      deletedAt: null,
    };

    if (filters.category && filters.category !== 'all') {
      where.profile = {
        category: filters.category,
      };
    }

    // Time range filter for matches
    let matchDateFilter = {};
    if (filters.timeRange && filters.timeRange !== 'all') {
      const now = new Date();
      const ranges = {
        week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
      };

      if (filters.timeRange in ranges) {
        matchDateFilter = {
          createdAt: {
            gte: ranges[filters.timeRange],
          },
        };
      }
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        profile: true,
        scoreEvents: {
          where: {
            ...matchDateFilter,
          },
        },
        _count: {
          select: {
            scoreEvents: {
              where: {
                ...matchDateFilter,
              },
            },
          },
        },
      },
    });

    const leaderboard = users.map((user) => {
      const totalPoints = user.scoreEvents.reduce((sum, event) => sum + event.pointsDelta, 0);
      const wins = user.scoreEvents.filter((event) => event.isWin).length;
      const matches = user._count.scoreEvents;
      const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;

      return {
        userId: user.id.toString(),
        nickname: user.profile?.nickname || '',
        fullName: user.profile?.fullName || '',
        category: user.profile?.category || 'graduacao',
        avatarUrl: user.profile?.avatarUrl || null,
        avatarKey: user.profile?.avatarKey || null,
        avatarMode: user.profile?.avatarMode || 'preset',
        totalPoints,
        wins,
        matches,
        winRate,
      };
    });

    const sortBy = filters.sortBy || 'wins';
    leaderboard.sort((a, b) => {
      switch (sortBy) {
        case 'points':
          return b.totalPoints - a.totalPoints;
        case 'winRate':
          return b.winRate - a.winRate;
        case 'matches':
          return b.matches - a.matches;
        default:
          return b.wins - a.wins;
      }
    });

    // Add rank
    return leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  }

  async getPlayerStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      include: {
        profile: true,
        scoreEvents: true,
        matchPlayers: {
          include: {
            submission: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const totalPoints = user.scoreEvents.reduce((sum, event) => sum + event.pointsDelta, 0);
    const wins = user.scoreEvents.filter((event) => event.isWin).length;
    const matches = user.matchPlayers.length;
    const avgPlacement =
      matches > 0
        ? user.matchPlayers.reduce((sum, mp) => sum + mp.placement, 0) / matches
        : 0;

    return {
      userId: user.id.toString(),
      nickname: user.profile?.nickname || '',
      fullName: user.profile?.fullName || '',
      category: user.profile?.category || 'graduacao',
      totalPoints,
      wins,
      matches,
      winRate: matches > 0 ? Math.round((wins / matches) * 100) : 0,
      avgPlacement: Math.round(avgPlacement * 10) / 10,
    };
  }
}
