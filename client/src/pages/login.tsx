import { useState } from "react";
import { useLocation, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { LogIn, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
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
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Login failed");
      }
      setLocation("/dashboard");
    } catch (err: any) {
      const msg = err.message?.replace(/^\d+:\s*/, "") || "Login failed";
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
            <LogIn className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-white font-display font-bold text-lg">Log In</h1>
            <p className="text-gray-500 font-mono text-xs">PairSite Developer Access</p>
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
                data-testid="input-login-email"
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
                placeholder="Enter password"
                required
                data-testid="input-login-password"
                className="w-full bg-black/50 border border-gray-800/50 rounded-lg px-4 py-3 text-white font-mono text-sm placeholder-gray-700 focus:outline-none focus:border-green-500/50 transition-colors"
              />
            </div>
            {error && (
              <p className="text-red-400 font-mono text-xs flex items-center gap-2" data-testid="text-login-error">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || !email || !password}
              data-testid="button-login-submit"
              className="w-full bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-sm font-medium py-3 rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {loading ? "Logging in..." : "Log In"}
            </button>
          </form>
        </div>
        <p className="text-center text-gray-500 font-mono text-xs mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-green-400 hover:text-green-300">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
