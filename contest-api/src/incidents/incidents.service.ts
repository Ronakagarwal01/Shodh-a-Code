import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContestIncidentEntity } from '../entities/incident.entity';
import { SubmissionEntity, SubmissionVerdict } from '../entities/submission.entity';

@Injectable()
export class IncidentsService {
  constructor(
    @InjectRepository(ContestIncidentEntity)
    private readonly incidentRepo: Repository<ContestIncidentEntity>,
    @InjectRepository(SubmissionEntity)
    private readonly submissionRepo: Repository<SubmissionEntity>,
  ) {}

  async findAll(contestId?: string) {
    const where = contestId ? { contestId } : {};
    return this.incidentRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const incident = await this.incidentRepo.findOne({ where: { id } });
    if (!incident) {
      throw new NotFoundException(`Incident ${id} not found`);
    }
    return {
      ...incident,
      timeline: JSON.parse(incident.timelineJson || '[]'),
    };
  }

  async getContestAnalytics(contestId: string) {
    const subs = await this.submissionRepo.find({ where: { contestId } });
    const incidents = await this.incidentRepo.find({ where: { contestId } });

    const verdictDistribution: Record<string, number> = {
      [SubmissionVerdict.ACCEPTED]: 0,
      [SubmissionVerdict.WRONG_ANSWER]: 0,
      [SubmissionVerdict.RUNTIME_ERROR]: 0,
      [SubmissionVerdict.TIME_LIMIT_EXCEEDED]: 0,
      [SubmissionVerdict.MEMORY_LIMIT_EXCEEDED]: 0,
      [SubmissionVerdict.COMPILATION_ERROR]: 0,
      [SubmissionVerdict.JUDGE_ERROR]: 0,
    };

    const uniqueUsers = new Set<string>();

    for (const s of subs) {
      uniqueUsers.add(s.userId);
      verdictDistribution[s.verdict] = (verdictDistribution[s.verdict] || 0) + 1;
    }

    return {
      contestId,
      totalSubmissions: subs.length,
      activeParticipants: uniqueUsers.size,
      verdictDistribution,
      incidentsCount: incidents.length,
      incidents: incidents.map((inc) => ({
        id: inc.id,
        title: inc.title,
        status: inc.status,
        severity: inc.severity,
        startTime: inc.startTime,
        endTime: inc.endTime,
        summary: inc.summary,
      })),
      timestamp: new Date().toISOString(),
    };
  }
}
