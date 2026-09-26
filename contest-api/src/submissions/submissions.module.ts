import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionEntity } from '../entities/submission.entity';
import { UserEntity } from '../entities/user.entity';
import { ProblemsModule } from '../problems/problems.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SubmissionEntity, UserEntity]),
    ProblemsModule,
    LeaderboardModule,
  ],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
