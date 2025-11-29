// app/tasks/new/page.tsx
"use client";

import { Suspense, FormEvent, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// Inner component that actually uses useSearchParams
function NewTaskContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ---- Load sample from URL query ----
  useEffect(() => {
    const sampleEncoded = searchParams.get("sample");
    if (!sampleEncoded) return;

    try {
      const decoded = decodeURIComponent(sampleEncoded);
      const sample = JSON.parse(decoded);

      setTitle(sample.title || "");
      setDescription(sample.description || "");
      setCode(sample.code || "");
    } catch (err) {
      console.error("Failed to decode sample:", err);
    }
  }, [searchParams]);

  // ---- Auth check ----
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
      }
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setErrorMsg("You must be logged in to submit a task.");
      return;
    }

    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      title,
      description,
      code,
      status: "pending",
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-semibold mb-2">Submit a Coding Task</h1>

        {errorMsg && (
          <p className="mb-3 text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
            {errorMsg}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Title</label>
            <input
              type="text"
              required
              className="w-full rounded-md px-3 py-2 bg-slate-950 border border-slate-700"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Task Description</label>
            <textarea
              required
              className="w-full rounded-md px-3 py-2 bg-slate-950 border border-slate-700 min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Code</label>
            <textarea
              required
              className="w-full font-mono text-xs rounded-md px-3 py-2 bg-slate-950 border border-slate-700 min-h-[160px]"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md py-2.5 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60"
          >
            {loading ? "Submitting..." : "Submit Task"}
          </button>
        </form>
      </div>
    </main>
  );
}

// Default export wrapped in Suspense for useSearchParams
export default function NewTaskPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
          <p className="text-slate-300 text-sm">Loading new task form...</p>
        </main>
      }
    >
      <NewTaskContent />
    </Suspense>
  );
}
