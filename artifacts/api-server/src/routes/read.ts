import { Router, type IRouter, type Request } from "express";
import { eq } from "drizzle-orm";
import { db, softlyActivityLogTable, softlySessionsTable } from "@workspace/db";
import { GetReadRecommendationBody, GetReadRecommendationResponse } from "@workspace/api-zod";

import { getSessionId as readSessionId } from "./session-utils";
import { logger } from "../lib/logger";

const router: IRouter = Router();

type CacheEntry = {
  recommendedTitles: string[];
  reason: string;
  timestamp: number;
};

// 24-Hour Cache: normalizedKey -> CacheEntry
const readRecommendationCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const BOOK_CATALOG = [
  { title: "Bridget Jones's Diary", author: "Helen Fielding", theme: "funny, chaotic, cozy, lighthearted diary entries" },
  { title: "Good Omens", author: "Terry Pratchett & Neil Gaiman", theme: "witty comedy, angel and demon partnership, hilarious distraction" },
  { title: "Bossypants", author: "Tina Fey", theme: "sharp, self-deprecating humor, short essay chapters" },
  { title: "Becoming", author: "Michelle Obama", theme: "grounded, inspiring memoir of identity, resilience, and personal growth" },
  { title: "The Palace Papers", author: "Tina Brown", theme: "juicy, sharp, entertaining deep dive into power and monarchy" },
  { title: "She Said", author: "Jodi Kantor & Megan Twohey", theme: "gripping, courageous investigative journalism of women confronting power" },
  { title: "Fascism: A Warning", author: "Madeleine Albright", theme: "sobering, clear-eyed historical reflection on democracy" },
  { title: "What Happened", author: "Hillary Clinton", theme: "candid, reflective, deeply personal political post-mortem" },
  { title: "The Dictator's Handbook", author: "Bruce Bueno de Mesquita & Alastair Smith", theme: "eye-opening, logical breakdown of how power operates" },
  { title: "Convenience Store Woman", author: "Sayaka Murata", theme: "short, quietly quirky novel about living on your own terms" },
  { title: "Kitchen", author: "Banana Yoshimoto", theme: "gentle, melancholic, comforting novella about healing and food" },
  { title: "Norwegian Wood", author: "Haruki Murakami", theme: "nostalgic, atmospheric coming-of-age novel about loss and quiet reflection" },
];

const ALTERNATIVE_CATALOG = [
  { title: "The Art of Doing Nothing", author: "Substack Essay", theme: "gentle permission slip to rest without guilt or anxiety" },
  { title: "A 5-Minute Reset for an Overwhelmed Mind", author: "YouTube Video", theme: "calming visual breathwork and gentle audio guidance for instant calm" },
  { title: "On Being Kind to Yourself Today", author: "Substack Essay", theme: "short thoughts on slowing down when work and life feel too loud" },
  { title: "10 Minutes of Cozy Ambient Rain & Tea", author: "YouTube Video", theme: "soft background ambience for quiet focus, reading, or relaxing" },
];

async function callGeminiForRecommendation(
  mood: string,
  mode: "books" | "alternatives",
  apiKey: string,
): Promise<{ recommendedTitles: string[]; reason: string }> {
  const catalog = mode === "books" ? BOOK_CATALOG : ALTERNATIVE_CATALOG;
  const catalogStr = catalog
    .map((item, idx) => `${idx + 1}. "${item.title}" by ${item.author} (${item.theme})`)
    .join("\n");

  const prompt = `You are Softly, a warm, gentle, and empathetic wellness reading assistant.

The user is sharing what's on their mind right now:
"${mood}"

Here is the available list of recommended items:
${catalogStr}

Your task:
1. Pick 1 or 2 items from the list above that best match their current feeling or mood.
2. Write a warm 1-2 sentence gentle explanation of why these pick(s) will offer good company or comfort right now.

Respond ONLY with valid JSON in this exact structure (no markdown fences, no extra text):
{
  "recommendedTitles": ["Exact Title 1", "Exact Title 2"],
  "reason": "Warm 1-2 sentence gentle explanation."
}`;

  const models = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.7-flash", "gemini-flash-latest"];
  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.4 },
          }),
        },
      );

      if (res.ok) {
        const data = (await res.json()) as any;
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed.recommendedTitles) && typeof parsed.reason === "string") {
          return {
            recommendedTitles: parsed.recommendedTitles.slice(0, 2),
            reason: parsed.reason,
          };
        }
      }
    } catch {
      // try next model
    }
  }

  return smartReadFallback(mood, mode);
}

