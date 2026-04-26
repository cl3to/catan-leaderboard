import { IsString, IsOptional, IsDateString, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateScheduledMatchDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty()
  @IsDateString()
  scheduledDate: string;

  @ApiPropertyOptional({ default: 3 })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(6)
  minPlayers?: number = 3;

  @ApiPropertyOptional({ default: 4 })
  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(6)
  maxPlayers?: number = 4;
}

export class ScheduledMatchResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  scheduledDate: string;

  @ApiProperty()
  minPlayers: number;

  @ApiProperty()
  maxPlayers: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  currentPlayers: number;

  @ApiProperty()
  creator: {
    userId: string;
    nickname: string;
  };
}
