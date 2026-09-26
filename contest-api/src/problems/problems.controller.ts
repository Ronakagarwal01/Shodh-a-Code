import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProblemsService } from './problems.service';
import { UserRole } from '../entities/user.entity';

@ApiTags('problems')
@Controller('problems')
export class ProblemsController {
  constructor(private readonly problemsService: ProblemsService) {}

  @Get()
  @ApiOperation({ summary: 'List all problems or filter by contest' })
  async findAll(@Query('contestId') contestId?: string) {
    return this.problemsService.findAll(contestId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get problem details with sanitized sample test cases' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    const userRole = req.user?.role || UserRole.LEARNER;
    return this.problemsService.findOne(id, userRole);
  }
}
