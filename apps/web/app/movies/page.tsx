import Image from 'next/image';
import Link from 'next/link';
import { fetchMovies } from '@/lib/api';
import type { Movie } from '@/lib/types';

export default async function MoviesPage() {
  let movies: Movie[] = [];
  try {
    movies = await fetchMovies();
  } catch {
    // API 서버 오류 시 빈 목록
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">현재 상영작</h1>
      {movies.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-zinc-400">상영 중인 영화가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
}

function MovieCard({ movie }: { movie: Movie }) {
  return (
    <Link href={`/movies/${movie.id}`} className="group">
      <div className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 hover:border-red-600 transition-colors">
        <div className="relative aspect-[2/3] bg-zinc-800 overflow-hidden">
          <Image
            src={
              movie.posterUrl ??
              `https://placehold.co/300x450/27272a/ffffff.png?text=${encodeURIComponent(movie.title)}`
            }
            alt={movie.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-red-600/0 group-hover:bg-red-600/10 transition-colors duration-300" />
        </div>
        <div className="p-3">
          <h2 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-red-400 transition-colors">
            {movie.title}
          </h2>
          <p className="text-zinc-500 text-xs mt-1">{movie.rating}</p>
          {movie.genres && movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {movie.genres.slice(0, 2).map((g) => (
                <span key={g} className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                  {g}
                </span>
              ))}
              {movie.genres.length > 2 && (
                <span className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">
                  +{movie.genres.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
