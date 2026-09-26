import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProblemEntity, ProblemDifficulty } from '../entities/problem.entity';
import { TestCaseEntity } from '../entities/test-case.entity';
import { UserRole } from '../entities/user.entity';

@Injectable()
export class ProblemsService {
  constructor(
    @InjectRepository(ProblemEntity)
    private readonly problemRepo: Repository<ProblemEntity>,
    @InjectRepository(TestCaseEntity)
    private readonly testCaseRepo: Repository<TestCaseEntity>,
  ) {}

  async findAll(contestId?: string) {
    const where = contestId ? { contestId } : {};
    const problems = await this.problemRepo.find({ where, order: { createdAt: 'ASC' } });
    return problems.map((p) => this.formatProblemOverview(p));
  }

  async findOne(id: string, userRole: UserRole = UserRole.LEARNER) {
    const problem = await this.problemRepo.findOne({ where: { id } });
    if (!problem) {
      throw new NotFoundException(`Problem ${id} not found`);
    }

    // Fetch test cases
    const testCases = await this.testCaseRepo.find({
      where: { problemId: id },
      order: { orderIndex: 'ASC' },
    });

    // SECURITY: Filter out hidden test cases for learners!
    const sanitizedTestCases = testCases
      .filter((tc) => !tc.isHidden || userRole === UserRole.INSTRUCTOR || userRole === UserRole.ADMIN)
      .map((tc) => ({
        id: tc.id,
        orderIndex: tc.orderIndex,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: tc.isHidden,
        explanation: tc.explanation,
      }));

    return {
      id: problem.id,
      slug: problem.slug,
      title: problem.title,
      statement: problem.statement,
      difficulty: problem.difficulty,
      constraints: problem.constraints || [],
      examples: JSON.parse(problem.examplesJson || '[]'),
      tags: problem.tags || [],
      contestId: problem.contestId,
      conceptId: problem.conceptId,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitMb: problem.memoryLimitMb,
      points: problem.points,
      starterCode: JSON.parse(problem.starterCodeJson || '{}'),
      sampleTestCases: sanitizedTestCases,
      createdAt: problem.createdAt,
      updatedAt: problem.updatedAt,
    };
  }

  /**
   * Internal method invoked exclusively by the Judge Worker.
   * Retrieves all test cases including hidden ones for sandboxed evaluation.
   */
  async getEvaluationTestCases(problemId: string): Promise<TestCaseEntity[]> {
    return this.testCaseRepo.find({
      where: { problemId },
      order: { orderIndex: 'ASC' },
    });
  }

  private formatProblemOverview(p: ProblemEntity) {
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      difficulty: p.difficulty,
      tags: p.tags || [],
      contestId: p.contestId,
      conceptId: p.conceptId,
      points: p.points,
      timeLimitMs: p.timeLimitMs,
    };
  }
}