function smartReadFallback(rawMood: string, mode: "books" | "alternatives"): { recommendedTitles: string[]; reason: string } {
  const catalog = mode === "books" ? BOOK_CATALOG : ALTERNATIVE_CATALOG;
  const lower = rawMood.toLowerCase();

  const stopWords = new Set(["book", "books", "read", "reads", "reading", "recommendation", "recommend", "want", "like", "need", "some", "good", "me", "for", "a", "an", "the"]);
  const words = lower.split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w));

  let bestMatches: typeof catalog = [];
  let highestScore = -1;

  for (const item of catalog) {
    let score = 0;
    const themeLower = item.theme.toLowerCase();
    const titleLower = item.title.toLowerCase();
    const authorLower = item.author.toLowerCase();

    for (const w of words) {
      if (themeLower.includes(w) || titleLower.includes(w) || authorLower.includes(w)) {
        score += 5;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatches = [item];
    } else if (score === highestScore && highestScore > 0) {
      bestMatches.push(item);
    }
  }

  if (bestMatches.length === 0 || highestScore <= 0) {
    const hash = Math.abs(rawMood.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0));
    const idx1 = hash % catalog.length;
    const idx2 = (idx1 + 1) % catalog.length;
    return {
      recommendedTitles: mode === "books" ? [catalog[idx1].title, catalog[idx2].title] : [catalog[idx1].title],
      reason: `A quiet, comforting selection matching your headspace today.`,
    };
  }

  return {
    recommendedTitles: bestMatches.slice(0, 2).map((b) => b.title),
    reason: `A gentle recommendation selected to give you good company right now.`,
  };
}

router.post("/read/recommend", async (req: Request, res: any): Promise<void> => {
  const parsed = GetReadRecommendationBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.mood) {
    res.status(400).json({ error: "Please tell us a little about what's on your mind." });
    return;
  }

  const rawMood = parsed.data.mood.trim();
  const mode = parsed.data.mode || "books";
  const normalizedKey = `${mode}:${rawMood.toLowerCase()}`;

  const cached = readRecommendationCache.get(normalizedKey);
  let recommendedTitles: string[];
  let reason: string;
  let isCached = false;

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    recommendedTitles = cached.recommendedTitles;
    reason = cached.reason;
    isCached = true;
    logger.info({ rawMood, mode }, "Serving read recommendation from 24h cache");
  } else {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (geminiKey) {
      const aiResult = await callGeminiForRecommendation(rawMood, mode, geminiKey);
      recommendedTitles = aiResult.recommendedTitles;
      reason = aiResult.reason;
    } else {
      const fb = smartReadFallback(rawMood, mode);
      recommendedTitles = fb.recommendedTitles;
      reason = fb.reason;
    }

    // Save to cache
    readRecommendationCache.set(normalizedKey, {
      recommendedTitles,
      reason,
      timestamp: Date.now(),
    });
  }

  // 2. Insert Activity Log Record
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
      activityType: "read_recommendation_requested",
      status: "completed",
      metadata: {
        mood: rawMood,
        mode,
        recommendedTitles,
        reason,
        isCached,
      },
    });
  } catch (err) {
    logger.warn({ err }, "Could not log read_recommendation_requested activity");
  }

  res.json(
    GetReadRecommendationResponse.parse({
      mood: rawMood,
      mode,
      recommendedTitles,
      reason,
      isCached,
    }),
  );

});

export default router;
