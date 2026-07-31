import { useState, useRef, useMemo } from "react";
import { useListGlossaryTerms, useDefineTerm } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TooltipState {
  term: string;
  definition: string;
  source: "local" | "ai";
  x: number;
  y: number;
}

function TermSpan({ term, definition }: { term: string; definition: string }) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const defineTerm = useDefineTerm();
  const { toast } = useToast();

  const show = () => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setTooltip({ term, definition, source: "local", x: rect.left + rect.width / 2, y: rect.bottom + window.scrollY + 6 });
  };

  const hide = () => setTooltip(null);

  const handleAiDefinition = async () => {
    try {
      const result = await defineTerm.mutateAsync({ data: { term } });
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      setTooltip({ term, definition: result.definition, source: "ai", x: rect.left + rect.width / 2, y: rect.bottom + window.scrollY + 6 });
    } catch {
      toast({ title: "AI definition failed", variant: "destructive" });
    }
  };

  return (
    <>
      <span
        ref={ref}
        className="term-highlight"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        tabIndex={0}
      >
        {term}
      </span>
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 max-w-xs bg-popover border border-border rounded-xl shadow-lg px-4 py-3 pointer-events-auto"
            style={{
              left: Math.min(tooltip.x, window.innerWidth - 280),
              top: tooltip.y,
              transform: "translateX(-50%)",
            }}
          >
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <p className="text-xs font-semibold text-primary">{tooltip.term}</p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[10px] gap-1"
                onClick={handleAiDefinition}
                disabled={defineTerm.isPending}
              >
                {defineTerm.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                AI
              </Button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{tooltip.definition}</p>
            {tooltip.source === "ai" && (
              <p className="mt-1.5 text-[10px] text-primary font-medium">AI definition</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function GlossaryTooltip({ text }: { text: string }) {
  const { data: terms } = useListGlossaryTerms();

  const parsed = useMemo(() => {
    if (!terms || terms.length === 0) return null;
    const termMap = new Map(terms.map(t => [t.term.toLowerCase(), { term: t.term, definition: t.definition }]));
    const termRegex = new RegExp(
      `\\b(${terms.map(t => t.term.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")).join("|")})\\b`,
      "gi"
    );
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    termRegex.lastIndex = 0;
    while ((match = termRegex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
      const found = termMap.get(match[0].toLowerCase());
      if (found) {
        parts.push(<TermSpan key={`${match.index}-${match[0]}`} term={match[0]} definition={found.definition} />);
      } else {
        parts.push(match[0]);
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts;
  }, [terms, text]);

  if (!terms || terms.length === 0 || !parsed) {
    return <p className="whitespace-pre-wrap">{text}</p>;
  }

  return <p className="whitespace-pre-wrap">{parsed}</p>;
}
