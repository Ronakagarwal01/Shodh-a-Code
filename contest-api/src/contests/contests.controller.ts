import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContestsService } from './contests.service';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { UserRole } from '../entities/user.entity';

@ApiTags('contests')
@Controller('contests')
export class ContestsController {
  constructor(private readonly contestsService: ContestsService) {}

  @Get()
  @ApiOperation({ summary: 'List all contests' })
  async findAll() {
    return this.contestsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contest details' })
  async findOne(@Param('id') id: string) {
    return this.contestsService.findOne(id);
  }

  @Get(':id/problems')
  @ApiOperation({ summary: 'Get problems for a contest' })
  async getProblems(@Param('id') id: string, @Request() req: any) {
    const userRole = req.user?.role || UserRole.LEARNER;
    return this.contestsService.getProblems(id, userRole);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join a contest' })
  async join(@Param('id') id: string, @Request() req: any) {
    return this.contestsService.joinContest(id, req.user.id);
  }
}
