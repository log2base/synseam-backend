import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Consultation } from './consultation.entity';
import { ConsultationsService } from './consultations.service';
import { ConsultationsController } from './consultations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Consultation])],
  controllers: [ConsultationsController],
  providers: [ConsultationsService],
  exports: [ConsultationsService],
})
export class ConsultationsModule {}
