import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConsultationsModule } from './consultations/consultations.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_NAME', 'synseam'),
        autoLoadEntities: true,
        synchronize: true, // disable in production
      }),
    }),

    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get('MAIL_HOST', 'localhost'),
          port: config.get<number>('MAIL_PORT', 1025),
          ignoreTLS: true,
          secure: false,
          auth: config.get('MAIL_USER')
            ? {
                user: config.get('MAIL_USER'),
                pass: config.get('MAIL_PASS'),
              }
            : undefined,
        },
        defaults: {
          from: config.get('MAIL_FROM', '"SynSeam" <hello@synseam.co>'),
        },
      }),
    }),

    ConsultationsModule,
    HealthModule,
    AuthModule,
  ],
})
export class AppModule {}
