import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('Email already registered');

    // Volunteers need admin approval, others are auto-approved
    const isApproved = dto.role !== 'volunteer';

    const user = await this.prisma.user.create({
      data: {
        ...dto,
        password: await bcrypt.hash(dto.password, 10),
        isApproved,
        approvedAt: isApproved ? new Date() : null,
      },
    });
    return this.buildToken(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Allow volunteers to log in even if pending approval
    // Frontend will show a banner about pending status
    return this.buildToken(user);
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        regionId: true,
        notificationPreferences: true,
        isApproved: true,
        approvedAt: true,
        approvedBy: true,
        createdAt: true,
      },
    });
  }

  private buildToken(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    isApproved?: boolean;
    approvedAt?: Date | null;
  }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isApproved: user.isApproved ?? true,
        approvedAt: user.approvedAt,
      },
    };
  }
}
