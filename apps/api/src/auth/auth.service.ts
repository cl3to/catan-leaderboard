import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email },
          { profile: { nickname: dto.nickname } },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email or nickname already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: 'player',
        profile: {
          create: {
            fullName: dto.fullName,
            nickname: dto.nickname,
            category: dto.category,
            program: dto.program,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    const token = this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      accessToken: token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.identifier },
          { profile: { nickname: dto.identifier } },
        ],
      },
      include: {
        profile: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      accessToken: token,
    };
  }

  private generateToken(user: any): string {
    const payload = {
      sub: user.id.toString(),
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
