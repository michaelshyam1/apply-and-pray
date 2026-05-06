"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Target,
  Upload,
  Sparkles,
  TableProperties,
  ArrowRight,
  BarChart3,
  Clock,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

const features = [
  {
    icon: Upload,
    title: "Screenshot to entry",
    desc: "Drag in a screenshot of any job posting. AI extracts company, role, location, deadline, and salary automatically.",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
  },
  {
    icon: Sparkles,
    title: "Smart extraction",
    desc: "GPT-4o Vision reads job postings with 90%+ accuracy. Manual edit support for anything it misses.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
  },
  {
    icon: TableProperties,
    title: "Google Sheets sync",
    desc: "Every application syncs to a Google Sheet you own. Full data portability — export, share, or query anytime.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  {
    icon: Clock,
    title: "Deadline warnings",
    desc: "Never miss a rolling deadline. Get visual warnings when applications close within 7 days.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  {
    icon: BarChart3,
    title: "Pipeline analytics",
    desc: "Track your application velocity, response rate, and funnel conversion in real time.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    icon: Zap,
    title: "Duplicate detection",
    desc: "Automatically catches if you accidentally apply to the same role twice.",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
];

const steps = [
  { label: "Upload screenshot", desc: "Drag & drop any job posting or confirmation email" },
  { label: "AI extracts details", desc: "Company, role, location, salary, deadline — all filled in" },
  { label: "Review & confirm", desc: "Edit any field before saving" },
  { label: "Synced everywhere", desc: "Dashboard updated + Google Sheet appended instantly" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
              <Target className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold">
              Applied<span className="text-indigo-400">&amp;</span>Prayed
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">Dashboard</Button>
            </Link>
            <Link href="/upload">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-20 text-center">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[600px] w-[600px] rounded-full bg-indigo-500/5 blur-3xl" />
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          className="relative z-10 max-w-3xl"
        >
          <motion.div variants={fadeUp} custom={0} className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered · Works with any job site
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-5xl font-bold tracking-tight text-zinc-50 sm:text-6xl lg:text-7xl"
          >
            Track every shot.
            <br />
            <span className="text-indigo-400">Remember every prayer.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="mt-6 max-w-xl mx-auto text-lg text-zinc-400 leading-relaxed"
          >
            Upload a screenshot of any job posting. AI extracts the details.
            Your pipeline stays organized — and synced to Google Sheets.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/upload">
              <Button size="lg" className="gap-2 shadow-lg shadow-indigo-500/20">
                <Upload className="h-4 w-4" />
                Add your first application
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline">
                View dashboard
              </Button>
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} custom={4} className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-600">
            {["Free to use", "No account required", "Data stays yours", "Google Sheets included"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-zinc-700" />
                {t}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="border-t border-zinc-800 bg-zinc-900/30 py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-2">
              How it works
            </p>
            <h2 className="text-3xl font-bold text-zinc-100">
              From screenshot to spreadsheet in seconds
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="relative rounded-xl border border-zinc-800 bg-zinc-900 p-5"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold text-zinc-100">{step.label}</h3>
                <p className="mt-1 text-sm text-zinc-500">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-2">
              Features
            </p>
            <h2 className="text-3xl font-bold text-zinc-100">
              Everything your internship hunt needs
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  className={`rounded-xl border ${f.border} bg-zinc-900 p-5`}
                >
                  <div className={`mb-3 inline-flex rounded-lg border ${f.border} ${f.bg} p-2`}>
                    <Icon className={`h-4 w-4 ${f.color}`} />
                  </div>
                  <h3 className="font-semibold text-zinc-100">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-800 py-20 px-6 text-center">
        <div className="mx-auto max-w-xl">
          <div className="mb-6 inline-flex items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4">
            <Target className="h-8 w-8 text-indigo-400" />
          </div>
          <h2 className="text-3xl font-bold text-zinc-100">
            Stop losing track. Start closing.
          </h2>
          <p className="mt-4 text-zinc-500">
            Your future self will thank you for having a single source of truth.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/upload">
              <Button size="lg" className="gap-2 shadow-lg shadow-indigo-500/20">
                <Upload className="h-4 w-4" />
                Start tracking
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline">Open dashboard</Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-800 px-6 py-6 text-center">
        <p className="text-xs text-zinc-700">
          Applied &amp; Prayed · Built for internship season
        </p>
      </footer>
    </div>
  );
}
