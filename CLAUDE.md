# CLAUDE.md — QuizCraft (quizcraft)

## このプロジェクト

- **例題（写真・テキスト）から類題（演習問題）を生成**して解く／またはノート・教科書から確認テストを生成し、どちらも間違いだけを間隔反復するWebアプリ
- 2モード: **類題（practice, 既定）**＝例題に似た新問をAIが作り自分で解いて解答・解説つきで出題／**確認テスト（review）**＝教材範囲の用語・定義を暗記
- 数式は **MathJax（tex-svg・mhchem）で描画**（SnapTeX から流用）。生成プロンプトは $…$ / $$…$$ のLaTeXを出させる
- 構成: 単一HTMLファイル（index.html）＋ tests/
- LLM: **Gemini API無料枠をブラウザから直叩き**（`dev-os/knowledge/patterns/gemini-direct-browser.md` の型）。既定モデルは `gemini-flash-latest`、429/モデル不可で自動フォールバック
- 管理情報: `C:\Users\smzyt\apps\dev-os\projects\quizcraft\`（設計判断は design.md）

## 開発標準

`C:\Users\smzyt\apps\dev-os\CLAUDE.md` の「全プロジェクト共通 開発標準」に従う。

## このプロジェクト固有のルール（重要）

- **APIキーをコードに書かない**。キーは設定画面から入力しlocalStorageに保存する方式を維持
- **精度対策の三層を崩さない**（モードごとに根拠が異なる）:
  - 類題（practice/solve）: ①全問に solution（AIが解いた途中式）必須＋出題時に表示 ②プロンプトで「自分で解いて検算してから出題」を強制 ③「この問題おかしい」ボタンで破棄
  - 確認テスト（review）: ①全問に evidence（教材原文の抜粋）必須＋常時表示 ②教材範囲外からの出題を禁止 ③同・破棄ボタン
  - 破棄は retired フラグで、削除はしない
- **類題モードを定義・穴埋めに退化させない**: practice では教材の語句を問う穴埋めではなく、例題と同型の「解く」問題（type:"solve"）を新規生成する。教材範囲限定ルール（review用）を practice に持ち込まない
- 生成モデルは品質優先の既定（gemini-2.5-flash・thinking有効）。速度目的で thinkingBudget:0 にしない（語彙ラボとは逆の判断。理由は design.md）
- SRSは `// ==SRS-START== / ==SRS-END==` マーカー内の純関数のみで実装する。このブロックにDOM・localStorage・Date.now()を持ち込まない（tests/srs.test.mjs が抽出実行するため）
- localStorageスキーマ（quizcraft.state）を変更するときはマイグレーションを書く

## 動作確認

- **編集後は必ず verify-single-html スキルで検証**（マーカー: `review-hero` `deck-list`）
- SRSに触れたら `node tests/srs.test.mjs`（全件パスが条件）
- API絡みの変更は、キー未設定/429/パース失敗の3状態も確認する
- 数式に触れたら、実ブラウザで $…$ / $$…$$ / \ce{} が MathJax で描画されるか確認（オフライン時は生テキスト表示にフォールバックすること）
