// app/payments/checkout/page.tsx
import { Suspense } from "react";
import CheckoutClient from "./CheckoutClient";

export default function CheckoutPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <Suspense
        fallback={
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
            <p className="text-slate-300 text-sm">Loading checkout...</p>
          </div>
        }
      >
        <CheckoutClient />
      </Suspense>
    </main>
  );
}
