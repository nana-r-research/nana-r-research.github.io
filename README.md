# ななーる訪問看護デベロップメントセンターリポジトリ

ななーる訪問看護デベロップメントセンターの公式研究リポジトリです。日本語・英語の静的ページを生成し、GitHub Pagesへ公開できます。

## 論文を追加する

1. 英語論文は `data/outputs/NRR-2026-001.json`、日本語論文は `NRR-2026-002.json` を参考に、`data/outputs/NRR-YYYY-NNN.json` を作成します。
2. 実在する書誌情報と、公開許諾を確認したPDFのパスを入力します。
3. PDFを `public/files/` に配置します。
4. `sample` を削除するか `false` にします。
5. `npm run build` を実行して `dist/` を確認します。

英語論文の書誌情報は文字列で保持し、両UIで英語表示します。日本語論文は `title`、著者名、所属、誌名、抄録、キーワードに `ja` と `en` を用意すると、UI切り替えに合わせて表示が変わります。

## ローカル確認

`npm install` の後に `npm run dev` を実行します。

## GitHub Pagesで公開する

GitHubリポジトリの Pages 設定で Source を **GitHub Actions** にします。`main` へのpush後、同梱ワークフローがサイトを公開します。
