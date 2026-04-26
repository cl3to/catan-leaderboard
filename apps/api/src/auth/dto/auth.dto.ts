import { IsEmail, IsString, MinLength, IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty()
  @IsString()
  nickname: string;

  @ApiProperty({ enum: ['graduacao', 'pos'] })
  @IsIn(['graduacao', 'pos'])
  category: 'graduacao' | 'pos';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  program?: string;
}

export class LoginDto {
  @ApiProperty()
  @IsString()
  identifier: string;

  @ApiProperty()
  @IsString()
  password: string;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  user: {
    id: string;
    email: string;
    role: string;
    profile: {
      nickname: string;
      fullName: string;
      category: string;
    };
  };
}
