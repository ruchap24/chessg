import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';
import { createRedisClient } from '../config/redis.config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  private redis = createRedisClient();

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async registerGuest(): Promise<{ user: User; tokens: { accessToken: string; refreshToken: string } }> {
    const username = `Guest_${uuidv4().substring(0, 8)}`;
    const email = `guest_${uuidv4()}@temp.com`;

    const user = await this.userService.create({
      username,
      email,
      isGuest: true,
      eloRating: 1200,
    });

    const tokens = await this.generateTokens(user);
    await this.storeGuestSession(user.id, tokens.refreshToken);

    return { user, tokens };
  }

  async loginGuest(username: string): Promise<{ user: User; tokens: { accessToken: string; refreshToken: string } }> {
    const user = await this.userService.findByUsername(username);
    
    if (!user || !user.isGuest) {
      throw new UnauthorizedException('Guest user not found');
    }

    const tokens = await this.generateTokens(user);
    await this.storeGuestSession(user.id, tokens.refreshToken);

    return { user, tokens };
  }

  async googleLogin(googleProfile: any): Promise<{ user: User; tokens: { accessToken: string; refreshToken: string } }> {
    let user = await this.userService.findByGoogleId(googleProfile.googleId);

    if (!user) {
      user = await this.userService.findByEmail(googleProfile.email);
      
      if (user) {
        user.googleId = googleProfile.googleId;
        await this.userRepository.save(user);
      } else {
        const username = googleProfile.email.split('@')[0] + '_' + uuidv4().substring(0, 6);
        user = await this.userService.create({
          email: googleProfile.email,
          username,
          googleId: googleProfile.googleId,
          isGuest: false,
          eloRating: 1200,
        });
      }
    }

    const tokens = await this.generateTokens(user);
    return { user, tokens };
  }

  async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRATION') || '7d',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '30d',
    });

    return { accessToken, refreshToken };
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.userService.findById(userId);
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const user = await this.userService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async storeGuestSession(userId: string, refreshToken: string): Promise<void> {
    const key = `guest_session:${userId}`;
    await this.redis.setex(key, 86400, refreshToken); // 24 hours
  }

  async validateGuestSession(userId: string, refreshToken: string): Promise<boolean> {
    const key = `guest_session:${userId}`;
    const stored = await this.redis.get(key);
    return stored === refreshToken;
  }
}

