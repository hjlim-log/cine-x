'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  adminGetMovie,
  adminUpdateMovie,
  adminDeleteMovie,
  type AdminMovieDetail,
  type MovieFormData,
} from '@/lib/admin-api';
import MovieForm from '../_components/MovieForm';
import { Button } from '@/components/ui/button';

export default function EditMoviePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const movieId = Number(id);

  const [movie, setMovie] = useState<AdminMovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminGetMovie(movieId)
      .then(setMovie)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [movieId]);

  const handleSubmit = async (data: MovieFormData) => {
    await adminUpdateMovie(movieId, data);
    router.push('/admin/movies');
  };

  const handleDelete = async () => {
    if (!movie) return;
    if (movie._count.screenings > 0) {
      alert(`상영 스케줄 ${movie._count.screenings}건이 있어 삭제할 수 없습니다.`);
      return;
    }
    if (!confirm(`"${movie.title}"을(를) 삭제하시겠습니까?`)) return;
    try {
      await adminDeleteMovie(movieId);
      router.push('/admin/movies');
    } catch (e) {
      alert((e as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        불러오는 중...
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="p-4 rounded bg-red-900/30 text-red-400">
        {error || '영화를 찾을 수 없습니다.'}
      </div>
    );
  }

  const initialData: Partial<MovieFormData> = {
    title: movie.title,
    runtime: movie.runtime,
    rating: movie.rating,
    synopsis: movie.synopsis,
    posterUrl: movie.posterUrl ?? '',
    releaseDate: movie.releaseDate,
    genres: movie.genres.map((g) => g.genre.name),
  };

  return (
    <div>
      {/* 삭제 버튼 — 폼 위에 별도 배치 */}
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          onClick={handleDelete}
          className="border-red-900 text-red-400 hover:bg-red-900/30 text-sm"
        >
          이 영화 삭제
        </Button>
      </div>

      {movie._count.screenings > 0 && (
        <div className="mb-4 p-3 rounded bg-amber-900/20 border border-amber-800 text-amber-400 text-sm">
          ⚠ 상영 스케줄 {movie._count.screenings}건이 연결되어 있습니다. 삭제 불가.
        </div>
      )}

      <MovieForm
        title="영화 편집"
        submitLabel="변경 사항 저장"
        initialData={initialData}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
