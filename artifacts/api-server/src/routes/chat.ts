import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request } from "express";
import { asc, eq } from "drizzle-orm";
import { db, softlyChatMessagesTable, softlySessionsTable } from "@workspace/db";
import {
  ClearChatMessagesResponse,
  ListChatMessagesResponse,
  SendChatMessageBody,
  SendChatMessageResponse,
} from "@workspace/api-zod";
import { getSessionId as readSessionId } from "./session-utils";

const router: IRouter = Router();
const SESSION_COOKIE = "softly_session";
const SESSION_MAX_AGE = 1000 * 60 * 60 * 24 * 365;

const SYSTEM_PROMPT = `You are a warm, non-judgmental companion inside a wellness app. The user may be feeling stressed, bored, sad, or reaching for food as a coping mechanism. Your job is to help them feel heard and gently supported. 

When the user asks for help taking action, getting out of bed, feeling stuck, or asking what to do, provide 2-3 concrete, ultra-gentle micro-steps (e.g., 1. Wiggle your toes, 2. Sit on the edge of the bed for 10 seconds, 3. Take a sip of water). 

Keep responses short (2-4 sentences or small bullet points). Never give diet advice, comment on food choices, or moralize. Never mention calories, weight, or 'good/bad' foods. Never repeat identical phrasing across turns. If the user expresses something serious — self-harm, suicidal thoughts, or being in crisis — respond with care, gently encourage them to reach out to a real person or a crisis helpline, and do not try to handle it yourself.`;


// In-memory fallback cache per session when database connection is not available
type MemoryMessage = {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
};
const inMemoryChatStore = new Map<string, MemoryMessage[]>();

async function ensureSession(req: Request): Promise<string> {
  const existingSessionId = readSessionId(req.headers.cookie);
  if (existingSessionId) {
    try {
      const [session] = await db
        .select()
        .from(softlySessionsTable)
        .where(eq(softlySessionsTable.id, existingSessionId));
      if (session) {
        return session.id;
      }
    } catch {
      // In case DB isn't available, keep the existing session ID
      return existingSessionId;
    }
  }

  const newSessionId = randomUUID();
  try {
    await db
      .insert(softlySessionsTable)
      .values({ id: newSessionId, username: "friend" })
      .onConflictDoNothing();
  } catch {
    // If DB is offline, continue with the generated sessionId
  }
  return newSessionId;
}

async function getSessionHistory(sessionId: string): Promise<MemoryMessage[]> {
  try {
    const rows = await db
      .select()
      .from(softlyChatMessagesTable)
      .where(eq(softlyChatMessagesTable.sessionId, sessionId))
      .orderBy(asc(softlyChatMessagesTable.createdAt));

    return rows.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      role: r.role as "user" | "assistant",
      content: r.content,
      createdAt: r.createdAt,
    }));
  } catch {
    return inMemoryChatStore.get(sessionId) ?? [];
  }
}

async function saveChatMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
): Promise<MemoryMessage> {
  const id = randomUUID();
  const now = new Date();
  const message: MemoryMessage = { id, sessionId, role, content, createdAt: now };

  try {
    await db.insert(softlyChatMessagesTable).values({
      id,
      sessionId,
      role,
      content,
      createdAt: now,
    });
  } catch {
    // Fallback store
    const list = inMemoryChatStore.get(sessionId) ?? [];
    list.push(message);
    inMemoryChatStore.set(sessionId, list);
  }

  return message;
}

// Check for crisis indicators
function isCrisisMessage(text: string): boolean {
  const lower = text.toLowerCase();
  const crisisPatterns = [
    /\b(suicide|suicidal|kill myself|end my life|want to die|ending it all)\b/,
    /\b(self[-\s]?harm|cut myself|hurt myself)\b/,
  ];
  return crisisPatterns.some((pattern) => pattern.test(lower));
}

const CRISIS_RESPONSE =
  "I'm so glad you shared this with me, and I hear how much pain you're in right now. Because I'm an AI companion, I want to make sure you have real, human support. Please reach out to someone you trust or connect with a crisis counselor by calling or texting 988 (in the US & Canada), texting HOME to 741741 (Crisis Text Line), or visiting findahelpline.com. You don't have to carry this alone.";

