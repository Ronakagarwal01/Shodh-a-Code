import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IncidentsService } from './incidents.service';

@ApiTags('incidents & analytics')
@Controller()
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get('incidents')
  @ApiOperation({ summary: 'List contest infrastructure incidents' })
  async findAll(@Query('contestId') contestId?: string) {
    return this.incidentsService.findAll(contestId);
  }

  @Get('incidents/:id')
  @ApiOperation({ summary: 'Get details of an incident including timeline' })
  async findOne(@Param('id') id: string) {
    return this.incidentsService.findOne(id);
  }

  @Get('analytics/contest/:id')
  @ApiOperation({ summary: 'Get aggregated analytics and verdict breakdown for a contest' })
  async getContestAnalytics(@Param('id') contestId: string) {
    return this.incidentsService.getContestAnalytics(contestId);
  }
}
