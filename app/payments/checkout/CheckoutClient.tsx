// app/payments/checkout/CheckoutClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

declare global {
  interface Window {
    Razorpay: any;
  }
}

type Task = {
  id: string;
  title: string;
  is_report_unlocked: boolean;
  user_id: string;
};

export default function CheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");

  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<Task | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // 1) Load task & verify ownership
  useEffect(() => {
    const loadData = async () => {
      if (!taskId) {
        setErrorMsg("Missing taskId in URL");
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, is_report_unlocked, user_id")
        .eq("id", taskId)
        .single();

      if (error || !data) {
        console.error("Task fetch error:", error);
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

  // 2) Load Razorpay JS once
  useEffect(() => {
    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) return;

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // 3) Payment flow
  const handlePay = async () => {
    if (!task || !taskId) return;

    setProcessing(true);
    setErrorMsg(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // (a) Create Razorpay order on backend
      const orderRes = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });

      const orderText = await orderRes.text();
      let orderData: any = {};
      try {
        orderData = JSON.parse(orderText);
      } catch {
        // ignore parse error
      }

      if (!orderRes.ok) {
        console.error("Order API failed:", orderRes.status, orderText);
        throw new Error(orderData.error || "Failed to create order");
      }

      const { order } = orderData;

      if (!window.Razorpay) {
        throw new Error("Razorpay SDK not loaded");
      }

      const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID as
        | string
        | undefined;
      if (!key) {
        throw new Error("NEXT_PUBLIC_RAZORPAY_KEY_ID not configured");
      }

      const options = {
        key,
        amount: order.amount,
        currency: order.currency,
        name: "AI Code Review",
        description: `Unlock full report for "${task.title}"`,
        order_id: order.id,
        handler: async (response: any) => {
          try {
            console.log("Razorpay success response:", response);

            // Directly unlock the report in Supabase
            const { error: updateError } = await supabase
              .from("tasks")
              .update({ is_report_unlocked: true })
              .eq("id", task.id);

            if (updateError) {
              console.error("Failed to unlock report:", updateError);
              setErrorMsg("Payment succeeded but failed to unlock report.");
              setProcessing(false);
              return;
            }

            // Optional: record payment client-side
            await supabase.from("payments").insert({
              user_id: user.id,
              task_id: task.id,
              amount: 99.0,
              currency: "INR",
              status: "success",
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
            });

            // Go back to task page – it will now show full report
            router.push(`/tasks/${task.id}`);
          } catch (err: any) {
            console.error("Post-payment error:", err);
            setErrorMsg("Payment succeeded but something went wrong.");
            setProcessing(false);
          }
        },
        theme: {
          color: "#10b981",
        },
        prefill: {
          name: user.email || "Test User",
          email: user.email || "test@example.com",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error("handlePay error:", err);
      setErrorMsg(err.message || "Payment failed");
      setProcessing(false);
    }
  };

  // ---------- UI ----------

  if (!taskId) {
    return (
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <p className="text-sm text-red-400">
          Missing taskId in URL. Use the “Unlock Full Report” button from a
          task.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <p className="text-slate-300 text-sm">Loading checkout...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <p className="text-red-400 text-sm">
          {errorMsg || "Unable to load payment page."}
        </p>
      </div>
    );
  }

  if (task.is_report_unlocked) {
    return (
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
    );
  }

  return (
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
          <li>Concrete improvement suggestions with code</li>
          <li>Permanent access in your dashboard</li>
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
        onClick={handlePay}
        disabled={processing}
        className="w-full text-sm px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60"
      >
        {processing ? "Processing..." : "Pay ₹99 with Razorpay"}
      </button>

      <Link
        href={`/tasks/${task.id}`}
        className="block text-center text-xs text-slate-400 hover:underline"
      >
        Cancel and go back
      </Link>
    </div>
  );
}
