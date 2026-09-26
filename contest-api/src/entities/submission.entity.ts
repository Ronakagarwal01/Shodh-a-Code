import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum SubmissionVerdict {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  ACCEPTED = 'ACCEPTED',
  WRONG_ANSWER = 'WRONG_ANSWER',
  TIME_LIMIT_EXCEEDED = 'TIME_LIMIT_EXCEEDED',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  RUNTIME_ERROR = 'RUNTIME_ERROR',
  COMPILATION_ERROR = 'COMPILATION_ERROR',
  JUDGE_ERROR = 'JUDGE_ERROR',
}

@Entity('submissions')
export class SubmissionEntity {
  @PrimaryColumn('varchar', { length: 64 })
  id: string;

  @Column({ length: 64 })
  userId: string;

  @Column({ length: 64, nullable: true })
  contestId: string;

  @Column({ length: 64 })
  problemId: string;

  @Column({ type: 'text' })
  sourceCode: string;

  @Column({ length: 32, default: 'python' })
  language: string;

  @Column({ type: 'varchar', length: 32, default: SubmissionVerdict.QUEUED })
  verdict: SubmissionVerdict;

  @Column({ type: 'varchar', length: 32, default: 'PENDING' })
  status: string;

  @Column({ type: 'int', default: 0 })
  executionTimeMs: number;

  @Column({ type: 'int', default: 0 })
  memoryUsageKb: number;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ length: 32, default: 'v1.4.1' })
  judgeVersion: string;

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @Column({ type: 'text', default: '[]' })
  testResultsJson: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
