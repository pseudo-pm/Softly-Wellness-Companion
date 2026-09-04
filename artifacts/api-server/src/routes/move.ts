import { Router, type IRouter, type Request } from "express";
import { eq, or, inArray } from "drizzle-orm";
import { db, softlyActivityLogTable, softlySessionsTable } from "@workspace/db";
import {
  GetMoveRecommendationBody,
  GetMoveRecommendationResponse,
  ListMoveVideosResponse,
} from "@workspace/api-zod";
import { getSessionId as readSessionId } from "./session-utils";
import { logger } from "../lib/logger";

const router: IRouter = Router();

type MoveVideoItem = {
  id: string;
  title: string;
  duration: string;
  description: string;
  href: string;
  thumbnail: string;
  tags: string[];
};

const MOVE_CATALOG: MoveVideoItem[] = [
  {
    id: "ml6cT4AZdqI",
    title: "10 Min Walk in Place Workout",
    duration: "10 min",
    description: "An easy, low-impact indoor walk to get your steps in without leaving the room.",
    href: "https://www.youtube.com/watch?v=ml6cT4AZdqI",
    thumbnail: "https://i.ytimg.com/vi/ml6cT4AZdqI/hqdefault.jpg",
    tags: ["walking", "steps", "light cardio", "indoor"],
  },
  {
    id: "zumba-15",
    title: "15 Min Fun Upbeat Zumba Dance Workout",
    duration: "15 min",
    description: "High-energy, joyful Latin dance moves and Zumba rhythm to boost your mood.",
    href: "https://www.youtube.com/watch?v=mZeFvXF_mE8",
    thumbnail: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80",
    tags: ["zumba", "dance", "latin", "upbeat", "fun", "cardio", "music"],
  },
  {
    id: "zumba-10",
    title: "10 Min Easy Latin Zumba Dance Break",
    duration: "10 min",
    description: "Quick, energetic Zumba dance break to shake off stress and fatigue.",
    href: "https://www.youtube.com/watch?v=8DZktowZo_k",
    thumbnail: "https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?auto=format&fit=crop&w=600&q=80",
    tags: ["zumba", "dance", "break", "energy", "rhythm"],
  },
  {
    id: "g_tea8ZNk5A",
    title: "10 Min Full Body Gentle Stretch",
    duration: "10 min",
    description: "A slow, relaxing stretch for shoulders, neck, back, and hips.",
    href: "https://www.youtube.com/watch?v=g_tea8ZNk5A",
    thumbnail: "https://i.ytimg.com/vi/g_tea8ZNk5A/hqdefault.jpg",
    tags: ["stretching", "full body", "relaxing", "stiff"],
  },
  {
    id: "v7AYKMP6rOE",
    title: "15 Min Beginner Yoga Flow",
    duration: "15 min",
    description: "A calm, grounding yoga flow with plenty of breathing space.",
    href: "https://www.youtube.com/watch?v=v7AYKMP6rOE",
    thumbnail: "https://i.ytimg.com/vi/v7AYKMP6rOE/hqdefault.jpg",
    tags: ["yoga", "flow", "beginner", "grounding"],
  },
  {
    id: "SedzswEwpPw",
    title: "8 Min Desk-Side Mobility",
    duration: "8 min",
    description: "Friendly mobility movements for long sitting days at your desk.",
    href: "https://www.youtube.com/watch?v=SedzswEwpPw",
    thumbnail: "https://i.ytimg.com/vi/SedzswEwpPw/hqdefault.jpg",
    tags: ["desk", "sitting", "workday", "mobility"],
  },
  {
    id: "2L2lnxIou00",
    title: "10 Min Gentle Bed Morning Stretch",
    duration: "10 min",
    description: "A soft wake-up stretch sequence you can do right in bed.",
    href: "https://www.youtube.com/watch?v=2L2lnxIou00",
    thumbnail: "https://i.ytimg.com/vi/2L2lnxIou00/hqdefault.jpg",
    tags: ["bed", "morning", "gentle", "tired"],
  },
  {
    id: "gC_L9qAHVJ8",
    title: "12 Min Low Impact Cardio for Energy",
    duration: "12 min",
    description: "Gentle, no-jumping movement to boost your mood without burnout.",
    href: "https://www.youtube.com/watch?v=gC_L9qAHVJ8",
    thumbnail: "https://i.ytimg.com/vi/gC_L9qAHVJ8/hqdefault.jpg",
    tags: ["energy", "cardio", "mood boost", "no jumping"],
  },
  {
    id: "X3-gKFu0CHw",
    title: "10 Min Slow Neck & Shoulder Relief",
    duration: "10 min",
    description: "Soothing tension release for upper body stiffness and computer posture.",
    href: "https://www.youtube.com/watch?v=X3-gKFu0CHw",
    thumbnail: "https://i.ytimg.com/vi/X3-gKFu0CHw/hqdefault.jpg",
    tags: ["neck", "shoulders", "posture", "stiffness"],
  },
  {
    id: "sTANio_2E0Q",
    title: "15 Min Gentle Evening Unwind Stretch",
    duration: "15 min",
    description: "Relaxing bedtime stretch to calm your nervous system for sleep.",
    href: "https://www.youtube.com/watch?v=sTANio_2E0Q",
    thumbnail: "https://i.ytimg.com/vi/sTANio_2E0Q/hqdefault.jpg",
    tags: ["evening", "bedtime", "sleep", "unwind"],
  },
  {
    id: "EN0z5-S_s_8",
    title: "8 Min Quiet Standing Stretch",
    duration: "8 min",
    description: "Zero-equipment standing posture release for quick workday breaks.",
    href: "https://www.youtube.com/watch?v=EN0z5-S_s_8",
    thumbnail: "https://i.ytimg.com/vi/EN0z5-S_s_8/hqdefault.jpg",
    tags: ["standing", "quick", "break", "work"],
  },
  {
    id: "K-PpD8z_L8s",
    title: "10 Min Calm Beginner Pilates",
    duration: "10 min",
    description: "Gentle core & posture alignment at a soft, manageable pace.",
    href: "https://www.youtube.com/watch?v=K-PpD8z_L8s",
    thumbnail: "https://i.ytimg.com/vi/K-PpD8z_L8s/hqdefault.jpg",
    tags: ["pilates", "core", "alignment", "calm"],
  },
  {
    id: "Q2cMMybpP_w",
    title: "12 Min Soft Walking for Stress Relief",
    duration: "12 min",
    description: "Mindful rhythm walk to release mental tension and clear your head.",
    href: "https://www.youtube.com/watch?v=Q2cMMybpP_w",
    thumbnail: "https://i.ytimg.com/vi/Q2cMMybpP_w/hqdefault.jpg",
    tags: ["walking", "stress relief", "mindful", "calm"],
  },
  {
    id: "COp7BR_Dvps",
    title: "15 Min Deep Relaxation Stretch",
    duration: "15 min",
    description: "Restorative floor stretches for quiet evenings and deep relaxation.",
    href: "https://www.youtube.com/watch?v=COp7BR_Dvps",
    thumbnail: "https://i.ytimg.com/vi/COp7BR_Dvps/hqdefault.jpg",
    tags: ["restorative", "relaxation", "floor", "deep stretch"],
  },
];

