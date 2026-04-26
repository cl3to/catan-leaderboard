import { IsString, IsOptional, IsArray, ValidateNested, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class BotMatchPlayerDto {
  @ApiProperty()
  @IsString()
  nickname: string;

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

export class BotCreateMatchDto {
  @ApiProperty()
  @IsString()
  externalMatchId: string;

  @ApiProperty()
  @IsDateString()
  matchDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [BotMatchPlayerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BotMatchPlayerDto)
  players: BotMatchPlayerDto[];
}

export class BotResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  externalMatchId: string;

  @ApiProperty()
  matchDate: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdAt: string;
}
