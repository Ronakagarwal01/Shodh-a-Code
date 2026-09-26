import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { SubmissionEntity, SubmissionVerdict } from '../entities/submission.entity';
import { UserEntity, UserRole } from '../entities/user.entity';
import { ProblemsService } from '../problems/problems.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { Queue } from 'bullmq';
import { SandboxEvaluator } from './sandbox-evaluator';

export interface CreateSubmissionDto {
  problemId: string;
  contestId?: string;
  sourceCode: string;
  language?: string;
}

@Injectable()
export class SubmissionsService {
  private queue: Queue | null = null;

  constructor(
    @InjectRepository(SubmissionEntity)
    private readonly submissionRepo: Repository<SubmissionEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly problemsService: ProblemsService,
    private readonly leaderboardService: LeaderboardService,
  ) {
    this.initQueue();
  }

  private initQueue() {
    // Only initialize queue when Redis is explicitly configured
    if (process.env.REDIS_ENABLED !== 'true' && !process.env.REDIS_HOST) {
      this.queue = null;
      return;
    }
    try {
      const redisHost = process.env.REDIS_HOST || 'localhost';
      const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
      this.queue = new Queue('judge-submissions', {
        connection: { host: redisHost, port: redisPort, maxRetriesPerRequest: 1, connectTimeout: 1000 },
      });
      // Suppress unhandled connection errors when Redis is offline
      this.queue.on('error', () => {});
    } catch (e) {
      this.queue = null;
    }
  }

  async create(dto: CreateSubmissionDto, user: { id: string; role: UserRole; username: string; displayName: string }) {
    // Validate problem exists
    const problem = await this.problemsService.findOne(dto.problemId, user.role);

    const submissionId = `sub-${uuidv4().substring(0, 8)}`;
    const submission = this.submissionRepo.create({
      id: submissionId,
      userId: user.id,
      contestId: dto.contestId || problem.contestId || null,
      problemId: dto.problemId,
      sourceCode: dto.sourceCode,
      language: dto.language || 'python',
      verdict: SubmissionVerdict.QUEUED,
      status: 'PENDING',
      executionTimeMs: 0,
      memoryUsageKb: 0,
      score: 0,
      judgeVersion: 'v1.4.1',
      testResultsJson: '[]',
    });

    await this.submissionRepo.save(submission);

    // Push to Redis Queue with retry configuration
    let enqueuedToRedis = false;
    if (this.queue) {
      try {
        await this.queue.add(
          'execute-submission',
          {
            submissionId: submission.id,
            problemId: submission.problemId,
            sourceCode: submission.sourceCode,
            language: submission.language,
            timeLimitMs: problem.timeLimitMs,
            memoryLimitMb: problem.memoryLimitMb,
            contestId: submission.contestId,
            userId: submission.userId,
            username: user.username,
            displayName: user.displayName,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
          },
        );
        enqueuedToRedis = true;
      } catch (err) {
        enqueuedToRedis = false;
      }
    }

    // If redis is offline or in local direct mode, trigger evaluation asynchronously
    if (!enqueuedToRedis) {
      setTimeout(() => this.processDirectEvaluation(submission.id, user), 200);
    }

    return this.sanitizeSubmission(submission, user.id, user.role);
  }

  async findOne(id: string, requestingUserId: string, requestingRole: UserRole) {
    const submission = await this.submissionRepo.findOne({ where: { id } });
    if (!submission) {
      throw new NotFoundException(`Submission ${id} not found`);
    }

    // SECURITY REQUIREMENT: Learner A cannot access Learner B's private submission!
    if (requestingRole === UserRole.LEARNER && submission.userId !== requestingUserId) {
      throw new ForbiddenException(`403 Forbidden: You do not have permission to view another learner's private submission.`);
    }

    return this.sanitizeSubmission(submission, requestingUserId, requestingRole);
  }

  async findByUser(userId: string) {
    const subs = await this.submissionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return subs.map((s) => this.sanitizeSubmission(s, userId, UserRole.LEARNER));
  }

  async findByContest(contestId: string, requestingUserId: string, requestingRole: UserRole) {
    const subs = await this.submissionRepo.find({
      where: { contestId },
      order: { createdAt: 'DESC' },
    });
    return subs.map((s) => this.sanitizeSubmission(s, requestingUserId, requestingRole));
  }

  /**
   * Called by Judge Worker upon evaluation completion
   */
  async updateResult(
    submissionId: string,
    result: {
      verdict: SubmissionVerdict;
      status: string;
      executionTimeMs: number;
      memoryUsageKb: number;
      score: number;
      judgeVersion: string;
      failureReason?: string;
      testResults: any[];
    },
  ) {
    const submission = await this.submissionRepo.findOne({ where: { id: submissionId } });
    if (!submission) return;

    submission.verdict = result.verdict;
    submission.status = result.status;
    submission.executionTimeMs = result.executionTimeMs;
    submission.memoryUsageKb = result.memoryUsageKb;
    submission.score = result.score;
    submission.judgeVersion = result.judgeVersion;
    submission.failureReason = result.failureReason || null;
    submission.testResultsJson = JSON.stringify(result.testResults);

    await this.submissionRepo.save(submission);

    // Update leaderboard if in contest
    if (submission.contestId) {
      const user = await this.userRepo.findOne({ where: { id: submission.userId } });
      if (user) {
        await this.leaderboardService.recordSubmission({
          contestId: submission.contestId,
          userId: user.id,
          username: user.username,
          displayName: user.displayName,
          problemId: submission.problemId,
          verdict: submission.verdict,
          score: submission.score,
        });
      }
    }

    return submission;
  }

