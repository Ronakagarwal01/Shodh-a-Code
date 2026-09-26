import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { UserEntity, UserRole } from '../entities/user.entity';

export interface RegisterDto {
  username: string;
  displayName: string;
  email: string;
  password: string;
  organization?: string;
  role?: UserRole;
}

export interface LoginDto {
  usernameOrEmail: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({
      where: [{ username: dto.username }, { email: dto.email }],
    });
    if (existing) {
      throw new ConflictException('Username or email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = this.userRepo.create({
      id: `usr-${uuidv4().substring(0, 8)}`,
      username: dto.username,
      displayName: dto.displayName || dto.username,
      email: dto.email,
      passwordHash,
      organization: dto.organization || 'Shodh Academy',
      role: dto.role || UserRole.LEARNER,
    });

    await this.userRepo.save(user);

    const token = this.generateToken(user);
    return {
      accessToken: token,
      user: this.sanitizeUser(user),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: [{ username: dto.usernameOrEmail }, { email: dto.usernameOrEmail }],
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user);
    return {
      accessToken: token,
      user: this.sanitizeUser(user),
    };
  }

  async getMe(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.sanitizeUser(user);
  }

  private generateToken(user: UserEntity): string {
    const payload = {
      sub: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      organization: user.organization,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  private sanitizeUser(user: UserEntity) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      organization: user.organization,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
