import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProblemEntity } from '../entities/problem.entity';
import { TestCaseEntity } from '../entities/test-case.entity';
import { ProblemsService } from './problems.service';
import { ProblemsController } from './problems.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProblemEntity, TestCaseEntity])],
  controllers: [ProblemsController],
  providers: [ProblemsService],
  exports: [ProblemsService],
})
export class ProblemsModule {}
