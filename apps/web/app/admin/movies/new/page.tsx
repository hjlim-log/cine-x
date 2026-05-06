'use client';

import { useRouter } from 'next/navigation';
import { adminCreateMovie, type MovieFormData } from '@/lib/admin-api';
import MovieForm from '../_components/MovieForm';

export default function NewMoviePage() {
  const router = useRouter();

  const handleSubmit = async (data: MovieFormData) => {
    await adminCreateMovie(data);
    router.push('/admin/movies');
  };

  return <MovieForm title="새 영화 등록" submitLabel="저장" onSubmit={handleSubmit} />;
}
