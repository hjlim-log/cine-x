export type Cinema = {
  id: number;
  name: string;
  address: string;
  region: string;
  createdAt: string;
};

export type ScreenType = {
  id: number;
  name: string;
  grade: string;
  description: string | null;
};

export type SeatType = {
  id: number;
  name: string;
  additionalPrice: number;
};

export type Screen = {
  id: number;
  name: string;
  totalSeats: number;
  cinemaId: number;
  cinema: Cinema;
  type?: ScreenType;
};

export type Seat = {
  id: number;
  row: string;
  number: number;
  screenId: number;
  type?: SeatType;
};

export type Person = {
  id: number;
  name: string;
  originalName: string | null;
  profileUrl: string | null;
  nationality: string | null;
  birthDate: string | null;
};

export type Movie = {
  id: number;
  title: string;
  runtime: number;
  rating: string;
  genre?: string;
  genres?: string[];
  synopsis: string;
  posterUrl: string | null;
  releaseDate: string;
};

export type Screening = {
  id: number;
  startTime: string;
  endTime: string;
  screenType: string;
  movieId: number;
  screenId: number;
};

export type MovieDetail = Omit<Movie, 'genres'> & {
  genres: string[];
  director: Person | null;
  cast: (Person & { order: number })[];
  trailer: { url: string } | null;
  stills: { url: string }[];
  screenings: (Screening & { screen: Screen })[];
};

export type ScreeningDetail = Screening & {
  movie: Movie;
  screen: Screen & { seats: Seat[] };
  bookedSeatIds: number[];
};

export type Ticket = {
  id: number;
  price: number;
  reservationId: number;
  seatId: number;
  seat: Seat;
};

export type Reservation = {
  id: number;
  orderId: string;
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'FAILED';
  paymentKey?: string | null;
  paidAt?: string | null;
  customerId: number;
  screeningId: number;
  createdAt: string;
  canResumePayment?: boolean;
  customer?: { email: string; name: string };
  tickets: Ticket[];
  screening: Screening & {
    movie: Movie;
    screen: Screen & { cinema: Cinema };
  };
};

export type CinemaListItem = Cinema & { screenCount: number };

export type CinemaScreening = Screening & {
  movie: Movie;
  screen: { id: number; name: string; totalSeats: number; cinemaId: number };
};

export type CinemaDetail = Cinema & {
  screens: { id: number; name: string; totalSeats: number }[];
  screenings: CinemaScreening[];
};
