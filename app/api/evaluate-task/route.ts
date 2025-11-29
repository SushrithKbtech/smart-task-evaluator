// app/api/evaluate-task/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { title, description, code } = await req.json();

    if (!title || !description || !code) {
      return NextResponse.json(
        { error: "Missing title, description, or code" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `
You are a strict senior software engineer reviewing a coding task.

Task Title: ${title}
Task Description: ${description}

Code:
${code}

Your job:
1. Identify concrete **bugs** and correctness issues.
2. Suggest **refactors** to improve readability, structure, and maintainability.
3. Give the entire refactored code with the bug fixes.
4. Suggest **performance / efficiency improvements** (time / space complexity, unnecessary work, etc.).

Respond ONLY with JSON that can be parsed by JSON.parse in JavaScript.

The JSON shape MUST be exactly:

{
  "score": number,          // from 0 to 100
  "strengths": string[],    // list of positive points
  "improvements": string[]  // list of concrete improvements
}

In \`improvements\`, include AT LEAST one item for each of these categories (if applicable):
- Start bug-related items with **"Bug Fix:"**
- Start refactor-related items with **"Refactor:"**
- Give the entire refactored code with the bug fixes.
- Start performance-related items with **"Performance:"**

Example improvements entries:
- "Bug Fix: handle null input for 'user' parameter."
- "Refactor: extract validation into a separate helper function."
- "Performance: avoid O(n^2) nested loop by using a hash map."

Do not include any explanations, markdown, comments, or text outside the JSON object.
Return a single JSON object only.
    `.trim();

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      } as any,
    });

    const rawText = result.response.text().trim();

    let jsonText = rawText;

    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```[a-zA-Z]*\s*/, "");
      const endIndex = jsonText.lastIndexOf("```");
      if (endIndex !== -1) {
        jsonText = jsonText.slice(0, endIndex).trim();
      }
    } else {
      const firstBrace = jsonText.indexOf("{");
      const lastBrace = jsonText.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.slice(firstBrace, lastBrace + 1);
      }
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      console.error("Gemini JSON parse failed. Raw text:", rawText);
      return NextResponse.json(
        { error: "Gemini returned invalid JSON" },
        { status: 500 }
      );
    }

    if (
      typeof parsed.score !== "number" ||
      !Array.isArray(parsed.strengths) ||
      !Array.isArray(parsed.improvements)
    ) {
      console.error("Gemini JSON shape invalid:", parsed);
      return NextResponse.json(
        { error: "Gemini JSON shape invalid" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      score: parsed.score,
      strengths: parsed.strengths,
      improvements: parsed.improvements,
    });
  } catch (err) {
    console.error("Gemini evaluate-task error:", err);
    return NextResponse.json(
      { error: "Failed to evaluate task using Gemini" },
      { status: 500 }
    );
  }
}
