import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';

@ApiTags('leaderboard')
@Controller()
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('contests/:id/leaderboard')
  @ApiOperation({ summary: 'Get live contest leaderboard' })
  async getContestLeaderboard(@Param('id') contestId: string) {
    return this.leaderboardService.getLeaderboard(contestId);
  }

  @Get('leaderboard/:contestId')
  @ApiOperation({ summary: 'Get live leaderboard by contest ID' })
  async getLeaderboard(@Param('contestId') contestId: string) {
    return this.leaderboardService.getLeaderboard(contestId);
  }
}
