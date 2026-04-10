import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildQuestionPrompt(previousThemes: string[]): string {
  return `あなたは哲学的思考実験の設計者です。
以下の条件で新しい思考実験を1つ生成してください。

## 条件
- 古典的な哲学問題（トロッコ問題、テセウスの船、中国語の部屋、水槽の脳、無知のヴェール等）を参考にしつつ、独自のシナリオにする
- 選択肢は2〜3つ。どれも一理ある内容にする
- シナリオは200〜300字、具体的で想像しやすい状況描写
- 以下の哲学軸のうち、主に1〜2軸を測定できる内容にする:
  功利主義⇔義務論 / 決定論⇔自由意志 / 個人主義⇔共同体主義 / 唯物論⇔観念論 / 理性主義⇔感情主義
- これまでの出題と異なるテーマ・軸を優先する

## これまでの出題テーマ
${previousThemes.length > 0 ? previousThemes.join('\n') : 'なし'}

## 出力フォーマット（JSONのみ、他のテキスト不要）
{
  "scenario": "思考実験のシナリオ",
  "choices": [
    {"id": "A", "text": "選択肢A"},
    {"id": "B", "text": "選択肢B"},
    {"id": "C", "text": "選択肢C（任意）"}
  ],
  "theme": "この問題のテーマ（短い説明）",
  "target_axes": ["測定対象の軸名"]
}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { previousThemes } = req.body as { previousThemes: string[] }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: buildQuestionPrompt(previousThemes) }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonText = raw.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(jsonText)

    res.json({
      scenario: parsed.scenario,
      choices: parsed.choices,
      theme: parsed.theme,
      target_axes: parsed.target_axes ?? [],
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to generate question' })
  }
}
