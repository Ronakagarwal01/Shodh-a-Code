import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('contest_incidents')
export class ContestIncidentEntity {
  @PrimaryColumn('varchar', { length: 64 })
  id: string;

  @Column({ length: 64 })
  contestId: string;

  @Column({ length: 256 })
  title: string;

  @Column({ type: 'varchar', length: 64 })
  startTime: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  endTime: string;

  @Column({ length: 32, default: 'RESOLVED' })
  status: string;

  @Column({ length: 32, default: 'CRITICAL' })
  severity: string;

  @Column({ type: 'text' })
  summary: string;

  @Column({ type: 'text' })
  rootCause: string;

  @Column({ type: 'text', default: '[]' })
  timelineJson: string;

  @Column({ type: 'simple-array', default: '' })
  affectedSubmissions: string[];

  @CreateDateColumn()
  createdAt: Date;
}