  async getEvaluationTestCases(problemId: string) {
    return this.problemsService.getEvaluationTestCases(problemId);
  }

  /**
   * Direct sandbox evaluation fallback when Redis worker is not running standalone.
   * Executes code using real child process sandbox with timeouts, memory limits, and test verification.
   */
  private async processDirectEvaluation(submissionId: string, user: { id: string; username: string; displayName: string }) {
    const sub = await this.submissionRepo.findOne({ where: { id: submissionId } });
    if (!sub) return;

    sub.status = 'PROCESSING';
    sub.verdict = SubmissionVerdict.RUNNING;
    await this.submissionRepo.save(sub);

    const testCases = await this.problemsService.getEvaluationTestCases(sub.problemId);
    const sandbox = new SandboxEvaluator();

    let allPassed = true;
    let totalTime = 0;
    const testResults = [];
    let finalVerdict = SubmissionVerdict.ACCEPTED;
    let failureReason: string | undefined = undefined;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const execResult = await sandbox.execute({
        sourceCode: sub.sourceCode,
        input: tc.input || '',
        language: sub.language,
        timeLimitMs: 2000,
        memoryLimitMb: 256,
      });

      totalTime += execResult.executionTimeMs;
      let tcVerdict = SubmissionVerdict.ACCEPTED;
      let passed = true;
      let errorMsg: string | undefined = undefined;

      if (execResult.isInfrastructureError) {
        tcVerdict = SubmissionVerdict.JUDGE_ERROR;
        passed = false;
        errorMsg = execResult.errorMessage || 'Sandbox execution error';
      } else if (execResult.isTimeout) {
        tcVerdict = SubmissionVerdict.TIME_LIMIT_EXCEEDED;
        passed = false;
        errorMsg = 'Time Limit Exceeded (CPU execution limit)';
      } else if (execResult.exitCode !== 0) {
        if (execResult.stderr.includes('SyntaxError') || execResult.stderr.includes('IndentationError')) {
          tcVerdict = SubmissionVerdict.COMPILATION_ERROR;
        } else {
          tcVerdict = SubmissionVerdict.RUNTIME_ERROR;
        }
        passed = false;
        errorMsg = execResult.stderr.split('\n').slice(-2).join(' ').trim();
      } else {
        // Output normalization & comparison
        const normActual = execResult.stdout.replace(/\r\n/g, '\n').trim();
        const normExpected = (tc.expectedOutput || '').replace(/\r\n/g, '\n').trim();
        if (normExpected && normActual !== normExpected) {
          tcVerdict = SubmissionVerdict.WRONG_ANSWER;
          passed = false;
          errorMsg = `Output mismatch on test case ${tc.orderIndex}`;
        }
      }

      if (!passed) {
        allPassed = false;
        finalVerdict = tcVerdict;
        failureReason = errorMsg;
      }

      testResults.push({
        testCaseId: tc.id,
        orderIndex: tc.orderIndex,
        isHidden: tc.isHidden,
        passed,
        verdict: tcVerdict,
        executionTimeMs: execResult.executionTimeMs,
        memoryUsageKb: execResult.memoryUsageKb,
        expectedOutput: tc.isHidden ? '[REDACTED]' : tc.expectedOutput,
        actualOutput: tc.isHidden ? '[REDACTED]' : (passed ? tc.expectedOutput : execResult.stdout || 'Error output'),
        errorMessage: errorMsg,
      });

      if (!passed) break; // Stop on first failure
    }

    await this.updateResult(submissionId, {
      verdict: finalVerdict,
      status: 'COMPLETED',
      executionTimeMs: totalTime,
      memoryUsageKb: 14500,
      score: finalVerdict === SubmissionVerdict.ACCEPTED ? 100 : 0,
      judgeVersion: 'v1.4.1-direct',
      failureReason: finalVerdict === SubmissionVerdict.ACCEPTED ? null : failureReason,
      testResults,
    });
  }

  private sanitizeSubmission(s: SubmissionEntity, requestingUserId: string, requestingRole: UserRole) {
    const isOwner = s.userId === requestingUserId;
    const isStaff = requestingRole === UserRole.INSTRUCTOR || requestingRole === UserRole.ADMIN;

    const rawTestResults = JSON.parse(s.testResultsJson || '[]');
    // Redact hidden test inputs/outputs for non-staff
    const sanitizedTestResults = rawTestResults.map((tr: any) => {
      if (tr.isHidden && !isStaff) {
        return {
          testCaseId: tr.testCaseId,
          orderIndex: tr.orderIndex,
          isHidden: true,
          passed: tr.passed,
          verdict: tr.verdict,
          executionTimeMs: tr.executionTimeMs,
          memoryUsageKb: tr.memoryUsageKb,
        };
      }
      return tr;
    });

    return {
      id: s.id,
      userId: s.userId,
      contestId: s.contestId,
      problemId: s.problemId,
      sourceCode: (isOwner || isStaff) ? s.sourceCode : '[REDACTED]',
      language: s.language,
      verdict: s.verdict,
      status: s.status,
      executionTimeMs: s.executionTimeMs,
      memoryUsageKb: s.memoryUsageKb,
      score: s.score,
      judgeVersion: s.judgeVersion,
      failureReason: s.failureReason,
      testResults: sanitizedTestResults,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }
}
