import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): { status: string; message: string; timestamp: string } {
    return {
      status: 'ok',
      message: 'IoT Security Audit System API is running',
      timestamp: new Date().toISOString(),
    };
  }

  getVersion(): { version: string; environment: string } {
    return {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }
}