import { NextResponse } from "next/server";
import { getServerContext } from "@/lib/supabase/server-helpers";
import { anthropic, extractText } from "@/lib/anthropic";
import { LAYER_LABELS } from "@/lib/constants";

const SYSTEM_PROMPTS = {
  first_step: `あなたはPdMの設計業務を支援するAIです。
以下のタスクについて、今すぐ着手できる最初の具体的なアクションを1〜3ステップで提案してください。
ステップは明確で実行可能な粒度にしてください。
箇条書きで簡潔に出力してください。`,
  research: `あなたはPdMの設計業務を支援するAIです。
以下のタスクを進めるために必要なリサーチ項目と、それぞれの調べ方・参照すべき情報源を提案してください。
箇条書きで簡潔に出力してください。`,
};

export async function POST(request: Request) {
  try {
    const { user, db } = await getServerContext();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { taskId, title, description, layerType, suggestionType } =
      await request.json();

    if (!title || !suggestionType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPTS[suggestionType as keyof typeof SYSTEM_PROMPTS],
      messages: [
        {
          role: "user",
          content: `タスク名: ${title}\nレイヤー: ${LAYER_LABELS[layerType as keyof typeof LAYER_LABELS] ?? layerType}\n説明: ${description ?? "（説明なし）"}`,
        },
      ],
    });

    const { data, error } = await db
      .from("ai_suggestions")
      .insert({
        task_id: taskId,
        user_id: user.id,
        suggestion_type: suggestionType,
        content: extractText(message),
      })
      .select()
      .single();

    if (error) {
      console.error("[ai/suggest] DB error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ suggestion: data });
  } catch (e) {
    console.error("[ai/suggest]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
