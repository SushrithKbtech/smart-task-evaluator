// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Task = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  ai_score: number | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setEmail(user.email ?? null);

      const { data: taskData, error } = await supabase
        .from("tasks")
        .select("id, title, status, created_at, ai_score")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading tasks:", error.message);
      } else if (taskData) {
        setTasks(taskData as Task[]);
      }

      setLoading(false);
    };

    loadData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <p className="text-slate-300 text-sm">Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-slate-400">
              Logged in as <span className="font-mono">{email}</span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1.5 rounded-md border border-slate-700 hover:bg-slate-800"
          >
            Logout
          </button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Your Tasks</h2>
          <div className="flex gap-2">
            <Link
              href="/tasks/new"
              className="text-sm px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-600"
            >
              + New Task
            </Link>
            <Link
              href="/broken-samples"
              className="text-sm px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700"
            >
              Code Editing Requirement
            </Link>
            <Link
              href="/reports"
              className="text-sm px-3 py-1.5 rounded-md bg-indigo-500 hover:bg-indigo-600"
            >
              Past Reports
            </Link>
          </div>
        </div>

        {tasks.length === 0 ? (
          <p className="text-sm text-slate-400">
            No tasks yet. Click &quot;New Task&quot; to submit your first coding task,
            or use &quot;Code Editing Requirement&quot; to load our broken samples.
          </p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="flex items-center justify-between border border-slate-800 rounded-lg px-4 py-3 bg-slate-950/40 hover:bg-slate-900 transition"
              >
                <div>
                  <p className="text-sm font-medium">{task.title}</p>
                  <p className="text-xs text-slate-500">
                    Status: {task.status}
                    {task.ai_score !== null && ` · Score: ${task.ai_score}`}
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(task.created_at).toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
