import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum UserRole {
  LEARNER = 'learner',
  INSTRUCTOR = 'instructor',
  ADMIN = 'admin',
}

@Entity('users')
@Index(['organization'])
@Index(['role'])
export class UserEntity {
  @PrimaryColumn('varchar', { length: 64 })
  id: string;

  @Column({ unique: true, length: 64 })
  username: string;

  @Column({ length: 128 })
  displayName: string;

  @Column({ unique: true, length: 128 })
  email: string;

  @Column({ length: 256 })
  passwordHash: string;

  @Column({ length: 128, default: 'Shodh Academy' })
  organization: string;

  @Column({ type: 'varchar', length: 32, default: UserRole.LEARNER })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
