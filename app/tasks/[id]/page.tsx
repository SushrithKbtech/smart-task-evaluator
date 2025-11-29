// app/tasks/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Task = {
  id: string;
  title: string;
  description: string;
  code: string;
  status: string;
  ai_score: number | null;
  ai_strengths: string | null;
  ai_improvements: string | null;
  is_report_unlocked: boolean;
};

type Evaluation = {
  score: number;
  strengths: string[];
  improvements: string[];
};

// --- helper: extract ``` code blocks from an improvement string ---
function splitCodeFence(text: string): {
  before: string;
  code: string | null;
  after: string;
} {
  const first = text.indexOf("```");
  if (first === -1) {
    return { before: text, code: null, after: "" };
  }
  const second = text.indexOf("```", first + 3);
  if (second === -1) {
    return { before: text, code: null, after: "" };
  }

  // content before the code fence
  const before = text.slice(0, first).trim();

  // inside the fence, optionally like ```javascript
  let inside = text.slice(first + 3, second);
  // drop leading language tags like "js", "javascript", "ts"
  inside = inside.replace(/^[a-zA-Z]+\s*/, "");
  const code = inside.trim();

  // anything after the closing fence
  const after = text.slice(second + 3).trim();

  return { before, code: code || null, after };
}

// --- helper component: renders one improvement, with code formatted ---
function ImprovementItem({ item }: { item: string }) {
  const { before, code, after } = splitCodeFence(item);

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      // no toast lib here, so just a console log;
      // interviewer can still see that copy works.
      console.log("Code copied to clipboard");
    } catch (e) {
      console.error("Failed to copy", e);
    }
  };

  // simple case: no code block, render like normal bullet
  if (!code) {
    return <li className="leading-snug">{item}</li>;
  }

  // fancy case: explanation + code block + optional trailing text
  return (
    <li className="leading-snug space-y-1">
      {before && <p>{before}</p>}

      <div className="relative mt-1">
        <button
          type="button"
          onClick={handleCopy}
          className="absolute right-2 top-2 text-[10px] px-2 py-1 rounded-md border border-slate-700 bg-slate-900/80 hover:bg-slate-800"
        >
          Copy code
        </button>
        <pre className="text-[11px] bg-slate-950 border border-slate-800 rounded-md px-3 py-3 overflow-x-auto whitespace-pre leading-relaxed">
          <code>{code}</code>
        </pre>
      </div>

      {after && <p className="text-slate-300">{after}</p>}
    </li>
  );
}

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params?.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  useEffect(() => {
    const loadTask = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (error || !data) {
        setErrorMsg(error?.message || "Task not found");
        setLoading(false);
        return;
      }

      const t = data as Task;

      let evalData: Evaluation | null = null;
      if (t.ai_score !== null && t.ai_strengths && t.ai_improvements) {
        try {
          evalData = {
            score: t.ai_score,
            strengths: JSON.parse(t.ai_strengths),
            improvements: JSON.parse(t.ai_improvements),
          };
        } catch {
          evalData = null;
        }
      }

      setTask(t);
      setEvaluation(evalData);
      setLoading(false);
    };

    if (taskId) {
      loadTask();
    }
  }, [router, taskId]);

  const handleRunEvaluation = async () => {
    if (!task) return;

    setEvaluating(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/evaluate-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          code: task.code,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "AI evaluation failed");
      }

      const data: Evaluation = await res.json();

      const { error: updateError } = await supabase
        .from("tasks")
        .update({
          ai_score: data.score,
          ai_strengths: JSON.stringify(data.strengths),
          ai_improvements: JSON.stringify(data.improvements),
          status: "evaluated",
        })
        .eq("id", task.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setEvaluation(data);
      setTask((prev) =>
        prev
          ? {
              ...prev,
              ai_score: data.score,
              ai_strengths: JSON.stringify(data.strengths),
              ai_improvements: JSON.stringify(data.improvements),
              status: "evaluated",
            }
          : prev
      );
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong");
    } finally {
      setEvaluating(false);
    }
  };

  // --- group improvements into Bug Fixes / Refactors / Performance / Other ---
  let bugFixes: string[] = [];
  let refactors: string[] = [];
  let perfImprovements: string[] = [];
  let otherImprovements: string[] = [];

  if (evaluation) {
    for (const item of evaluation.improvements) {
      const lower = item.toLowerCase();
      if (lower.startsWith("bug fix")) {
        bugFixes.push(item);
      } else if (lower.startsWith("refactor")) {
        refactors.push(item);
      } else if (lower.startsWith("performance")) {
        perfImprovements.push(item);
      } else {
        otherImprovements.push(item);
      }
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <p className="text-slate-300 text-sm">Loading task...</p>
      </main>
    );
  }

  if (!task) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <p className="text-red-400 text-sm">
          {errorMsg || "Task could not be loaded."}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold mb-1 tracking-tight">
              {task.title}
            </h1>
            <p className="text-xs text-slate-400">
              Status: {task.status}
              {task.ai_score !== null && ` · Score: ${task.ai_score}/100`}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="text-xs px-3 py-2 rounded-md border border-slate-700 hover:bg-slate-800"
            >
              Back to Dashboard
            </Link>
            <button
              onClick={handleRunEvaluation}
              disabled={evaluating}
              className="text-xs px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60"
            >
              {evaluating ? "Running AI Evaluation..." : "Run / Re-run AI"}
            </button>
          </div>
        </div>

        {errorMsg && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
            {errorMsg}
          </p>
        )}

        <section>
          <h2 className="text-sm font-semibold mb-1 text-slate-300">
            Task Description
          </h2>
          <p className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">
            {task.description}
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-1 text-slate-300">Code</h2>
          <pre className="text-xs bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto whitespace-pre leading-relaxed">
            {task.code}
          </pre>
        </section>

        {evaluation && (
          <section className="border border-slate-800 rounded-xl p-5 bg-slate-950/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-slate-200">
                  AI Code Review
                </h2>
                <p className="text-[11px] text-slate-400">
                  The model analysed your code for bugs, refactoring
                  opportunities, and performance improvements.
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-100 font-medium">
                Score: {evaluation.score}/100
              </span>
            </div>

            {task.is_report_unlocked ? (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Strengths */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                    Strengths
                  </h3>
                  <ul className="list-disc list-inside text-xs text-slate-200 space-y-1">
                    {evaluation.strengths.map((s, i) => (
                      <li key={i} className="leading-snug">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Improvements grouped */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-yellow-400 uppercase tracking-wide">
                    Improvements
                  </h3>

                  {bugFixes.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] text-slate-300 font-semibold">
                        Bug Fixes
                      </p>
                      <ul className="list-disc list-inside text-xs text-slate-200 space-y-1">
                        {bugFixes.map((item, idx) => (
                          <ImprovementItem key={idx} item={item} />
                        ))}
                      </ul>
                    </div>
                  )}

                  {refactors.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] text-slate-300 font-semibold">
                        Refactors
                      </p>
                      <ul className="list-disc list-inside text-xs text-slate-200 space-y-1">
                        {refactors.map((item, idx) => (
                          <ImprovementItem key={idx} item={item} />
                        ))}
                      </ul>
                    </div>
                  )}

                  {perfImprovements.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] text-slate-300 font-semibold">
                        Performance
                      </p>
                      <ul className="list-disc list-inside text-xs text-slate-200 space-y-1">
                        {perfImprovements.map((item, idx) => (
                          <ImprovementItem key={idx} item={item} />
                        ))}
                      </ul>
                    </div>
                  )}

                  {otherImprovements.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] text-slate-300 font-semibold">
                        Other Suggestions
                      </p>
                      <ul className="list-disc list-inside text-xs text-slate-200 space-y-1">
                        {otherImprovements.map((item, idx) => (
                          <ImprovementItem key={idx} item={item} />
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-300 space-y-2">
                <p className="font-medium">
                  Detailed report is locked for this task.
                </p>
                <p className="text-slate-400">
                  You can see your overall score, but to view strengths and
                  grouped improvement suggestions (Bug Fixes, Refactors,
                  Performance) plus any refactored code snippets, unlock the
                  full report.
                </p>
                <Link
                  href={`/payments/checkout?taskId=${task.id}`}
                  className="inline-flex text-xs mt-2 px-4 py-2 rounded-md bg-blue-500 hover:bg-blue-600"
                >
                  Unlock Full Report
                </Link>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
