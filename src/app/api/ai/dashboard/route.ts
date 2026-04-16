import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

  const { title, description, layerType } = await request.json()

  const userMessage = `タスク名: ${title}
レイヤー: ${LAYER_LABELS[layerType] ?? layerType}
説明: ${description ?? '（説明なし）'}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: `あなたはPdMの設計業務を支援するAIです。
以下のタスクについて、今すぐ着手できる最初の具体的なアクションを1〜2ステップで、
できるだけ簡潔に提案してください。`,
    messages: [{ role: 'user', content: userMessage }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Unexpected response' }, { status: 500 })
  }

  return NextResponse.json({ suggestion: content.text })
}
