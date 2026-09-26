import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaderboardEntryEntity } from '../entities/leaderboard-entry.entity';
import { SubmissionVerdict } from '../entities/submission.entity';

export interface RecordSubmissionDto {
  contestId: string;
  userId: string;
  username: string;
  displayName: string;
  problemId: string;
  verdict: SubmissionVerdict;
  score: number;
}

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(LeaderboardEntryEntity)
    private readonly leaderboardRepo: Repository<LeaderboardEntryEntity>,
  ) {}

  async getLeaderboard(contestId: string) {
    const entries = await this.leaderboardRepo.find({
      where: { contestId },
      order: {
        totalScore: 'DESC',
        solvedCount: 'DESC',
        totalPenaltyMinutes: 'ASC',
      },
    });

    return entries.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      username: entry.username,
      displayName: entry.displayName,
      totalScore: entry.totalScore,
      solvedCount: entry.solvedCount,
      totalPenaltyMinutes: entry.totalPenaltyMinutes,
      problemScores: JSON.parse(entry.problemScoresJson || '{}'),
      lastSubmissionTime: entry.lastSubmissionTime,
    }));
  }

  async recordSubmission(dto: RecordSubmissionDto) {
    const id = `${dto.contestId}_${dto.userId}`;
    let entry = await this.leaderboardRepo.findOne({ where: { id } });

    if (!entry) {
      entry = this.leaderboardRepo.create({
        id,
        contestId: dto.contestId,
        userId: dto.userId,
        username: dto.username,
        displayName: dto.displayName,
        totalScore: 0,
        solvedCount: 0,
        totalPenaltyMinutes: 0,
        problemScoresJson: '{}',
      });
    }

    const problemScores = JSON.parse(entry.problemScoresJson || '{}');
    const existing = problemScores[dto.problemId] || {
      problemId: dto.problemId,
      solved: false,
      score: 0,
      attempts: 0,
      timeToSolveMinutes: 0,
    };

    if (!existing.solved) {
      existing.attempts += 1;
      if (dto.verdict === SubmissionVerdict.ACCEPTED) {
        existing.solved = true;
        existing.score = dto.score || 100;
        existing.timeToSolveMinutes = Math.floor(Math.random() * 45) + 15;
      }
    }

    problemScores[dto.problemId] = existing;
    entry.problemScoresJson = JSON.stringify(problemScores);

    // Recalculate totals
    let totalScore = 0;
    let solvedCount = 0;
    let totalPenaltyMinutes = 0;

    for (const p of Object.values(problemScores) as any[]) {
      totalScore += p.score || 0;
      if (p.solved) {
        solvedCount += 1;
        totalPenaltyMinutes += p.timeToSolveMinutes + (p.attempts - 1) * 20;
      }
    }

    entry.totalScore = totalScore;
    entry.solvedCount = solvedCount;
    entry.totalPenaltyMinutes = totalPenaltyMinutes;
    entry.lastSubmissionTime = new Date().toISOString();

    await this.leaderboardRepo.save(entry);
    return entry;
  }
}
