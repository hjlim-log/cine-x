import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MoviesService {
  constructor(private readonly prisma: PrismaService) {}

  // 현재 상영 중인 영화 (미래 스케줄이 하나라도 있는 영화)
  async findAll() {
    const movies = await this.prisma.movie.findMany({
      where: {
        screenings: { some: { startTime: { gte: new Date() } } },
      },
      orderBy: { releaseDate: 'desc' },
      include: {
        genres: { include: { genre: true } },
      },
    });

    return movies.map(({ genres, genre: _genre, ...m }) => ({
      ...m,
      genres: genres.map((g) => g.genre.name),
    }));
  }

  async findOne(id: number) {
    const movie = await this.prisma.movie.findUnique({
      where: { id },
      include: {
        genres: { include: { genre: true } },
        people: {
          include: { person: true },
          orderBy: { order: 'asc' },
        },
        media: { orderBy: { order: 'asc' } },
        screenings: {
          where: { startTime: { gte: new Date() } },
          include: {
            screen: { include: { cinema: true, screenType: true } },
          },
          orderBy: { startTime: 'asc' },
        },
      },
    });
    if (!movie) throw new NotFoundException('영화를 찾을 수 없습니다.');

    const {
      genres,
      people,
      media,
      screenings: rawScreenings,
      genre: _genre,
      ...movieFields
    } = movie;

    const screenings = rawScreenings.map((s) => {
      const { screenType: screenTypeObj, ...screenFields } = s.screen;
      return { ...s, screen: { ...screenFields, type: screenTypeObj } };
    });

    const directorEntry = people.find((p) => p.role === '감독');
    const director = directorEntry ? directorEntry.person : null;
    const cast = people
      .filter((p) => p.role === '출연')
      .map(({ person, order }) => ({ ...person, order }));
    const trailer = media.find((m) => m.type === 'trailer') ?? null;
    const stills = media
      .filter((m) => m.type === 'still')
      .map(({ url }) => ({ url }));

    return {
      ...movieFields,
      genres: genres.map((g) => g.genre.name),
      director,
      cast,
      trailer: trailer ? { url: trailer.url } : null,
      stills,
      screenings,
    };
  }
}
