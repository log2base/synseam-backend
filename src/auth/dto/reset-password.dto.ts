import { IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'some-token-from-email' })
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewPassword123!' })
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