function formatGeminiContents(history: MemoryMessage[], newMessage: string) {
  const rawList: Array<{ role: "user" | "model"; text: string }> = [];

  for (const msg of history.slice(-8)) {
    const role: "user" | "model" = msg.role === "assistant" ? "model" : "user";
    if (rawList.length === 0 && role === "model") {
      continue;
    }
    if (rawList.length > 0 && rawList[rawList.length - 1].role === role) {
      rawList[rawList.length - 1].text += `\n${msg.content}`;
    } else {
      rawList.push({ role, text: msg.content });
    }
  }

  if (rawList.length > 0 && rawList[rawList.length - 1].role === "user") {
    rawList[rawList.length - 1].text += `\n${newMessage}`;
  } else {
    rawList.push({ role: "user", text: newMessage });
  }

  return rawList.map((item) => ({
    role: item.role,
    parts: [{ text: item.text }],
  }));
}

// Call Google Gemini API
async function callGemini(
  history: MemoryMessage[],
  newMessage: string,
  apiKey: string,
): Promise<string | null> {
  const models = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.7-flash",
    "gemini-flash-latest",
  ];
  const contents = formatGeminiContents(history, newMessage);


  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: SYSTEM_PROMPT }],
            },
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 300,
            },
          }),
        },
      );

      if (response.ok) {
        const data = (await response.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return text;
      }
    } catch {
      // Continue to next model on failure
    }
  }

  return null;
}


// Call OpenAI API
async function callOpenAI(
  history: MemoryMessage[],
  newMessage: string,
  apiKey: string,
): Promise<string | null> {
  try {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-8).map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user", content: newMessage },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) return text;
    }
  } catch {
    // Fail gracefully
  }

  return null;
}

// Local warm empathetic fallback generator
function generateLocalCompanionReply(userText: string, historyCount: number): string {
  const lower = userText.toLowerCase();

  if (
    lower.includes("bed") ||
    lower.includes("get out") ||
    lower.includes("what do i do") ||
    lower.includes("what should i do") ||
    lower.includes("help me") ||
    lower.includes("stuck") ||
    lower.includes("how to get") ||
    lower.includes("do to get out")
  ) {
    const actionResponses = [
      "Let's take it in tiny, micro-steps together: 1. Wiggle your toes and roll your ankles under the blanket. 2. Swing your legs over the side of the bed and sit for just 10 seconds. 3. Reach for a sip of water or open a curtain. Which one of those feels tiny enough to try right now?",
      "Getting out of bed when feeling heavy is hard, so give yourself grace. Try this: sit up for just 5 seconds, take one deep breath, and put your feet on the floor. You don't have to conquer the day—just focus on this single minute.",
      "We don't need a big leap—just one soft micro-step. Can you roll over, take a slow breath, and stretch your arms above your head? After that, let's just sit on the edge of the bed for a moment.",
    ];
    return actionResponses[historyCount % actionResponses.length];
  }

  if (
    lower.includes("eat") ||
    lower.includes("snack") ||
    lower.includes("food") ||
    lower.includes("hungry") ||
    lower.includes("craving") ||
    lower.includes("bored") ||
    lower.includes("guilt") ||
    lower.includes("guilty") ||
    lower.includes("crosso") ||
    lower.includes("croissant") ||
    lower.includes("tea") ||
    lower.includes("sweet")
  ) {
    const foodResponses = [
      "Enjoying food and tea is a completely normal part of being human. Food has no moral value—eating something comforting doesn't mean you did anything wrong. How does it feel to take a gentle breath and let go of the guilt for a moment?",
      "It sounds like there’s a lot going on under the surface right now. When we reach for something comforting, it's often our body or mind asking for a gentle pause. How are you feeling in your chest or shoulders right now?",
      "That is so completely understandable. Eating something pleasant should bring comfort, not blame. Would you like to pause together for a few quiet breaths, or tell me what was feeling heavy right before you started eating?",
      "I hear you, and there is zero shame in that at all. What kind of warmth or comfort feels most needed for you right now?",
    ];
    return foodResponses[historyCount % foodResponses.length];
  }

  if (
    lower.includes("stress") ||
    lower.includes("overwhelm") ||
    lower.includes("tired") ||
    lower.includes("anxious") ||
    lower.includes("exhausted") ||
    lower.includes("sad") ||
    lower.includes("lonely")
  ) {
    const stressResponses = [
      "I hear how heavy and sad things feel right now. When sadness makes moving feel impossible, try doing just one micro-action: roll onto your side, place a hand over your heart, and take 3 gentle breaths. Want to try that together?",
      "That sounds really heavy to carry, and it makes complete sense that you're feeling this way. You don't have to fix everything or have it figured out right now. What is one small thing that might take a tiny bit of weight off your shoulders today?",
      "Thank you for sharing that with me. It takes energy just to name that you're overwhelmed. If you could give yourself permission to let go of one expectation today, what would it be?",
      "I hear how tired you are. Let's make this space as quiet and undemanding as possible. Would you like to just say a little more about what's been on your mind, or would you prefer a peaceful pause?",
    ];
    return stressResponses[historyCount % stressResponses.length];
  }

  if (lower === "no" || lower === "not really" || lower === "nope" || lower === "can't" || lower === "idk") {
    const refusalResponses = [
      "That is completely okay. You don't have to push yourself to do or feel anything right now. I'm right here with you in the quiet.",
      "No pressure at all. Just being here and taking a moment is enough. What is on your mind?",
      "I hear you. You don't have to find answers or force softness. I'm listening whenever you want to share.",
    ];
    return refusalResponses[historyCount % refusalResponses.length];
  }

  if (historyCount === 0) {
    return "I'm right here with you, and there's no right or wrong way to feel. Thank you for taking a moment to check in with yourself. What's been taking up the most space in your head today?";
  }

  const generalResponses = [
    "I'm listening, and I hear how much you've been navigating. What is something small and kind you might do for yourself right now, even if it's just a glass of water or closing your eyes for two minutes?",
    "That makes a lot of sense. You're giving yourself room to notice how you feel, which is already a meaningful act of care. How does it feel to put that into words?",
    "I appreciate you sharing this with me. What would feel like the most supportive thing for you in this exact moment?",
    "Thank you for telling me that. It's completely valid to feel whatever is coming up right now. Is there a way you can be especially gentle with yourself for the rest of today?",
  ];
  return generalResponses[historyCount % generalResponses.length];
}



