import { Router, type IRouter, type Request } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  softlyNotificationPreferencesTable,
  softlySessionsTable,
  softlyEntriesTable,
  softlyActivityLogTable,
} from "@workspace/db";
import {
  GetNotificationPreferencesResponse,
  UpdateNotificationPreferencesBody,
  UpdateNotificationPreferencesResponse,
  LogNotificationEngagementBody,
  LogNotificationEngagementResponse,
} from "@workspace/api-zod";
import { getSessionId as readSessionId } from "./session-utils";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// GET /api/notifications/preferences
router.get("/notifications/preferences", async (req: Request, res: any): Promise<void> => {
  const sessionId = readSessionId(req.headers.cookie);
  const today = new Date().toISOString().slice(0, 10);
  let userId: string | null = null;
  let checkedInToday = false;
  let preferredTimeSlot = "19:00-21:00";
  let enabled = true;

  if (sessionId) {
    try {
      const [s] = await db.select().from(softlySessionsTable).where(eq(softlySessionsTable.id, sessionId));
      if (s) {
        userId = s.userId ?? null;
        if (s.checkInTime) preferredTimeSlot = s.checkInTime;
      }

      // Check if user has checked in today
      const [todayEntry] = await db
        .select()
        .from(softlyEntriesTable)
        .where(
          and(
            eq(softlyEntriesTable.sessionId, sessionId),
            eq(softlyEntriesTable.entryDate, today),
          ),
        );
      if (todayEntry) {
        checkedInToday = true;
      }
    } catch {
      // ignore
    }

    if (userId) {
      try {
        const [pref] = await db
          .select()
          .from(softlyNotificationPreferencesTable)
          .where(eq(softlyNotificationPreferencesTable.userId, userId));
        if (pref) {
          preferredTimeSlot = pref.preferredTimeSlot;
          enabled = pref.enabled;
        }
      } catch {
        // ignore
      }
    }
  }

  res.json(
    GetNotificationPreferencesResponse.parse({
      preferredTimeSlot,
      enabled,
      checkedInToday,
    }),
  );
});

// POST /api/notifications/preferences
router.post("/notifications/preferences", async (req: Request, res: any): Promise<void> => {
  const parsed = UpdateNotificationPreferencesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid notification preferences input." });
    return;
  }

  const { preferredTimeSlot, enabled } = parsed.data;
  const sessionId = readSessionId(req.headers.cookie);
  const today = new Date().toISOString().slice(0, 10);
  let userId: string | null = null;
  let checkedInToday = false;

  if (sessionId) {
    try {
      const [s] = await db.select().from(softlySessionsTable).where(eq(softlySessionsTable.id, sessionId));
      if (s) {
        userId = s.userId ?? null;
        await db
          .update(softlySessionsTable)
          .set({ checkInTime: preferredTimeSlot })
          .where(eq(softlySessionsTable.id, sessionId));
      }

      const [todayEntry] = await db
        .select()
        .from(softlyEntriesTable)
        .where(
          and(
            eq(softlyEntriesTable.sessionId, sessionId),
            eq(softlyEntriesTable.entryDate, today),
          ),
        );
      if (todayEntry) checkedInToday = true;
    } catch {
      // ignore
    }

    if (userId) {
      try {
        const [existing] = await db
          .select()
          .from(softlyNotificationPreferencesTable)
          .where(eq(softlyNotificationPreferencesTable.userId, userId));

        if (existing) {
          await db
            .update(softlyNotificationPreferencesTable)
            .set({ preferredTimeSlot, enabled })
            .where(eq(softlyNotificationPreferencesTable.id, existing.id));
        } else {
          await db
            .insert(softlyNotificationPreferencesTable)
            .values({
              userId,
              preferredTimeSlot,
              enabled,
            });
        }
      } catch (err) {
        logger.warn({ err }, "Could not update notification preferences in DB");
      }
    }

    try {
      await db.insert(softlyActivityLogTable).values({
        userId,
        sessionId: sessionId || null,
        activityType: "notification_preferences_updated",
        status: "completed",
        metadata: { preferredTimeSlot, enabled },
      });
    } catch {
      // ignore
    }
  }

  res.json(
    UpdateNotificationPreferencesResponse.parse({
      preferredTimeSlot,
      enabled,
      checkedInToday,
    }),
  );
});

// POST /api/notifications/log-engagement
router.post("/notifications/log-engagement", async (req: Request, res: any): Promise<void> => {
  const parsed = LogNotificationEngagementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid log engagement body." });
    return;
  }

  const { action, timeSlot } = parsed.data;
  const sessionId = readSessionId(req.headers.cookie);
  let userId: string | null = null;

  if (sessionId) {
    try {
      const [s] = await db.select().from(softlySessionsTable).where(eq(softlySessionsTable.id, sessionId));
      if (s) userId = s.userId ?? null;
    } catch {
      // ignore
    }
  }

  try {
    await db.insert(softlyActivityLogTable).values({
      userId,
      sessionId: sessionId || null,
      activityType: `reminder_${action}`,
      status: "completed",
      metadata: { action, timeSlot },
    });
  } catch (err) {
    logger.warn({ err, action }, "Could not log notification engagement activity");
  }

  res.json(LogNotificationEngagementResponse.parse({ success: true }));
});

export default router;

