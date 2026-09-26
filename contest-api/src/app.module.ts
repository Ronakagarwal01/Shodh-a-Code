import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  UserEntity,
  ContestEntity,
  ProblemEntity,
  TestCaseEntity,
  SubmissionEntity,
  LeaderboardEntryEntity,
  ContestIncidentEntity,
} from './entities';
import { AuthModule } from './auth/auth.module';
import { ContestsModule } from './contests/contests.module';
import { ProblemsModule } from './problems/problems.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { IncidentsModule } from './incidents/incidents.module';
import { runSeed } from './scripts/seed';

const isPostgres = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres');

@Module({
  imports: [
    TypeOrmModule.forRoot(
      isPostgres
        ? {
            type: 'postgres',
            url: process.env.DATABASE_URL,
            entities: [
              UserEntity,
              ContestEntity,
              ProblemEntity,
              TestCaseEntity,
              SubmissionEntity,
              LeaderboardEntryEntity,
              ContestIncidentEntity,
            ],
            synchronize: true, // auto-sync schema
          }
        : {
            type: 'sqljs' as any,
            location: 'shodha_contest.db',
            autoSave: true,
            entities: [
              UserEntity,
              ContestEntity,
              ProblemEntity,
              TestCaseEntity,
              SubmissionEntity,
              LeaderboardEntryEntity,
              ContestIncidentEntity,
            ],
            synchronize: true,
          },
    ),
    AuthModule,
    ContestsModule,
    ProblemsModule,
    SubmissionsModule,
    LeaderboardModule,
    IncidentsModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await runSeed(this.dataSource);
    } catch (err) {
      console.warn('[AppModule] Auto-seed warning:', err.message);
    }
  }
}
