import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContestEntity, ContestStatus } from '../entities/contest.entity';
import { ProblemsService } from '../problems/problems.service';
import { UserRole } from '../entities/user.entity';

@Injectable()
export class ContestsService {
  constructor(
    @InjectRepository(ContestEntity)
    private readonly contestRepo: Repository<ContestEntity>,
    private readonly problemsService: ProblemsService,
  ) {}

  async findAll() {
    return this.contestRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(idOrSlug: string) {
    const contest = await this.contestRepo.findOne({
      where: [{ id: idOrSlug }, { slug: idOrSlug }],
    });
    if (!contest) {
      throw new NotFoundException(`Contest ${idOrSlug} not found`);
    }
    return contest;
  }

  async getProblems(contestId: string, userRole: UserRole = UserRole.LEARNER) {
    const contest = await this.findOne(contestId);
    return this.problemsService.findAll(contest.id);
  }

  async joinContest(contestId: string, userId: string) {
    const contest = await this.findOne(contestId);
    return {
      success: true,
      message: `Successfully joined contest ${contest.title}`,
      contestId: contest.id,
      userId,
    };
  }
}