// 1. GET /chat/messages and /talk/messages
const listMessagesHandler = async (req: Request, res: any): Promise<void> => {
  const sessionId = readSessionId(req.headers.cookie);
  if (!sessionId) {
    res.json(ListChatMessagesResponse.parse([]));
    return;
  }

  const messages = await getSessionHistory(sessionId);
  res.json(ListChatMessagesResponse.parse(messages));
};

router.get("/chat/messages", listMessagesHandler);
router.get("/talk/messages", listMessagesHandler);

// 2. POST /chat/messages and /talk/messages
const sendMessageHandler = async (req: Request, res: any): Promise<void> => {
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid chat message body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userText = parsed.data.message.trim();
  if (!userText) {
    res.status(400).json({ error: "Please enter a message." });
    return;
  }

  const sessionId = await ensureSession(req);
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  // 1. Save user message
  const userMessage = await saveChatMessage(sessionId, "user", userText);

  // 2. Call real LLM API (Gemini or OpenAI) with persona prompt & crisis checks
  let botReplyText: string | null = null;

  if (isCrisisMessage(userText)) {
    botReplyText = CRISIS_RESPONSE;
  } else {
    const history = await getSessionHistory(sessionId);
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (geminiKey) {
      botReplyText = await callGemini(history, userText, geminiKey);
    } else if (openaiKey) {
      botReplyText = await callOpenAI(history, userText, openaiKey);
    }

    // If no key is set or external call fails, use warm context-aware fallback
    if (!botReplyText) {
      botReplyText = generateLocalCompanionReply(userText, history.length);
    }
  }

  // 3. Save bot reply
  const botMessage = await saveChatMessage(sessionId, "assistant", botReplyText);

  // 4. Log activity event
  try {
    const { softlyActivityLogTable, softlySessionsTable } = await import("@workspace/db");
    const [s] = await db.select().from(softlySessionsTable).where(eq(softlySessionsTable.id, sessionId));
    await db.insert(softlyActivityLogTable).values({
      userId: s?.userId ?? null,
      sessionId: sessionId,
      activityType: "chat_message",
      status: "completed",
    });
  } catch {
    // ignore
  }

  res.json(
    SendChatMessageResponse.parse({
      userMessage,
      botMessage,
    }),
  );

};

router.post("/chat/messages", sendMessageHandler);
router.post("/talk/messages", sendMessageHandler);

// 3. POST /chat/clear and /talk/clear
const clearMessagesHandler = async (req: Request, res: any): Promise<void> => {
  const sessionId = readSessionId(req.headers.cookie);
  if (sessionId) {
    try {
      await db
        .delete(softlyChatMessagesTable)
        .where(eq(softlyChatMessagesTable.sessionId, sessionId));
    } catch {
      // In-memory clear
      inMemoryChatStore.delete(sessionId);
    }
    inMemoryChatStore.delete(sessionId);
  }

  res.json(ClearChatMessagesResponse.parse({ success: true }));
};

router.post("/chat/clear", clearMessagesHandler);
router.post("/talk/clear", clearMessagesHandler);

export default router;

