# CLAUDE.md — QuizCraft (quizcraft)

## このプロジェクト

- 講義ノート・教科書から確認テストを生成し、間違いだけを間隔反復するWebアプリ
- 構成: 単一HTMLファイル（index.html）＋ tests/
- LLM: **Gemini API無料枠をブラウザから直叩き**（`dev-os/knowledge/patterns/gemini-direct-browser.md` の型）
- 管理情報: `C:\Users\smzyt\apps\dev-os\projects\quizcraft\`（設計判断は design.md）

## 開発標準

`C:\Users\smzyt\apps\dev-os\CLAUDE.md` の「全プロジェクト共通 開発標準」に従う。

## このプロジェクト固有のルール（重要）

- **APIキーをコードに書かない**。キーは設定画面から入力しlocalStorageに保存する方式を維持
- **精度対策の三層を崩さない**: ①全問題に evidence（教材原文の抜粋）必須＋答え合わせで常時表示 ②プロンプトで教材範囲外からの出題を禁止 ③「この問題おかしい」ボタンで破棄（retired。削除はしない）
- 生成モデルは品質優先の既定（gemini-2.5-flash・thinking有効）。速度目的で thinkingBudget:0 にしない（語彙ラボとは逆の判断。理由は design.md）
- SRSは `// ==SRS-START== / ==SRS-END==` マーカー内の純関数のみで実装する。このブロックにDOM・localStorage・Date.now()を持ち込まない（tests/srs.test.mjs が抽出実行するため）
- localStorageスキーマ（quizcraft.state）を変更するときはマイグレーションを書く

## 動作確認

- **編集後は必ず verify-single-html スキルで検証**（マーカー: `review-hero` `deck-list`）
- SRSに触れたら `node tests/srs.test.mjs`（全件パスが条件）
- API絡みの変更は、キー未設定/429/パース失敗の3状態も確認する
