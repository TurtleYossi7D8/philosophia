import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface Choice {
  id: string
  text: string
}

interface Question {
  scenario: string
  choices: Choice[]
  theme: string
  target_axes: string[]
}

interface Answer {
  questionIndex: number
  choiceId: string
  reason: string
}

function buildAnalysisPrompt(questions: Question[], answers: Answer[]): string {
  const qa = answers.map((a) => {
    const q = questions[a.questionIndex]
    const choice = q?.choices.find((c) => c.id === a.choiceId)
    return `【問${a.questionIndex + 1}】テーマ：${q?.theme}
シナリオ：${q?.scenario}
選択：${a.choiceId}. ${choice?.text ?? ''}${a.reason ? `\n理由：${a.reason}` : ''}`
  }).join('\n\n')

  return `あなたは哲学的思考分析の専門家です。
以下のユーザーの回答を分析し、5つの哲学軸それぞれのスコアと分析文を生成してください。

## ユーザーの回答
${qa}

## 5つの哲学軸（各0〜100でスコアリング）
- ethics: 功利主義（0）⇔ 義務論（100）
- will: 決定論（0）⇔ 自由意志（100）
- individual: 共同体主義（0）⇔ 個人主義（100）
- ontology: 唯物論（0）⇔ 観念論（100）
- judgment: 感情主義（0）⇔ 理性主義（100）

## 出力フォーマット（JSONのみ、他のテキスト不要）
{
  "scores": {
    "ethics": <0-100>,
    "will": <0-100>,
    "individual": <0-100>,
    "ontology": <0-100>,
    "judgment": <0-100>
  },
  "analysis": "ユーザーの思考傾向の分析文（200〜350字）",
  "philosophers": [
    {
      "name": "哲学者名",
      "description": "哲学者の簡潔な説明（20字以内）",
      "reason": "この哲学者と共鳴する理由（80〜120字）"
    }
  ]
}

analysisは回答の具体的な内容を反映した個別の分析にしてください。philosophersは2〜3人選び、選択理由にはユーザーの実際の回答パターンを具体的に言及してください。`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { questions, answers } = req.body as { questions: Question[]; answers: Answer[] }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: buildAnalysisPrompt(questions, answers) }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonText = raw.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(jsonText)

    res.json({
      scores: {
        ethics: parsed.scores.ethics,
        will: parsed.scores.will,
        individual: parsed.scores.individual,
        ontology: parsed.scores.ontology,
        judgment: parsed.scores.judgment,
      },
      analysis: parsed.analysis,
      philosophers: parsed.philosophers,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to analyze answers' })
  }
}
