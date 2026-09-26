import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';

@ApiTags('leaderboard')
@Controller()
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('contests/:id/leaderboard')
  @ApiOperation({ summary: 'Get live contest leaderboard with pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getContestLeaderboard(
    @Param('id') contestId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.leaderboardService.getLeaderboard(contestId, limit, offset);
  }

  @Get('leaderboard/:contestId')
  @ApiOperation({ summary: 'Get live leaderboard by contest ID with pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getLeaderboard(
    @Param('contestId') contestId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.leaderboardService.getLeaderboard(contestId, limit, offset);
  }
}
