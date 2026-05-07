'use client';

// TODO: 데모 확인 후 이 파일 제거
export default function DebugSentry() {
  return (
    <div className="p-8">
      <button
        onClick={() => {
          throw new Error('프론트 Sentry 테스트 에러');
        }}
        className="px-4 py-2 bg-red-500 text-white rounded"
      >
        에러 발생시키기
      </button>
    </div>
  );
}
