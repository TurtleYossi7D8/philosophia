import { useState, useEffect, useRef } from 'react'
import Anthropic from '@anthropic-ai/sdk'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts'

// ─── Anthropic client ─────────────────────────────────────────────────────────

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'intro' | 'question' | 'analyzing' | 'result'

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

interface PhilosopherResult {
  name: string
  description: string
  reason: string
}

interface Result {
  scores: {
    ethics: number
    will: number
    individual: number
    ontology: number
    judgment: number
  }
  analysis: string
  philosophers: PhilosopherResult[]
}

// ─── API ──────────────────────────────────────────────────────────────────────

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

async function generateQuestion(previousThemes: string[]): Promise<Question> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: buildQuestionPrompt(previousThemes) }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''

  // バッククォートで囲まれていた場合に除去
  const jsonText = raw.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')

  const parsed = JSON.parse(jsonText)
  return {
    scenario: parsed.scenario,
    choices: parsed.choices,
    theme: parsed.theme,
    target_axes: parsed.target_axes ?? [],
  }
}

// ─── Mock result（Step 4 で分析 API に差し替え） ───────────────────────────────

const MOCK_RESULT: Result = {
  scores: { ethics: 72, will: 38, individual: 61, ontology: 45, judgment: 68 },
  analysis: `あなたの思考には、感情と論理が複雑に絡み合っています。倫理的判断においては義務論的な傾向が強く、「どんな結果であれ、原則を守ること」に重きを置いています。一方で、感情主義的な直感も強く働いており、純粋な論理だけでなく、人間的な温かみを判断の軸に据えているようです。\n\n意志と因果については決定論寄りの世界観をお持ちです。個人と全体のバランスでは、個人の権利を尊重しながらも共同体の調和を意識する中間的な立場にあります。存在論では唯物論と観念論の境界に位置し、物質世界と精神世界の両方に価値を見出しています。`,
  philosophers: [
    {
      name: 'イマヌエル・カント',
      description: 'ドイツ観念論の巨匠',
      reason: 'あなたと同様に、行為の結果よりも行為そのものの原則（義務）を重視する傾向があります。「人を手段としてのみ扱ってはならない」というカントの定言命法は、あなたの思考に強く共鳴するでしょう。',
    },
    {
      name: 'デイヴィッド・ヒューム',
      description: 'スコットランド啓蒙主義の哲学者',
      reason: '理性よりも感情・情念が道徳の根底にあるというヒュームの立場は、あなたの感情主義的な判断スタイルと重なります。',
    },
  ],
}

// ─── IntroScreen ─────────────────────────────────────────────────────────────

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center">
      <p className="text-[#d4a853] text-xs tracking-[0.25em] uppercase mb-8">
        Philosophy Diagnostic
      </p>
      <h1 className="font-serif text-6xl text-[#e8e4df] mb-6 leading-tight">
        Philosophia
      </h1>
      <p className="text-[#e8e4df]/55 text-base leading-loose mb-3 max-w-sm">
        10の思考実験に答えるだけで、<br />あなたの哲学的立場が明らかになります。
      </p>
      <p className="text-[#e8e4df]/30 text-sm mb-14">所要時間：約10〜15分</p>
      <button
        onClick={onStart}
        className="px-10 py-3 border border-[#d4a853]/70 text-[#d4a853] text-sm tracking-widest hover:bg-[#d4a853]/10 transition-colors duration-300 cursor-pointer"
      >
        診断を始める
      </button>
    </div>
  )
}

// ─── QuestionLoadingScreen ────────────────────────────────────────────────────

function QuestionLoadingScreen({
  current,
  total,
  error,
  onRetry,
}: {
  current: number
  total: number
  error: string | null
  onRetry: () => void
}) {
  const progress = (current / total) * 100

  return (
    <div className="flex flex-col min-h-screen px-8 py-14">
      <div className="mb-12">
        <div className="flex justify-between text-[#e8e4df]/35 text-xs mb-3">
          <span>問 {current + 1} / {total}</span>
        </div>
        <div className="w-full h-px bg-[#e8e4df]/10">
          <div
            className="h-px bg-[#d4a853]/70 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        {error ? (
          <>
            <p className="text-[#e8e4df]/40 text-sm mb-6">{error}</p>
            <button
              onClick={onRetry}
              className="px-8 py-3 border border-[#d4a853]/70 text-[#d4a853] text-sm tracking-wider hover:bg-[#d4a853]/10 transition-colors cursor-pointer"
            >
              もう一度試す
            </button>
          </>
        ) : (
          <>
            <div className="flex gap-3 mb-6">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[#d4a853] animate-pulse"
                  style={{ animationDelay: `${i * 0.25}s` }}
                />
              ))}
            </div>
            <p className="text-[#e8e4df]/40 text-sm">次の問題を生成中…</p>
          </>
        )}
      </div>
    </div>
  )
}

