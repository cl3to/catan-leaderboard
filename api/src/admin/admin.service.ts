import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ReviewSubmissionDto,
  UpdateUserDto,
  DeleteUserDto,
  DeleteMatchDto,
  UpdateMatchDto,
  PaginationDto,
} from './dto/admin.dto';
import { MatchStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // Submissions
  async getPendingSubmissions(pagination: PaginationDto) {
    const { page = 1, perPage = 10 } = pagination;
    const skip = (page - 1) * perPage;

    const [submissions, total] = await Promise.all([
      this.prisma.matchSubmission.findMany({
        where: { status: 'pending', deletedAt: null },
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
      }),
      this.prisma.matchSubmission.count({
        where: { status: 'pending', deletedAt: null },
      }),
    ]);

    return {
      data: submissions.map((s) => this.formatSubmission(s)),
      meta: { total, page, perPage },
    };
  }

  async approveSubmission(submissionId: string, adminId: string, dto: ReviewSubmissionDto) {
    const submission = await this.prisma.matchSubmission.findUnique({
      where: { id: submissionId },
      include: { players: true },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.status !== 'pending') {
      throw new NotFoundException('Submission already reviewed');
    }

    // Calculate points and create score events
    const scoreEvents = submission.players.map((player) => {
      const points = this.calculatePoints(player.placement, player.victoryPoints);
      return {
        submissionId: submission.id,
        userId: player.userId,
        pointsDelta: points,
        isWin: player.placement === 1,
      };
    });

    const updated = await this.prisma.$transaction([
      this.prisma.matchSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'approved',
          reviewedByUserId: BigInt(adminId),
          reviewedAt: new Date(),
          rejectReason: dto.reason,
        },
      }),
      this.prisma.scoreEvent.createMany({
        data: scoreEvents,
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: BigInt(adminId),
          action: 'MATCH_APPROVE',
          targetType: 'match_submission',
          targetId: submissionId,
          meta: { reason: dto.reason },
        },
      }),
    ]);

    return updated[0];
  }

  async rejectSubmission(submissionId: string, adminId: string, dto: ReviewSubmissionDto) {
    const submission = await this.prisma.matchSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.status !== 'pending') {
      throw new NotFoundException('Submission already reviewed');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.matchSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'rejected',
          reviewedByUserId: BigInt(adminId),
          reviewedAt: new Date(),
          rejectReason: dto.reason,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: BigInt(adminId),
          action: 'MATCH_REJECT',
          targetType: 'match_submission',
          targetId: submissionId,
          meta: { reason: dto.reason },
        },
      }),
    ]);

    return updated;
  }

  // Users
  async getUsers(pagination: PaginationDto) {
    const { page = 1, perPage = 10 } = pagination;
    const skip = (page - 1) * perPage;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        include: { profile: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users.map((u) => this.formatUser(u)),
      meta: { total, page, perPage },
    };
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.formatUser(user);
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: {
        role: dto.role,
        isActive: dto.isActive,
        profile: {
          update: {
            fullName: dto.fullName,
            nickname: dto.nickname,
            category: dto.category,
            program: dto.program,
            bio: dto.bio,
          },
        },
      },
      include: { profile: true },
    });

    return this.formatUser(user);
  }

  async deleteUser(userId: string, adminId: string, dto: DeleteUserDto) {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: BigInt(userId) },
        data: {
          deletedAt: new Date(),
          deletedByUserId: BigInt(adminId),
          deleteReason: dto.reason,
          isActive: false,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: BigInt(adminId),
          action: 'USER_DELETE',
          targetType: 'user',
          targetId: userId,
          meta: { reason: dto.reason },
        },
      }),
    ]);

    return { success: true };
  }

  // Matches
  async updateMatch(matchId: string, dto: UpdateMatchDto) {
    const match = await this.prisma.matchSubmission.update({
      where: { id: matchId },
      data: {
        notes: dto.notes,
        matchDate: dto.matchDate ? new Date(dto.matchDate) : undefined,
      },
      include: {
        players: { include: { user: { include: { profile: true } } } },
        submittedBy: { include: { profile: true } },
      },
    });

    return this.formatSubmission(match);
  }

  async deleteMatch(matchId: string, adminId: string, dto: DeleteMatchDto) {
    await this.prisma.$transaction([
      this.prisma.matchSubmission.update({
        where: { id: matchId },
        data: {
          deletedAt: new Date(),
          deletedByUserId: BigInt(adminId),
          deleteReason: dto.reason,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: BigInt(adminId),
          action: 'MATCH_DELETE',
          targetType: 'match_submission',
          targetId: matchId,
          meta: { reason: dto.reason },
        },
      }),
    ]);

    return { success: true };
  }

  // Helpers
  private calculatePoints(placement: number, victoryPoints: number): number {
    // Point calculation logic
    const placementPoints = { 1: 10, 2: 6, 3: 4, 4: 2, 5: 1, 6: 0 };
    const basePoints = placementPoints[placement] || 0;
    const vpBonus = Math.floor(victoryPoints / 10);
    return basePoints + vpBonus;
  }

  private formatUser(user: any) {
    const profile = user.profile ?? {};
    return {
      ...user,
      id: user.id.toString(),
      nickname: profile.nickname || '',
      fullName: profile.fullName || '',
      category: profile.category || 'graduacao',
      avatarMode: profile.avatarMode || 'preset',
      avatarKey: profile.avatarKey || null,
      avatarUrl: profile.avatarUrl || null,
      profile: user.profile
        ? {
            ...user.profile,
            userId: user.profile.userId.toString(),
          }
        : null,
    };
  }

  private formatSubmission(submission: any) {
    return {
      ...submission,
      submittedByUserId: submission.submittedByUserId?.toString(),
      reviewedByUserId: submission.reviewedByUserId?.toString(),
      submittedBy: submission.submittedBy
        ? {
            ...submission.submittedBy,
            id: submission.submittedBy.id.toString(),
          }
        : null,
      players: submission.players?.map((p: any) => ({
        ...p,
        userId: p.userId.toString(),
        user: p.user
          ? {
              ...p.user,
              id: p.user.id.toString(),
            }
          : null,
      })),
    };
  }
}
