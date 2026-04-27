import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto, ChangeAvatarDto } from './dto/user.dto';
import * as bcrypt from 'bcryptjs';

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
      { key: 'wood', name: 'Madeira', category: 'recurso', icon: '🪵', color: '#8B4513' },
      { key: 'brick', name: 'Tijolo', category: 'recurso', icon: '🧱', color: '#B22222' },
      { key: 'sheep', name: 'Ovelha', category: 'recurso', icon: '🐑', color: '#90EE90' },
      { key: 'wheat', name: 'Trigo', category: 'recurso', icon: '🌾', color: '#FFD700' },
      { key: 'ore', name: 'Pedra', category: 'recurso', icon: '🪨', color: '#696969' },
      { key: 'settlement', name: 'Aldeia', category: 'construcao', icon: '🏠', color: '#4A90D9' },
      { key: 'city', name: 'Cidade', category: 'construcao', icon: '🏰', color: '#9B59B6' },
      { key: 'road', name: 'Estrada', category: 'construcao', icon: '🛤️', color: '#8B4513' },
      { key: 'desert', name: 'Deserto', category: 'especial', icon: '🏜️', color: '#F4A460' },
      { key: 'robber', name: 'Ladrao', category: 'especial', icon: '🏴', color: '#2C3E50' },
      { key: 'dice', name: 'Dado', category: 'especial', icon: '🎲', color: '#E74C3C' },
      { key: 'port', name: 'Porto', category: 'especial', icon: '⚓', color: '#3498DB' },
      { key: 'knight', name: 'Cavaleiro', category: 'especial', icon: '🛡️', color: '#95A5A6' },
      { key: 'vp', name: 'PV', category: 'especial', icon: '⭐', color: '#F1C40F' },
      { key: 'trade', name: 'Comercio', category: 'especial', icon: '⚖️', color: '#1ABC9C' },
    ];
  }

  async searchPlayers(query: string) {
    const normalized = query.trim().toLowerCase();

    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        profile: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 100,
    });

    return users
      .map((user) => ({
        userId: user.id.toString(),
        email: user.email,
        nickname: user.profile?.nickname || '',
        fullName: user.profile?.fullName || '',
        category: user.profile?.category || 'graduacao',
      }))
      .filter((player) => {
        if (!normalized) return true;
        const haystack = `${player.nickname} ${player.fullName} ${player.email}`.toLowerCase();
        return haystack.includes(normalized);
      });
  }

  async deleteProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: {
        deletedAt: new Date(),
      },
    });

    return { message: 'Account deleted successfully' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: {
        passwordHash: hashedPassword,
      },
    });

    return { message: 'Password changed successfully' };
  }
}
