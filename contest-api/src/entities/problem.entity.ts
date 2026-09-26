import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum ProblemDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

@Entity('problems')
@Index(['contestId'])
@Index(['conceptId'])
export class ProblemEntity {
  @PrimaryColumn('varchar', { length: 64 })
  id: string;

  @Column({ unique: true, length: 128 })
  slug: string;

  @Column({ length: 256 })
  title: string;

  @Column({ type: 'text' })
  statement: string;

  @Column({ type: 'varchar', length: 32, default: ProblemDifficulty.MEDIUM })
  difficulty: ProblemDifficulty;

  @Column({ type: 'simple-array', default: '' })
  constraints: string[];

  @Column({ type: 'text', default: '[]' })
  examplesJson: string;

  @Column({ type: 'simple-array', default: '' })
  tags: string[];

  @Column({ type: 'varchar', length: 64, nullable: true })
  contestId: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  conceptId: string;

  @Column({ type: 'int', default: 2000 })
  timeLimitMs: number;

  @Column({ type: 'int', default: 256 })
  memoryLimitMb: number;

  @Column({ type: 'int', default: 100 })
  points: number;

  @Column({ type: 'text', default: '{}' })
  starterCodeJson: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
