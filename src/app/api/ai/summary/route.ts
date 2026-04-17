import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { weekStart } = await request.json()

    // 今週完了タスクを取得
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    const { data: tasks } = await supabase.schema('taskgo').from('tasks').select('title, output_note')
      .eq('status', 'done').eq('user_id', user.id)
      .gte('completed_at', weekStart)
      .lt('completed_at', weekEnd.toISOString().split('T')[0])

    if (!tasks?.length) {
      return NextResponse.json({ error: '今週完了したタスクがありません' }, { status: 400 })
    }

    const taskList = tasks.map((t, i) =>
      `${i + 1}. ${t.title}${t.output_note ? `\n   アウトプット: ${t.output_note}` : ''}`
    ).join('\n')

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `以下は今週完了したタスクとそのアウトプットの記録です。
今週どんな価値を出せたかを3〜5文で簡潔にまとめてください。
PMとしての観点で、決めたこと・動かしたこと・発見したことの観点を含めてください。

${taskList}`,
      }],
    })

    const content = message.content[0]
    if (content.type !== 'text') return NextResponse.json({ error: 'Unexpected response' }, { status: 500 })

    // weekly_summaries に保存
    const { data: existing } = await supabase.schema('taskgo').from('weekly_summaries')
      .select('id').eq('user_id', user.id).eq('week_start', weekStart).maybeSingle()

    if (existing) {
      await supabase.schema('taskgo').from('weekly_summaries').update({ summary: content.text }).eq('id', existing.id)
    } else {
      await supabase.schema('taskgo').from('weekly_summaries')
        .insert({ user_id: user.id, week_start: weekStart, summary: content.text })
    }

    return NextResponse.json({ summary: content.text })
  } catch (e) {
    console.error('[ai/summary]', e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
