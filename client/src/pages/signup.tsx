import { useState } from "react";
import { useLocation, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { UserPlus, Loader2, AlertCircle, Github } from "lucide-react";
import { SiGoogle } from "react-icons/si";

export default function Signup() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/signup", { email, password });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Signup failed");
      }
      setLocation("/dashboard");
    } catch (err: any) {
      const msg = err.message?.replace(/^\d+:\s*/, "") || "Signup failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <div className="neon-bg" />
      <div className="w-full max-w-sm relative z-10">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 animate-glow-pulse">
            <UserPlus className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-white font-display font-bold text-lg">Create Account</h1>
            <p className="text-gray-500 font-mono text-xs">Join PairSite</p>
          </div>
        </div>
        <div className="backdrop-blur-sm bg-black/30 border border-green-500/20 rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-gray-400 font-mono text-xs uppercase tracking-wider mb-2 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                data-testid="input-signup-email"
                className="w-full bg-black/50 border border-gray-800/50 rounded-lg px-4 py-3 text-white font-mono text-sm placeholder-gray-700 focus:outline-none focus:border-green-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-gray-400 font-mono text-xs uppercase tracking-wider mb-2 block">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
                data-testid="input-signup-password"
                className="w-full bg-black/50 border border-gray-800/50 rounded-lg px-4 py-3 text-white font-mono text-sm placeholder-gray-700 focus:outline-none focus:border-green-500/50 transition-colors"
              />
            </div>
            {error && (
              <p className="text-red-400 font-mono text-xs flex items-center gap-2" data-testid="text-signup-error">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || !email || !password}
              data-testid="button-signup-submit"
              className="w-full bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-sm font-medium py-3 rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
          <div className="my-5 flex items-center gap-3 text-gray-700 font-mono text-[10px] uppercase tracking-wider">
            <span className="h-px flex-1 bg-gray-800" /> or <span className="h-px flex-1 bg-gray-800" />
          </div>
          <a
            href="/api/auth/google"
            data-testid="button-signup-google"
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-800 px-4 py-3 font-mono text-sm text-gray-300 transition-colors hover:border-green-500/40 hover:text-white"
          >
            <SiGoogle className="h-4 w-4" /> Sign up with Google
          </a>
          <a
            href="/api/auth/github"
            data-testid="button-signup-github"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-800 px-4 py-3 font-mono text-sm text-gray-300 transition-colors hover:border-green-500/40 hover:text-white"
          >
            <Github className="h-4 w-4" /> Sign up with GitHub
          </a>
        </div>
        <p className="text-center text-gray-500 font-mono text-xs mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-green-400 hover:text-green-300">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