function smartMoveFallback(rawMood: string): { recommendedTitle: string; reason: string } {
  const lower = rawMood.toLowerCase();

  if (lower.includes("zumba") || lower.includes("dance") || lower.includes("salsa") || lower.includes("rhythm") || lower.includes("latin")) {
    const match = MOVE_CATALOG.find((v) => v.tags.includes("zumba") || v.tags.includes("dance")) || MOVE_CATALOG[1];
    return {
      recommendedTitle: match.title,
      reason: "An upbeat, joyful Zumba dance session to get your energy and rhythm flowing!",
    };
  }

  if (lower.includes("neck") || lower.includes("shoulder") || lower.includes("posture") || lower.includes("desk") || lower.includes("sitting")) {
    const match = MOVE_CATALOG.find((v) => v.id === "X3-gKFu0CHw" || v.id === "SedzswEwpPw") || MOVE_CATALOG[0];
    return {
      recommendedTitle: match.title,
      reason: "A gentle stretch to release stiffness in your neck and shoulders.",
    };
  }

  if (lower.includes("bed") || lower.includes("tired") || lower.includes("sleep") || lower.includes("evening") || lower.includes("unwind")) {
    const match = MOVE_CATALOG.find((v) => v.id === "2L2lnxIou00" || v.id === "sTANio_2E0Q") || MOVE_CATALOG[0];
    return {
      recommendedTitle: match.title,
      reason: "A soft, relaxing stretch you can do right in bed.",
    };
  }

  if (lower.includes("yoga") || lower.includes("flow") || lower.includes("breath")) {
    const match = MOVE_CATALOG.find((v) => v.id === "v7AYKMP6rOE") || MOVE_CATALOG[0];
    return {
      recommendedTitle: match.title,
      reason: "A calm, grounding yoga flow with plenty of breathing space.",
    };
  }

  let bestMatch = MOVE_CATALOG[0];
  let bestScore = -1;

  for (const item of MOVE_CATALOG) {
    let score = 0;
    for (const tag of item.tags) {
      if (lower.includes(tag.toLowerCase())) score += 3;
    }
    if (lower.includes(item.title.toLowerCase())) score += 5;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }

  return {
    recommendedTitle: bestMatch.title,
    reason: `A gentle movement session matched to help you move lightly today.`,
  };
}

