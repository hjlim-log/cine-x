import { config } from 'dotenv';
import { resolve } from 'path';

// 단위 테스트(pnpm test)도 cinema_test DB를 사용하도록 환경 변수 로드
config({ path: resolve(__dirname, '../.env.test') });
