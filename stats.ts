import { Router } from "express";
import { db } from "@workspace/db";
import {
  notesTable,
  flashcardDecksTable,
  glossaryTermsTable,
  studySetsTable,
  branchTreesTable,
} from "@workspace/db";
import { count, desc } from "drizzle-orm";

const router = Router();

router.get("/stats/overview", async (req, res) => {
  try {
    const [[noteRow], [deckRow], [termRow], [setRow], [treeRow], recentNotes, allNotes] =
      await Promise.all([
        db.select({ value: count() }).from(notesTable),
        db.select({ value: count() }).from(flashcardDecksTable),
        db.select({ value: count() }).from(glossaryTermsTable),
        db.select({ value: count() }).from(studySetsTable),
        db.select({ value: count() }).from(branchTreesTable),
        db
          .select()
          .from(notesTable)
          .orderBy(desc(notesTable.updatedAt))
          .limit(5),
        db.select().from(notesTable),
      ]);

    const subjectMap = new Map<string, number>();
    for (const n of allNotes) {
      if (n.subject) subjectMap.set(n.subject, (subjectMap.get(n.subject) ?? 0) + 1);
    }
    const topSubjects = Array.from(subjectMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([subject, count]) => ({ subject, count }));

    res.json({
      noteCount: Number(noteRow.value),
      flashcardDeckCount: Number(deckRow.value),
      glossaryTermCount: Number(termRow.value),
      studySetCount: Number(setRow.value),
      branchTreeCount: Number(treeRow.value),
      recentNotes: recentNotes.map((n) => ({
        ...n,
        id: String(n.id),
        tags: n.tags ?? [],
        bulletPoints: n.bulletPoints ?? [],
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
      topSubjects,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get stats" });
  }
});

router.get("/stats/recent", async (req, res) => {
  try {
    const [notes, decks, terms] = await Promise.all([
      db.select().from(notesTable).orderBy(desc(notesTable.updatedAt)).limit(5),
      db.select().from(flashcardDecksTable).orderBy(desc(flashcardDecksTable.createdAt)).limit(3),
      // FIX: was missing orderBy — glossary terms now sorted by newest first
      db.select().from(glossaryTermsTable).orderBy(desc(glossaryTermsTable.createdAt)).limit(3),
    ]);

    const activity = [
      ...notes.map((n) => ({
        id: String(n.id),
        type: "note" as const,
        title: n.title,
        action: "updated" as const,
        timestamp: n.updatedAt.toISOString(),
      })),
      ...decks.map((d) => ({
        id: String(d.id),
        type: "flashcard_deck" as const,
        title: d.title,
        action: "created" as const,
        timestamp: d.createdAt.toISOString(),
      })),
      ...terms.map((t) => ({
        id: String(t.id),
        type: "glossary_term" as const,
        title: t.term,
        action: "created" as const,
        // FIX: was new Date().toISOString() — all glossary terms appeared as "just now"
        // and floated to the top of the feed on every request
        timestamp: t.createdAt.toISOString(),
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json(activity.slice(0, 10));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get activity" });
  }
});

export default router;
