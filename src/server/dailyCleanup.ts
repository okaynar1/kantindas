import { db } from './db.ts';

let lastRunDateString = '';

/**
 * Executes end-of-day order archiving:
 * Archives completed (delivered) and cancelled orders from the active operational board.
 * Preserves all financial reports, payments, stock movements, and audit records.
 */
export function executeEndOfDayArchive(schoolId?: string, actorId = 'system'): { archivedCount: number } {
  const result = db.archiveCompletedOrders(schoolId);

  db.addAuditLog({
    actorUserId: actorId,
    actorName: actorId === 'system' ? 'Otomatik Sistem Temizliği' : 'Kantin / Kurum İdaresi',
    actorRole: actorId === 'system' ? 'admin' : 'canteen',
    action: 'CANTEEN_END_OF_DAY_ARCHIVE',
    entityType: 'order',
    entityId: schoolId || 'all',
    schoolId: schoolId,
    details: `Gün sonu sipariş arşivleme tamamlandı. ${result.archivedCount} adet tamamlanmış sipariş ertesi güne temiz ekran sağlamak amacıyla arşive aktarıldı.`,
  });

  console.log(`[Daily Cleanup] Archived ${result.archivedCount} orders for school: ${schoolId || 'all'}`);
  return result;
}

/**
 * Background scheduler that monitors Turkey Time (Europe/Istanbul UTC+3).
 * Triggers every day at 23:59 TSİ to clear the day's completed orders.
 */
export function startDailyCleanupScheduler(): () => void {
  console.log('[Daily Cleanup] Scheduler initialized for 23:59 Turkey Time (Europe/Istanbul).');

  const checkInterval = setInterval(() => {
    try {
      const now = new Date();
      // Format in Europe/Istanbul time zone
      const trFormatter = new Intl.DateTimeFormat('tr-TR', {
        timeZone: 'Europe/Istanbul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const parts = trFormatter.formatToParts(now);
      const partObj: Record<string, string> = {};
      parts.forEach(p => {
        partObj[p.type] = p.value;
      });

      const dateStr = `${partObj.year}-${partObj.month}-${partObj.day}`;
      const hour = parseInt(partObj.hour, 10);
      const minute = parseInt(partObj.minute, 10);

      // Check if it's 23:59 and has not yet run for this day
      if (hour === 23 && minute === 59 && lastRunDateString !== dateStr) {
        lastRunDateString = dateStr;
        console.log(`[Daily Cleanup] 23:59 TSİ reached (${dateStr}). Starting automatic order archive...`);
        executeEndOfDayArchive(undefined, 'system');
      }
    } catch (err) {
      console.warn('[Daily Cleanup] Scheduler check error:', err);
    }
  }, 30000); // Check every 30 seconds

  return () => clearInterval(checkInterval);
}
