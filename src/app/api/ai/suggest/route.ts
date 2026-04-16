import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPTS = {
  first_step: `あなたはPdMの設計業務を支援するAIです。
以下のタスクについて、今すぐ着手できる最初の具体的なアクションを1〜3ステップで提案してください。
ステップは明確で実行可能な粒度にしてください。
箇条書きで簡潔に出力してください。`,

  research: `あなたはPdMの設計業務を支援するAIです。
以下のタスクを進めるために必要なリサーチ項目と、それぞれの調べ方・参照すべき情報源を提案してください。
箇条書きで簡潔に出力してください。`,
}

const LAYER_LABELS: Record<string, string> = {
  core_value: 'コアバリュー',
  roadmap: 'ロードマップ',
  spec_design: '仕様・デザイン',
  other: 'その他',
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { taskId, title, description, layerType, suggestionType } = await request.json()

  if (!title || !suggestionType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const userMessage = `タスク名: ${title}
レイヤー: ${LAYER_LABELS[layerType] ?? layerType}
説明: ${description ?? '（説明なし）'}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPTS[suggestionType as 'first_step' | 'research'],
    messages: [{ role: 'user', content: userMessage }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Unexpected response' }, { status: 500 })
  }

  // Save to DB
  const { data, error } = await supabase
    .schema('taskgo')
    .from('ai_suggestions')
    .insert({
      task_id: taskId,
      user_id: user.id,
      suggestion_type: suggestionType,
      content: content.text,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ suggestion: data })
}
