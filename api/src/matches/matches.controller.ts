import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MatchesService } from './matches.service';
import { CreateMatchDto, MatchResponseDto } from './dto/match.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Matches')
@Controller('matches')
export class MatchesController {
  constructor(private matchesService: MatchesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all matches' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'rejected'] })
  @ApiResponse({ status: 200, description: 'List of matches' })
  async getMatches(
    @Query('status') status?: 'pending' | 'approved' | 'rejected',
  ) {
    return this.matchesService.getMatches(status);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get match by ID' })
  @ApiResponse({ status: 200, description: 'Match details' })
  @ApiResponse({ status: 404, description: 'Match not found' })
  async getMatch(@Param('id') id: string) {
    return this.matchesService.getMatch(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a new match' })
  @ApiResponse({ status: 201, description: 'Match submitted', type: MatchResponseDto })
  async createMatch(
    @CurrentUser() user: any,
    @Body() dto: CreateMatchDto,
  ) {
    return this.matchesService.createSubmission(user.userId, dto);
  }
}
