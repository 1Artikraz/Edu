import { Router } from "express";
import { db } from "@workspace/db";
import { flashcardDecksTable, flashcardsTable, branchTreesTable, glossaryTermsTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { GenerateFlashcardsBody, GenerateBranchTreeBody, DefineTermBody, SummarizeNoteBody } from "@workspace/api-zod";

const router = Router();

router.post("/ai/generate-flashcards", async (req, res) => {
  try {
    const body = GenerateFlashcardsBody.parse(req.body);
    const count = body.count ?? 10;

    const completion = await openai.chat.completions.create({
      // FIX: was "gpt-5.4" which does not exist
      model: "gpt-4o",
      max_completion_tokens: 4096,
      messages: [
        {
          role: "system",
          content: `You are an expert study assistant. Generate exactly ${count} flashcards from the provided content. Return ONLY valid JSON in this exact format:\n{\n  "cards": [\n    { "front": "question or term", "back": "answer or definition", "hint": "optional hint" }\n  ]\n}`,
        },
        {
          role: "user",
          content: `Content:\n${body.content}\n\nGenerate ${count} flashcards.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { cards: Array<{ front: string; back: string; hint?: string }> };
    try {
      parsed = JSON.parse(raw);
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { cards: [] };
    }

    const title = body.title ?? "AI Generated Deck";
    const [deck] = await db.insert(flashcardDecksTable).values({ title }).returning();

    const cards = await db
      .insert(flashcardsTable)
      .values(parsed.cards.map((c) => ({ deckId: deck.id, front: c.front, back: c.back, hint: c.hint ?? null })))
      .returning();

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
    res.status(500).json({ error: "Failed to generate flashcards" });
  }
});

router.post("/ai/generate-branch-tree", async (req, res) => {
  try {
    const body = GenerateBranchTreeBody.parse(req.body);

    const completion = await openai.chat.completions.create({
      // FIX: was "gpt-5.4" which does not exist
      model: "gpt-4o",
      max_completion_tokens: 4096,
      messages: [
        {
          role: "system",
          content: `You are an expert at creating mind maps and branch trees. Analyze the content and create a hierarchical branch tree. Return ONLY valid JSON in this exact format:\n{\n  "root": {\n    "id": "root",\n    "label": "Main Topic",\n    "children": [\n      {\n        "id": "1",\n        "label": "Subtopic",\n        "children": [\n          { "id": "1-1", "label": "Detail", "children": [] }\n        ]\n      }\n    ]\n  }\n}\nKeep it to 3 levels deep max, 3-5 branches per node.`,
        },
        {
          role: "user",
          content: `Content:\n${body.content}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { root: object };
    try {
      parsed = JSON.parse(raw);
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { root: { id: "root", label: "Topic", children: [] } };
    }

    const title = body.title ?? "AI Branch Tree";
    const [tree] = await db
      .insert(branchTreesTable)
      .values({
        title,
        noteId: body.noteId ? Number(body.noteId) : null,
        root: parsed.root,
      })
      .returning();

    res.json({
      id: String(tree.id),
      title: tree.title,
      noteId: tree.noteId ? String(tree.noteId) : undefined,
      root: tree.root,
      createdAt: tree.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to generate branch tree" });
  }
});

router.post("/ai/define-term", async (req, res) => {
  try {
    const body = DefineTermBody.parse(req.body);

    const completion = await openai.chat.completions.create({
      // FIX: was "gpt-5.4" which does not exist
      model: "gpt-4o",
      max_completion_tokens: 1024,
      messages: [
        {
          role: "system",
          content: `You are an expert educator. Define the given term clearly and concisely. Return ONLY valid JSON:\n{\n  "definition": "clear definition",\n  "examples": ["example 1", "example 2"],\n  "relatedTerms": ["related term 1", "related term 2"]\n}`,
        },
        {
          role: "user",
          content: `Term: ${body.term}${body.context ? `\nContext: ${body.context}` : ""}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { definition: string; examples: string[]; relatedTerms: string[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { definition: "", examples: [], relatedTerms: [] };
    }

    const [term] = await db
      .insert(glossaryTermsTable)
      .values({
        term: body.term,
        definition: parsed.definition,
        examples: parsed.examples ?? [],
        relatedTerms: parsed.relatedTerms ?? [],
      })
      .returning();

    res.json({
      id: String(term.id),
      term: term.term,
      definition: term.definition,
      examples: term.examples ?? [],
      relatedTerms: term.relatedTerms ?? [],
      subject: term.subject,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to define term" });
  }
});

router.post("/ai/summarize", async (req, res) => {
  try {
    const body = SummarizeNoteBody.parse(req.body);

    const completion = await openai.chat.completions.create({
      // FIX: was "gpt-5.4" which does not exist
      model: "gpt-4o",
      max_completion_tokens: 2048,
      messages: [
        {
          role: "system",
          content: `You are an expert study assistant. Summarize the content into clear, concise bullet points. Return ONLY valid JSON:\n{\n  "bullets": ["bullet point 1", "bullet point 2", "bullet point 3"]\n}\nGenerate 5-10 key bullet points.`,
        },
        {
          role: "user",
          content: `Content:\n${body.content}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { bullets: string[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { bullets: [] };
    }

    res.json({
      bullets: parsed.bullets ?? [],
      noteId: body.noteId,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to summarize note" });
  }
});

export default router;
