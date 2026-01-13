import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private connectedClients = new Map<string, Socket>();

  afterInit(server: Server) {
    this.logger.log('🔌 WebSocket Gateway initialized');
    this.logger.log(`   Transport: websocket, polling`);
    this.logger.log(`   Namespace: /`);
  }

  handleConnection(client: Socket) {
    this.connectedClients.set(client.id, client);
    this.logger.log(`✅ Client connected: ${client.id} (Total: ${this.connectedClients.size})`);
    
    // Send welcome message
    client.emit('connected', {
      message: 'Successfully connected to IoT Security Audit System',
      clientId: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`❌ Client disconnected: ${client.id} (Total: ${this.connectedClients.size})`);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): { event: string; data: string } {
    this.logger.debug(`📡 Ping received from ${client.id}`);
    return { event: 'pong', data: 'pong' };
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() data: { channel: string },
    @ConnectedSocket() client: Socket,
  ): { event: string; data: any } {
    this.logger.log(`📻 Client ${client.id} subscribed to ${data.channel}`);
    client.join(data.channel);
    return {
      event: 'subscribed',
      data: { channel: data.channel, success: true },
    };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @MessageBody() data: { channel: string },
    @ConnectedSocket() client: Socket,
  ): { event: string; data: any } {
    this.logger.log(`📻 Client ${client.id} unsubscribed from ${data.channel}`);
    client.leave(data.channel);
    return {
      event: 'unsubscribed',
      data: { channel: data.channel, success: true },
    };
  }

  // ============================================
  // DEVICE EVENTS
  // ============================================

  // Emit device status update
  emitDeviceStatusUpdate(deviceId: string, status: string, data?: any) {
    this.logger.debug(`📤 Emitting device status update: ${deviceId} - ${status}`);
    this.server.emit('deviceStatusUpdate', {
      deviceId,
      status,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  // Broadcast device update (full device object)
  broadcastDeviceUpdate(device: any) {
    this.logger.debug(`📤 Broadcasting device update: ${device.id}`);
    this.server.emit('deviceUpdate', {
      ...device,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit device created
  emitDeviceCreated(device: any) {
    this.logger.debug(`📤 Emitting device created: ${device.id}`);
    this.server.emit('deviceCreated', {
      ...device,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit device deleted
  emitDeviceDeleted(deviceId: string) {
    this.logger.debug(`📤 Emitting device deleted: ${deviceId}`);
    this.server.emit('deviceDeleted', {
      deviceId,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================
  // SCAN EVENTS
  // ============================================

  // Emit scan progress update
  emitScanProgress(scanId: string, deviceId: string, progress: number, status: string) {
    this.logger.debug(`📤 Emitting scan progress: ${scanId} - ${progress}%`);
    this.server.emit('scanProgress', {
      scanId,
      deviceId,
      progress,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit scan completed
  emitScanCompleted(scanId: string, deviceId: string, results: any) {
    this.logger.debug(`📤 Emitting scan completed: ${scanId}`);
    this.server.emit('scanCompleted', {
      scanId,
      deviceId,
      results,
      timestamp: new Date().toISOString(),
    });
  }

  // Broadcast scan update (full scan object) - REQUIRED by scans.service.ts
  broadcastScanUpdate(scan: any) {
    this.logger.debug(`📤 Broadcasting scan update: ${scan.id}`);
    this.server.emit('scanUpdate', {
      ...scan,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit scan started
  emitScanStarted(scan: any) {
    this.logger.debug(`📤 Emitting scan started: ${scan.id}`);
    this.server.emit('scanStarted', {
      ...scan,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit scan failed
  emitScanFailed(scanId: string, error: string) {
    this.logger.debug(`📤 Emitting scan failed: ${scanId}`);
    this.server.emit('scanFailed', {
      scanId,
      error,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================
  // VULNERABILITY EVENTS
  // ============================================

  // Emit new vulnerability detected
  emitNewVulnerability(vulnerability: any) {
    this.logger.debug(`📤 Emitting new vulnerability: ${vulnerability.id}`);
    this.server.emit('newVulnerability', {
      ...vulnerability,
      timestamp: new Date().toISOString(),
    });
  }

  // Broadcast vulnerability update (full object) - REQUIRED by vulnerabilities.service.ts
  broadcastVulnerabilityUpdate(vulnerability: any) {
    this.logger.debug(`📤 Broadcasting vulnerability update: ${vulnerability.id}`);
    this.server.emit('vulnerabilityUpdate', {
      ...vulnerability,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit vulnerability resolved
  emitVulnerabilityResolved(vulnerabilityId: string) {
    this.logger.debug(`📤 Emitting vulnerability resolved: ${vulnerabilityId}`);
    this.server.emit('vulnerabilityResolved', {
      vulnerabilityId,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit vulnerability reopened
  emitVulnerabilityReopened(vulnerabilityId: string) {
    this.logger.debug(`📤 Emitting vulnerability reopened: ${vulnerabilityId}`);
    this.server.emit('vulnerabilityReopened', {
      vulnerabilityId,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================
  // REPORT EVENTS
  // ============================================

  // Broadcast report generated - REQUIRED by reports.service.ts
  broadcastReportGenerated(report: any) {
    this.logger.debug(`📤 Broadcasting report generated: ${report.id}`);
    this.server.emit('reportGenerated', {
      ...report,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit report generation started
  emitReportGenerationStarted(reportId: string) {
    this.logger.debug(`📤 Emitting report generation started: ${reportId}`);
    this.server.emit('reportGenerationStarted', {
      reportId,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit report generation failed
  emitReportGenerationFailed(reportId: string, error: string) {
    this.logger.debug(`📤 Emitting report generation failed: ${reportId}`);
    this.server.emit('reportGenerationFailed', {
      reportId,
      error,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================
  // ANALYTICS EVENTS
  // ============================================

  // Emit real-time analytics update
  emitAnalyticsUpdate(data: any) {
    this.logger.debug(`📤 Emitting analytics update`);
    this.server.emit('analyticsUpdate', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit dashboard metrics update
  emitDashboardMetricsUpdate(metrics: any) {
    this.logger.debug(`📤 Emitting dashboard metrics update`);
    this.server.emit('dashboardMetrics', {
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================
  // ALERT & NOTIFICATION EVENTS
  // ============================================

  // Emit alert/notification
  emitAlert(type: string, message: string, severity: string, data?: any) {
    this.logger.debug(`📤 Emitting alert: ${type} - ${severity}`);
    this.server.emit('alert', {
      type,
      message,
      severity,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit system notification
  emitNotification(title: string, message: string, type: string = 'info') {
    this.logger.debug(`📤 Emitting notification: ${title}`);
    this.server.emit('notification', {
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================
  // GENERIC BROADCAST METHODS
  // ============================================

  // Broadcast to specific channel
  broadcastToChannel(channel: string, event: string, data: any) {
    this.logger.debug(`📤 Broadcasting to channel ${channel}: ${event}`);
    this.server.to(channel).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // Broadcast to all clients
  broadcast(event: string, data: any) {
    this.logger.debug(`📤 Broadcasting to all: ${event}`);
    this.server.emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit to specific client
  emitToClient(clientId: string, event: string, data: any) {
    const client = this.connectedClients.get(clientId);
    if (client) {
      this.logger.debug(`📤 Emitting to client ${clientId}: ${event}`);
      client.emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
      });
    } else {
      this.logger.warn(`⚠️  Client ${clientId} not found`);
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  // Get connected clients count
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  // Get all connected client IDs
  getConnectedClientIds(): string[] {
    return Array.from(this.connectedClients.keys());
  }

  // Check if client is connected
  isClientConnected(clientId: string): boolean {
    return this.connectedClients.has(clientId);
  }

  // Disconnect specific client
  disconnectClient(clientId: string) {
    const client = this.connectedClients.get(clientId);
    if (client) {
      this.logger.log(`🔌 Manually disconnecting client: ${clientId}`);
      client.disconnect(true);
    }
  }

  // Broadcast system status
  broadcastSystemStatus(status: string, message?: string) {
    this.logger.debug(`📤 Broadcasting system status: ${status}`);
    this.server.emit('systemStatus', {
      status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}