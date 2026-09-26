import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('leaderboard_entries')
export class LeaderboardEntryEntity {
  @PrimaryColumn('varchar', { length: 128 }) // composite key e.g. contestId_userId
  id: string;

  @Column({ length: 64 })
  contestId: string;

  @Column({ length: 64 })
  userId: string;

  @Column({ length: 64 })
  username: string;

  @Column({ length: 128 })
  displayName: string;

  @Column({ type: 'int', default: 0 })
  totalScore: number;

  @Column({ type: 'int', default: 0 })
  solvedCount: number;

  @Column({ type: 'int', default: 0 })
  totalPenaltyMinutes: number;

  @Column({ type: 'text', default: '{}' })
  problemScoresJson: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  lastSubmissionTime: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
