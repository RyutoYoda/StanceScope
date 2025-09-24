# StanceScope

StanceScopeは、YouTube動画のコメントを収集してGemini APIで分析し、主要な論点・支持の偏り・要約をダッシュボード形式で可視化するリサーチ支援アプリです。マーケターやリサーチャーがコミュニティの議論構造を素早く把握するためのツールとして利用できます。

## 主な機能
- YouTube Data APIから動画情報とコメントを収集
- Gemini 2.5 Flashを用いた論点抽出・要約生成
- 論点別の支持数を可視化するインタラクティブな棒グラフ
- 「意見 A / B / C…」といった論点カードによるリッチな解説ビュー
- コメント数・中立コメント割合などの集計ハイライト

## 技術スタック
- React 19 + Vite 6
- TypeScript 5
- Tailwind CSS (CDN利用)
- Recharts（チャート描画）
- @google/genai（Gemini APIクライアント）

## セットアップ手順

### 動作要件
- Node.js 18以降
- npm 9以降
- Google Gemini APIキー
- YouTube Data APIキー

### 依存関係のインストール
```bash
npm install
```

### 環境変数
ローカル開発ではルートに`.env.local`を配置し、以下のキーを設定します。

```ini
GEMINI_API_KEY="<your Gemini API key>"
YOUTUBE_API_KEY="<your YouTube Data API key>"
```

Viteは`vite.config.ts`経由でこれらを読み込み、ビルド済みバンドルに注入します。

### ローカル開発
```bash
npm run dev
# http://localhost:3000 を開く
```

### 本番ビルド
```bash
npm run build
npm run preview
```

`dist/`配下に静的アセットが生成されます。

## Cloudflare Pagesへのデプロイ

1. GitHubで本リポジトリをCloudflare Pagesプロジェクトに接続します。
2. Build command に `npm run build`、Build output directory に `dist` を指定し、Framework preset は **Vite** を選択します。
3. Pagesのダッシュボードで以下のシークレットを登録します。
   - `GEMINI_API_KEY`
   - `YOUTUBE_API_KEY`
4. `main`ブランチへpushするとCloudflare側で自動ビルド・デプロイが実行されます。

> セキュリティ注意: 現在はAPIキーがフロントエンドに埋め込まれる構成です。必要に応じてCloudflare Pages Functionsなどを利用し、サーバ側でAPI呼び出しをプロキシしてください。

## プロジェクト構成

```
├── App.tsx                 # メインUI。分析ワークフローと結果表示
├── components/             # チャートやアイコンなどのUIパーツ
├── services/
│   ├── geminiService.ts    # Gemini API呼び出しとレスポンス整形
│   └── youtubeService.ts   # YouTube Data APIからのデータ取得
├── types.ts                # 分析結果の型定義
├── vite.config.ts          # Viteと環境変数の定義
└── wrangler.toml           # Cloudflare Pages設定
```

## 今後の改善アイデア
- Cloudflare Pages FunctionsでのAPIキー秘匿
- コメント取得件数やカテゴリのカスタマイズ
- 分析結果のエクスポート（CSV / PDF）
- 複数動画の横断比較ビュー

## ライセンス
プロジェクトのライセンスは未定です。用途に応じて適切なライセンスを設定してください。
