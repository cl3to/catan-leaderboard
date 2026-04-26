import { IsString, IsOptional, IsIn, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Category } from '@prisma/client';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  program?: string;

  @ApiPropertyOptional({ enum: ['graduacao', 'pos'] })
  @IsOptional()
  @IsEnum(Category)
  category?: Category;
}

export class ChangeAvatarDto {
  @ApiProperty()
  @IsString()
  avatarKey: string;
}

export class ProfileResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  nickname: string;

  @ApiProperty()
  category: string;

  @ApiPropertyOptional()
  program?: string;

  @ApiPropertyOptional()
  bio?: string;

  @ApiProperty()
  avatarMode: string;

  @ApiPropertyOptional()
  avatarKey?: string;

  @ApiPropertyOptional()
  avatarUrl?: string;
}
