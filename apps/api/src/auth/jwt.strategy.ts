import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as Sentry from '@sentry/node';

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_SECRET ?? 'cinema-jwt-secret-key-change-in-prod',
    });
  }

  async validate(payload: JwtPayload) {
    const user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role ?? 'USER',
    };

    // 요청 컨텍스트에 사용자 정보 주입 (beforeSend에서 이메일 마스킹됨)
    Sentry.setUser({ id: user.id.toString(), email: user.email });

    return user;
  }
}
