# ななーる訪問看護デベロップメントセンターリポジトリ

ななーる訪問看護デベロップメントセンターの公式研究リポジトリです。日本語・英語の静的ページを生成し、GitHub Pagesへ公開できます。

## 論文を追加する

Vercelの管理画面から、実在する書誌情報と公開許諾を確認したPDFを登録します。管理画面はIDを採番し、JSONを `data/outputs/`、PDFを `public/files/` へ追加します。公開済み情報の修正とPDFの差し替えにも対応しています。

英語論文の書誌情報は文字列で保持し、両UIで英語表示します。日本語論文は `title`、著者名、所属、誌名、抄録、キーワードに `ja` と `en` を用意すると、UI切り替えに合わせて表示が変わります。抄録は任意です。掲載PDFのライセンスは `repository_file.license` に記録します。

## ローカル確認

`npm install` の後に `npm run dev` を実行します。

## GitHub Pagesで公開する

GitHubリポジトリの Pages 設定で Source を **GitHub Actions** にします。`main` へのpush後、同梱ワークフローがサイトを公開します。

## 管理画面

`admin/` は、GitHubを操作せずにPDFと書誌情報を登録するVercel向け管理画面です。設定方法は `admin/README.md` を参照してください。
