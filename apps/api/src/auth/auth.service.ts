import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CouponsService } from '../coupons/coupons.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly couponsService: CouponsService,
  ) {}

  async signup(dto: SignupDto) {
    const exists = await this.prisma.customer.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('이미 사용 중인 이메일입니다.');

    const hashed = await bcrypt.hash(dto.password, 10);
    const customer = await this.prisma.customer.create({
      data: { email: dto.email, password: hashed, name: dto.name, phone: dto.phone },
    });

    await this.couponsService.issueWelcomeCoupons(customer.id);

    const token = this.sign(customer.id, customer.email, customer.role);
    return { token };
  }

  async login(dto: LoginDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { email: dto.email },
    });
    if (!customer) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

    const valid = await bcrypt.compare(dto.password, customer.password);
    if (!valid) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

    const token = this.sign(customer.id, customer.email, customer.role);
    const { password: _pw, ...user } = customer;
    return { token, user };
  }

  private sign(id: number, email: string, role: string): string {
    return this.jwt.sign({ sub: id, email, role });
  }
}
