import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request } from "express";
import { eq, and, gt, isNull } from "drizzle-orm";
import {
  db,
  softlyUsersTable,
  softlySessionsTable,
  softlyMagicLinkTokensTable,
  softlyActivityLogTable,
} from "@workspace/db";
import {
  SendMagicLinkBody,
  SendMagicLinkResponse,
  VerifyMagicLinkBody,
  LogoutResponse,
  GetSessionResponse,
} from "@workspace/api-zod";
import { getSessionId as readSessionId } from "./session-utils";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const SESSION_COOKIE = "softly_session";
const SESSION_MAX_AGE = 1000 * 60 * 60 * 24 * 365;

// Helper to send email via Resend or log to console
async function sendMagicLinkEmail(email: string, magicLinkUrl: string): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (resendApiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "Softly Companion <onboarding@resend.dev>",
          to: [email],
          subject: "Your Softly Magic Link",
          html: `
            <div style="font-family: serif; padding: 24px; color: #2d3748; max-width: 500px; margin: 0 auto; background: #faf8f5; border-radius: 12px;">
              <h2 style="color: #2c4a3e; margin-top: 0;">Welcome back to Softly</h2>
              <p style="font-size: 16px; line-height: 1.6;">Click the button below to sign in to your private wellness space. No password needed.</p>
              <div style="margin: 32px 0; text-align: center;">
                <a href="${magicLinkUrl}" style="background-color: #2c4a3e; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 24px; font-size: 16px; display: inline-block; font-weight: 500;">
                  Open My Softly Space →
                </a>
              </div>
              <p style="font-size: 13px; color: #718096; text-align: center;">If you didn't request this email, you can safely ignore it. This link expires in 15 minutes.</p>
            </div>
          `,
        }),
      });

      if (response.ok) {
        logger.info({ email }, "Magic link email sent successfully via Resend");
        return true;
      } else {
        const errorData = await response.text();
        logger.warn({ email, errorData }, "Resend API returned non-OK status");
      }
    } catch (err) {
      logger.error({ err, email }, "Failed to send email via Resend");
    }
  }

  // Console log for local dev testing
  console.log("\n=================================================================");
  console.log(`✨ [DEV MAGIC LINK] For ${email}:`);
  console.log(`👉 ${magicLinkUrl}`);
  console.log("=================================================================\n");
  return true;
}

// 1. POST /api/auth/magic-link
router.post("/auth/magic-link", async (req: Request, res: any): Promise<void> => {
  const parsed = SendMagicLinkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please enter a valid email address." });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "Please enter a valid email address." });
    return;
  }

  try {
    let userId: string;
    const [existingUser] = await db
      .select()
      .from(softlyUsersTable)
      .where(eq(softlyUsersTable.email, email));

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const [newUser] = await db
        .insert(softlyUsersTable)
        .values({ email })
        .returning();
      userId = newUser.id;
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.insert(softlyMagicLinkTokensTable).values({
      email,
      token,
      expiresAt,
    });

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const magicLinkUrl = `${appUrl}/auth/verify?token=${token}`;

    await sendMagicLinkEmail(email, magicLinkUrl);

    const sessionId = readSessionId(req.headers.cookie);
    await db.insert(softlyActivityLogTable).values({
      userId,
      sessionId: sessionId || null,
      activityType: "magic_link_requested",
      status: "completed",
      metadata: { email },
    });

    res.json(
      SendMagicLinkResponse.parse({
        success: true,
        message: `Magic link sent to ${email}`,
        devMagicLink: magicLinkUrl,
      }),
    );
  } catch (err) {
    logger.error({ err, email }, "Error generating magic link");
    res.status(500).json({ error: "Could not generate magic link. Please try again." });
  }
});

// 2. POST /api/auth/verify
router.post("/auth/verify", async (req: Request, res: any): Promise<void> => {
  const parsed = VerifyMagicLinkBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.token) {
    res.status(400).json({ error: "Invalid token." });
    return;
  }

  const token = parsed.data.token.trim();

  try {
    const [tokenRecord] = await db
      .select()
      .from(softlyMagicLinkTokensTable)
      .where(
        and(
          eq(softlyMagicLinkTokensTable.token, token),
          isNull(softlyMagicLinkTokensTable.usedAt),
          gt(softlyMagicLinkTokensTable.expiresAt, new Date()),
        ),
      );

    if (!tokenRecord) {
      res.status(400).json({ error: "Magic link is invalid or has expired." });
      return;
    }

    await db
      .update(softlyMagicLinkTokensTable)
      .set({ usedAt: new Date() })
      .where(eq(softlyMagicLinkTokensTable.id, tokenRecord.id));

    let user = (
      await db
        .select()
        .from(softlyUsersTable)
        .where(eq(softlyUsersTable.email, tokenRecord.email))
    )[0];

    if (!user) {
      [user] = await db
        .insert(softlyUsersTable)
        .values({ email: tokenRecord.email })
        .returning();
    }

    const existingSessionId = readSessionId(req.headers.cookie);
    const sessionId = existingSessionId || randomUUID();
    const defaultUsername = user.email.split("@")[0] || "friend";

    const [session] = await db
      .insert(softlySessionsTable)
      .values({
        id: sessionId,
        userId: user.id,
        username: defaultUsername,
        helpPreferences: [],
        checkInTime: null,
      })
      .onConflictDoUpdate({
        target: softlySessionsTable.id,
        set: {
          userId: user.id,
        },
      })
      .returning();

    res.cookie(SESSION_COOKIE, session.id, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    await db.insert(softlyActivityLogTable).values({
      userId: user.id,
      sessionId: session.id,
      activityType: "user_login",
      status: "completed",
      metadata: { email: user.email },
    });

    res.json(
      GetSessionResponse.parse({
        sessionId: session.id,
        userId: user.id,
        email: user.email,
        username: session.username,
        isSignedIn: true,
        helpPreferences: session.helpPreferences ?? [],
        checkInTime: session.checkInTime ?? null,
      }),
    );
  } catch (err) {
    logger.error({ err }, "Error verifying magic link token");
    res.status(500).json({ error: "Could not verify magic link. Please try again." });
  }
});

// 3. POST /api/auth/logout
router.post("/auth/logout", async (req: Request, res: any): Promise<void> => {
  const sessionId = readSessionId(req.headers.cookie);
  if (sessionId) {
    try {
      const [session] = await db
        .select()
        .from(softlySessionsTable)
        .where(eq(softlySessionsTable.id, sessionId));

      if (session?.userId) {
        await db.insert(softlyActivityLogTable).values({
          userId: session.userId,
          sessionId: session.id,
          activityType: "user_logout",
          status: "completed",
        });
      }
    } catch {
      // ignore
    }
  }

  res.clearCookie(SESSION_COOKIE);
  res.json(LogoutResponse.parse({ success: true }));
});

export default router;

