import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider, useAuth } from "@clerk/react";
import { ThemeProvider } from "@/components/theme-provider";
import Layout from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Notes from "@/pages/notes";
import NoteDetail from "@/pages/note-detail";
import NoteEdit from "@/pages/note-edit";
import Flashcards from "@/pages/flashcards";
import FlashcardStudy from "@/pages/flashcard-study";
import Glossary from "@/pages/glossary";
import BranchTrees from "@/pages/branch-trees";
import BranchTreeDetail from "@/pages/branch-tree-detail";
import Sets from "@/pages/sets";
import SetDetail from "@/pages/set-detail";
import SearchPage from "@/pages/search";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? import.meta.env.CLERK_PUBLISHABLE_KEY;

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // FIX: was returning null when not signed in — user saw a blank white page
  // with no indication of what to do. Now redirects to /sign-in.
  if (!isSignedIn) return <Redirect to="/sign-in" />;

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/sign-in" component={SignInPage} />
      <Route path="/sign-in/:rest*" component={SignInPage} />
      <Route path="/sign-up" component={SignUpPage} />
      <Route path="/sign-up/:rest*" component={SignUpPage} />
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/notes" component={() => <ProtectedRoute component={Notes} />} />
      <Route path="/notes/new" component={() => <ProtectedRoute component={NoteEdit} />} />
      <Route path="/notes/:id/edit" component={() => <ProtectedRoute component={NoteEdit} />} />
      <Route path="/notes/:id" component={() => <ProtectedRoute component={NoteDetail} />} />
      <Route path="/flashcards" component={() => <ProtectedRoute component={Flashcards} />} />
      <Route path="/flashcards/:id" component={() => <ProtectedRoute component={FlashcardStudy} />} />
      <Route path="/glossary" component={() => <ProtectedRoute component={Glossary} />} />
      <Route path="/branches" component={() => <ProtectedRoute component={BranchTrees} />} />
      <Route path="/branches/:id" component={() => <ProtectedRoute component={BranchTreeDetail} />} />
      <Route path="/sets" component={() => <ProtectedRoute component={Sets} />} />
      <Route path="/sets/:id" component={() => <ProtectedRoute component={SetDetail} />} />
      <Route path="/search" component={() => <ProtectedRoute component={SearchPage} />} />
      <Route path="*" component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <ThemeProvider defaultTheme="light" storageKey="studycore-theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}
