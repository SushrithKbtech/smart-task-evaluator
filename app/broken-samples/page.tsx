"use client";

import { useRouter } from "next/navigation";
import brokenUI from "./samples/ui";
import brokenAPI from "./samples/api";
import brokenFunction from "./samples/function";

export default function BrokenSamplesPage() {
  const router = useRouter();

  const loadSample = (title: string, description: string, code: string) => {
    const encoded = encodeURIComponent(
      JSON.stringify({ title, description, code })
    );
    router.push(`/tasks/new?sample=${encoded}`);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <h1 className="text-2xl font-semibold mb-6">Broken Code Samples</h1>

      <div className="space-y-4">
        <button
          onClick={() =>
            loadSample(
              "Broken UI Component",
              "Fix this React component with rendering bugs, missing keys, and broken logic.",
              brokenUI
            )
          }
          className="bg-red-600 px-4 py-2 rounded-md"
        >
          Load Broken UI Component
        </button>

        <button
          onClick={() =>
            loadSample(
              "Buggy API File",
              "Fix validation, SQL injection, and error handling issues.",
              brokenAPI
            )
          }
          className="bg-red-600 px-4 py-2 rounded-md"
        >
          Load Buggy API File
        </button>

        <button
          onClick={() =>
            loadSample(
              "Poorly Written Function",
              "Optimize the algorithm and fix logic errors.",
              brokenFunction
            )
          }
          className="bg-red-600 px-4 py-2 rounded-md"
        >
          Load Poorly Written Function
        </button>
      </div>
    </main>
  );
}
