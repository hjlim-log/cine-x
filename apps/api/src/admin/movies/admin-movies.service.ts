import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';

@Injectable()
export class AdminMoviesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: { search?: string; genre?: string }) {
    return this.prisma.movie.findMany({
      where: {
        ...(filter.search && {
          title: { contains: filter.search, mode: 'insensitive' },
        }),
        ...(filter.genre && {
          genres: { some: { genre: { name: filter.genre } } },
        }),
      },
      include: {
        genres: { include: { genre: true } },
        _count: { select: { screenings: true } },
      },
      orderBy: { releaseDate: 'desc' },
    });
  }

  async getOne(id: number) {
    const movie = await this.prisma.movie.findUnique({
      where: { id },
      include: {
        genres: { include: { genre: true } },
        people: { include: { person: true }, orderBy: { order: 'asc' } },
        media: { orderBy: { order: 'asc' } },
      },
    });
    if (!movie) throw new NotFoundException('영화가 없습니다.');
    return movie;
  }

  async create(dto: CreateMovieDto) {
    return this.prisma.movie.create({
      data: {
        title: dto.title,
        runtime: dto.runtime,
        rating: dto.rating,
        genre: dto.genres[0] ?? 'ETC',
        synopsis: dto.synopsis,
        posterUrl: dto.posterUrl,
        releaseDate: new Date(dto.releaseDate),
        genres: {
          create: dto.genres.map((name) => ({
            genre: { connect: { name } },
          })),
        },
      },
      include: { genres: { include: { genre: true } } },
    });
  }

  async update(id: number, dto: UpdateMovieDto) {
    await this.getOne(id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.genres) {
        await tx.movieGenre.deleteMany({ where: { movieId: id } });
      }

      return tx.movie.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.runtime !== undefined && { runtime: dto.runtime }),
          ...(dto.rating !== undefined && { rating: dto.rating }),
          ...(dto.synopsis !== undefined && { synopsis: dto.synopsis }),
          ...(dto.posterUrl !== undefined && { posterUrl: dto.posterUrl }),
          ...(dto.releaseDate !== undefined && {
            releaseDate: new Date(dto.releaseDate),
          }),
          ...(dto.genres && {
            genre: dto.genres[0] ?? 'ETC',
            genres: {
              create: dto.genres.map((name) => ({
                genre: { connect: { name } },
              })),
            },
          }),
        },
        include: { genres: { include: { genre: true } } },
      });
    });
  }

  async delete(id: number) {
    await this.getOne(id);

    const screeningCount = await this.prisma.screening.count({
      where: { movieId: id },
    });
    if (screeningCount > 0) {
      throw new BadRequestException(
        '상영 스케줄이 있는 영화는 삭제할 수 없습니다.',
      );
    }

    return this.prisma.movie.delete({ where: { id } });
  }
}
