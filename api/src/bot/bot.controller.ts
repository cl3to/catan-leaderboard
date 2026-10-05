import { Controller, Get, Post, Body, Param, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { BotService } from './bot.service';
import { BotCreateMatchDto, BotResponseDto } from './dto/bot.dto';
import { BotToken } from '../common/decorators/bot-token.decorator';
import { BotTokenGuard } from '../common/guards/bot-token.guard';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Bot')
@Controller('bot')
@UseGuards(BotTokenGuard)
@BotToken()
export class BotController {
  constructor(private botService: BotService) {}

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get leaderboard (bot)' })
  @ApiHeader({ name: 'Authorization', description: 'Bearer <bot_token>' })
  @ApiResponse({ status: 200, description: 'Leaderboard data' })
  async getLeaderboard() {
    return this.botService.getLeaderboard();
  }

  @Get('players')
  @ApiOperation({ summary: 'Get all players (bot)' })
  @ApiHeader({ name: 'Authorization', description: 'Bearer <bot_token>' })
  @ApiResponse({ status: 200, description: 'List of players' })
  async getPlayers() {
    return this.botService.getPlayers();
  }

  @Post('matches')
  @ApiOperation({ summary: 'Submit match via bot' })
  @ApiHeader({ name: 'Authorization', description: 'Bearer <bot_token>' })
  @ApiResponse({ status: 201, description: 'Match submitted', type: BotResponseDto })
  async createMatch(
    @Headers('x-bot-client-id') botClientId: string,
    @Body() dto: BotCreateMatchDto,
  ) {
    return this.botService.createMatch(BigInt(botClientId), dto);
  }

  @Get('matches/:id')
  @ApiOperation({ summary: 'Get match by ID (bot)' })
  @ApiHeader({ name: 'Authorization', description: 'Bearer <bot_token>' })
  @ApiResponse({ status: 200, description: 'Match details' })
  async getMatch(@Param('id') id: string) {
    return this.botService.getMatch(id);
  }
}
