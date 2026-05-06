import { IsInt, IsString, IsNotEmpty, MinLength, Min } from 'class-validator';

export class ChangeGradeDto {
  @IsInt()
  @Min(1)
  gradeId: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: '사유는 최소 5자 이상 입력해주세요.' })
  reason: string;
}
