import { NextResponse } from "next/server";
import { getServerContext } from "@/lib/supabase/server-helpers";
import { anthropic, extractText } from "@/lib/anthropic";
import { LAYER_LABELS } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const { user } = await getServerContext();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { title, description, layerType } = await request.json();

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: `あなたはPdMの設計業務を支援するAIです。
以下のタスクについて、今すぐ着手できる最初の具体的なアクションを1〜2ステップで、
できるだけ簡潔に提案してください。`,
      messages: [
        {
          role: "user",
          content: `タスク名: ${title}\nレイヤー: ${LAYER_LABELS[layerType as keyof typeof LAYER_LABELS] ?? layerType}\n説明: ${description ?? "（説明なし）"}`,
        },
      ],
    });

    return NextResponse.json({ suggestion: extractText(message) });
  } catch (e) {
    console.error("[ai/dashboard]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
