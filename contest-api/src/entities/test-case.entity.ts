import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('test_cases')
export class TestCaseEntity {
  @PrimaryColumn('varchar', { length: 64 })
  id: string;

  @Column({ length: 64 })
  problemId: string;

  @Column({ type: 'text' })
  input: string;

  @Column({ type: 'text' })
  expectedOutput: string;

  @Column({ type: 'boolean', default: false })
  isHidden: boolean;

  @Column({ type: 'int', default: 0 })
  orderIndex: number;

  @Column({ type: 'text', nullable: true })
  explanation: string;

  @CreateDateColumn()
  createdAt: Date;
}
