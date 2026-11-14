# Philosophia

**10の思考実験に答えると、あなたの哲学的立場がわかるWebアプリ**

🔗 デモ：https://philosophia-murex.vercel.app
📝 開発記録（Zenn）：[開発経験ゼロから3時間でAI Webアプリを公開した話 ── バイブコーディング実践記](https://zenn.dev/yossi7d8/articles/b47bf0e575bbbe)

## どんなアプリか

トロッコ問題やテセウスの船のような思考実験に10問答えると、回答の傾向から「哲学的立場マップ」を作ります。

- **毎回ちがう問題**：思考実験はClaude APIがその場で生成します。古典的な哲学問題を参考にしつつ、オリジナルのシナリオにしています。前に出たテーマと重ならないように出題します。
- **選んだ理由も書ける**：選択肢を選ぶだけでなく、「なぜそれを選んだか」を任意で書けます。理由も分析に使われます。
- **5つの軸で分析**：回答をもとに、次の5軸を0〜100でスコア化し、レーダーチャートで表示します。

| 軸 | 0 | 100 |
| --- | --- | --- |
| 倫理基盤 | 功利主義 | 義務論 |
| 意志と因果 | 決定論 | 自由意志 |
| 個と全体 | 共同体主義 | 個人主義 |
| 存在の本質 | 唯物論 | 観念論 |
| 判断の源泉 | 感情主義 | 理性主義 |

- **近い哲学者を紹介**：思考傾向の分析文と、考え方の近い哲学者を2〜3人、理由つきで表示します。

## 技術スタック

| 分類 | 使用技術 |
| --- | --- |
| フロントエンド | React 19 / TypeScript / Vite |
| スタイリング | Tailwind CSS v4 |
| グラフ | Recharts（レーダーチャート） |
| API | Vercel Serverless Functions（`api/`） |
| AI | Anthropic Claude API（`@anthropic-ai/sdk`） |
| デプロイ | Vercel |

## 工夫したところ

- **APIキーをブラウザに出さない構成**：Claude APIの呼び出しはVercelのサーバーレス関数（`api/generate-question.ts` / `api/analyze-answers.ts`）にまとめ、APIキーは環境変数でサーバー側だけに置いています。
- **待ち時間を減らす先読み**：1問答えている間に次の問題を裏で生成しておき、「次へ」を押したときの待ち時間を短くしています。
- **失敗してもやり直せる**：問題の生成に失敗したときは、エラーを表示して「もう一度試す」から再生成できます。

## ディレクトリ構成

```
philosophia/
├── api/
│   ├── generate-question.ts   # 思考実験を1問生成する
│   └── analyze-answers.ts     # 10問の回答から5軸スコア・分析文・哲学者を生成する
├── src/
│   ├── App.tsx                # 画面（イントロ → 出題 → 分析中 → 結果）と状態管理
│   ├── main.tsx
│   └── index.css
├── vercel.json
└── package.json
```

## ローカルで動かす

```bash
npm install

# .env.local を作り、AnthropicのAPIキーを設定する
echo "ANTHROPIC_API_KEY=your-api-key" > .env.local

# API込みで起動（Vercel CLIが必要）
npm run dev

# 画面だけ確認する場合（APIは動きません）
npm run dev:ui
```

## 生成AIの使い方

- 企画・コンセプト、作る機能の取捨選択は自分で決めました。
- 仕様書とロードマップはClaudeと対話しながら作成し、コードはClaude Codeで生成しています。
- AIが出した構成は、「なぜこの構成なのか」を自分で説明できるまで質問して確認しました。
- 環境構築の質問などには Gemini CLI も使用しました。

詳しい経緯は[Zennの開発記録](https://zenn.dev/yossi7d8/articles/b47bf0e575bbbe)に書いています。

## 作者

yossi（[@TurtleYossi7D8](https://github.com/TurtleYossi7D8)）— 東京工科大学 コンピュータサイエンス学部 1年
サークル（Linuxclub）のLT会で発表しました。
