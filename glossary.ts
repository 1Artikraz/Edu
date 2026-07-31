import { Router } from "express";
import { db } from "@workspace/db";
import { glossaryTermsTable } from "@workspace/db";
import { eq, ilike } from "drizzle-orm";
import { CreateGlossaryTermBody } from "@workspace/api-zod";

const router = Router();

const mapTerm = (t: typeof glossaryTermsTable.$inferSelect) => ({
  id: String(t.id),
  term: t.term,
  definition: t.definition,
  examples: t.examples ?? [],
  relatedTerms: t.relatedTerms ?? [],
  subject: t.subject,
});

router.get("/glossary", async (req, res) => {
  try {
    const { search } = req.query;
    // FIX: was fetching all rows then filtering in JS
    const terms = await db
      .select()
      .from(glossaryTermsTable)
      .where(search ? ilike(glossaryTermsTable.term, `%${String(search)}%`) : undefined)
      .orderBy(glossaryTermsTable.term);
    res.json(terms.map(mapTerm));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list glossary" });
  }
});

router.post("/glossary", async (req, res) => {
  try {
    const body = CreateGlossaryTermBody.parse(req.body);
    const [term] = await db.insert(glossaryTermsTable).values(body).returning();
    res.status(201).json(mapTerm(term));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create term" });
  }
});

router.put("/glossary/:id", async (req, res) => {
  try {
    const body = CreateGlossaryTermBody.parse(req.body);
    const [term] = await db
      .update(glossaryTermsTable)
      .set(body)
      .where(eq(glossaryTermsTable.id, Number(req.params.id)))
      .returning();
    if (!term) return res.status(404).json({ error: "Not found" });
    res.json(mapTerm(term));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update term" });
  }
});

router.delete("/glossary/:id", async (req, res) => {
  try {
    // FIX: was returning 204 even for non-existent IDs
    const [deleted] = await db
      .delete(glossaryTermsTable)
      .where(eq(glossaryTermsTable.id, Number(req.params.id)))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete term" });
  }
});

export default router;
