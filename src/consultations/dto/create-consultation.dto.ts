import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const NEEDS = [
  'Expert Network',
  'Virtual Assistant',
  'Website Design',
  'SEO',
  'Full Growth System',
] as const;

export class CreateConsultationDto {
  @ApiProperty({ example: 'Jane Cole' })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'jane@company.com' })
  @IsEmail({}, { message: 'Enter a valid email' })
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({ example: 'Acme Inc.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  company?: string;

  @ApiProperty({
    example: 'Expert Network',
    enum: NEEDS,
  })
  @IsIn(NEEDS, { message: 'Pick a valid option' })
  need: string;

  @ApiPropertyOptional({ example: '2–4 weeks' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  timeline?: string;

  @ApiPropertyOptional({ example: '$5k – $15k' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  budget?: string;

  @ApiPropertyOptional({
    example: 'We need help validating market demand for our B2B SaaS product.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
