import { Request, Response } from 'express';
import { DeliveryNotificationEvent, SupportDeliveryNotificationEvent, NotificationItem, PushSubscriptionRecord } from '../types.ts';

/**
 * Real-Time Notification Server Engine for KantinCep
 * Provides:
 * - Central Server-Sent Events (SSE) connections for live in-app notifications
 * - Event-based delivery notification broadcasting with deduplication / idempotency
 * - Web Push / Service Worker subscription management
 * - Graceful fallback when FCM / Web Push external keys are pending configuration
 */

class RealtimeNotificationHub {
  // Active SSE client connections grouped by userId
  private clientsByUser = new Map<string, Set<Response>>();
  // In-memory cache of dispatched delivery event IDs to prevent duplicate broadcasts
  private dispatchedEventIds = new Set<string>();

  /**
   * Handle incoming Server-Sent Events (SSE) connection from client
   */
  handleSSEConnection(req: Request, res: Response, userId: string): void {
    // Set SSE HTTP response headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    });

    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    // Register client
    if (!this.clientsByUser.has(userId)) {
      this.clientsByUser.set(userId, new Set());
    }
    const userClients = this.clientsByUser.get(userId)!;
    userClients.add(res);

    // Initial greeting event
    const connectPayload = JSON.stringify({
      type: 'connection_established',
      userId,
      timestamp: new Date().toISOString(),
      activeSessions: userClients.size,
    });
    res.write(`event: connected\ndata: ${connectPayload}\n\n`);

    // Keep-alive heartbeat every 25 seconds
    const heartbeat = setInterval(() => {
      try {
        res.write(`event: ping\ndata: {"time":${Date.now()}}\n\n`);
      } catch {
        clearInterval(heartbeat);
      }
    }, 25000);

    // Cleanup on disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      userClients.delete(res);
      if (userClients.size === 0) {
        this.clientsByUser.delete(userId);
      }
    });

    req.on('error', () => {
      clearInterval(heartbeat);
      userClients.delete(res);
    });
  }

  /**
   * Check if user currently has an active in-app SSE connection
   */
  isUserConnected(userId: string): boolean {
    const clients = this.clientsByUser.get(userId);
    return Boolean(clients && clients.size > 0);
  }

  /**
   * Return number of active connections for a user
   */
  getConnectionCount(userId: string): number {
    return this.clientsByUser.get(userId)?.size || 0;
  }

  /**
   * Broadcast a delivery notification to the parent in real-time
   * Guarantees idempotency via eventId
   */
  broadcastDeliveryNotification(event: DeliveryNotificationEvent): {
    success: boolean;
    sentToSSECount: number;
    isDuplicate: boolean;
  } {
    // Check idempotency
    if (this.dispatchedEventIds.has(event.eventId)) {
      console.log(`[RealtimeHub] Duplicate delivery event skipped: ${event.eventId}`);
      return { success: true, sentToSSECount: 0, isDuplicate: true };
    }

    this.dispatchedEventIds.add(event.eventId);
    // Keep set bounded to last 5000 events
    if (this.dispatchedEventIds.size > 5000) {
      const oldest = Array.from(this.dispatchedEventIds).slice(0, 1000);
      for (const id of oldest) {
        this.dispatchedEventIds.delete(id);
      }
    }

    const parentClients = this.clientsByUser.get(event.parentUserId);
    let sentCount = 0;

    if (parentClients && parentClients.size > 0) {
      const dataStr = JSON.stringify(event);
      const message = `event: delivery_notification\ndata: ${dataStr}\n\n`;

      for (const client of parentClients) {
        try {
          client.write(message);
          sentCount++;
        } catch (err) {
          console.error('[RealtimeHub] Failed writing to client:', err);
          parentClients.delete(client);
        }
      }
    }

    console.log(
      `[RealtimeHub] Delivery notification broadcast for event ${event.eventId}: sent to ${sentCount} active client(s) of parent ${event.parentUserId}`
    );

    return {
      success: true,
      sentToSSECount: sentCount,
      isDuplicate: false,
    };
  }

  /**
   * Broadcast a support allocation delivery notification to the assigned teacher in real-time
   * Guarantees idempotency via eventId
   */
  broadcastSupportDeliveryNotification(event: SupportDeliveryNotificationEvent): {
    success: boolean;
    sentToSSECount: number;
    isDuplicate: boolean;
  } {
    // Check idempotency
    if (this.dispatchedEventIds.has(event.eventId)) {
      console.log(`[RealtimeHub] Duplicate support delivery event skipped: ${event.eventId}`);
      return { success: true, sentToSSECount: 0, isDuplicate: true };
    }

    this.dispatchedEventIds.add(event.eventId);
    if (this.dispatchedEventIds.size > 5000) {
      const oldest = Array.from(this.dispatchedEventIds).slice(0, 1000);
      for (const id of oldest) {
        this.dispatchedEventIds.delete(id);
      }
    }

    const teacherClients = this.clientsByUser.get(event.teacherUserId);
    let sentCount = 0;

    if (teacherClients && teacherClients.size > 0) {
      const dataStr = JSON.stringify(event);
      const sseMessage = `event: support_delivery_notification\ndata: ${dataStr}\n\n`;
      const notifMessage = `event: notification\ndata: ${JSON.stringify(event.notification)}\n\n`;

      for (const client of teacherClients) {
        try {
          client.write(sseMessage);
          client.write(notifMessage);
          sentCount++;
        } catch (err) {
          console.error('[RealtimeHub] Failed writing to teacher client:', err);
          teacherClients.delete(client);
        }
      }
    }

    console.log(
      `[RealtimeHub] Support delivery notification broadcast for event ${event.eventId}: sent to ${sentCount} active client(s) of teacher ${event.teacherUserId}`
    );

    return {
      success: true,
      sentToSSECount: sentCount,
      isDuplicate: false,
    };
  }

  /**
   * Generic notification broadcast (e.g. system or support notifications)
   */
  broadcastGeneralNotification(userId: string, notification: NotificationItem): number {
    const clients = this.clientsByUser.get(userId);
    if (!clients || clients.size === 0) return 0;

    const message = `event: notification\ndata: ${JSON.stringify(notification)}\n\n`;
    let count = 0;
    for (const client of clients) {
      try {
        client.write(message);
        count++;
      } catch {
        clients.delete(client);
      }
    }
    return count;
  }
}

export const realtimeHub = new RealtimeNotificationHub();
