import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Consultation } from './consultation.entity';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { Subject } from 'rxjs';

@Injectable()
export class ConsultationsService {
  private readonly logger = new Logger(ConsultationsService.name);
  public readonly newConsultation$ = new Subject<Consultation>();

  constructor(
    @InjectRepository(Consultation)
    private readonly repo: Repository<Consultation>,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateConsultationDto): Promise<Consultation> {
    const consultation = this.repo.create(dto);
    const saved = await this.repo.save(consultation);

    try {
      await this.sendNotificationEmail(saved);
    } catch (error) {
      // Don't fail the request if email fails, just log it
      this.logger.error('Failed to send consultation notification email', error);
    }

    this.newConsultation$.next(saved);
    return saved;
  }

  async findAll(): Promise<Consultation[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findAllPaginated(options: {
    page: number;
    limit: number;
    search?: string;
    need?: string;
  }): Promise<{ data: Consultation[]; total: number; page: number; limit: number; totalPages: number }> {
    const { page, limit, search, need } = options;
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('c');

    if (search && search.trim()) {
      qb.andWhere(
        '(LOWER(c.name) LIKE :search OR LOWER(c.email) LIKE :search OR LOWER(c.company) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    if (need && need !== 'all') {
      qb.andWhere('c.need = :need', { need });
    }

    qb.orderBy('c.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUniqueNeeds(): Promise<string[]> {
    const results = await this.repo
      .createQueryBuilder('c')
      .select('DISTINCT c.need', 'need')
      .orderBy('c.need', 'ASC')
      .getRawMany();
    return results.map((r) => r.need).filter(Boolean);
  }

  async findOne(id: string): Promise<Consultation | null> {
    return this.repo.findOneBy({ id });
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async markAsRead(id: string): Promise<Consultation | null> {
    const consultation = await this.repo.findOneBy({ id });
    if (!consultation) return null;
    consultation.isRead = true;
    return this.repo.save(consultation);
  }

  private async sendNotificationEmail(consultation: Consultation) {
    const notifyEmail = this.configService.get<string>(
      'NOTIFY_EMAIL',
      'hello@synseam.co',
    );

    const text = `
New Consultation Request Received:

Name: ${consultation.name}
Email: ${consultation.email}
Company: ${consultation.company || 'N/A'}
Need: ${consultation.need}
Timeline: ${consultation.timeline || 'N/A'}
Budget: ${consultation.budget || 'N/A'}

Message:
${consultation.message || 'N/A'}

---
ID: ${consultation.id}
`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #030712; /* Matches bg-background */
          color: #f9fafb; /* Matches text-foreground */
          margin: 0;
          padding: 40px 20px;
          line-height: 1.6;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #111827; /* Matches card background */
          border: 1px solid #374151; /* Matches border */
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .header {
          background: #0A0F1B;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          color: #ffffff;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 30px;
        }
        .greeting {
          font-size: 18px;
          margin-bottom: 24px;
          color: #f3f4f6;
        }
        .field-grid {
          display: grid;
          gap: 16px;
          margin-bottom: 24px;
        }
        .field {
          background: #1f2937;
          border: 1px solid #374151;
          padding: 16px;
          border-radius: 8px;
        }
        .field-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #9ca3af; /* text-muted-foreground */
          margin-bottom: 4px;
          font-weight: 600;
        }
        .field-value {
          font-size: 16px;
          color: #f9fafb;
          font-weight: 500;
        }
        .message-box {
          background: #1f2937;
          border: 1px solid #374151;
          padding: 20px;
          border-radius: 8px;
          margin-top: 24px;
        }
        .message-text {
          white-space: pre-wrap;
          color: #d1d5db;
          font-size: 15px;
          font-style: italic;
        }
        .footer {
          background: #0f172a;
          padding: 20px;
          text-align: center;
          font-size: 13px;
          color: #6b7280;
          border-top: 1px solid #1e293b;
        }
        .badge {
          display: inline-block;
          background: #3b82f6;
          color: white;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/images/SynSeam%20Assets/logo.png" alt="SynSeam" style="height: 36px; width: auto; display: inline-block;">
        </div>
        <div class="content">
          <div class="badge">New Lead</div>
          <div class="greeting">
            <strong>${consultation.name}</strong> just requested a consultation.
          </div>
          
          <div class="field-grid">
            <div class="field">
              <div class="field-label">Contact Email</div>
              <div class="field-value"><a href="mailto:${consultation.email}" style="color: #60a5fa; text-decoration: none;">${consultation.email}</a></div>
            </div>
            
            <div class="field">
              <div class="field-label">Company</div>
              <div class="field-value">${consultation.company || '<span style="color: #6b7280;">Not provided</span>'}</div>
            </div>
            
            <div class="field">
              <div class="field-label">Primary Need</div>
              <div class="field-value" style="color: #a78bfa;">${consultation.need}</div>
            </div>

            <div class="field">
              <div class="field-label">Timeline</div>
              <div class="field-value">${consultation.timeline || '<span style="color: #6b7280;">Not provided</span>'}</div>
            </div>

            <div class="field">
              <div class="field-label">Budget</div>
              <div class="field-value">${consultation.budget || '<span style="color: #6b7280;">Not provided</span>'}</div>
            </div>
          </div>

          <div class="message-box">
            <div class="field-label">Additional Message</div>
            <div class="message-text">"${consultation.message || 'No additional details provided.'}"</div>
          </div>
        </div>
        <div class="footer">
          Consultation ID: ${consultation.id}<br>
          Sent securely from your SynSeam infrastructure.
        </div>
      </div>
    </body>
    </html>
    `;

    await this.mailerService.sendMail({
      to: notifyEmail,
      subject: `New Lead: ${consultation.name} (${consultation.need})`,
      text,
      html,
    });
  }
}
