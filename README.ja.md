# PetalGen

**[Pollinations.ai](https://pollinations.ai) を活用した AI 画像生成のためのプロンプトエンジニアリングツール**

**[→ ライブデモ](https://petalgen.tools4all.ai)** · 🌐 [English](README.md) · [中文](README.zh.md)

---

## これは何か（そして何でないか）

PetalGen は**プロンプトの解析とテストのためのツール**です。散文・JSON・カンマ区切りなど任意の形式で書かれた AI 画像生成プロンプトを貼り付けると、10 個の名前付きモジュールに分解して編集・ロック・シャッフル・再構成できます。内蔵の画像生成は、プロンプトの変更を*検証*するためのものであり、汎用の画像生成ツールではありません。

**事前に知っておくべき制約：**

- ライブデモは **Pollinations.ai Seed プラン**の共有オペレーターキーで動作します（0.15 pollen/時間 ≈ Z-Image Turbo で 1 時間あたり 75 枚）。未登録ユーザーは**1日5回**まで無料で生成できます。
- **Z-Image Turbo はデフォルトモデルです——これは意図的な設計です。** Seed プランに最適化されており、高速・低 pollen コスト・安定した動作が特徴です。自分の `pk_` キー（BYOP）を持つユーザーは、オペレーターが有効化したモデルに切り替えられます。自己デプロイユーザーは管理パネルでモデルを追加できます。
- **モデルリストはオペレーターが管理します**。ライブデモでは一部のモデルのみ有効です。このリポジトリをフォークすれば、管理パネルから任意の Pollinations モデルを有効化できます。
- 画像の品質と速度は選択したモデルに完全に依存します。Z-Image Turbo は高速で無料プランに適しています。GPT Image や Seedream はより高品質ですが、多くの pollen を消費します。

無制限の生成やより多くのモデルを使いたい場合は、ご自身の Pollinations キーを連携してください（[BYOP](#自分の-pollinations-キーを使う) を参照）。

---

## 使い方

### ワークスペース（`/`）

プロンプトエンジニアリングの基本的なワークフロー：

1. 入力欄に任意の画像プロンプトを**貼り付ける**（散文・JSON・カンマ区切り、いずれも対応）
2. **魔法の杖ボタン**をクリックして、10 個のモジュールに分解する：主体・服装・場面・ポーズ・照明・構図・スタイル・ムード・技術パラメータ・制約条件
3. ドロップダウンエディタで任意の**モジュールを編集**する（現在の値と AI が生成した 3 つの代替案が表示されます）
4. シャッフル時に保持したいモジュールを**ロック**する（ロックアイコンをクリック）
5. 🎲 ボタンでロックされていない全モジュールを一括**シャッフル**する
6. モデル・アスペクト比を**選択**し、必要に応じてエンハンスをオンにする
7. ⚡ で**生成**する——ビューポートに画像が表示されます
8. 💾 でライブラリに**保存**する（手動操作。自動保存はされません）

> **Z-Image Turbo について：** 固定パラメータ `guidance_scale=0.0`、`steps=9` を使用します。ネガティブプロンプトは Z-Image に転送されません——制約条件はポジティブプロンプトにコンパイルされます。これは仕様です。

### Token ファクトリー（`/factory`）

収集済みのトークンライブラリからプロンプトをボトムアップで構築：

1. **Token Crate**（左パネル）を閲覧する——主体・スタイル・照明・場面などのカテゴリ別に頻度順で並んでいます
2. **任意の値チップをクリック**してレシピに追加する
3. **自動補完**で頻度加重ランダムサンプリングを全カテゴリに適用する
4. ライブラリにないものは**カスタムトークン**として追加する
5. ファクトリーから直接生成する——ワークスペースと同じモデル・比率コントロールを使用

### ライブラリ（`/library`）

保存した画像を、完全なリミックスサポートとともに表示：

- 4 列レスポンシブ瀑布流レイアウト（4 → 3 → 2 → 1 列）
- **📋 コピー** ——コンパイル済みプロンプト全文をクリップボードにコピー
- **⚡ リミックス** ——プロンプトのコンテキストをワークスペースに読み込んで編集を継続
- 画像は Cloudflare R2 に保存。メタデータ（プロンプト・モデル・解像度）は D1 に保存

---

## 自分の Pollinations キーを使う

`pk_` 公開キーを連携することで、共有レート制限を回避し、任意のモデルを使用できます：

1. **[enter.pollinations.ai](https://enter.pollinations.ai)** でキーを取得する
2. ヘッダーの **🔑 Free API key** をクリックする
3. `pk_` キーを貼り付ける——ブラウザのローカルに保存され、サーバーには送信されません

> **キーの種類を確認：** ブラウザでは `pk_`（公開）キーを使用してください。`sk_`（シークレット）キーはサーバーサイド専用です。シークレットキーを貼り付けると PetalGen が警告します。

BYOP ユーザーは 1 日 5 回の制限を完全に回避できます。pollen 残高はあなたの Pollinations アカウントから直接請求されます。

---

## 自分でデプロイする

独自のモデルリスト・オペレーターキー・ブランディングで、自分専用のインスタンスをデプロイできます。

### 前提条件

- [Cloudflare アカウント](https://cloudflare.com)（無料プランで動作）
- [Pollinations.ai API キー](https://enter.pollinations.ai)——サーバーサイドのオペレーターキーには `sk_` を使用
- Node.js 18+ と [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### 1. クローンして依存関係をインストール

```bash
git clone https://github.com/your-fork/petalgen
cd petalgen
npm install
```

### 2. Cloudflare リソースを作成する

```bash
# D1 データベース——プロンプトログ・トークン・ライブラリ・モデルレジストリを保存
npx wrangler d1 create PETALGEN_DB
# 返された database_id を wrangler.toml に貼り付ける

# R2 バケット——生成した画像を保存
npx wrangler r2 bucket create petalgen-images
# CF ダッシュボードでバケットに公開カスタムドメインを設定する
# wrangler.toml の R2_PUBLIC_URL をそのドメインに更新する
```

### 3. `wrangler.toml` を更新する

```toml
[[d1_databases]]
binding = "D1_DATABASE"
database_name = "PETALGEN_DB"
database_id = "YOUR_D1_ID_HERE"

[[r2_buckets]]
binding = "R2_IMAGES"
bucket_name = "petalgen-images"

[vars]
R2_PUBLIC_URL = "https://your-r2-domain.example.com"
```

### 4. マイグレーションを実行する

```bash
npx wrangler d1 execute PETALGEN_DB --remote --file=migrations/001_saved_images.sql
npx wrangler d1 execute PETALGEN_DB --remote --file=migrations/002_seed_tokens.sql
npx wrangler d1 execute PETALGEN_DB --remote --file=migrations/003_enabled_models.sql
npx wrangler d1 execute PETALGEN_DB --remote --file=migrations/004_text_models.sql
```

マイグレーション 003 は 21 個の画像モデルを初期投入します（デフォルトで 4 つ有効：Z-Image Turbo、Flux、Nano Banana Pro、Grok Imagine）。マイグレーション 004 は 14 個のテキストモデルを初期投入します（プロンプト再構成に使用する Llama Scout が有効）。デプロイ後、管理パネルからさらに多くのモデルを有効化できます。

### 5. シークレットを設定する

```bash
# Pollinations オペレーターキー（サーバーサイドでは sk_ が正しい）
npx wrangler secret put POLLINATIONS_API_KEY

# 管理パネルのパスワード——/admin を保護する
npx wrangler secret put ADMIN_SECRET
```

または Cloudflare ダッシュボードで設定：**Workers & Pages → あなたの Worker → Settings → Variables and Secrets**。

### 6. ビルドしてデプロイする

```bash
npm run build
npx wrangler deploy
```

### 7. 管理パネルでモデルを設定する

デプロイした URL の `/admin` にアクセスし、`ADMIN_SECRET` でログインします。

- **Models タブ**：画像・テキストモデルの有効/無効を切り替える。**↺ Sync from Pollinations** をクリックして最新モデルリストを取得できます。
- **Library タブ**：保存された画像の確認・削除（D1 と R2 から同時に削除）。
- **Rate Limits タブ**：アクティブなレート制限の確認と個別 IP のクリア。

モデルを有効化すると、ワークスペースとファクトリーのモデルセレクターに即座に反映されます（5 分間キャッシュ）。

---

## ローカル開発

```bash
# キーを設定する
cp .dev.vars.example .dev.vars

# 完全な Workers ランタイムでビルド・起動する
npm run build
npm run pages:dev
```

> ローカル開発は独立した D1 インスタンスを使用します。ライブラリと Token ファクトリーは最初は空です。エンドツーエンドの機能はデプロイ済みの URL でテストしてください。

---

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フレームワーク | Astro v6（SSR + 静的ハイブリッド） |
| ランタイム | Cloudflare Workers |
| データベース | Cloudflare D1（SQLite）——プロンプトログ・トークン・ライブラリ・モデルレジストリ |
| ストレージ | Cloudflare R2——生成された画像 |
| 言語 | TypeScript |
| AI バックエンド | Pollinations.ai——画像生成 + LLM プロンプト再構成 |
| スタイリング | Flat Warm Pixel テーマ——IBM Plex Mono / Inter / Press Start 2P |

---

## コントリビューション

[CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。MIT ライセンス——フォーク歓迎。

---

## クレジット

[Pollinations.ai](https://pollinations.ai) の上に構築——無料でオープンな AI 生成インフラ。
プロンプト再構成は Llama Scout（Pollinations テキスト API）が担当。
