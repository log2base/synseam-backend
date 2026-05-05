import { Injectable, UnauthorizedException, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from './entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

  async onModuleInit() {
    await this.ensureAdminUser();
  }

  private async ensureAdminUser() {
    const adminUsername = this.configService.get<string>('ADMIN_USERNAME', 'admin');
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL', 'admin@synseam.co');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD', 'admin123');

    const existingAdmin = await this.userRepository.findOne({ where: { username: adminUsername } });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const admin = this.userRepository.create({
        username: adminUsername,
        email: adminEmail,
        password: hashedPassword,
        role: 'SUPERADMIN',
      });
      await this.userRepository.save(admin);
      console.log('Default admin user created');
    }
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: [
        { username: dto.username },
        { email: dto.username },
      ],
    });
    
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { username: user.username, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        username: user.username,
        role: user.role,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!user) {
      // For security, don't reveal that the user doesn't exist
      return { message: 'If an account exists, a reset link has been sent.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await this.userRepository.save(user);

    const resetUrl = `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${token}`;

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background-color: #030712;
              color: #f9fafb;
              margin: 0;
              padding: 40px 20px;
              line-height: 1.6;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: #111827;
              border: 1px solid #374151;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            }
            .header {
              background: #0A0F1B;
              padding: 30px;
              text-align: center;
            }
            .content {
              padding: 40px 32px;
            }
            .greeting {
              font-size: 20px;
              font-weight: 600;
              margin-bottom: 16px;
              color: #f3f4f6;
            }
            .text {
              color: #9ca3af;
              margin-bottom: 24px;
              font-size: 16px;
            }
            .button-wrapper {
              text-align: center;
              margin: 32px 0;
            }
            .button {
              background-color: #2563EB;
              color: #ffffff !important;
              padding: 14px 28px;
              text-decoration: none;
              border-radius: 8px;
              display: inline-block;
              font-weight: 600;
              font-size: 16px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            .footer {
              background: #0f172a;
              padding: 24px;
              text-align: center;
              font-size: 12px;
              color: #6b7280;
              border-top: 1px solid #1e293b;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/images/SynSeam%20Assets/logo.png" alt="SynSeam" style="height: 36px; width: auto; display: inline-block;">
            </div>
            <div class="content">
              <div class="greeting">Reset Your Password</div>
              <p class="text">
                We received a request to reset the password for your SynSeam account. Click the button below to choose a new password:
              </p>
              <div class="button-wrapper">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              <p class="text" style="font-size: 14px; margin-top: 32px;">
                If you didn't request this, you can safely ignore this email. This link will expire in 1 hour.
              </p>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} SynSeam. All rights reserved.
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return { message: 'Reset link sent to email' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepository.findOne({
      where: {
        resetPasswordToken: dto.token,
        resetPasswordExpires: MoreThan(new Date()),
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    user.password = await bcrypt.hash(dto.password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await this.userRepository.save(user);

    return { message: 'Password has been reset successfully' };
  }
}