type CacheEntry = {
  recommendedTitle: string;
  reason: string;
  timestamp: number;
};

// 24-Hour Cache for Move AI Recommendations
const moveRecommendationCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// GET /api/move/videos
router.get("/move/videos", async (req: Request, res: any): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);
  const sessionId = readSessionId(req.headers.cookie);
  let userId: string | null = null;
  const seenVideoIds = new Set<string>();

  if (sessionId) {
    try {
      const [s] = await db.select().from(softlySessionsTable).where(eq(softlySessionsTable.id, sessionId));
      if (s) userId = s.userId ?? null;

      const pastLogs = await db
        .select()
        .from(softlyActivityLogTable)
        .where(
          or(
            eq(softlyActivityLogTable.sessionId, sessionId),
            userId ? eq(softlyActivityLogTable.userId, userId) : undefined,
          ),
        );

      for (const log of pastLogs) {
        if (log.activityType === "move_view" || log.activityType === "move_recommendation_requested") {
          const meta = log.metadata as any;
          if (Array.isArray(meta?.dailyVideoIds)) {
            meta.dailyVideoIds.forEach((id: string) => seenVideoIds.add(id));
          }
          if (meta?.recommendedTitle) {
            const matched = MOVE_CATALOG.find((v) => v.title === meta.recommendedTitle);
            if (matched) seenVideoIds.add(matched.id);
          }
        }
      }
    } catch {
      // ignore
    }
  }

  const unseenVideos = MOVE_CATALOG.filter((v) => !seenVideoIds.has(v.id));
  const seenVideos = MOVE_CATALOG.filter((v) => seenVideoIds.has(v.id));

  const daySeed = new Date(today).getDate() + new Date(today).getMonth() * 31;
  const availablePool = [...unseenVideos, ...seenVideos];

  const selectedVideos: MoveVideoItem[] = [];
  for (let i = 0; i < 4; i++) {
    const idx = (daySeed + i * 3) % availablePool.length;
    const item = availablePool[idx];
    if (!selectedVideos.some((v) => v.id === item.id)) {
      selectedVideos.push(item);
    }
  }

  for (const item of availablePool) {
    if (selectedVideos.length >= 4) break;
    if (!selectedVideos.some((v) => v.id === item.id)) {
      selectedVideos.push(item);
    }
  }

  try {
    await db.insert(softlyActivityLogTable).values({
      userId,
      sessionId: sessionId || null,
      activityType: "move_view",
      status: "completed",
      metadata: {
        date: today,
        dailyVideoIds: selectedVideos.map((v) => v.id),
      },
    });
  } catch (err) {
    logger.warn({ err }, "Could not log move_view activity");
  }

  res.json(
    ListMoveVideosResponse.parse({
      date: today,
      videos: selectedVideos.map(({ tags, ...v }) => v),
    }),
  );
});

