import { SignIn } from "@clerk/react";
import { Brain } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
          <Brain className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">StudyCore</h1>
        <p className="text-white/60 mt-1 text-sm">The AI-powered study platform</p>
      </div>
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" afterSignInUrl="/" forceRedirectUrl="/" />
    </div>
  );
}
