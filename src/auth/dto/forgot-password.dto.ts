import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'admin@synseam.co' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
