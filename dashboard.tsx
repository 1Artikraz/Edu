import { Link } from "wouter";
import { useGetOverviewStats, useGetRecentActivity } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdSenseSlot } from "@/components/adsense";
import {
  BookOpen, Layers, BookMarked, Star, GitBranch,
  Plus, ArrowRight, Clock, TrendingUp, Sparkles,
} from "lucide-react";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

const typeIcon: Record<string, React.ReactNode> = {
  note: <BookOpen className="h-3.5 w-3.5" />,
  flashcard_deck: <Layers className="h-3.5 w-3.5" />,
  glossary_term: <BookMarked className="h-3.5 w-3.5" />,
  study_set: <Star className="h-3.5 w-3.5" />,
  branch_tree: <GitBranch className="h-3.5 w-3.5" />,
};

export default function Dashboard() {
  const { user } = useUser();
  const { data: stats, isLoading: statsLoading } = useGetOverviewStats();
  const { data: activity } = useGetRecentActivity();

  const statCards = [
    { label: "Notes", value: stats?.noteCount ?? 0, icon: BookOpen, href: "/notes", color: "text-violet-500" },
    { label: "Flashcard Decks", value: stats?.flashcardDeckCount ?? 0, icon: Layers, href: "/flashcards", color: "text-blue-500" },
    { label: "Glossary Terms", value: stats?.glossaryTermCount ?? 0, icon: BookMarked, href: "/glossary", color: "text-emerald-500" },
    { label: "Study Sets", value: stats?.studySetCount ?? 0, icon: Star, href: "/sets", color: "text-amber-500" },
    { label: "Mind Maps", value: stats?.branchTreeCount ?? 0, icon: GitBranch, href: "/branches", color: "text-pink-500" },
  ];

  const quickActions = [
    { label: "New Note", href: "/notes/new", icon: BookOpen },
    { label: "Browse Flashcards", href: "/flashcards", icon: Layers },
    { label: "Glossary", href: "/glossary", icon: BookMarked },
    { label: "Mind Maps", href: "/branches", icon: GitBranch },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
            </h1>
            <p className="text-muted-foreground mt-0.5 text-sm">Your study dashboard — everything in one place.</p>
          </div>
          <Link href="/notes/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> New Note
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats grid */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
      >
        {statCards.map(({ label, value, icon: Icon, href, color }) => (
          <motion.div key={label} variants={fadeUp}>
            <Link href={href}>
              <Card className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group">
                <CardContent className="pt-5 pb-5">
                  <div className={`${color} mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-bold">{statsLoading ? "—" : value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{label}</div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Notes */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" /> Recent Notes
            </h2>
            <Link href="/notes">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {statsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
              ))
            ) : stats?.recentNotes?.length ? (
              stats.recentNotes.map((note) => (
                <Link key={note.id} href={`/notes/${note.id}`}>
                  <Card className="cursor-pointer hover:shadow-sm hover:border-primary/20 transition-all">
                    <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{note.title}</div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {note.content?.slice(0, 80)}
                        </div>
                      </div>
                      {note.subject && (
                        <Badge variant="secondary" className="shrink-0 text-xs">{note.subject}</Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))
            ) : (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No notes yet.{" "}
                <Link href="/notes/new">
                  <span className="text-primary cursor-pointer hover:underline">Create your first note</span>
                </Link>
              </div>
            )}
          </div>

          {/* AdSense */}
          <AdSenseSlot slot="1234567890" />
        </motion.div>

        {/* Right sidebar */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-4">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 grid grid-cols-2 gap-2">
              {quickActions.map(({ label, href, icon: Icon }) => (
                <Link key={href} href={href}>
                  <button className="w-full flex flex-col items-center gap-1.5 p-3 rounded-lg bg-muted hover:bg-accent hover:text-accent-foreground transition-colors text-center">
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-medium leading-tight">{label}</span>
                  </button>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Top subjects */}
          {stats?.topSubjects && stats.topSubjects.length > 0 && (
            <Card>
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" /> Top Subjects
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {stats.topSubjects.map(({ subject, count }) => (
                  <div key={subject} className="flex items-center justify-between">
                    <span className="text-sm">{subject}</span>
                    <Badge variant="secondary" className="text-xs">{count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          {activity && activity.length > 0 && (
            <Card>
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {activity.slice(0, 5).map((item) => (
                  <div key={`${item.type}-${item.id}`} className="flex items-center gap-2">
                    <span className="text-muted-foreground">{typeIcon[item.type]}</span>
                    <span className="text-xs text-muted-foreground truncate flex-1">{item.title}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">{item.action}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}
