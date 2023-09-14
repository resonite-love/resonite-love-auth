# neos-auth-system

単純な認証システムの実装です
- Neosアカウントを作る(Botで認証)
- Discordアカウントを連携できる(要Neosアカウント)
- Discordアカウントでログインできる

## 使い方
必要な環境変数を`.env`に設定してください。
鍵のペアは`generateKeyPair.mjs`で作成できます。


## jwtをつけて外部にリクエストしたいとき
```https://host?link={jwtをつけてアクセスされたいURL}```
にアクセスすることでGETリクエストがそのエンドポイントにブラウザ上から送信されます。
(いずれ変わります)

`Authorization`ヘッダに60秒間有効なjwtがつきます。  
このjwtではrefreshはできません。 

公開鍵は
```https://host/api/publickey```
で取得できます。




