import { useState } from "react";
import {
  useListGlossaryTerms,
  useCreateGlossaryTerm,
  useDeleteGlossaryTerm,
  useDefineTerm,
  getListGlossaryTermsQueryKey,
} from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BookMarked, Plus, Search, Trash2, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const fadeUp = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

export default function Glossary() {
  const [search, setSearch] = useState("");
  const { data: terms, isLoading } = useListGlossaryTerms({ search: search || undefined });
  const createTerm = useCreateGlossaryTerm();
  const deleteTerm = useDeleteGlossaryTerm();
  const defineTermMutation = useDefineTerm();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [termInput, setTermInput] = useState("");
  const [definition, setDefinition] = useState("");
  const [subject, setSubject] = useState("");
  const [aiDefining, setAiDefining] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [selectedDefinition, setSelectedDefinition] = useState<string>("");
  const [selectedLoading, setSelectedLoading] = useState(false);

  const handleCreate = async () => {
    if (!termInput.trim() || !definition.trim()) return;
    await createTerm.mutateAsync({ data: { term: termInput, definition, subject: subject || undefined } });
    qc.invalidateQueries({ queryKey: getListGlossaryTermsQueryKey() });
    toast({ title: "Term added!" });
    setOpen(false); setTermInput(""); setDefinition(""); setSubject("");
  };

  const handleAiDefine = async () => {
    if (!termInput.trim()) return;
    setAiDefining(true);
    try {
      const result = await defineTermMutation.mutateAsync({ data: { term: termInput } });
      setDefinition(result.definition);
      toast({ title: "AI definition ready!" });
    } catch {
      toast({ title: "AI definition failed", variant: "destructive" });
    } finally {
      setAiDefining(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this glossary term?")) return;
    await deleteTerm.mutateAsync({ id });
    qc.invalidateQueries({ queryKey: getListGlossaryTermsQueryKey() });
    toast({ title: "Term deleted" });
  };

  const handleAiLookup = async (term: string) => {
    setSelectedTerm(term);
    setSelectedLoading(true);
    try {
      const result = await defineTermMutation.mutateAsync({ data: { term } });
      setSelectedDefinition(result.definition);
    } catch {
      setSelectedDefinition("");
      toast({ title: "AI definition failed", variant: "destructive" });
    } finally {
      setSelectedLoading(false);
    }
  };

  const grouped = terms?.reduce((acc, t) => {
    const letter = t.term[0].toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(t);
    return acc;
  }, {} as Record<string, typeof terms>) ?? {};

  const letters = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Glossary</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{terms?.length ?? 0} terms</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add Term
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search terms..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {selectedTerm && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4 px-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-primary mb-1">AI Definition</p>
                <h2 className="text-base font-semibold">{selectedTerm}</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedTerm(null); setSelectedDefinition(""); }}>
                Close
              </Button>
            </div>
            <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
              {selectedLoading ? <Loader2 className="h-4 w-4 animate-spin mt-0.5" /> : <Sparkles className="h-4 w-4 mt-0.5 text-primary" />}
              <div>{selectedLoading ? "Generating AI definition..." : selectedDefinition || "No definition available."}</div>
            </div>
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => handleAiLookup(selectedTerm)} className="gap-2">
                <Sparkles className="h-3.5 w-3.5" /> Refresh AI definition
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : terms?.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <BookMarked className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No glossary terms yet</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setOpen(true)}>
            Add your first term
          </Button>
        </div>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
          {letters.map(letter => (
            <motion.div key={letter} variants={fadeUp}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">{letter}</span>
                </div>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-2">
                {grouped[letter]?.map(t => (
                  <Card key={t.id} className="group hover:border-primary/20 transition-colors">
                    <CardContent className="py-4 px-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              className="font-semibold text-sm hover:text-primary transition-colors text-left"
                              onClick={() => handleAiLookup(t.term)}
                            >
                              {t.term}
                            </button>
                            <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" onClick={() => handleAiLookup(t.term)}>
                              <Sparkles className="h-3.5 w-3.5" /> AI
                            </Button>
                            {t.subject && <Badge variant="secondary" className="text-xs">{t.subject}</Badge>}
                            {t.relatedTerms && t.relatedTerms.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {t.relatedTerms.slice(0, 3).map(rt => (
                                  <Badge key={rt} variant="outline" className="text-xs">{rt}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{t.definition}</p>
                          {t.examples && t.examples.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border">
                              <p className="text-[10px] text-muted-foreground font-medium mb-1">EXAMPLES</p>
                              <ul className="space-y-0.5">
                                {t.examples.slice(0, 2).map((ex, i) => (
                                  <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                                    <span className="text-primary mt-0.5 shrink-0">→</span>
                                    {ex}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded shrink-0"
                          onClick={() => handleDelete(t.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Glossary Term</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1.5 block">TERM</Label>
                <Input placeholder="e.g. Mitochondria" value={termInput} onChange={e => setTermInput(e.target.value)} />
              </div>
              <div className="pt-6">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-9"
                  onClick={handleAiDefine}
                  disabled={aiDefining || !termInput.trim()}
                >
                  {aiDefining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  AI Define
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">SUBJECT</Label>
              <Input placeholder="e.g. Biology" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">DEFINITION</Label>
              <Textarea
                placeholder="Enter definition..."
                rows={4}
                value={definition}
                onChange={e => setDefinition(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createTerm.isPending || !termInput.trim() || !definition.trim()} className="gap-2">
              {createTerm.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Add Term
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
