import { Link } from "wouter";
import {
  Bot,
  Rocket,
  ShieldCheck,
  Globe,
  Palette,
  Github,
  ArrowRight,
  Zap,
  Lock,
  Layers,
  CheckCircle2,
} from "lucide-react";

const FEATURES = [
  {
    icon: Globe,
    title: "Your Own Subdomain",
    desc: "Every bot gets a branded pairing page at yourbot.pairsite.space, live in minutes.",
  },
  {
    icon: ShieldCheck,
    title: "Verified Ownership",
    desc: "We check your GitHub repo against your account, so no one can clone your bot's identity.",
  },
  {
    icon: Palette,
    title: "Pick a Theme",
    desc: "Choose from a growing set of color templates, or stick with the classic neon default.",
  },
  {
    icon: Globe,
    title: "Bring Your Own Domain",
    desc: "Point a custom domain at your pair site, free, on every plan.",
  },
];

const STEPS = [
  { title: "Sign up", desc: "Create an account with email, Google, or GitHub." },
  { title: "Connect GitHub", desc: "Link the account that owns your bot's repository." },
  { title: "Create your site", desc: "Give it a name and subdomain — we verify the repo automatically." },
  { title: "Go live", desc: "Your branded pairing page is instantly reachable." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="neon-bg" />

      {/* Nav */}
      <nav className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
            <Bot className="w-5 h-5 text-green-400" />
          </div>
          <span className="text-white font-display font-bold text-lg">PairSite</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-gray-400 hover:text-white font-mono text-xs sm:text-sm transition-colors">
            Log in
          </Link>
          <Link
            href="/signup"
            data-testid="link-nav-signup"
            className="bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-xs sm:text-sm px-4 py-2 rounded-lg hover:bg-green-500/20 transition-colors"
          >
            Sign up
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
          <Zap className="w-3.5 h-3.5 text-green-400" />
          <span className="text-green-400 font-mono text-xs">Free while in beta</span>
        </div>
        <h1 className="text-white font-display font-bold text-4xl sm:text-6xl leading-tight mb-6">
          Your bot deserves its <span className="text-green-400">own pairing page</span>
        </h1>
        <p className="text-gray-400 font-mono text-sm sm:text-base max-w-2xl mx-auto mb-10">
          Spin up a branded WhatsApp pair site for your bot in minutes. Verified ownership,
          your own subdomain, your own custom domain — no infrastructure to manage.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/signup"
            data-testid="link-hero-signup"
            className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-sm font-medium px-6 py-3.5 rounded-lg hover:bg-green-500/20 transition-colors"
          >
            <Rocket className="w-4 h-4" /> Create your pair site
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 border border-gray-800/50 text-gray-300 font-mono text-sm px-6 py-3.5 rounded-lg hover:border-gray-700 transition-colors"
          >
            I already have an account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="p-6 rounded-xl bg-black/30 border border-gray-800/30 hover:border-green-500/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-white font-mono text-sm font-medium mb-2">{f.title}</p>
              <p className="text-gray-500 font-mono text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-white font-display font-bold text-2xl sm:text-3xl text-center mb-12">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative">
              <div className="w-9 h-9 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mb-3 text-green-400 font-mono text-sm font-bold">
                {i + 1}
              </div>
              <p className="text-white font-mono text-sm font-medium mb-1.5">{s.title}</p>
              <p className="text-gray-500 font-mono text-xs leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ownership protection callout */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="p-8 rounded-2xl bg-black/30 border border-green-500/20 flex flex-col sm:flex-row items-start gap-6">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
            <Lock className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <p className="text-white font-mono text-base font-medium mb-2">Built-in clone protection</p>
            <p className="text-gray-500 font-mono text-sm leading-relaxed mb-4">
              Every site is tied to a verified GitHub repository. If someone forks your bot and tries to
              register it under their own account, the request is blocked automatically — and you're
              notified.
            </p>
            <div className="flex items-center gap-2 text-gray-600 font-mono text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500/60" /> GitHub-verified ownership on every site
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-20 text-center">
        <Layers className="w-8 h-8 text-green-400 mx-auto mb-4" />
        <h2 className="text-white font-display font-bold text-2xl sm:text-3xl mb-4">Ready to launch your bot's site?</h2>
        <p className="text-gray-500 font-mono text-sm mb-8">One free site, forever. No credit card required.</p>
        <Link
          href="/signup"
          data-testid="link-footer-signup"
          className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-sm font-medium px-6 py-3.5 rounded-lg hover:bg-green-500/20 transition-colors"
        >
          <Rocket className="w-4 h-4" /> Get started free
        </Link>
      </section>

      <footer className="relative z-10 border-t border-gray-800/50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 text-gray-600 font-mono text-xs">
            <Bot className="w-4 h-4" /> PairSite
          </div>
          <a
            href="https://github.com/WOLVAREX/silentwolf"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-gray-600 hover:text-gray-400 font-mono text-xs transition-colors"
          >
            <Github className="w-3.5 h-3.5" /> GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
