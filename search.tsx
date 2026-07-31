import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { useGlobalSearch } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, Layers, BookMarked, Star, GitBranch, Loader2 } from "lucide-react";

const typeIcon: Record<string, React.ReactNode> = {
  note: <BookOpen className="h-4 w-4" />,
  flashcard_deck: <Layers className="h-4 w-4" />,
  glossary_term: <BookMarked className="h-4 w-4" />,
  study_set: <Star className="h-4 w-4" />,
  branch_tree: <GitBranch className="h-4 w-4" />,
};

const typeHref = (item: { type: string; id: string }) => ({
  note: `/notes/${item.id}`,
  flashcard_deck: `/flashcards/${item.id}`,
  glossary_term: `/glossary`,
  study_set: `/sets`,
  branch_tree: `/branches/${item.id}`,
}[item.type] ?? "/");

export default function SearchPage() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const initialQ = params.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [submitted, setSubmitted] = useState(initialQ);

  const { data, isLoading } = useGlobalSearch(
    { q: submitted, type: "all" },
    { query: { enabled: submitted.length > 0 } }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(query);
  };

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
  const fadeUp = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-4">Search</h1>
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search notes, flashcards, glossary, sets..."
            className="pl-9 pr-20"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          <Button type="submit" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7">
            Search
          </Button>
        </form>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {!isLoading && submitted && (
        <>
          <p className="text-sm text-muted-foreground">
            {data?.results?.length ?? 0} results for "{submitted}"
          </p>

          {data?.results?.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No results found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
              {data?.results?.map(item => (
                <motion.div key={`${item.type}-${item.id}`} variants={fadeUp}>
                  <Link href={typeHref(item)}>
                    <Card className="cursor-pointer hover:shadow-sm hover:border-primary/30 transition-all">
                      <CardContent className="py-4 px-4 flex items-start gap-4">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                          {typeIcon[item.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{item.title}</span>
                            <Badge variant="secondary" className="text-xs capitalize shrink-0">
                              {item.type.replace("_", " ")}
                            </Badge>
                          </div>
                          {/* FIX: was item.excerpt — backend returns item.snippet, so results
                              were always blank even when content matched */}
                          {item.snippet && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.snippet}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </>
      )}

      {!submitted && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">Type something to search</p>
          <p className="text-sm mt-1">Search across all your study materials</p>
        </div>
      )}
    </div>
  );
}
