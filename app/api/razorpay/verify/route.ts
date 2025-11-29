// app/api/razorpay/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      taskId,
      userId,
    } = body;

    console.log("VERIFY BODY:", body);

    if (!taskId || !userId) {
      console.error("Missing taskId or userId in verify payload");
      return NextResponse.json(
        { error: "Missing taskId or userId" },
        { status: 400 }
      );
    }

    // unlock the report for this task
    const { error: updateError } = await supabaseAdmin
      .from("tasks")
      .update({ is_report_unlocked: true })
      .eq("id", taskId);

    if (updateError) {
      console.error("Failed to update task:", updateError);
      return NextResponse.json(
        { error: "Failed to unlock report" },
        { status: 500 }
      );
    }

    console.log("Report unlocked for task:", taskId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Verify error (catch):", err);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}

