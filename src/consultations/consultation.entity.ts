import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ConsultationStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

@Entity('consultations')
export class Consultation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 255 })
  email: string;

  @Column({ length: 120, nullable: true })
  company: string | null;

  @Column({ length: 60 })
  need: string;

  @Column({ length: 80, nullable: true })
  timeline: string | null;

  @Column({ length: 80, nullable: true })
  budget: string | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({
    type: 'enum',
    enum: ConsultationStatus,
    default: ConsultationStatus.NEW,
  })
  status: ConsultationStatus;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
