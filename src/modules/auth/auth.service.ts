import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
}

@Injectable()
export class AuthService {
  private users: Map<string, User & { password: string }> = new Map();

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {
    // Initialize with a default admin user
    this.initDefaultUsers();
  }

  private async initDefaultUsers() {
    const adminPassword = await bcrypt.hash('admin123', 10);
    const userPassword = await bcrypt.hash('user123', 10);

    this.users.set('admin@iotsec.com', {
      id: '1',
      email: 'admin@iotsec.com',
      name: 'Admin User',
      role: 'admin',
      password: adminPassword,
      createdAt: new Date(),
    });

    this.users.set('user@iotsec.com', {
      id: '2',
      email: 'user@iotsec.com',
      name: 'Regular User',
      role: 'user',
      password: userPassword,
      createdAt: new Date(),
    });

    console.log('✅ [AUTH] Default users initialized');
    console.log('   Admin: admin@iotsec.com / admin123');
    console.log('   User:  user@iotsec.com / user123');
  }

  async register(email: string, password: string, name: string) {
    // Check if user already exists
    if (this.users.has(email)) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user: User & { password: string } = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      name,
      role: 'user',
      password: hashedPassword,
      createdAt: new Date(),
    };

    this.users.set(email, user);

    // Generate JWT token
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    console.log('✅ [AUTH] User registered:', email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    };
  }

  async login(email: string, password: string) {
    const user = this.users.get(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    console.log('✅ [AUTH] User logged in:', email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    };
  }

  async validateUser(userId: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.id === userId) {
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
        };
      }
    }
    return null;
  }

  async getProfile(userId: string) {
    const user = await this.validateUser(userId);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}