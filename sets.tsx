import { useState } from "react";
import { Link } from "wouter";
import {
  useListSets,
  useCreateSet,
  useDeleteSet,
  getListSetsQueryKey,
} from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Star, Plus, Trash2, Loader2, Search, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const subjectColors: Record<string, string> = {
  biology: "text-emerald-500 bg-emerald-500/10",
  mathematics: "text-blue-500 bg-blue-500/10",
  history: "text-amber-500 bg-amber-500/10",
  chemistry: "text-pink-500 bg-pink-500/10",
  physics: "text-violet-500 bg-violet-500/10",
};

export default function Sets() {
  const [search, setSearch] = useState("");
  const { data: sets, isLoading } = useListSets({ search: search || undefined });
  const createSet = useCreateSet();
  const deleteSet = useDeleteSet();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");

  const handleCreate = async () => {
    if (!title.trim()) return;
    await createSet.mutateAsync({ data: { title, description: description || undefined, subject: subject || undefined } });
    qc.invalidateQueries({ queryKey: getListSetsQueryKey() });
    toast({ title: "Study set created!" });
    setOpen(false); setTitle(""); setDescription(""); setSubject("");
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm("Delete this study set?")) return;
    await deleteSet.mutateAsync({ id });
    qc.invalidateQueries({ queryKey: getListSetsQueryKey() });
    toast({ title: "Set deleted" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Study Sets</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{sets?.length ?? 0} sets</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New Set
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search sets..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : sets?.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <Star className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No study sets yet</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setOpen(true)}>
            Create your first set
          </Button>
        </div>
      ) : (
        <motion.div
          variants={stagger} initial="hidden" animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {sets?.map(set => {
            const colorClass = subjectColors[set.subject?.toLowerCase() ?? ""] ?? "text-primary bg-primary/10";
            return (
              <motion.div key={set.id} variants={fadeUp}>
                <Link href={`/sets/${set.id}`}>
                  <Card className="h-full cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group">
                    <CardContent className="pt-5 pb-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorClass}`}>
                          <Star className="h-5 w-5" />
                        </div>
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded shrink-0"
                          onClick={e => handleDelete(set.id, e)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </div>
                      <h3 className="font-semibold text-sm mb-1">{set.title}</h3>
                      {set.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{set.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          {set.subject && <Badge variant="secondary" className="text-xs">{set.subject}</Badge>}
                        </div>
                        <span className="text-xs text-primary font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          Open <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Study Set</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">TITLE</Label>
              <Input placeholder="e.g. Biology Midterm Prep" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">SUBJECT</Label>
              <Input placeholder="e.g. Biology" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">DESCRIPTION</Label>
              <Textarea placeholder="Optional description..." rows={3} value={description} onChange={e => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createSet.isPending || !title.trim()} className="gap-2">
              {createSet.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create Set
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
