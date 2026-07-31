import { Link, useLocation } from "wouter";
import { useUser, UserButton } from "@clerk/react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { useGlobalSearch } from "@workspace/api-client-react";
import {
  BookOpen, Brain, Layers, GitBranch, Search,
  Sun, Moon, LayoutDashboard, Menu, X,
  BookMarked, Star
} from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/notes", label: "Notes", icon: BookOpen },
  { href: "/flashcards", label: "Flashcards", icon: Layers },
  { href: "/glossary", label: "Glossary", icon: BookMarked },
  { href: "/branches", label: "Mind Maps", icon: GitBranch },
  { href: "/sets", label: "Study Sets", icon: Star },
];

function SearchBar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const { data: results } = useGlobalSearch(
    { q: query, type: "all" },
    { query: { enabled: query.length > 1 } }
  );

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative flex-1 max-w-md">
      <form onSubmit={handleSearch}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search notes, flashcards, glossary..."
            className="pl-9 pr-4 bg-muted/50 border-border focus:bg-background transition-colors"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(e.target.value.length > 1); }}
            onFocus={() => query.length > 1 && setOpen(true)}
          />
        </div>
      </form>
      <AnimatePresence>
        {open && results && results.results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 right-0 bg-popover border border-popover-border rounded-xl shadow-lg z-50 overflow-hidden max-h-[min(24rem,calc(100vh-6rem))]"
          >
            <div className="max-h-[inherit] overflow-y-auto overflow-x-hidden">
              {results.results.slice(0, 5).map(item => (
                <button
                  key={item.id}
                  className="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-center gap-3"
                  onClick={() => {
                    const paths: Record<string, string> = {
                      note: `/notes/${item.id}`,
                      flashcard_deck: `/flashcards/${item.id}`,
                      glossary_term: `/glossary`,
                      study_set: `/sets/${item.id}`,
                    };
                    navigate(paths[item.type] ?? "/");
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <span className="text-sm font-medium text-foreground">{item.title}</span>
                  <Badge variant="secondary" className="ml-auto text-xs capitalize shrink-0">
                    {item.type.replace("_", " ")}
                  </Badge>
                </button>
              ))}
            </div>
            <button
              className="w-full text-left px-4 py-2 text-xs text-primary hover:bg-accent transition-colors border-t border-border"
              onClick={handleSearch as any}
            >
              See all results for "{query}"
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Brain className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight hidden sm:block">StudyCore</span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 ml-2">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  location === href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}>
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              </Link>
            ))}
          </nav>

          {/* Search */}
          <div className="flex-1 flex justify-center px-2">
            <SearchBar />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <UserButton afterSignOutUrl="/sign-in" />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border overflow-hidden"
            >
              <nav className="flex flex-col px-4 py-3 gap-1">
                {nav.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href}>
                    <button
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        location === href
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  </Link>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-6">
        <motion.div
          key={location}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
