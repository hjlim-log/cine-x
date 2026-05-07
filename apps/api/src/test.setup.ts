// 단위 테스트(pnpm test)도 cinema_test DB를 사용하도록 환경 변수 로드
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.test') });