// POST /api/move/recommend
router.post("/move/recommend", async (req: Request, res: any): Promise<void> => {
  const parsed = GetMoveRecommendationBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.mood) {
    res.status(400).json({ error: "Please tell us how you'd like to move right now." });
    return;
  }

  const rawMood = parsed.data.mood.trim();
  const normalizedKey = `move:${rawMood.toLowerCase()}`;

  const cached = moveRecommendationCache.get(normalizedKey);
  let recommendedTitle: string = "";
  let reason: string = "";
  let isCached = false;

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    recommendedTitle = cached.recommendedTitle;
    reason = cached.reason;
    isCached = true;
    logger.info({ rawMood }, "Serving move recommendation from 24h cache");
  } else {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (geminiKey) {
      const catalogStr = MOVE_CATALOG
        .map((item, idx) => `${idx + 1}. "${item.title}" (${item.duration}) - ${item.description} [tags: ${item.tags.join(", ")}]`)
        .join("\n");

      const prompt = `You are Softly, a gentle wellness movement companion.

The user is sharing how they feel or want to move right now:
"${rawMood}"

Here is the available movement video catalog:
${catalogStr}

Your task:
1. Pick 1 single best-fitting video title from the list above.
2. Write a warm, encouraging 1-2 sentence explanation of why this gentle movement is perfect for their current state.

Respond ONLY with valid JSON in this exact structure (no markdown fences, no extra text):
{
  "recommendedTitle": "Exact Video Title",
  "reason": "Warm 1-2 sentence gentle explanation."
}`;

      try {
        const models = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.7-flash", "gemini-flash-latest"];
        let found = false;

        for (const model of models) {
          try {
            const apiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: { temperature: 0.4 },
                }),
              },
            );

            if (apiRes.ok) {
              const data = (await apiRes.json()) as any;
              const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
              const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
              const parsedJson = JSON.parse(cleanJson);
              if (parsedJson.recommendedTitle && parsedJson.reason) {
                recommendedTitle = parsedJson.recommendedTitle;
                reason = parsedJson.reason;
                found = true;
                break;
              }
            }
          } catch {
            // try next model
          }
        }

        if (!found) {
          const fb = smartMoveFallback(rawMood);
          recommendedTitle = fb.recommendedTitle;
          reason = fb.reason;
        }
      } catch {
        const fb = smartMoveFallback(rawMood);
        recommendedTitle = fb.recommendedTitle;
        reason = fb.reason;
      }
    } else {
      const fb = smartMoveFallback(rawMood);
      recommendedTitle = fb.recommendedTitle;
      reason = fb.reason;
    }

    moveRecommendationCache.set(normalizedKey, {
      recommendedTitle,
      reason,
      timestamp: Date.now(),
    });
  }

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
      activityType: "move_recommendation_requested",
      status: "completed",
      metadata: {
        mood: rawMood,
        recommendedTitle,
        reason,
        isCached,
      },
    });
  } catch (err) {
    logger.warn({ err }, "Could not log move_recommendation_requested activity");
  }

  res.json(
    GetMoveRecommendationResponse.parse({
      mood: rawMood,
      recommendedTitle,
      reason,
      isCached,
    }),
  );
});

export default router;
