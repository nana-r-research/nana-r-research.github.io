# リポジトリ管理画面

GitHubを操作せずに、PDFと書誌情報から研究成果を公開するための管理画面です。

新規登録、続けて登録、公開済み書誌情報の修正、PDFの差し替え、掲載PDFのライセンス設定に対応しています。抄録は任意です。

## Vercel設定

1. VercelプロジェクトのRoot Directoryを `admin` に設定する。
2. Vercel MarketplaceでClerkとBlobを接続する。
3. `.env.example` の環境変数をVercelへ設定する。
4. `ADMIN_EMAILS` は利用を許可するメールアドレスをカンマ区切りで指定する。
5. `GITHUB_REPOSITORY_TOKEN` には対象リポジトリのContentsを更新できるfine-grained tokenを設定する。

秘密情報はGitへコミットしないでください。
