import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class SignupDto {
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  email: string;

  @IsString()
  @MinLength(6, { message: '비밀번호는 6자 이상이어야 합니다.' })
  password: string;

  @IsString({ message: '이름을 입력해주세요.' })
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
