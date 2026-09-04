import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, softlySessionsTable } from "@workspace/db";
import {
  CreateSessionBody,
  CreateSessionResponse,
  GetSessionResponse,
} from "@workspace/api-zod";
import { getSessionId as readSessionId } from "./session-utils";

const router: IRouter = Router();
const SESSION_COOKIE = "softly_session";
const SESSION_MAX_AGE = 1000 * 60 * 60 * 24 * 365;

type MemorySession = {
  id: string;
  username: string;
  helpPreferences?: string[];
  checkInTime?: string | null;
};

const memorySessions = new Map<string, MemorySession>();

router.get("/session", async (req, res): Promise<void> => {
  const sessionId = readSessionId(req.headers.cookie);

  if (!sessionId) {
    res.json(
      GetSessionResponse.parse({
        sessionId: null,
        username: null,
        isSignedIn: false,
        helpPreferences: [],
        checkInTime: null,
      }),
    );
    return;
  }

  let session: MemorySession | undefined = memorySessions.get(sessionId);

  let userId: string | null = null;
  let email: string | null = null;

  try {
    const [row] = await db
      .select()
      .from(softlySessionsTable)
      .where(eq(softlySessionsTable.id, sessionId));
    if (row) {
      session = {
        id: row.id,
        username: row.username,
        helpPreferences: row.helpPreferences ?? [],
        checkInTime: row.checkInTime ?? null,
      };
      userId = row.userId ?? null;

      if (row.userId) {
        const { softlyUsersTable } = await import("@workspace/db");
        const [u] = await db
          .select()
          .from(softlyUsersTable)
          .where(eq(softlyUsersTable.id, row.userId));
        if (u) {
          email = u.email;
        }
      }
      memorySessions.set(sessionId, session);
    }
  } catch {
    // Database connection fallback
  }

  if (!session) {
    res.clearCookie(SESSION_COOKIE);
    res.json(
      GetSessionResponse.parse({
        sessionId: null,
        userId: null,
        email: null,
        username: null,
        isSignedIn: false,
        helpPreferences: [],
        checkInTime: null,
      }),
    );
    return;
  }

  res.json(
    GetSessionResponse.parse({
      sessionId: session.id,
      userId: userId,
      email: email,
      username: session.username,
      isSignedIn: true,
      helpPreferences: session.helpPreferences ?? [],
      checkInTime: session.checkInTime ?? null,
    }),
  );
});


router.post("/session", async (req, res): Promise<void> => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid session body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let username = parsed.data.username ? parsed.data.username.trim() : "";
  if (!username && parsed.data.email) {
    username = parsed.data.email.split("@")[0] || "friend";
  }
  if (!username) {
    username = "friend";
  }
  username = username.slice(0, 40);

  const helpPreferences = parsed.data.helpPreferences ?? [];
  const checkInTime = parsed.data.checkInTime ?? null;
  const rawEmail = parsed.data.email ? parsed.data.email.trim().toLowerCase() : null;

  const existingSessionId = readSessionId(req.headers.cookie);
  const sessionId = existingSessionId ?? randomUUID();

  let userId: string | null = null;
  let userEmail: string | null = rawEmail;

  if (rawEmail) {
    try {
      const { softlyUsersTable } = await import("@workspace/db");
      let [u] = await db
        .select()
        .from(softlyUsersTable)
        .where(eq(softlyUsersTable.email, rawEmail));
      if (!u) {
        [u] = await db
          .insert(softlyUsersTable)
          .values({ email: rawEmail })
          .returning();
      }
      if (u) {
        userId = u.id;
        userEmail = u.email;
      }
    } catch (err) {
      req.log.info({ err }, "Could not resolve user for email in session");
    }
  }

  let session: MemorySession = {
    id: sessionId,
    username,
    helpPreferences,
    checkInTime,
  };

  try {
    const [row] = await db
      .insert(softlySessionsTable)
      .values({
        id: sessionId,
        userId: userId || undefined,
        username,
        helpPreferences,
        checkInTime,
      })
      .onConflictDoUpdate({
        target: softlySessionsTable.id,
        set: {
          ...(userId ? { userId } : {}),
          username,
          helpPreferences,
          checkInTime,
        },
      })
      .returning();
    if (row) {
      session = {
        id: row.id,
        username: row.username,
        helpPreferences: row.helpPreferences ?? [],
        checkInTime: row.checkInTime ?? null,
      };
      if (row.userId) userId = row.userId;
    }
  } catch (err) {
    req.log.info("Saving session to memory cache");
  }

  memorySessions.set(sessionId, session);

  if (userId && checkInTime) {
    try {
      const { softlyNotificationPreferencesTable } = await import("@workspace/db");
      const [existingPref] = await db
        .select()
        .from(softlyNotificationPreferencesTable)
        .where(eq(softlyNotificationPreferencesTable.userId, userId));

      if (existingPref) {
        await db
          .update(softlyNotificationPreferencesTable)
          .set({ preferredTimeSlot: checkInTime })
          .where(eq(softlyNotificationPreferencesTable.id, existingPref.id));
      } else {
        await db
          .insert(softlyNotificationPreferencesTable)
          .values({
            userId,
            preferredTimeSlot: checkInTime,
            enabled: true,
          });
      }
    } catch (err) {
      req.log.info({ err }, "Could not sync notification preferences on session update");
    }
  }

  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  res.json(
    CreateSessionResponse.parse({
      sessionId: session.id,
      userId,
      email: userEmail,
      username: session.username,
      isSignedIn: true,
      helpPreferences: session.helpPreferences ?? [],
      checkInTime: session.checkInTime ?? null,
    }),
  );
});

export default router;