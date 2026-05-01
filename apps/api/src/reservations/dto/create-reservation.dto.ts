import { IsInt, IsArray, ArrayMinSize } from 'class-validator';

export class CreateReservationDto {
  @IsInt({ message: '상영 ID를 입력해주세요.' })
  screeningId: number;

  @IsArray({ message: '좌석 목록이 필요합니다.' })
  @ArrayMinSize(1, { message: '좌석을 최소 1개 선택해주세요.' })
  @IsInt({ each: true })
  seatIds: number[];
}
