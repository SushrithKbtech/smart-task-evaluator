// app/reports/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type ReportTask = {
  id: string;
  title: string;
  ai_score: number | null;
  created_at: string;
};

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<ReportTask[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, ai_score, created_at, status, is_report_unlocked")
        .eq("status", "evaluated")
        .eq("is_report_unlocked", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading reports:", error.message);
      } else if (data) {
        setTasks(
          data.map((t: any) => ({
            id: t.id,
            title: t.title,
            ai_score: t.ai_score,
            created_at: t.created_at,
          }))
        );
      }

      setLoading(false);
    };

    loadData();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <p className="text-slate-300 text-sm">Loading past reports...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold">Past Reports</h1>
          <Link
            href="/dashboard"
            className="text-xs px-3 py-1.5 rounded-md border border-slate-700 hover:bg-slate-800"
          >
            Back to Dashboard
          </Link>
        </div>

        {tasks.length === 0 ? (
          <p className="text-sm text-slate-400">
            You don&apos;t have any unlocked reports yet.
          </p>
        ) : (
          <div className="space-y-3">
            {tasks.map((t) => (
              <Link
                key={t.id}
                href={`/tasks/${t.id}`}
                className="flex items-center justify-between border border-slate-800 rounded-lg px-4 py-3 bg-slate-950/40 hover:bg-slate-900 transition"
              >
                <div>
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-slate-500">
                    Score: {t.ai_score ?? "N/A"}
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(t.created_at).toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
