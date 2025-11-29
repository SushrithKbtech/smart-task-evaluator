// app/payments/checkout/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Task = {
  id: string;
  title: string;
  is_report_unlocked: boolean;
  user_id: string;
};

// This component actually uses useSearchParams and handles the logic
function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");

  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<Task | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      if (!taskId) {
        setErrorMsg("Missing taskId");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, is_report_unlocked, user_id")
        .eq("id", taskId)
        .single();

      if (error || !data) {
        setErrorMsg(error?.message || "Task not found");
        setLoading(false);
        return;
      }

      if (data.user_id !== user.id) {
        setErrorMsg("You are not allowed to unlock this task.");
        setLoading(false);
        return;
      }

      setTask({
        id: data.id,
        title: data.title,
        is_report_unlocked: data.is_report_unlocked,
        user_id: data.user_id,
      });
      setLoading(false);
    };

    loadData();
  }, [router, taskId]);

  const handleFakePayment = async () => {
    if (!task) return;

    setProcessing(true);
    setErrorMsg(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      // 1) Insert payment record
      const { error: payError } = await supabase.from("payments").insert({
        user_id: user.id,
        task_id: task.id,
        amount: 99.0,
        currency: "INR",
        status: "success", // fake payment, no Razorpay/Stripe for now
      });

      if (payError) throw new Error(payError.message);

      // 2) Mark report as unlocked on the task
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ is_report_unlocked: true })
        .eq("id", task.id);

      if (updateError) throw new Error(updateError.message);

      // 3) Go back to the task page
      router.push(`/tasks/${task.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Payment failed");
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <p className="text-slate-300 text-sm">Loading checkout...</p>
      </main>
    );
  }

  if (!task) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <p className="text-red-400 text-sm">
          {errorMsg || "Unable to load payment page."}
        </p>
      </main>
    );
  }

  if (task.is_report_unlocked) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-4">
          <h1 className="text-xl font-semibold">Report Already Unlocked</h1>
          <p className="text-sm text-slate-300">
            The full report for{" "}
            <span className="font-semibold">{task.title}</span> is already
            unlocked.
          </p>
          <Link
            href={`/tasks/${task.id}`}
            className="inline-flex text-xs mt-2 px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-600"
          >
            Go to Report
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-5">
        <h1 className="text-2xl font-semibold">Unlock Full Report</h1>

        <p className="text-sm text-slate-300">
          You are unlocking the detailed AI report for:
        </p>
        <p className="text-sm font-medium text-slate-100">{task.title}</p>

        <div className="border border-slate-800 rounded-lg p-4 text-sm text-slate-300 space-y-1 bg-slate-950/60">
          <p>What you get:</p>
          <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
            <li>Full list of strengths</li>
            <li>Concrete improvement suggestions</li>
            <li>Permanent access in your past reports</li>
          </ul>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-300">Price</span>
          <span className="font-semibold text-emerald-400">₹99</span>
        </div>

        {errorMsg && (
          <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
            {errorMsg}
          </p>
        )}

        <button
          onClick={handleFakePayment}
          disabled={processing}
          className="w-full text-sm px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60"
        >
          {processing ? "Processing..." : "Pay ₹99 and Unlock"}
        </button>

        <Link
          href={`/tasks/${task.id}`}
          className="block text-center text-xs text-slate-400 hover:underline"
        >
          Cancel and go back
        </Link>
      </div>
    </main>
  );
}

// This is the actual page exported to Next.js, wrapped in Suspense
export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
          <p className="text-slate-300 text-sm">Loading checkout...</p>
        </main>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
