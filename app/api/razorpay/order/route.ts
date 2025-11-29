// app/api/razorpay/order/route.ts
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

export const dynamic = "force-dynamic"; // avoid caching

export async function POST(req: NextRequest) {
  try {
    const { taskId } = await req.json();

    if (!taskId) {
      console.error("Missing taskId in body");
      return NextResponse.json({ error: "taskId missing" }, { status: 400 });
    }

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      console.error("Razorpay keys not configured", {
        key_id_present: !!key_id,
        key_secret_present: !!key_secret,
      });
      return NextResponse.json(
        { error: "Razorpay keys not configured" },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({ key_id, key_secret });

    // amount in paise (₹99.00)
    const amount = 9900;

    // keep receipt <= 40 chars
    const shortTaskId = String(taskId).slice(0, 16);
    const receipt = `t_${shortTaskId}_${Date.now()}`.slice(0, 40);

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt,
    });

    console.log("Razorpay order created:", order.id);

    return NextResponse.json({ order }, { status: 200 });
  } catch (err: any) {
    console.error("Razorpay order error:", err?.response || err);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
