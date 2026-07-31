import { useEffect, useState, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import {
  useGetNote,
  useCreateNote,
  useUpdateNote,
  useSummarizeNote,
  useDefineTerm,
} from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Save, Sparkles, X, Loader2, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListNotesQueryKey, getGetNoteQueryKey } from "@workspace/api-client-react";

export default function NoteEdit() {
  const { id } = useParams<{ id?: string }>();
  const isNew = !id;
  const [, navigate] = useLocation();
  const { data: note } = useGetNote(id!, { query: { enabled: !isNew && !!id } });
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const summarize = useSummarizeNote();
  const defineTerm = useDefineTerm();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [bulletPoints, setBulletPoints] = useState<string[]>([]);
  const [selectedDefinition, setSelectedDefinition] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title ?? "");
      setContent(note.content ?? "");
      setSubject(note.subject ?? "");
      setTagsInput(note.tags?.join(", ") ?? "");
      setImageUrl(note.imageUrl ?? undefined);
      setBulletPoints(note.bulletPoints ?? []);
    }
  }, [note]);

  const parseTags = (s: string) => s.split(",").map(t => t.trim()).filter(Boolean);

  const handleSummarize = async () => {
    if (!content.trim()) return;
    try {
      const result = await summarize.mutateAsync({ data: { content, noteId: id } });
      setBulletPoints(result.bullets);
      toast({ title: "Summary generated!" });
    } catch {
      toast({ title: "Failed to summarize", variant: "destructive" });
    }
  };

  const handleAIDefinition = async () => {
    const term = title.trim() || subject.trim();
    if (!term) return;
    setSelectedTerm(term);
    setSelectedDefinition(null);
    try {
      const result = await defineTerm.mutateAsync({ data: { term, context: content || title } });
      setSelectedDefinition(result.definition);
      toast({ title: "AI definition ready!" });
    } catch {
      toast({ title: "AI definition failed", variant: "destructive" });
    }
  };

  /**
   * FIX: Was POSTing a multipart form to /api/storage/upload which does not exist.
   * The backend uses a presigned-URL flow:
   *   1. POST /storage/uploads/request-url  →  get { uploadURL, objectPath }
   *   2. PUT the file directly to uploadURL  (goes straight to object storage)
   * The objectPath is then stored as the imageUrl on the note.
   */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Step 1: request a presigned upload URL from the backend
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });

      if (!urlRes.ok) {
        throw new Error(`Failed to get upload URL: ${urlRes.status}`);
      }

      const { uploadURL, objectPath } = await urlRes.json() as {
        uploadURL: string;
        objectPath: string;
      };

      // Step 2: PUT the file directly to the presigned URL (bypasses the backend)
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload failed: ${uploadRes.status}`);
      }

      // Use the stable objectPath (not the time-limited presigned URL) as the stored URL
      setImageUrl(objectPath);
      toast({ title: "Image uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const body = {
      title,
      content,
      subject: subject || undefined,
      tags: parseTags(tagsInput),
      imageUrl: imageUrl ?? undefined,
      bulletPoints: bulletPoints.length > 0 ? bulletPoints : undefined,
    };
    try {
      if (isNew) {
        const created = await createNote.mutateAsync({ data: body });
        qc.invalidateQueries({ queryKey: getListNotesQueryKey() });
        toast({ title: "Note created!" });
        navigate(`/notes/${created.id}`);
      } else {
        await updateNote.mutateAsync({ id: id!, data: body });
        qc.invalidateQueries({ queryKey: getListNotesQueryKey() });
        qc.invalidateQueries({ queryKey: getGetNoteQueryKey(id!) });
        toast({ title: "Note saved!" });
        navigate(`/notes/${id}`);
      }
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div className="flex items-center gap-2">
        <Link href="/notes">
          <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" /> Notes
          </button>
        </Link>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-bold tracking-tight">{isNew ? "New Note" : "Edit Note"}</h1>
        <div className="flex gap-2 flex-wrap">
          {!isNew && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSummarize}
              disabled={summarize.isPending}
              className="gap-2"
            >
              {summarize.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              AI Summarize
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleAIDefinition} className="gap-2">
            <Sparkles className="h-3.5 w-3.5" /> AI Definition
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={createNote.isPending || updateNote.isPending}
            className="gap-2"
          >
            {(createNote.isPending || updateNote.isPending)
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
        </div>
      </div>

      {selectedTerm && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">AI Definition</p>
                <p className="font-semibold">{selectedTerm}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedTerm(null); setSelectedDefinition(null); }}>Close</Button>
            </div>
            <p className="text-sm text-muted-foreground">{selectedDefinition ?? "Generating..."}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6 pb-6 space-y-4">
          <div>
            <Label htmlFor="title" className="text-xs text-muted-foreground mb-1.5 block">TITLE</Label>
            <Input
              id="title"
              placeholder="Note title..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="text-base font-medium"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="subject" className="text-xs text-muted-foreground mb-1.5 block">SUBJECT</Label>
              <Input id="subject" placeholder="e.g. Biology" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="tags" className="text-xs text-muted-foreground mb-1.5 block">TAGS (comma-separated)</Label>
              <Input id="tags" placeholder="cells, biology, exam" value={tagsInput} onChange={e => setTagsInput(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="content" className="text-xs text-muted-foreground mb-1.5 block">CONTENT</Label>
            <Textarea
              id="content"
              placeholder="Write your notes here..."
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={12}
              className="resize-y font-mono text-sm"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">IMAGE / DIAGRAM</Label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            {imageUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img src={imageUrl} alt="Note image" className="w-full max-h-48 object-cover" />
                <button
                  className="absolute top-2 right-2 bg-background/80 backdrop-blur rounded-full p-1 hover:bg-background"
                  onClick={() => setImageUrl(undefined)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full border-2 border-dashed border-border rounded-xl py-6 flex flex-col items-center gap-2 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
              >
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Image className="h-5 w-5" />}
                {uploading ? "Uploading..." : "Upload image or diagram"}
              </button>
            )}
          </div>

          {bulletPoints.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">AI BULLET POINTS</Label>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1">
                {bulletPoints.map((bp, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-0.5 shrink-0">•</span>
                    <span>{bp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
