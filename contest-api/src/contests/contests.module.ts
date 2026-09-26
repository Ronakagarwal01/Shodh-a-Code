import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContestEntity } from '../entities/contest.entity';
import { ProblemsModule } from '../problems/problems.module';
import { ContestsService } from './contests.service';
import { ContestsController } from './contests.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ContestEntity]), ProblemsModule],
  controllers: [ContestsController],
  providers: [ContestsService],
  exports: [ContestsService],
})
export class ContestsModule {}
