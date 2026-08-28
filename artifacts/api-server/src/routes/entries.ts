import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, softlyEntriesTable } from "@workspace/db";
import {
  CreateEntryBody,
  CreateEntryResponse,
  ListEntriesResponse,
} from "@workspace/api-zod";
import { getSessionId } from "./session-utils";

const router: IRouter = Router();

router.get("/entries", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req.headers.cookie);
  if (!sessionId) {
    res.json(ListEntriesResponse.parse([]));
    return;
  }

  const entries = await db
    .select({
      id: softlyEntriesTable.id,
      entryDate: softlyEntriesTable.entryDate,
      bookName: softlyEntriesTable.bookName,
      pagesRead: softlyEntriesTable.pagesRead,
      steps: softlyEntriesTable.steps,
      stretched: softlyEntriesTable.stretched,
      skincare: softlyEntriesTable.skincare,
      waterLiters: softlyEntriesTable.waterLiters,
      enjoyedMeal: softlyEntriesTable.enjoyedMeal,
      note: softlyEntriesTable.note,
      createdAt: softlyEntriesTable.createdAt,
    })
    .from(softlyEntriesTable)
    .where(eq(softlyEntriesTable.sessionId, sessionId))
    .orderBy(desc(softlyEntriesTable.entryDate), desc(softlyEntriesTable.createdAt));

  res.json(ListEntriesResponse.parse(entries));
});

router.post("/entries", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req.headers.cookie);
  if (!sessionId) {
    res.status(401).json({ error: "Start a session before saving a check-in." });
    return;
  }

  const parsed = CreateEntryBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid entry body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const values = {
    sessionId,
    entryDate: today,
    bookName: parsed.data.bookName.trim(),
    pagesRead: Math.max(0, Math.round(parsed.data.pagesRead)),
    steps: Math.max(0, Math.round(parsed.data.steps)),
    stretched: parsed.data.stretched,
    skincare: parsed.data.skincare,
    waterLiters: Math.max(0, parsed.data.waterLiters),
    enjoyedMeal: parsed.data.enjoyedMeal,
    note: parsed.data.note?.trim() || null,
  };

  const [entry] = await db
    .insert(softlyEntriesTable)
    .values(values)
    .onConflictDoUpdate({
      target: [softlyEntriesTable.sessionId, softlyEntriesTable.entryDate],
      set: {
        bookName: values.bookName,
        pagesRead: values.pagesRead,
        steps: values.steps,
        stretched: values.stretched,
        skincare: values.skincare,
        waterLiters: values.waterLiters,
        enjoyedMeal: values.enjoyedMeal,
        note: values.note,
        createdAt: new Date(),
      },
    })
    .returning();

  res.status(201).json(CreateEntryResponse.parse(entry));
});

export default router;