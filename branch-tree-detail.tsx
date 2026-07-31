import { useState, useCallback, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useGetBranchTree } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Save, Plus, Trash2, ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BranchNode {
  id: string;
  label: string;
  children: BranchNode[];
}

function NodeView({
  node,
  depth = 0,
  onAddChild,
  onDelete,
  onRename,
}: {
  node: BranchNode;
  depth?: number;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, label: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(node.label);
  const colors = [
    "border-primary/40 bg-primary/5",
    "border-violet-400/40 bg-violet-500/5",
    "border-blue-400/40 bg-blue-500/5",
    "border-emerald-400/40 bg-emerald-500/5",
    "border-amber-400/40 bg-amber-500/5",
  ];

  return (
    <div className={depth > 0 ? "ml-5" : ""}>
      <div className="flex items-center gap-1 group mb-1">
        {node.children.length > 0 ? (
          <button onClick={() => setExpanded(e => !e)} className="p-0.5 rounded hover:bg-muted shrink-0">
            {expanded
              ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
              : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </button>
        ) : (
          <div className="w-5 shrink-0" />
        )}
        <div className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colors[depth % colors.length]} transition-all`}>
          {editing ? (
            <input
              autoFocus
              className="flex-1 bg-transparent outline-none text-sm"
              value={label}
              onChange={e => setLabel(e.target.value)}
              onBlur={() => { setEditing(false); onRename(node.id, label); }}
              onKeyDown={e => { if (e.key === "Enter") { setEditing(false); onRename(node.id, label); } }}
            />
          ) : (
            <span className="flex-1 text-sm font-medium cursor-pointer" onDoubleClick={() => setEditing(true)}>
              {node.label}
            </span>
          )}
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-0.5 rounded hover:bg-primary/20 text-primary" onClick={() => onAddChild(node.id)}>
              <Plus className="h-3 w-3" />
            </button>
            {depth > 0 && (
              <button className="p-0.5 rounded hover:bg-destructive/20 text-destructive" onClick={() => onDelete(node.id)}>
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
      {expanded && node.children.length > 0 && (
        <div className="ml-5 pl-3 border-l border-border">
          {node.children.map(child => (
            <NodeView key={child.id} node={child} depth={depth + 1} onAddChild={onAddChild} onDelete={onDelete} onRename={onRename} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function BranchTreeDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: tree, isLoading } = useGetBranchTree(id!);
  const { toast } = useToast();
  const [localRoot, setLocalRoot] = useState<BranchNode | null>(null);
  const [saving, setSaving] = useState(false);

  const treeRoot = useMemo(() => {
    if (localRoot) return localRoot;
    if (!tree?.root) return null;
    if (typeof tree.root === "object" && tree.root !== null) return tree.root as BranchNode;
    try {
      return JSON.parse(String(tree.root)) as BranchNode;
    } catch {
      return null;
    }
  }, [localRoot, tree?.root]);

  const addChild = useCallback((parentId: string) => {
    const newNode: BranchNode = { id: `${Date.now()}`, label: "New branch", children: [] };
    const addToNode = (n: BranchNode): BranchNode => {
      if (n.id === parentId) return { ...n, children: [...n.children, newNode] };
      return { ...n, children: n.children.map(addToNode) };
    };
    setLocalRoot(prev => {
      const current = prev ?? treeRoot;
      return current ? addToNode(current) : null;
    });
  }, [treeRoot]);

  const deleteNode = useCallback((nodeId: string) => {
    const removeNode = (n: BranchNode): BranchNode => ({
      ...n,
      children: n.children.filter(c => c.id !== nodeId).map(removeNode),
    });
    setLocalRoot(prev => {
      const current = prev ?? treeRoot;
      return current ? removeNode(current) : null;
    });
  }, [treeRoot]);

  const renameNode = useCallback((nodeId: string, label: string) => {
    const rename = (n: BranchNode): BranchNode => {
      if (n.id === nodeId) return { ...n, label };
      return { ...n, children: n.children.map(rename) };
    };
    setLocalRoot(prev => {
      const current = prev ?? treeRoot;
      return current ? rename(current) : null;
    });
  }, [treeRoot]);

  const handleSave = async () => {
    const currentRoot = localRoot ?? treeRoot;
    if (!currentRoot || !tree?.title) return;
    setSaving(true);
    try {
      await fetch(`/api/branch-trees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: tree.title, root: currentRoot }),
      });
      toast({ title: "Mind map saved!" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  const displayRoot = localRoot ?? treeRoot;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/branches">
          <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" /> Mind Maps
          </button>
        </Link>
      </div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-bold tracking-tight">{tree?.title}</h1>
        <Button size="sm" className="gap-2" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6 pb-6">
          <p className="text-xs text-muted-foreground mb-4">Double-click a node to rename. Click + to add a child branch.</p>
          {displayRoot ? (
            <NodeView node={displayRoot} onAddChild={addChild} onDelete={deleteNode} onRename={renameNode} />
          ) : (
            <p className="text-sm text-muted-foreground">No tree data.</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
