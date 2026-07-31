import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetFlashcardDeck,
  useListFlashcards,
  useAddFlashcard,
  useGenerateFlashcards,
  getListFlashcardsQueryKey,
} from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft, ChevronRight, RotateCcw, Plus, Sparkles,
  List, BookOpen, Loader2, CheckCircle2, XCircle, Trophy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type CardRating = "know" | "learning" | null;

interface SessionStats {
  know: number;
  learning: number;
  total: number;
}

export default function FlashcardStudy() {
  const { id } = useParams<{ id: string }>();
  const { data: deck } = useGetFlashcardDeck(id!);
  const { data: cards, isLoading } = useListFlashcards(id!);
  const addCard = useAddFlashcard();
  const aiGenerate = useGenerateFlashcards();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [mode, setMode] = useState<"browse" | "study">("browse");
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [hint, setHint] = useState("");

  const [ratings, setRatings] = useState<Record<string, CardRating>>({});
  const [sessionDone, setSessionDone] = useState(false);

  const total = cards?.length ?? 0;
  const card = cards?.[current];

  const next = () => {
    setFlipped(false);
    if (current === total - 1) {
      setSessionDone(true);
    } else {
      setCurrent(i => i + 1);
    }
  };
  const prev = () => { setFlipped(false); setCurrent(i => Math.max(i - 1, 0)); };

  const rateCard = (cardId: string, rating: CardRating) => {
    setRatings(prev => ({ ...prev, [cardId]: rating }));
    setTimeout(() => next(), 300);
  };

  const resetSession = () => {
    setRatings({});
    setSessionDone(false);
    setCurrent(0);
    setFlipped(false);
  };

  const sessionStats: SessionStats = {
    know: Object.values(ratings).filter(r => r === "know").length,
    learning: Object.values(ratings).filter(r => r === "learning").length,
    total: cards?.length ?? 0,
  };

  const handleAdd = async () => {
    if (!front.trim() || !back.trim()) return;
    await addCard.mutateAsync({ id: id!, data: { front, back, hint: hint || undefined } });
    qc.invalidateQueries({ queryKey: getListFlashcardsQueryKey(id!) });
    toast({ title: "Card added!" });
    setAddOpen(false); setFront(""); setBack(""); setHint("");
  };

  const handleAiGenerate = async () => {
    if (!deck?.title) return;
    try {
      await aiGenerate.mutateAsync({
        data: { content: `Generate flashcards for the topic: ${deck.title}. ${deck.description ?? ""}`, title: deck.title }
      });
      qc.invalidateQueries({ queryKey: getListFlashcardsQueryKey(id!) });
      toast({ title: "AI flashcards generated!" });
    } catch {
      toast({ title: "Failed to generate", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <Link href="/flashcards">
          <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" /> Flashcards
          </button>
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{deck?.title ?? "Loading..."}</h1>
          {deck?.subject && <Badge variant="secondary" className="mt-1">{deck.subject}</Badge>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setMode(m => m === "browse" ? "study" : "browse"); resetSession(); }}>
            {mode === "browse" ? <><BookOpen className="h-3.5 w-3.5" /> Study Mode</> : <><List className="h-3.5 w-3.5" /> Browse</>}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleAiGenerate} disabled={aiGenerate.isPending}>
            {aiGenerate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            AI Generate
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Card
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 rounded-2xl bg-muted animate-pulse" />
      ) : total === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No flashcards yet</p>
          <div className="flex gap-2 justify-center mt-4">
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>Add manually</Button>
            <Button size="sm" className="gap-1.5" onClick={handleAiGenerate} disabled={aiGenerate.isPending}>
              {aiGenerate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generate with AI
            </Button>
          </div>
        </div>
      ) : mode === "study" ? (
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {sessionDone ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center space-y-6"
              >
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <Trophy className="h-10 w-10 text-primary" />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Session complete!</h2>
                  <p className="text-muted-foreground text-sm mt-1">You went through all {sessionStats.total} cards.</p>
                </div>
                <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                  <Card className="border-emerald-500/30 bg-emerald-500/5">
                    <CardContent className="pt-4 pb-4 text-center">
                      <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{sessionStats.know}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Know it
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-amber-500/30 bg-amber-500/5">
                    <CardContent className="pt-4 pb-4 text-center">
                      <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{sessionStats.learning}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                        <RotateCcw className="h-3 w-3" /> Still learning
                      </div>
                    </CardContent>
                  </Card>
                </div>
                {sessionStats.total > 0 && (
                  <div className="max-w-xs mx-auto">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all"
                        style={{ width: `${(sessionStats.know / sessionStats.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {Math.round((sessionStats.know / sessionStats.total) * 100)}% mastery
                    </p>
                  </div>
                )}
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={resetSession} className="gap-2">
                    <RotateCcw className="h-3.5 w-3.5" /> Study again
                  </Button>
                  {sessionStats.learning > 0 && (
                    <Button onClick={() => {
                      const learningIds = Object.entries(ratings)
                        .filter(([, r]) => r === "learning")
                        .map(([id]) => id);
                      setRatings({});
                      setSessionDone(false);
                      const firstLearning = cards?.findIndex(c => learningIds.includes(c.id)) ?? 0;
                      setCurrent(firstLearning);
                      setFlipped(false);
                    }} className="gap-2">
                      Review {sessionStats.learning} struggling
                    </Button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`card-${current}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{current + 1} / {total}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-emerald-600 font-medium">{sessionStats.know} know</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-amber-600 font-medium">{sessionStats.learning} learning</span>
                  </div>
                </div>

                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{ width: `${((current) / total) * 100}%` }}
                  />
                </div>

                <div
                  className="perspective-1000 cursor-pointer select-none"
                  style={{ height: 260 }}
                  onClick={() => setFlipped(f => !f)}
                >
                  <motion.div
                    className="relative w-full h-full transform-style-3d"
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ duration: 0.45, type: "spring", stiffness: 160 }}
                  >
                    <div className="absolute inset-0 backface-hidden">
                      <Card className="h-full flex items-center justify-center border-primary/20 bg-gradient-to-br from-primary/5 to-violet-500/5">
                        <CardContent className="text-center p-8">
                          <p className="text-xs text-muted-foreground mb-4 uppercase tracking-widest font-medium">Question</p>
                          <p className="text-xl font-semibold leading-relaxed">{card?.front}</p>
                          {card?.hint && (
                            <p className="text-sm text-muted-foreground mt-4 italic">Hint: {card.hint}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-6 opacity-60">Click to reveal answer</p>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="absolute inset-0 backface-hidden rotate-y-180">
                      <Card className="h-full flex items-center justify-center border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
                        <CardContent className="text-center p-8">
                          <p className="text-xs text-muted-foreground mb-4 uppercase tracking-widest font-medium">Answer</p>
                          <p className="text-xl font-semibold leading-relaxed text-emerald-600 dark:text-emerald-400">{card?.back}</p>
                        </CardContent>
                      </Card>
                    </div>
                  </motion.div>
                </div>

                <AnimatePresence>
                  {flipped && card && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="flex gap-3 justify-center"
                    >
                      <Button
                        variant="outline"
                        className="gap-2 border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-600"
                        onClick={() => rateCard(card.id, "learning")}
                      >
                        <RotateCcw className="h-4 w-4" /> Still learning
                      </Button>
                      <Button
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => rateCard(card.id, "know")}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Know it!
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center justify-center gap-4">
                  <Button variant="outline" size="icon" onClick={prev} disabled={current === 0}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={resetSession} title="Restart session">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={next}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="space-y-3">
          {cards?.map((c, i) => (
            <Card key={c.id} className={`hover:border-primary/20 transition-colors ${
              ratings[c.id] === "know" ? "border-emerald-500/30" :
              ratings[c.id] === "learning" ? "border-amber-500/30" : ""
            }`}>
              <CardContent className="py-4 px-4">
                <div className="flex items-start gap-4">
                  <span className="text-xs text-muted-foreground font-mono w-6 shrink-0 mt-0.5">{i + 1}</span>
                  <div className="flex-1 grid grid-cols-2 gap-4 min-w-0">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium mb-1">FRONT</p>
                      <p className="text-sm font-medium">{c.front}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium mb-1">BACK</p>
                      <p className="text-sm text-muted-foreground">{c.back}</p>
                    </div>
                  </div>
                  {ratings[c.id] && (
                    <div className="shrink-0">
                      {ratings[c.id] === "know"
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        : <XCircle className="h-4 w-4 text-amber-500" />
                      }
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Flashcard</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">FRONT (QUESTION)</Label>
              <Textarea placeholder="Enter the question..." rows={3} value={front} onChange={e => setFront(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">BACK (ANSWER)</Label>
              <Textarea placeholder="Enter the answer..." rows={3} value={back} onChange={e => setBack(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">HINT (OPTIONAL)</Label>
              <Input placeholder="Optional hint..." value={hint} onChange={e => setHint(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={addCard.isPending || !front.trim() || !back.trim()} className="gap-2">
              {addCard.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Add Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
