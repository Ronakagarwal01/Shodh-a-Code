import { Controller, Post, Get, Param, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubmissionsService, CreateSubmissionDto } from './submissions.service';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { UserRole } from '../entities/user.entity';

@ApiTags('submissions')
@Controller()
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post('submissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit source code for a problem' })
  async create(@Body() dto: CreateSubmissionDto, @Request() req: any) {
    return this.submissionsService.create(dto, req.user);
  }

  @Get('submissions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get submission details and verdict (Private code protected from other learners)' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.submissionsService.findOne(id, req.user.id, req.user.role);
  }

  @Get('users/me/submissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user submission history with pagination' })
  async getMySubmissions(
    @Request() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.submissionsService.findByUser(req.user.id, limit, offset);
  }

  @Get('contests/:id/submissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get submissions for a contest with pagination' })
  async getContestSubmissions(
    @Param('id') contestId: string,
    @Request() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.submissionsService.findByContest(contestId, req.user.id, req.user.role, limit, offset);
  }

  @Get('judge/test-cases/:problemId')
  @ApiOperation({ summary: 'Internal judge endpoint to fetch all test cases for sandbox execution' })
  async getJudgeTestCases(@Param('problemId') problemId: string) {
    return this.submissionsService.getEvaluationTestCases(problemId);
  }

  @Post('judge/result')
  @ApiOperation({ summary: 'Internal judge callback to persist evaluation verdict' })
  async updateJudgeResult(@Body() body: any) {
    return this.submissionsService.updateResult(body.submissionId, body);
  }
}