// ─── QuestionScreen ───────────────────────────────────────────────────────────

function QuestionScreen({
  question,
  current,
  total,
  onNext,
}: {
  question: Question
  current: number
  total: number
  onNext: (choiceId: string, reason: string) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const handleNext = () => {
    if (!selected) return
    onNext(selected, reason)
    setSelected(null)
    setReason('')
  }

  const progress = (current / total) * 100

  return (
    <div className="flex flex-col min-h-screen px-8 py-14">
      {/* Progress bar */}
      <div className="mb-12">
        <div className="flex justify-between text-[#e8e4df]/35 text-xs mb-3">
          <span>問 {current + 1} / {total}</span>
          <span>{question.theme}</span>
        </div>
        <div className="w-full h-px bg-[#e8e4df]/10">
          <div
            className="h-px bg-[#d4a853]/70 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Scenario */}
      <p className="text-[#e8e4df]/85 text-base leading-[2] mb-12">
        {question.scenario}
      </p>

      {/* Choices */}
      <div className="flex flex-col gap-3 mb-10">
        {question.choices.map((choice) => (
          <button
            key={choice.id}
            onClick={() => setSelected(choice.id)}
            className={`text-left px-5 py-4 border text-sm leading-relaxed transition-all duration-200 cursor-pointer ${
              selected === choice.id
                ? 'border-[#d4a853]/80 bg-[#d4a853]/8 text-[#e8e4df]'
                : 'border-[#e8e4df]/15 text-[#e8e4df]/60 hover:border-[#d4a853]/40 hover:text-[#e8e4df]/80'
            }`}
          >
            <span className="text-[#d4a853]/80 font-mono mr-3 text-xs">{choice.id}.</span>
            {choice.text}
          </button>
        ))}
      </div>

      {/* Reason textarea */}
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="なぜその選択を？（任意）"
        rows={3}
        className="w-full bg-transparent border border-[#e8e4df]/10 px-4 py-3 text-[#e8e4df]/65 text-sm placeholder:text-[#e8e4df]/25 focus:outline-none focus:border-[#d4a853]/40 resize-none transition-colors duration-200"
      />

      {/* Next button */}
      <div className="mt-10 flex justify-end">
        <button
          onClick={handleNext}
          disabled={!selected}
          className={`px-8 py-3 text-sm tracking-wider transition-all duration-200 ${
            selected
              ? 'border border-[#d4a853]/70 text-[#d4a853] hover:bg-[#d4a853]/10 cursor-pointer'
              : 'border border-[#e8e4df]/10 text-[#e8e4df]/20 cursor-not-allowed'
          }`}
        >
          {current === total - 1 ? '分析する →' : '次へ →'}
        </button>
      </div>
    </div>
  )
}

// ─── AnalyzingScreen ──────────────────────────────────────────────────────────

function AnalyzingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center">
      <div className="flex gap-3 mb-10">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#d4a853] animate-pulse"
            style={{ animationDelay: `${i * 0.25}s` }}
          />
        ))}
      </div>
      <p className="text-[#e8e4df]/50 text-base tracking-wide">
        あなたの思考を分析中…
      </p>
    </div>
  )
}

// ─── ResultScreen ─────────────────────────────────────────────────────────────

