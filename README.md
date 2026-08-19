# Nana-r Research Repository

ななーる訪問看護デベロップメントセンターの公式研究リポジトリです。日本語・英語の静的ページを生成し、GitHub Pagesへ公開できます。

## 論文を追加する

1. `data/outputs/NRR-YYYY-NNN.json` を既存ファイルから複製します。
2. 実在する書誌情報と、公開許諾を確認したPDFのパスを入力します。
3. PDFを `public/files/` に配置します。
4. `sample` を削除するか `false` にします。
5. `npm run build` を実行して `dist/` を確認します。

## ローカル確認

`npm install` の後に `npm run dev` を実行します。

## GitHub Pagesで公開する

GitHubリポジトリの Pages 設定で Source を **GitHub Actions** にします。`main` へのpush後、同梱ワークフローがサイトを公開します。
