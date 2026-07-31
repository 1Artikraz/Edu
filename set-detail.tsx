import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetSet,
  useListNotes,
  useListFlashcardDecks,
  useListGlossaryTerms,
} from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft, BookOpen, Layers, BookMarked, Star,
  ArrowRight, FileText
} from "lucide-react";

const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };

export default function SetDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: set, isLoading: setLoading } = useGetSet(id!);
  const { data: allNotes } = useListNotes();
  const { data: allDecks } = useListFlashcardDecks();
  const { data: allTerms } = useListGlossaryTerms();

  const subject = set?.subject?.toLowerCase();

  const relatedNotes = allNotes?.filter(n =>
    subject ? n.subject?.toLowerCase() === subject : true
  ) ?? [];
  const relatedDecks = allDecks?.filter(d =>
    subject ? d.subject?.toLowerCase() === subject : true
  ) ?? [];
  const relatedTerms = allTerms?.filter(t =>
    subject ? t.subject?.toLowerCase() === subject : true
  ) ?? [];

  if (setLoading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!set) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        <p>Study set not found.</p>
        <Link href="/sets"><Button variant="ghost" className="mt-4">Back to sets</Button></Link>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/sets">
          <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" /> Study Sets
          </button>
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Star className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{set.title}</h1>
          </div>
          {set.description && (
            <p className="text-muted-foreground text-sm">{set.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            {set.subject && <Badge variant="secondary">{set.subject}</Badge>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-violet-500">{relatedNotes.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Notes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-blue-500">{relatedDecks.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Flashcard Decks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-emerald-500">{relatedTerms.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Glossary Terms</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="notes">
        <TabsList className="w-full">
          <TabsTrigger value="notes" className="flex-1 gap-2">
            <BookOpen className="h-3.5 w-3.5" /> Notes
          </TabsTrigger>
          <TabsTrigger value="flashcards" className="flex-1 gap-2">
            <Layers className="h-3.5 w-3.5" /> Flashcards
          </TabsTrigger>
          <TabsTrigger value="glossary" className="flex-1 gap-2">
            <BookMarked className="h-3.5 w-3.5" /> Glossary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="mt-4">
          {relatedNotes.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {set.subject
                  ? `No notes with subject "${set.subject}" yet`
                  : "No notes yet"}
              </p>
              <Link href="/notes/new">
                <Button variant="outline" size="sm" className="mt-3">Create a note</Button>
              </Link>
            </div>
          ) : (
            <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2">
              {relatedNotes.map(note => (
                <motion.div key={note.id} variants={fadeUp}>
                  <Link href={`/notes/${note.id}`}>
                    <Card className="cursor-pointer hover:shadow-sm hover:border-primary/20 transition-all">
                      <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <BookOpen className="h-4 w-4 text-violet-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{note.title}</div>
                            {note.content && (
                              <div className="text-xs text-muted-foreground truncate mt-0.5">
                                {note.content.slice(0, 80)}
                              </div>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="flashcards" className="mt-4">
          {relatedDecks.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Layers className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {set.subject
                  ? `No flashcard decks with subject "${set.subject}" yet`
                  : "No flashcard decks yet"}
              </p>
              <Link href="/flashcards">
                <Button variant="outline" size="sm" className="mt-3">Browse flashcards</Button>
              </Link>
            </div>
          ) : (
            <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2">
              {relatedDecks.map(deck => (
                <motion.div key={deck.id} variants={fadeUp}>
                  <Link href={`/flashcards/${deck.id}`}>
                    <Card className="cursor-pointer hover:shadow-sm hover:border-primary/20 transition-all">
                      <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Layers className="h-4 w-4 text-blue-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{deck.title}</div>
                            {deck.description && (
                              <div className="text-xs text-muted-foreground truncate mt-0.5">{deck.description}</div>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="glossary" className="mt-4">
          {relatedTerms.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BookMarked className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {set.subject
                  ? `No glossary terms with subject "${set.subject}" yet`
                  : "No glossary terms yet"}
              </p>
              <Link href="/glossary">
                <Button variant="outline" size="sm" className="mt-3">Browse glossary</Button>
              </Link>
            </div>
          ) : (
            <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2">
              {relatedTerms.map(term => (
                <motion.div key={term.id} variants={fadeUp}>
                  <Card className="hover:border-primary/10 transition-colors">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start gap-3">
                        <BookMarked className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-sm">{term.term}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{term.definition}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
