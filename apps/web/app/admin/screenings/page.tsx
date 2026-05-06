'use client';

import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar-dark.css';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  adminListScreenings,
  adminGetCinemasWithScreens,
  adminListMovies,
  adminDeleteScreening,
  type AdminScreening,
  type CinemaWithScreens,
  type AdminMovie,
} from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const locales = { ko };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 0 }),
  getDay,
  locales,
});

type CalendarEvent = {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: AdminScreening;
};

export default function AdminScreeningsPage() {
  const router = useRouter();
  const [screenings, setScreenings] = useState<AdminScreening[]>([]);
  const [cinemas, setCinemas] = useState<CinemaWithScreens[]>([]);
  const [movies, setMovies] = useState<AdminMovie[]>([]);
  const [cinemaId, setCinemaId] = useState<string>('all');
  const [screenId, setScreenId] = useState<string>('all');
  const [movieId, setMovieId] = useState<string>('all');
  const [view, setView] = useState<View>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selected, setSelected] = useState<AdminScreening | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const selectedCinema = cinemas.find((c) => c.id === Number(cinemaId));
  const filteredScreens = selectedCinema?.screens ?? [];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof adminListScreenings>[0] = {};
      if (cinemaId !== 'all') params.cinemaId = Number(cinemaId);
      if (screenId !== 'all') params.screenId = Number(screenId);
      if (movieId !== 'all') params.movieId = Number(movieId);
      const data = await adminListScreenings(params);
      setScreenings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [cinemaId, screenId, movieId]);

  useEffect(() => {
    adminGetCinemasWithScreens().then(setCinemas).catch(console.error);
    adminListMovies().then(setMovies).catch(console.error);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCinemaChange = (val: string) => {
    setCinemaId(val);
    setScreenId('all');
  };

  const isFiltered = cinemaId !== 'all' || screenId !== 'all' || movieId !== 'all';

  const handleDelete = async () => {
    if (!selected) return;
    if (selected._count.reservations > 0) {
      alert(`진행 중인 예매가 ${selected._count.reservations}건 있어 삭제할 수 없습니다.`);
      return;
    }
    if (!confirm(`이 상영을 삭제하시겠습니까?`)) return;
    setDeleting(true);
    try {
      await adminDeleteScreening(selected.id);
      setSelected(null);
      load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const events: CalendarEvent[] = screenings.map((s) => ({
    id: s.id,
    title: `${s.movie.title} · ${s.screen.name}`,
    start: new Date(s.startTime),
    end: new Date(s.endTime),
    resource: s,
  }));

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-5 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">상영 스케줄</h1>
          <p className="text-slate-400 text-sm mt-0.5">총 {screenings.length}건</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push('/admin/screenings/new')}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            + 단건 등록
          </Button>
          <Button
            onClick={() => router.push('/admin/screenings/bulk')}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            일괄 등록
          </Button>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-3 mb-4 shrink-0">
        <Select value={movieId} onValueChange={setMovieId}>
          <SelectTrigger className="w-52 bg-slate-800 border-slate-700 text-slate-200">
            <SelectValue placeholder="전체 영화" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700 text-slate-200 max-h-64">
            <SelectItem value="all">전체 영화</SelectItem>
            {movies.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>
                {m.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={cinemaId} onValueChange={handleCinemaChange}>
          <SelectTrigger className="w-44 bg-slate-800 border-slate-700 text-slate-200">
            <SelectValue placeholder="전체 영화관" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
            <SelectItem value="all">전체 영화관</SelectItem>
            {cinemas.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={screenId}
          onValueChange={setScreenId}
          disabled={cinemaId === 'all'}
        >
          <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-slate-200 disabled:opacity-40">
            <SelectValue placeholder="전체 상영관" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
            <SelectItem value="all">전체 상영관</SelectItem>
            {filteredScreens.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.name} ({s.screenType.name})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => { setCinemaId('all'); setScreenId('all'); setMovieId('all'); }}
            className="text-slate-500 hover:text-slate-300"
          >
            초기화
          </Button>
        )}

        {loading && (
          <span className="self-center text-xs text-slate-500 ml-2">불러오는 중...</span>
        )}
      </div>

      {/* 캘린더 */}
      <div
        className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex-1"
        style={{ minHeight: 640 }}
      >
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={(v) => setView(v)}
          date={currentDate}
          onNavigate={(date) => setCurrentDate(date)}
          views={['month', 'week', 'day']}
          step={30}
          timeslots={2}
          style={{ height: '100%' }}
          onSelectEvent={(event) => setSelected((event as CalendarEvent).resource)}
          eventPropGetter={() => ({
            style: {
              backgroundColor: '#dc2626',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              padding: '2px 6px',
            },
          })}
          messages={{
            today: '오늘',
            previous: '이전',
            next: '다음',
            month: '월',
            week: '주',
            day: '일',
            showMore: (count) => `+${count}개 더`,
            noEventsInRange: '이 기간에 상영이 없습니다.',
          }}
          formats={{
            timeGutterFormat: (date: Date) => format(date, 'HH:mm'),
            eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
              `${format(start, 'HH:mm')}–${format(end, 'HH:mm')}`,
            dayHeaderFormat: (date: Date) =>
              format(date, 'M월 d일 (eee)', { locale: ko }),
            dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
              `${format(start, 'M월 d일', { locale: ko })} – ${format(end, 'M월 d일', { locale: ko })}`,
            monthHeaderFormat: (date: Date) => format(date, 'yyyy년 M월', { locale: ko }),
            weekdayFormat: (date: Date) => format(date, 'eee', { locale: ko }),
          }}
        />
      </div>

      {/* 상세 모달 */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">
              {selected?.movie.title}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-[80px_1fr] gap-y-2 text-slate-300">
                <span className="text-slate-500">상영관</span>
                <span>{selected.screen.cinema.name} · {selected.screen.name}</span>

                <span className="text-slate-500">관 유형</span>
                <span>{selected.screen.screenType.name} / {selected.screenType}</span>

                <span className="text-slate-500">시작</span>
                <span>{format(new Date(selected.startTime), 'yyyy. M. d. (eee) HH:mm', { locale: ko })}</span>

                <span className="text-slate-500">종료</span>
                <span>{format(new Date(selected.endTime), 'HH:mm')} ({selected.movie.runtime}분)</span>

                <span className="text-slate-500">예매</span>
                <span className={selected._count.reservations > 0 ? 'text-emerald-400' : 'text-slate-500'}>
                  {selected._count.reservations}건
                </span>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-700 hover:bg-red-800"
                >
                  {deleting ? '삭제 중...' : '삭제'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelected(null)}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  닫기
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
