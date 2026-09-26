import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ContestStatus {
  UPCOMING = 'UPCOMING',
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
}

@Entity('contests')
export class ContestEntity {
  @PrimaryColumn('varchar', { length: 64 })
  id: string;

  @Column({ unique: true, length: 128 })
  slug: string;

  @Column({ length: 256 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 64 })
  startTime: string;

  @Column({ type: 'varchar', length: 64 })
  endTime: string;

  @Column({ type: 'varchar', length: 32, default: ContestStatus.ACTIVE })
  status: ContestStatus;

  @Column({ length: 128, default: 'Shodh Academy' })
  organization: string;

  @Column({ type: 'simple-array', default: '' })
  problemIds: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
