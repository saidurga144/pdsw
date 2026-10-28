"use client";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Mail,
  Menu,
  SendHorizonal,
  X,
  ShieldCheck,
  Database,
  Cpu,
  Lock,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

const menuItems = [
  { name: "PDS Lifecycle", href: "/lifecycle" },
  { name: "AI Intelligence", href: "/admin/ai-intelligence" },
  { name: "IPFS Provenance", href: "/admin/ipfs" },
  { name: "Integrity Matrix", href: "/admin/integrity" },
];

export function HeroSection() {
  const [menuState, setMenuState] = useState(false);
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 shadow-2xl">
      <header>
        <nav
          data-state={menuState && "active"}
          className="group w-full border-b border-dashed border-slate-800 bg-slate-950/80 backdrop-blur"
        >
          <div className="m-auto max-w-6xl px-6">
            <div className="flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
              <div className="flex w-full justify-between lg:w-auto">
                <Link
                  href="/"
                  aria-label="home"
                  className="flex items-center space-x-3"
                >
                  <div className="p-2 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-xl text-white shadow-md shadow-cyan-500/20">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-base tracking-wider text-white uppercase block leading-none">
                      PDSW
                    </span>
                    <span className="text-[10px] text-cyan-400 font-mono">
                      Secure Welfare Distribution
                    </span>
                  </div>
                </Link>

                <button
                  onClick={() => setMenuState(!menuState)}
                  aria-label={menuState === true ? "Close Menu" : "Open Menu"}
                  className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden text-slate-300"
                >
                  <Menu className="group-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                  <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
                </button>
              </div>

              <div className="bg-slate-900 group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-6 rounded-2xl border border-slate-800 p-6 shadow-2xl md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none">
                <div className="lg:pr-4">
                  <ul className="space-y-4 text-sm lg:flex lg:gap-6 lg:space-y-0 text-slate-300 font-medium">
                    {menuItems.map((item, index) => (
                      <li key={index}>
                        <Link
                          href={item.href}
                          className="text-slate-400 hover:text-cyan-400 block duration-150 text-xs tracking-wide"
                        >
                          <span>{item.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit lg:border-l lg:border-slate-800 lg:pl-6">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 hover:text-white text-xs"
                  >
                    <Link href="/lifecycle">
                      <span>Explore Lifecycle</span>
                    </Link>
                  </Button>

                  <Button
                    asChild
                    size="sm"
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20"
                  >
                    <Link href="/login">
                      <span>Portal Login</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="relative mx-auto max-w-6xl px-6 py-16 lg:py-20 z-10">
            <div className="lg:flex lg:items-center lg:gap-12">
              <div className="relative z-10 mx-auto max-w-2xl text-center lg:ml-0 lg:w-3/5 lg:text-left">
                <Link
                  href="/lifecycle"
                  className="rounded-full mx-auto flex w-fit items-center gap-2 border border-cyan-800/80 bg-cyan-950/60 p-1 pr-3 lg:ml-0 shadow-sm hover:border-cyan-500/80 transition-colors"
                >
                  <span className="bg-cyan-500/20 text-cyan-300 font-mono rounded-full px-2 py-0.5 text-[10px] font-bold">
                    AI + IPFS DAG
                  </span>
                  <span className="text-xs text-cyan-200 font-medium">
                    National Anti-Fraud Framework
                  </span>
                  <ArrowRight className="size-3.5 text-cyan-400" />
                </Link>

                <h1 className="mt-6 text-balance text-3xl font-extrabold text-white sm:text-4xl md:text-5xl lg:text-5xl tracking-tight leading-tight">
                  PDSW: Provenance-Driven Secure Welfare-Distribution
                </h1>
                <p className="mt-4 text-sm md:text-base text-slate-300 leading-relaxed">
                  An AI-driven privacy-preserving framework securing Public
                  Distribution Systems against ration leakage, phantom
                  beneficiaries, and unauthorized database mutations through
                  cryptographic IPFS provenance.
                </p>

                <div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      window.location.href = "/login";
                    }}
                    className="mx-auto my-8 max-w-md lg:my-8 lg:ml-0 lg:mr-auto"
                  >
                    <div className="bg-slate-900 border border-slate-800 has-[input:focus]:border-cyan-500 relative grid grid-cols-[1fr_auto] items-center rounded-xl p-1 shadow-xl shadow-black/40">
                      <Mail className="pointer-events-none absolute inset-y-0 left-4 my-auto size-4 text-slate-500" />

                      <input
                        placeholder="Enter officer/beneficiary ID or email"
                        className="h-11 w-full bg-transparent pl-10 pr-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                        type="text"
                      />

                      <div>
                        <Button
                          type="submit"
                          size="sm"
                          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider"
                          aria-label="submit"
                        >
                          <span className="hidden md:block">Access Portal</span>
                          <SendHorizonal
                            className="size-4 md:hidden"
                            strokeWidth={2}
                          />
                        </Button>
                      </div>
                    </div>
                  </form>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300 pt-2">
                    <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800/80 rounded-lg p-2.5">
                      <Cpu className="size-4 text-indigo-400 shrink-0" />
                      <span className="font-semibold text-slate-200">
                        AI Risk Scoring
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800/80 rounded-lg p-2.5">
                      <Database className="size-4 text-cyan-400 shrink-0" />
                      <span className="font-semibold text-slate-200">
                        IPFS DAG Audit
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800/80 rounded-lg p-2.5">
                      <Lock className="size-4 text-emerald-400 shrink-0" />
                      <span className="font-semibold text-slate-200">
                        Zero-Knowledge
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Background Visual Element with Unsplash Cybersecurity/Analytics Dashboard */}
            <div className="absolute inset-0 -mx-4 rounded-3xl p-3 lg:col-span-3 pointer-events-none opacity-40 lg:opacity-60 overflow-hidden">
              <div
                aria-hidden
                className="absolute z-[1] inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent"
              />
              <div className="relative h-full w-full flex items-center justify-end">
                <img
                  className="rounded-2xl object-cover border border-slate-800 shadow-2xl h-[520px] w-[640px] translate-x-12"
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80"
                  alt="PDSW Security & Provenance Analytics"
                  width={1600}
                  height={1000}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