function ResultScreen({ result }: { result: Result }) {
  const radarData = [
    { axis: '倫理基盤', value: result.scores.ethics },
    { axis: '意志と因果', value: result.scores.will },
    { axis: '個と全体', value: result.scores.individual },
    { axis: '存在の本質', value: result.scores.ontology },
    { axis: '判断の源泉', value: result.scores.judgment },
  ]

  return (
    <div className="px-8 py-16">
      <p className="text-[#d4a853] text-xs tracking-[0.25em] uppercase mb-4 text-center">
        Your Philosophy Profile
      </p>
      <h2 className="font-serif text-4xl text-[#e8e4df] text-center mb-14 leading-tight">
        哲学的立場マップ
      </h2>

      {/* Radar Chart */}
      <div className="mb-16">
        <ResponsiveContainer width="100%" height={340}>
          <RadarChart data={radarData} margin={{ top: 16, right: 40, bottom: 16, left: 40 }}>
            <PolarGrid stroke="rgba(232,228,223,0.08)" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: 'rgba(232,228,223,0.55)', fontSize: 12, fontFamily: 'Noto Sans JP' }}
            />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              dataKey="value"
              stroke="#d4a853"
              fill="#d4a853"
              fillOpacity={0.18}
              strokeWidth={1.5}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="w-12 h-px bg-[#d4a853]/40 mx-auto mb-14" />

      {/* Analysis */}
      <div className="mb-14">
        <p className="text-[#d4a853] text-xs tracking-[0.2em] uppercase mb-6">思考傾向の分析</p>
        <p className="text-[#e8e4df]/65 text-sm leading-[2.2] whitespace-pre-line">
          {result.analysis}
        </p>
      </div>

      <div className="w-12 h-px bg-[#d4a853]/40 mx-auto mb-14" />

      {/* Philosophers */}
      <div>
        <p className="text-[#d4a853] text-xs tracking-[0.2em] uppercase mb-8">近い哲学者</p>
        <div className="flex flex-col gap-4">
          {result.philosophers.map((p) => (
            <div key={p.name} className="border border-[#e8e4df]/10 px-7 py-6">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="font-serif text-xl text-[#e8e4df]">{p.name}</span>
                <span className="text-[#e8e4df]/35 text-xs">{p.description}</span>
              </div>
              <p className="text-[#e8e4df]/55 text-sm leading-relaxed">{p.reason}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="pb-16" />
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

const TOTAL = 10

export default function App() {
  const [phase, setPhase] = useState<Phase>('intro')
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Answer[]>([])
  const [themes, setThemes] = useState<string[]>([])
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // 次の問題を先読みして保持する Promise
  const prefetchRef = useRef<Promise<Question> | null>(null)
  // リトライ時に呼ぶ関数
  const retryRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (phase !== 'analyzing') return
    const timer = setTimeout(() => setPhase('result'), 2500)
    return () => clearTimeout(timer)
  }, [phase])

  // 先読み開始
  const startPrefetch = (currentThemes: string[]) => {
    prefetchRef.current = generateQuestion(currentThemes)
  }

  // 問題を取得して表示する共通処理
  const loadNextQuestion = async (index: number, currentThemes: string[]) => {
    setIsLoadingQuestion(true)
    setLoadError(null)

    const attempt = async () => {
      try {
        let q: Question
        if (prefetchRef.current) {
          q = await prefetchRef.current
          prefetchRef.current = null
        } else {
          q = await generateQuestion(currentThemes)
        }

        const updatedThemes = [...currentThemes, q.theme]
        setQuestions((prev) => {
          const next = [...prev]
          next[index] = q
          return next
        })
        setThemes(updatedThemes)
        setIsLoadingQuestion(false)

        // 次の問題を先読み
        if (index + 1 < TOTAL) {
          startPrefetch(updatedThemes)
        }
      } catch {
        prefetchRef.current = null // 先読みキャッシュをクリア
        setLoadError('問題の生成に失敗しました。')
        setIsLoadingQuestion(false)
        retryRef.current = () => loadNextQuestion(index, currentThemes)
      }
    }

    await attempt()
  }

  const handleStart = async () => {
    setPhase('question')
    setCurrentQuestion(0)
    setQuestions([])
    setAnswers([])
    setThemes([])
    await loadNextQuestion(0, [])
  }

  const handleNext = async (choiceId: string, reason: string) => {
    const updatedAnswers = [...answers, { questionIndex: currentQuestion, choiceId, reason }]
    setAnswers(updatedAnswers)

    if (currentQuestion === TOTAL - 1) {
      setPhase('analyzing')
      return
    }

    const nextIndex = currentQuestion + 1
    setCurrentQuestion(nextIndex)
    await loadNextQuestion(nextIndex, themes)
  }

  const handleRetry = () => {
    retryRef.current?.()
  }

  // ── Render ──
  return (
    <div className="min-h-screen bg-[#0a0e1a] font-sans">
      <div className="max-w-[640px] mx-auto">
        {phase === 'intro' && (
          <div key="intro" className="animate-fade-in">
            <IntroScreen onStart={handleStart} />
          </div>
        )}

        {phase === 'question' && (
          <div key={`q-${currentQuestion}-${isLoadingQuestion}`} className="animate-fade-in">
            {isLoadingQuestion || loadError ? (
              <QuestionLoadingScreen
                current={currentQuestion}
                total={TOTAL}
                error={loadError}
                onRetry={handleRetry}
              />
            ) : questions[currentQuestion] ? (
              <QuestionScreen
                question={questions[currentQuestion]}
                current={currentQuestion}
                total={TOTAL}
                onNext={handleNext}
              />
            ) : null}
          </div>
        )}

        {phase === 'analyzing' && (
          <div key="analyzing" className="animate-fade-in">
            <AnalyzingScreen />
          </div>
        )}

        {phase === 'result' && (
          <div key="result" className="animate-fade-in">
            <ResultScreen result={MOCK_RESULT} />
          </div>
        )}
      </div>
    </div>
  )
}
