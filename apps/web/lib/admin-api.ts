const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function getToken(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('token') ?? '') : '';
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `오류 (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type AdminMovie = {
  id: number;
  title: string;
  runtime: number;
  rating: string;
  genre: string;
  synopsis: string;
  posterUrl: string | null;
  releaseDate: string;
  genres: { id: number; genre: { id: number; name: string } }[];
  _count: { screenings: number };
};

export type AdminMovieDetail = AdminMovie & {
  people: {
    id: number;
    role: string;
    order: number;
    person: { id: number; name: string; originalName: string | null };
  }[];
  media: { id: number; type: string; url: string; order: number }[];
};

export type MovieFormData = {
  title: string;
  runtime: number;
  rating: string;
  synopsis: string;
  posterUrl?: string;
  releaseDate: string;
  genres: string[];
};

export const adminListMovies = (params?: {
  search?: string;
  genre?: string;
}): Promise<AdminMovie[]> => {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.genre) qs.set('genre', params.genre);
  const q = qs.toString();
  return req<AdminMovie[]>(`/admin/movies${q ? `?${q}` : ''}`);
};

export const adminGetMovie = (id: number): Promise<AdminMovieDetail> =>
  req<AdminMovieDetail>(`/admin/movies/${id}`);

export const adminCreateMovie = (data: MovieFormData): Promise<AdminMovie> =>
  req<AdminMovie>('/admin/movies', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const adminUpdateMovie = (
  id: number,
  data: Partial<MovieFormData>,
): Promise<AdminMovie> =>
  req<AdminMovie>(`/admin/movies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const adminDeleteMovie = (id: number): Promise<void> =>
  req<void>(`/admin/movies/${id}`, { method: 'DELETE' });

export type AdminScreening = {
  id: number;
  startTime: string;
  endTime: string;
  screenType: string;
  movieId: number;
  screenId: number;
  movie: { id: number; title: string; runtime: number; posterUrl: string | null };
  screen: {
    id: number;
    name: string;
    cinema: { id: number; name: string };
    screenType: { id: number; name: string };
  };
  _count: { reservations: number };
};

export type CinemaWithScreens = {
  id: number;
  name: string;
  screens: { id: number; name: string; screenType: { id: number; name: string } }[];
};

export const adminListScreenings = (params?: {
  cinemaId?: number;
  screenId?: number;
  movieId?: number;
  startDate?: string;
  endDate?: string;
}): Promise<AdminScreening[]> => {
  const qs = new URLSearchParams();
  if (params?.cinemaId) qs.set('cinemaId', String(params.cinemaId));
  if (params?.screenId) qs.set('screenId', String(params.screenId));
  if (params?.movieId) qs.set('movieId', String(params.movieId));
  if (params?.startDate) qs.set('startDate', params.startDate);
  if (params?.endDate) qs.set('endDate', params.endDate);
  const q = qs.toString();
  return req<AdminScreening[]>(`/admin/screenings${q ? `?${q}` : ''}`);
};

export const adminGetCinemasWithScreens = (): Promise<CinemaWithScreens[]> =>
  req<CinemaWithScreens[]>('/admin/screenings/cinemas');

export const adminDeleteScreening = (id: number): Promise<void> =>
  req<void>(`/admin/screenings/${id}`, { method: 'DELETE' });

export type CreateScreeningDto = {
  movieId: number;
  screenId: number;
  startTime: string;
  screenType: string;
};

export type BulkCreateScreeningDto = {
  movieId: number;
  screenId: number;
  screenType: string;
  startDate: string;
  endDate: string;
  repeatPattern: 'DAILY' | 'WEEKDAY' | 'WEEKEND';
  timeSlots: string[];
};

export type BulkCreateResult = {
  total: number;
  created: number;
  skipped: number;
  skippedDetails: { startTime: string; reason: string }[];
};

export const adminCreateScreening = (data: CreateScreeningDto): Promise<AdminScreening> =>
  req<AdminScreening>('/admin/screenings', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const adminBulkCreateScreenings = (data: BulkCreateScreeningDto): Promise<BulkCreateResult> =>
  req<BulkCreateResult>('/admin/screenings/bulk', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export type AdminEventPrize = {
  id: number;
  name: string;
  type: string;
  quantity: number;
  imageUrl: string | null;
};

export type AdminEvent = {
  id: number;
  title: string;
  category: string;
  status: string;
  startDate: string;
  endDate: string;
  prizes: AdminEventPrize[];
  _count: { applications: number };
};

export type AdminEventApplication = {
  id: number;
  status: string;
  appliedAt: string;
  customer: { id: number; email: string; name: string };
  prize: { id: number; name: string } | null;
};

export type AdminDrawResult = {
  totalApplications: number;
  winners: number;
  losers: number;
  winnersList: { applicationId: number; customerId: number; prizeName: string }[];
};

export const adminListEvents = (): Promise<AdminEvent[]> =>
  req<AdminEvent[]>('/admin/events');

export const adminGetEventApplications = (id: number): Promise<AdminEventApplication[]> =>
  req<AdminEventApplication[]>(`/admin/events/${id}/applications`);

export const adminDrawEvent = (id: number): Promise<AdminDrawResult> =>
  req<AdminDrawResult>(`/admin/events/${id}/draw`, { method: 'POST' });
