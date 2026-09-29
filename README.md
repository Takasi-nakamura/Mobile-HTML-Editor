# Mobile HTML Editor

モバイル向けのHTMLエディタPWAです。

## Features

- CodeMirrorによるHTML/CSS/JavaScriptのシンタックスハイライト
- HTMLタグの自動補完・候補表示（Ctrl/Cmd + Spaceでも起動）
- 自動保存（localStorage）
- 「HTML / プレビュー」タブ切り替え
- iframeによるライブプレビュー
- HTMLファイルのダウンロード
- プレビュー内容のPDFダウンロード
- PWAインストール対応
- Service Workerによるオフラインキャッシュ

## GitHub Pages

このリポジトリをGitHub Pagesで公開すれば、そのままPWAとして利用できます。

> 初回アクセス時にCDNのライブラリをキャッシュするため、完全オフライン利用は一度オンラインで読み込んだ後に可能になります。
