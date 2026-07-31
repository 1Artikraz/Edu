import { Router } from "express";
import { db } from "@workspace/db";
import { notesTable, flashcardDecksTable, glossaryTermsTable, studySetsTable } from "@workspace/db";
import { ilike, or } from "drizzle-orm";

const router = Router();

router.get("/search", async (req, res) => {
  try {
    const { q, type = "all" } = req.query;
    if (!q) return res.status(400).json({ error: "q is required" });

    const query = String(q);
    const pattern = `%${query}%`;

    const results: Array<{
      id: string;
      type: string;
      title: string;
      snippet: string;
      subject?: string | null;
    }> = [];

    // FIX: all four branches previously fetched every row then filtered in JS.
    // Now filtering is pushed to the database via ilike(), which is far more
    // efficient and avoids loading the entire table into memory on each request.

    if (type === "all" || type === "notes") {
      const notes = await db
        .select()
        .from(notesTable)
        .where(
          or(
            ilike(notesTable.title, pattern),
            ilike(notesTable.content, pattern),
          ),
        );
      for (const n of notes) {
        results.push({
          id: String(n.id),
          type: "note",
          title: n.title,
          snippet: n.content.slice(0, 120),
          subject: n.subject,
        });
      }
    }

    if (type === "all" || type === "flashcards") {
      const decks = await db
        .select()
        .from(flashcardDecksTable)
        .where(ilike(flashcardDecksTable.title, pattern));
      for (const d of decks) {
        results.push({
          id: String(d.id),
          type: "flashcard_deck",
          title: d.title,
          snippet: d.description ?? "",
          subject: d.subject,
        });
      }
    }

    if (type === "all" || type === "glossary") {
      const terms = await db
        .select()
        .from(glossaryTermsTable)
        .where(
          or(
            ilike(glossaryTermsTable.term, pattern),
            ilike(glossaryTermsTable.definition, pattern),
          ),
        );
      for (const t of terms) {
        results.push({
          id: String(t.id),
          type: "glossary_term",
          title: t.term,
          snippet: t.definition.slice(0, 120),
          subject: t.subject,
        });
      }
    }

    if (type === "all" || type === "sets") {
      const sets = await db
        .select()
        .from(studySetsTable)
        .where(ilike(studySetsTable.title, pattern));
      for (const s of sets) {
        results.push({
          id: String(s.id),
          type: "study_set",
          title: s.title,
          snippet: s.description ?? "",
          subject: s.subject,
        });
      }
    }

    res.json({ query, results, total: results.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
