import { Router } from "express";
import { db } from "@workspace/db";
import { branchTreesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateBranchTreeBody } from "@workspace/api-zod";

const router = Router();

const mapTree = (t: typeof branchTreesTable.$inferSelect) => ({
  id: String(t.id),
  title: t.title,
  noteId: t.noteId ? String(t.noteId) : undefined,
  root: t.root,
  createdAt: t.createdAt.toISOString(),
});

router.get("/branch-trees", async (req, res) => {
  try {
    const trees = await db.select().from(branchTreesTable).orderBy(branchTreesTable.createdAt);
    res.json(trees.map(mapTree));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list branch trees" });
  }
});

router.post("/branch-trees", async (req, res) => {
  try {
    const body = CreateBranchTreeBody.parse(req.body);
    const [tree] = await db
      .insert(branchTreesTable)
      .values({
        title: body.title,
        noteId: body.noteId ? Number(body.noteId) : null,
        root: body.root,
      })
      .returning();
    res.status(201).json(mapTree(tree));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create branch tree" });
  }
});

router.get("/branch-trees/:id", async (req, res) => {
  try {
    const [tree] = await db
      .select()
      .from(branchTreesTable)
      .where(eq(branchTreesTable.id, Number(req.params.id)));
    if (!tree) return res.status(404).json({ error: "Not found" });
    res.json(mapTree(tree));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get branch tree" });
  }
});

router.put("/branch-trees/:id", async (req, res) => {
  try {
    const { title, root } = req.body as { title?: string; root?: string };
    const [updated] = await db
      .update(branchTreesTable)
      .set({
        ...(title !== undefined && { title }),
        ...(root !== undefined && { root }),
      })
      .where(eq(branchTreesTable.id, Number(req.params.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(mapTree(updated));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update branch tree" });
  }
});

router.delete("/branch-trees/:id", async (req, res) => {
  try {
    // FIX: was returning 204 even for non-existent IDs
    const [deleted] = await db
      .delete(branchTreesTable)
      .where(eq(branchTreesTable.id, Number(req.params.id)))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete branch tree" });
  }
});

export default router;
