import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto, ChangeAvatarDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(id) },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      id: user.id.toString(),
    };
  }

  async findByNickname(nickname: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        profile: {
          nickname: {
            equals: nickname,
            mode: 'insensitive',
          },
        },
      },
      include: {
        profile: true,
      },
    });

    return user
      ? {
          ...user,
          id: user.id.toString(),
        }
      : null;
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.playerProfile.findUnique({
      where: { userId: BigInt(userId) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return {
      ...profile,
      userId: profile.userId.toString(),
      user: {
        ...profile.user,
        id: profile.user.id.toString(),
      },
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const profile = await this.prisma.playerProfile.update({
      where: { userId: BigInt(userId) },
      data: {
        fullName: dto.fullName,
        nickname: dto.nickname,
        bio: dto.bio,
        program: dto.program,
        category: dto.category,
      },
    });

    return {
      ...profile,
      userId: profile.userId.toString(),
    };
  }

  async setAvatarPreset(userId: string, dto: ChangeAvatarDto) {
    const profile = await this.prisma.playerProfile.update({
      where: { userId: BigInt(userId) },
      data: {
        avatarMode: 'preset',
        avatarKey: dto.avatarKey,
      },
    });

    return {
      ...profile,
      userId: profile.userId.toString(),
    };
  }

  async setAvatarUpload(userId: string, filename: string, url: string) {
    const profile = await this.prisma.playerProfile.update({
      where: { userId: BigInt(userId) },
      data: {
        avatarMode: 'upload',
        avatarKey: filename,
        avatarUrl: url,
      },
    });

    return {
      ...profile,
      userId: profile.userId.toString(),
    };
  }

  async getAvatarPresets() {
    return [
      { key: 'wood', name: 'Wood', color: '#8B4513' },
      { key: 'brick', name: 'Brick', color: '#B22222' },
      { key: 'sheep', name: 'Sheep', color: '#90EE90' },
      { key: 'wheat', name: 'Wheat', color: '#FFD700' },
      { key: 'ore', name: 'Ore', color: '#696969' },
      { key: 'desert', name: 'Desert', color: '#F4A460' },
    ];
  }
}
