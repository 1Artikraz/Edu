import { Router } from "express";
import { db } from "@workspace/db";
import { flashcardDecksTable, flashcardsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { CreateFlashcardDeckBody, AddFlashcardBody } from "@workspace/api-zod";

const router = Router();

router.get("/flashcard-decks", async (req, res) => {
  try {
    const { search } = req.query;

    // FIX: Previously issued one COUNT query per deck inside Promise.all (N+1 problem).
    // Now a single GROUP BY query fetches all card counts in one round-trip,
    // then the results are merged in memory.
    const [decks, cardCounts] = await Promise.all([
      db.select().from(flashcardDecksTable).orderBy(flashcardDecksTable.createdAt),
      db
        .select({ deckId: flashcardsTable.deckId, value: count() })
        .from(flashcardsTable)
        .groupBy(flashcardsTable.deckId),
    ]);

    const countMap = new Map<number, number>();
    for (const row of cardCounts) {
      countMap.set(row.deckId, Number(row.value));
    }

    const result = decks.map((deck) => ({
      id: String(deck.id),
      title: deck.title,
      description: deck.description,
      subject: deck.subject,
      cardCount: countMap.get(deck.id) ?? 0,
      createdAt: deck.createdAt.toISOString(),
    }));

    const filtered = search
      ? result.filter((d) => d.title.toLowerCase().includes(String(search).toLowerCase()))
      : result;

    res.json(filtered);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list decks" });
  }
});

router.post("/flashcard-decks", async (req, res) => {
  try {
    const body = CreateFlashcardDeckBody.parse(req.body);
    const [deck] = await db.insert(flashcardDecksTable).values(body).returning();
    res.status(201).json({
      id: String(deck.id),
      title: deck.title,
      description: deck.description,
      subject: deck.subject,
      cardCount: 0,
      createdAt: deck.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create deck" });
  }
});

router.get("/flashcard-decks/:id", async (req, res) => {
  try {
    const [deck] = await db
      .select()
      .from(flashcardDecksTable)
      .where(eq(flashcardDecksTable.id, Number(req.params.id)));
    if (!deck) return res.status(404).json({ error: "Not found" });
    const cards = await db
      .select()
      .from(flashcardsTable)
      .where(eq(flashcardsTable.deckId, deck.id));
    res.json({
      id: String(deck.id),
      title: deck.title,
      description: deck.description,
      subject: deck.subject,
      cards: cards.map((c) => ({
        id: String(c.id),
        deckId: String(c.deckId),
        front: c.front,
        back: c.back,
        hint: c.hint,
      })),
      createdAt: deck.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get deck" });
  }
});

router.delete("/flashcard-decks/:id", async (req, res) => {
  try {
    await db.delete(flashcardDecksTable).where(eq(flashcardDecksTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete deck" });
  }
});

router.get("/flashcard-decks/:id/cards", async (req, res) => {
  try {
    const cards = await db
      .select()
      .from(flashcardsTable)
      .where(eq(flashcardsTable.deckId, Number(req.params.id)));
    res.json(
      cards.map((c) => ({
        id: String(c.id),
        deckId: String(c.deckId),
        front: c.front,
        back: c.back,
        hint: c.hint,
      })),
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list cards" });
  }
});

router.post("/flashcard-decks/:id/cards", async (req, res) => {
  try {
    const body = AddFlashcardBody.parse(req.body);
    const [card] = await db
      .insert(flashcardsTable)
      .values({ ...body, deckId: Number(req.params.id) })
      .returning();
    res.status(201).json({
      id: String(card.id),
      deckId: String(card.deckId),
      front: card.front,
      back: card.back,
      hint: card.hint,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to add card" });
  }
});

export default router;
