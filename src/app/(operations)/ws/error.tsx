'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <h2 className="text-xl font-semibold text-red-600">오류가 발생했습니다</h2>
      <p className="text-gray-600">{error.message || '알 수 없는 오류'}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        다시 시도
      </button>
    </div>
  );
}
