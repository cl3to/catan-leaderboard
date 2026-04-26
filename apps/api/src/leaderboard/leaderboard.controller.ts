import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardFilters } from './dto/leaderboard.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get leaderboard rankings' })
  @ApiQuery({ name: 'category', required: false, enum: ['graduacao', 'pos', 'all'] })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['week', 'month', 'year', 'all'] })
  @ApiResponse({ status: 200, description: 'Leaderboard entries' })
  async getLeaderboard(
    @Query('category') category?: 'graduacao' | 'pos' | 'all',
    @Query('timeRange') timeRange?: 'week' | 'month' | 'year' | 'all',
  ) {
    const filters: LeaderboardFilters = {
      category: category || 'all',
      timeRange: timeRange || 'all',
    };

    return this.leaderboardService.getLeaderboard(filters);
  }

  @Get(':userId/stats')
  @Public()
  @ApiOperation({ summary: 'Get player statistics' })
  @ApiResponse({ status: 200, description: 'Player statistics' })
  @ApiResponse({ status: 404, description: 'Player not found' })
  async getPlayerStats(@Param('userId') userId: string) {
    return this.leaderboardService.getPlayerStats(userId);
  }
}
