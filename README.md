# 🛁 おふろクエスト - VR Adventure

WebXR + Three.js で作る子供向けお風呂クエストVRゲーム

## 概要

子供がお風呂まで冒険するVRゲームです。おもちゃの誘惑に負けず、星を集めながらお風呂の扉を目指します！

## ゲーム内容

- **目標**: 5つの星⭐を集めて、お風呂の扉🛁にたどり着く
- **障害物**: おもちゃの車🚗、積み木🧱、くまさん🧸の誘惑
- **クリア条件**: 全ての星を集めてゴールに到達

## 操作方法

### VRモード
- **VRコントローラー**: トリガーを押しながら視線方向に移動

### デスクトップモード
- **W / ↑**: 前進
- **S / ↓**: 後退
- **A / ←**: 左移動
- **D / →**: 右移動
- **マウス**: カメラ回転（OrbitControls）

## 起動方法

### ローカルサーバーで起動

```bash
# Python 3の場合
python -m http.server 8000

# Node.jsの場合（npx使用）
npx serve .

# VS Codeの場合
# Live Server拡張機能を使用
```

### アクセス

ブラウザで以下のURLにアクセス:
```
http://localhost:8000
```

### VRで遊ぶ場合

1. VRヘッドセット（Meta Quest、HTC Viveなど）を接続
2. HTTPSでアクセスするか、localhost で起動
3. 「VRモードであそぶ」ボタンをクリック

## 技術スタック

- **Three.js** (v0.160.0) - 3Dレンダリング
- **WebXR API** - VR対応
- **ES Modules** - モジュール管理

## ファイル構成

```
test-vr-door/
├── index.html      # メインHTML
├── css/
│   └── style.css   # スタイルシート
├── js/
│   └── main.js     # メインJavaScript
└── README.md       # このファイル
```

## ブラウザ対応

- Chrome 79+ (推奨)
- Firefox 98+
- Edge 79+
- Safari 15.4+ (一部機能制限あり)

## VR対応デバイス

- Meta Quest 2/3/Pro
- HTC Vive / Vive Pro
- Valve Index
- Windows Mixed Reality
- その他WebXR対応デバイス

## カスタマイズ

### 星の数を変更
`js/main.js` の `GAME_CONFIG.starsRequired` を変更

### 移動速度を変更
`js/main.js` の `GAME_CONFIG.playerSpeed` を変更

### メッセージを追加
`js/main.js` の `gameState.messages` 配列に追加

## ライセンス

MIT License

## 作者

Created with ❤️ for kids who need a little adventure to get to bath time!

