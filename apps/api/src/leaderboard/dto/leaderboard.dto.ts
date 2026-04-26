import { IsOptional, IsIn, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class LeaderboardFilters {
  @ApiPropertyOptional({ enum: ['graduacao', 'pos', 'all'] })
  @IsOptional()
  @IsIn(['graduacao', 'pos', 'all'])
  category?: 'graduacao' | 'pos' | 'all';

  @ApiPropertyOptional({ enum: ['week', 'month', 'year', 'all'] })
  @IsOptional()
  @IsIn(['week', 'month', 'year', 'all'])
  timeRange?: 'week' | 'month' | 'year' | 'all';

  @ApiPropertyOptional({ enum: ['wins', 'points', 'winRate', 'matches'] })
  @IsOptional()
  @IsIn(['wins', 'points', 'winRate', 'matches'])
  sortBy?: 'wins' | 'points' | 'winRate' | 'matches';
}

export class LeaderboardEntryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timeRange?: string;
}
