import { Router } from "express";
import { db } from "@workspace/db";
import { notesTable } from "@workspace/db";
import { eq, ilike, or, and } from "drizzle-orm";
import { CreateNoteBody, UpdateNoteBody } from "@workspace/api-zod";

const router = Router();

router.get("/notes", async (req, res) => {
  try {
    const { subjectId, search } = req.query;

    // FIX: was fetching all rows then filtering in JS.
    // Now builds WHERE clause in Drizzle and lets the DB do the work.
    const conditions = [];

    if (subjectId && typeof subjectId === "string") {
      conditions.push(eq(notesTable.subject, subjectId));
    }

    if (search && typeof search === "string") {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(notesTable.title, pattern),
          ilike(notesTable.content, pattern),
        ),
      );
    }

    const notes = await db
      .select()
      .from(notesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(notesTable.updatedAt);

    res.json(
      notes.map((n) => ({
        ...n,
        id: String(n.id),
        tags: n.tags ?? [],
        bulletPoints: n.bulletPoints ?? [],
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list notes" });
  }
});

router.post("/notes", async (req, res) => {
  try {
    const body = CreateNoteBody.parse(req.body);
    const [note] = await db
      .insert(notesTable)
      .values({
        title: body.title,
        content: body.content,
        subject: body.subject ?? null,
        tags: body.tags ?? [],
        imageUrl: body.imageUrl ?? null,
        diagramUrl: body.diagramUrl ?? null,
      })
      .returning();
    res.status(201).json({
      ...note,
      id: String(note.id),
      tags: note.tags ?? [],
      bulletPoints: note.bulletPoints ?? [],
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create note" });
  }
});

router.get("/notes/:id", async (req, res) => {
  try {
    const [note] = await db
      .select()
      .from(notesTable)
      .where(eq(notesTable.id, Number(req.params.id)));
    if (!note) return res.status(404).json({ error: "Not found" });
    res.json({
      ...note,
      id: String(note.id),
      tags: note.tags ?? [],
      bulletPoints: note.bulletPoints ?? [],
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get note" });
  }
});

router.put("/notes/:id", async (req, res) => {
  try {
    const body = UpdateNoteBody.parse(req.body);
    const [note] = await db
      .update(notesTable)
      .set({
        ...(body.title !== undefined && { title: body.title }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.subject !== undefined && { subject: body.subject }),
        ...(body.tags !== undefined && { tags: body.tags }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
        ...(body.diagramUrl !== undefined && { diagramUrl: body.diagramUrl }),
        ...(body.bulletPoints !== undefined && { bulletPoints: body.bulletPoints }),
        updatedAt: new Date(),
      })
      .where(eq(notesTable.id, Number(req.params.id)))
      .returning();
    if (!note) return res.status(404).json({ error: "Not found" });
    res.json({
      ...note,
      id: String(note.id),
      tags: note.tags ?? [],
      bulletPoints: note.bulletPoints ?? [],
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update note" });
  }
});

router.delete("/notes/:id", async (req, res) => {
  try {
    // FIX: was using db.delete() without .returning(), which silently succeeds
    // even when no row matches (i.e. deleting a non-existent ID returned 204).
    // Now uses .returning() to detect whether a row was actually deleted.
    const [deleted] = await db
      .delete(notesTable)
      .where(eq(notesTable.id, Number(req.params.id)))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

export default router;
