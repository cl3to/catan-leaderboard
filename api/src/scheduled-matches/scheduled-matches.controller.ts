import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ScheduledMatchesService } from './scheduled-matches.service';
import { CreateScheduledMatchDto, ScheduledMatchResponseDto } from './dto/scheduled-match.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Scheduled Matches')
@Controller('scheduled-matches')
export class ScheduledMatchesController {
  constructor(private scheduledMatchesService: ScheduledMatchesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all scheduled matches' })
  @ApiResponse({ status: 200, description: 'List of scheduled matches', type: [ScheduledMatchResponseDto] })
  async getScheduledMatches() {
    return this.scheduledMatchesService.getScheduledMatches();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get scheduled match by ID' })
  @ApiResponse({ status: 200, description: 'Match details' })
  @ApiResponse({ status: 404, description: 'Match not found' })
  async getScheduledMatch(@Param('id') id: string) {
    return this.scheduledMatchesService.getScheduledMatch(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a scheduled match' })
  @ApiResponse({ status: 201, description: 'Match created', type: ScheduledMatchResponseDto })
  async createMatch(
    @CurrentUser() user: any,
    @Body() dto: CreateScheduledMatchDto,
  ) {
    return this.scheduledMatchesService.createMatch(user.userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a scheduled match' })
  @ApiResponse({ status: 200, description: 'Match cancelled' })
  async deleteMatch(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.scheduledMatchesService.deleteMatch(id, user.userId);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join a scheduled match' })
  @ApiResponse({ status: 200, description: 'Joined match', type: ScheduledMatchResponseDto })
  async joinMatch(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.scheduledMatchesService.joinMatch(id, user.userId);
  }

  @Delete(':id/leave')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Leave a scheduled match' })
  @ApiResponse({ status: 200, description: 'Left match', type: ScheduledMatchResponseDto })
  async leaveMatch(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.scheduledMatchesService.leaveMatch(id, user.userId);
  }
}
