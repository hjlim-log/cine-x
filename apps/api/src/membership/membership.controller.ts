import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { MembershipService } from './membership.service';

@Controller('membership')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get('grades')
  getAllGrades() {
    return this.membershipService.getAllGrades();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyMembership(@GetUser() user: { id: number }) {
    return this.membershipService.getMyMembership(user.id);
  }
}
