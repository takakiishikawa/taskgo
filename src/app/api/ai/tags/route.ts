import { NextResponse } from "next/server";
import { getServerContext } from "@/lib/supabase/server-helpers";
import { anthropic } from "@/lib/anthropic";
import { LAYER_LABELS } from "@/lib/constants";

function parseTagArray(text: string): string[] {
  try {
    const match = text.match(/\[[\s\S]*?\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(
            (t): t is string => typeof t === "string" && t.trim().length > 0,
          )
          .slice(0, 2);
      }
    }
  } catch {
    /* ignore */
  }
  return [];
}

export async function POST(request: Request) {
  try {
    const { user } = await getServerContext();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { title, description, layerType } = await request.json();

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `以下のタスクに対して、プロジェクトやテーマを表すタグを1〜2個提案してください。
タグは短く（2〜8文字）、日本語で。
JSON配列で返してください。例: ["リプレイス", "設計"]

タスクタイトル: ${title}
説明: ${description ?? "（なし）"}
レイヤー: ${LAYER_LABELS[layerType as keyof typeof LAYER_LABELS] ?? layerType}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") return NextResponse.json({ tags: [] });

    return NextResponse.json({ tags: parseTagArray(content.text) });
  } catch (e) {
    console.error("[ai/tags]", e);
    return NextResponse.json({ tags: [] });
  }
}
