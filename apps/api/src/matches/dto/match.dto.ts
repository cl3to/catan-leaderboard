import { IsString, IsOptional, IsDateString, IsArray, ValidateNested, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class MatchPlayerDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(6)
  placement: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(30)
  victoryPoints: number;
}

export class CreateMatchDto {
  @ApiProperty()
  @IsDateString()
  matchDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [MatchPlayerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MatchPlayerDto)
  players: MatchPlayerDto[];
}

export class MatchResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  matchDate: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdAt: string;
}
