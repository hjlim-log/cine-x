import { IsString, IsOptional, IsIn, MinLength } from 'class-validator';

export class AnswerInquiryDto {
  @IsString()
  @MinLength(10)
  answer: string;

  @IsOptional()
  @IsIn(['PROCESSING', 'COMPLETED'])
  status?: string;
}
