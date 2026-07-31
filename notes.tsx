import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useListNotes, useDeleteNote, getListNotesQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, BookOpen, Trash2, Edit, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Notes() {
  const [search, setSearch] = useState("");
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const { data: notes, isLoading } = useListNotes({ search: search || undefined });
  const deleteNote = useDeleteNote();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const allSubjects = useMemo(() => {
    const set = new Set<string>();
    notes?.forEach(n => { if (n.subject) set.add(n.subject); });
    return Array.from(set).sort();
  }, [notes]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes?.forEach(n => n.tags?.forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [notes]);

  const filtered = useMemo(() => {
    let list = notes ?? [];
    if (activeSubject) list = list.filter(n => n.subject === activeSubject);
    if (activeTag) list = list.filter(n => n.tags?.includes(activeTag));
    return list;
  }, [notes, activeSubject, activeTag]);

  const hasFilters = !!activeSubject || !!activeTag;

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this note?")) return;
    await deleteNote.mutateAsync({ id });
    qc.invalidateQueries({ queryKey: getListNotesQueryKey() });
    toast({ title: "Note deleted" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{filtered.length} {filtered.length === 1 ? "note" : "notes"}</p>
        </div>
        <Link href="/notes/new">
          <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> New Note</Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search notes..."
            className="pl-9 w-56"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {allSubjects.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground">Subject:</span>
            {allSubjects.map(s => (
              <button
                key={s}
                onClick={() => setActiveSubject(activeSubject === s ? null : s)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  activeSubject === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-primary/50 hover:bg-primary/5"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground">Tags:</span>
            {allTags.slice(0, 8).map(t => (
              <button
                key={t}
                onClick={() => setActiveTag(activeTag === t ? null : t)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  activeTag === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-primary/50 hover:bg-primary/5"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground"
            onClick={() => { setActiveSubject(null); setActiveTag(null); }}
          >
            <X className="h-3 w-3" /> Clear filters
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
          {hasFilters ? (
            <>
              <p className="font-medium">No notes match these filters</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => { setActiveSubject(null); setActiveTag(null); }}>
                Clear filters
              </Button>
            </>
          ) : (
            <p className="font-medium">No notes yet. <Link href="/notes/new"><span className="text-primary cursor-pointer hover:underline">Create your first note</span></Link></p>
          )}
        </div>
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filtered.map(note => (
            <motion.div key={note.id} variants={fadeUp}>
              <Link href={`/notes/${note.id}`}>
                <Card className="h-full cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group relative">
                  <CardContent className="pt-4 pb-4">
                    {(note.imageUrl || note.diagramUrl) && (
                      <div className="mb-3 rounded-lg overflow-hidden bg-muted h-28">
                        <img
                          src={note.diagramUrl ?? note.imageUrl ?? ""}
                          alt="Note image"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-sm leading-tight">{note.title}</h3>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          className="p-1 hover:bg-muted rounded"
                          onClick={e => { e.preventDefault(); navigate(`/notes/${note.id}/edit`); }}
                        >
                          <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button
                          className="p-1 hover:bg-destructive/10 rounded"
                          onClick={e => handleDelete(note.id, e)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {note.content}
                    </p>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {note.subject && (
                        <Badge
                          variant={activeSubject === note.subject ? "default" : "secondary"}
                          className="text-xs cursor-pointer"
                          onClick={e => { e.preventDefault(); setActiveSubject(activeSubject === note.subject ? null : note.subject!); }}
                        >
                          {note.subject}
                        </Badge>
                      )}
                      {note.tags?.slice(0, 2).map(tag => (
                        <Badge
                          key={tag}
                          variant={activeTag === tag ? "default" : "outline"}
                          className="text-xs cursor-pointer"
                          onClick={e => { e.preventDefault(); setActiveTag(activeTag === tag ? null : tag); }}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    {note.bulletPoints && note.bulletPoints.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-[10px] text-muted-foreground font-medium mb-1">KEY POINTS</p>
                        <ul className="space-y-0.5">
                          {note.bulletPoints.slice(0, 2).map((bp, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                              <span className="text-primary mt-0.5 shrink-0">•</span>
                              <span className="line-clamp-1">{bp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
