import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients = new Set<string>();

  handleConnection(client: Socket) {
    this.connectedClients.add(client.id);
    console.log(`✅ Client connected: ${client.id} (Total: ${this.connectedClients.size})`);
    
    client.emit('connected', {
      message: 'Connected to IoT Security Audit WebSocket',
      clientId: client.id,
    });
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    console.log(`❌ Client disconnected: ${client.id} (Total: ${this.connectedClients.size})`);
  }

  // Broadcast device update
  broadcastDeviceUpdate(device: any) {
    this.server.emit('deviceUpdate', device);
  }

  // Broadcast scan update
  broadcastScanUpdate(scan: any) {
    this.server.emit('scanUpdate', scan);
  }

  // Broadcast vulnerability discovered
  broadcastVulnerability(vulnerability: any) {
    this.server.emit('vulnerability', vulnerability);
  }

  // Broadcast metrics update
  broadcastMetricsUpdate(metrics: any) {
    this.server.emit('metricsUpdate', metrics);
  }

  // Broadcast activity
  broadcastActivity(activity: any) {
    this.server.emit('activity', activity);
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket) {
    return { event: 'pong', data: { timestamp: new Date().toISOString() } };
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }
}