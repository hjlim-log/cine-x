import { IsInt, IsArray, ArrayMinSize } from 'class-validator';

export class BulkIssueExecuteDto {
  @IsInt()
  couponId: number;

  @IsArray()
  @IsInt({ each: true })
  @ArrayMinSize(1)
  customerIds: number[];
}
