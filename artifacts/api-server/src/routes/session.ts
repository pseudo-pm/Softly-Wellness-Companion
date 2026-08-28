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

router.get("/session", async (req, res): Promise<void> => {
  const sessionId = readSessionId(req.headers.cookie);

  if (!sessionId) {
    res.json(
      GetSessionResponse.parse({
        sessionId: null,
        username: null,
        isSignedIn: false,
      }),
    );
    return;
  }

  const [session] = await db
    .select()
    .from(softlySessionsTable)
    .where(eq(softlySessionsTable.id, sessionId));

  if (!session) {
    res.clearCookie(SESSION_COOKIE);
    res.json(
      GetSessionResponse.parse({
        sessionId: null,
        username: null,
        isSignedIn: false,
      }),
    );
    return;
  }

  res.json(
    GetSessionResponse.parse({
      sessionId: session.id,
      username: session.username,
      isSignedIn: true,
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

  const username = parsed.data.username.trim();
  if (!username) {
    res.status(400).json({ error: "Please enter a name." });
    return;
  }

  const existingSessionId = readSessionId(req.headers.cookie);
  const sessionId = existingSessionId ?? randomUUID();
  const [session] = await db
    .insert(softlySessionsTable)
    .values({ id: sessionId, username })
    .onConflictDoUpdate({
      target: softlySessionsTable.id,
      set: { username },
    })
    .returning();

  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
  res.json(
    CreateSessionResponse.parse({
      sessionId: session.id,
      username: session.username,
      isSignedIn: true,
    }),
  );
});

export default router;