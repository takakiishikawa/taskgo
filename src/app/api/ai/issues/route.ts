import { NextResponse } from "next/server";
import { getServerContext } from "@/lib/supabase/server-helpers";
import { anthropic, extractText } from "@/lib/anthropic";
import { LAYER_LABELS, STATUS_LABEL } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const { user, db } = await getServerContext();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { taskId, issueType } = await request.json();
    const isShort = issueType === "short";

    const [{ data: tasks }, { data: layers }] = await Promise.all([
      db
        .from("tasks")
        .select("title, layer_type, status")
        .eq("user_id", user.id)
        .neq("status", "done")
        .order("updated_at", { ascending: false })
        .limit(20),
      db
        .from("design_layers")
        .select("layer_type, title, cover_until")
        .eq("user_id", user.id)
        .order("last_updated_at", { ascending: false }),
    ]);

    const taskSummary = (tasks ?? [])
      .map(
        (t) =>
          `・${t.title}（${LAYER_LABELS[t.layer_type as keyof typeof LAYER_LABELS]}/${STATUS_LABEL[t.status as keyof typeof STATUS_LABEL]}）`,
      )
      .join("\n");

    const layerSummary = (layers ?? [])
      .map(
        (l) =>
          `・${LAYER_LABELS[l.layer_type as keyof typeof LAYER_LABELS]}: ${l.title}${l.cover_until ? `（カバー〜${l.cover_until}）` : ""}`,
      )
      .join("\n");

    const context = `【進行中タスク】\n${taskSummary || "（なし）"}\n\n【設計レイヤー】\n${layerSummary || "（なし）"}`;

    const systemPrompt = isShort
      ? `あなたはPdMの設計業務を支援するAIです。
以下は現在のタスク一覧と設計レイヤーの状況です。
現在進行中の開発において、今すぐ対処すべき重要な課題をトップ3で挙げてください。
各課題は課題名・なぜ重要か・推奨アクションの3点で記述してください。`
      : `あなたはPdMの設計業務を支援するAIです。
以下は現在のタスク一覧・設計レイヤー・ロードマップの状況です。
3〜12ヶ月のスパンで見た時に対処すべき重要な課題をトップ3で挙げてください。
各課題は課題名・なぜ重要か・推奨アクションの3点で記述してください。`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: `${systemPrompt}\n\n${context}` }],
    });

    const { data: saved, error } = await db
      .from("ai_suggestions")
      .insert({
        task_id: taskId,
        user_id: user.id,
        suggestion_type: "issues",
        content: extractText(message),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ suggestion: saved });
  } catch (e) {
    console.error("[ai/issues]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
