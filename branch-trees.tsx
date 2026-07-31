import { useState } from "react";
import { Link } from "wouter";
import {
  useListBranchTrees,
  useCreateBranchTree,
  useDeleteBranchTree,
  useGenerateBranchTree,
  getListBranchTreesQueryKey,
} from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { GitBranch, Plus, Trash2, Sparkles, Loader2, Network } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function BranchTrees() {
  const { data: trees, isLoading } = useListBranchTrees();
  const createTree = useCreateBranchTree();
  const deleteTree = useDeleteBranchTree();
  const aiGenerate = useGenerateBranchTree();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [aiTitle, setAiTitle] = useState("");
  const [aiTopic, setAiTopic] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    const defaultRoot = JSON.stringify({
      id: "root",
      label: title,
      children: [
        { id: "1", label: "Branch 1", children: [] },
        { id: "2", label: "Branch 2", children: [] },
      ],
    });
    await createTree.mutateAsync({ data: { title, root: defaultRoot } });
    qc.invalidateQueries({ queryKey: getListBranchTreesQueryKey() });
    toast({ title: "Mind map created!" });
    setOpen(false); setTitle("");
  };

  const handleAiGenerate = async () => {
    if (!aiTitle.trim() || !aiTopic.trim()) return;
    setAiGenerating(true);
    try {
      await aiGenerate.mutateAsync({ data: { content: aiTopic, title: aiTitle } });
      qc.invalidateQueries({ queryKey: getListBranchTreesQueryKey() });
      toast({ title: "AI mind map created!" });
      setAiOpen(false); setAiTitle(""); setAiTopic("");
    } catch {
      toast({ title: "AI generation failed", variant: "destructive" });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm("Delete this mind map?")) return;
    await deleteTree.mutateAsync({ id });
    qc.invalidateQueries({ queryKey: getListBranchTreesQueryKey() });
    toast({ title: "Mind map deleted" });
  };

  const countNodes = (rootStr: string) => {
    try {
      const countChildren = (node: { children?: unknown[] }): number =>
        1 + (node.children ?? []).reduce((sum, c) => sum + countChildren(c as { children?: unknown[] }), 0);
      return countChildren(JSON.parse(rootStr));
    } catch { return 0; }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mind Maps</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{trees?.length ?? 0} mind maps</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setAiOpen(true)}>
            <Sparkles className="h-4 w-4" /> AI Generate
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New Map
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : trees?.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <Network className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No mind maps yet</p>
          <div className="flex gap-2 justify-center mt-4">
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Create manually</Button>
            <Button size="sm" className="gap-1.5" onClick={() => setAiOpen(true)}>
              <Sparkles className="h-3.5 w-3.5" /> AI Generate
            </Button>
          </div>
        </div>
      ) : (
        <motion.div
          variants={stagger} initial="hidden" animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {trees?.map(tree => (
            <motion.div key={tree.id} variants={fadeUp}>
              <Link href={`/branches/${tree.id}`}>
                <Card className="h-full cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center mb-3">
                        <GitBranch className="h-5 w-5 text-pink-500" />
                      </div>
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded shrink-0"
                        onClick={e => handleDelete(tree.id, e)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{tree.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {countNodes(tree.root ?? "{}")} nodes
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Mind Map</DialogTitle></DialogHeader>
          <div className="py-2">
            <Label className="text-xs text-muted-foreground mb-1.5 block">TITLE</Label>
            <Input placeholder="e.g. Cell Biology Overview" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createTree.isPending || !title.trim()} className="gap-2">
              {createTree.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI Mind Map Generator
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">MAP TITLE</Label>
              <Input placeholder="e.g. Photosynthesis Overview" value={aiTitle} onChange={e => setAiTitle(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">TOPIC / DESCRIPTION</Label>
              <Textarea
                placeholder="Describe the topic for AI to generate a mind map..."
                rows={4}
                value={aiTopic}
                onChange={e => setAiTopic(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiOpen(false)}>Cancel</Button>
            <Button onClick={handleAiGenerate} disabled={aiGenerating || !aiTitle.trim() || !aiTopic.trim()} className="gap-2">
              {aiGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
