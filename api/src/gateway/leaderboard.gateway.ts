import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
})
export class LeaderboardGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('LeaderboardGateway');
  private connectedUsers: Map<string, string> = new Map(); // socketId -> userId

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedUsers.delete(client.id);
  }

  // Methods to emit events from other services
  emitLeaderboardUpdate(data: any) {
    this.server.emit('leaderboard:update', {
      type: 'score',
      payload: data,
      timestamp: new Date().toISOString(),
    });
  }

  emitMatchApproved(matchId: string, scores: any[]) {
    this.server.emit('match:approved', {
      matchId,
      scores,
      timestamp: new Date().toISOString(),
    });
    this.emitLeaderboardUpdate({ matchId, scores });
  }

  emitMatchSubmitted(matchId: string) {
    this.server.emit('match:submitted', {
      matchId,
      timestamp: new Date().toISOString(),
    });
  }

  emitScheduledMatchCreated(matchId: string) {
    this.server.emit('scheduled-match:created', {
      matchId,
      timestamp: new Date().toISOString(),
    });
  }

  emitScheduledMatchUpdated(matchId: string) {
    this.server.emit('scheduled-match:updated', {
      matchId,
      timestamp: new Date().toISOString(),
    });
  }

  emitScheduledMatchCancelled(matchId: string) {
    this.server.emit('scheduled-match:cancelled', {
      matchId,
      timestamp: new Date().toISOString(),
    });
  }

  // Presence tracking
  setUserOnline(socketId: string, userId: string) {
    this.connectedUsers.set(socketId, userId);
    this.server.emit('presence:online', { userId });
  }

  setUserOffline(userId: string) {
    this.server.emit('presence:offline', { userId });
  }

  // Get connected users count
  getConnectedCount(): number {
    return this.server?.sockets?.sockets?.size || 0;
  }
}
