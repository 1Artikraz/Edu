import { Router } from "express";
import { db } from "@workspace/db";
import { studySetsTable } from "@workspace/db";
import { eq, ilike } from "drizzle-orm";
import { CreateSetBody } from "@workspace/api-zod";

const router = Router();

const mapSet = (s: typeof studySetsTable.$inferSelect) => ({
  id: String(s.id),
  title: s.title,
  description: s.description,
  subject: s.subject,
  termCount: 0,
  createdAt: s.createdAt.toISOString(),
});

router.get("/sets", async (req, res) => {
  try {
    const { search } = req.query;
    // FIX: was fetching all rows then filtering in JS
    const sets = await db
      .select()
      .from(studySetsTable)
      .where(search ? ilike(studySetsTable.title, `%${String(search)}%`) : undefined)
      .orderBy(studySetsTable.createdAt);
    res.json(sets.map(mapSet));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list sets" });
  }
});

router.post("/sets", async (req, res) => {
  try {
    const body = CreateSetBody.parse(req.body);
    const [set] = await db.insert(studySetsTable).values(body).returning();
    res.status(201).json(mapSet(set));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create set" });
  }
});

router.get("/sets/:id", async (req, res) => {
  try {
    const [set] = await db
      .select()
      .from(studySetsTable)
      .where(eq(studySetsTable.id, Number(req.params.id)));
    if (!set) return res.status(404).json({ error: "Not found" });
    res.json(mapSet(set));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get set" });
  }
});

router.delete("/sets/:id", async (req, res) => {
  try {
    // FIX: was returning 204 even for non-existent IDs
    const [deleted] = await db
      .delete(studySetsTable)
      .where(eq(studySetsTable.id, Number(req.params.id)))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete set" });
  }
});

export default router;
