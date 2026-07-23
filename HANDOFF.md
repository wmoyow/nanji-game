# 引き継ぎドキュメント: MOPIKOのなんじでしょう?

子ども向け時計読み知育アプリ。Vite+React構成のWebアプリとして開発中。

## ✅ 移行済み (2026-07-22)

- Vite+Reactプロジェクトとしてセットアップ済み（Node.jsはnvm経由でインストール）
- 元の13MBの単一`nanji-game.jsx`から、base64埋め込みだった画像25点・音声6点を
  `src/assets/images/` `src/assets/audio/` に実ファイルとして展開し、`src/App.jsx`から
  importする形に変更済み
- 音声再生は `base64ToArrayBuffer` + 埋め込みbase64 から、`fetch(url).then(r => r.arrayBuffer())`
  ベースのWeb Audio API実装に変更済み（`decodeAudioData`を使う点は変更なし）
- `npm run dev` で動作確認済み（全画面フロー・正誤判定・BGM/効果音の非同期ロードともに正常動作）
- `npm run build` で本番ビルドも成功（JSバンドル222KB / gzip 74KB、画像・音声は個別ファイルとして出力）
- 元の`nanji-game.jsx`（13MB版）は引き継がれていません。ロジック・UIは`src/App.jsx`に完全移植済み

## 以下は元の引き継ぎ内容（背景情報として保持）

## プロジェクト概要

- 子ども向け時計読みクイズアプリ
- キャラクター「MOPIKO」が主役
- 難易度4段階（やさしい/ふつう/むずかしい/チャレンジ）
- 全10問、正解数に応じた得点イラストが最後に表示される
- BGM・効果音つき

## 画面フロー

```
[ホーム画面] --スタート--> [難易度選択] --選択--> [問題画面×10問] --終了--> [結果画面]
                              ↑◀︎もどる            ↑◀︎もどる           |
                              └────────────────────────────────────┘（もっとあそぶ/タップ）
```

### 1. ホーム画面 (`started === false`)
- `TITLE_IMG`（MOPIKOのなんじでしょう？の2行タイトル）
- `IdleClock` コンポーネント（上下に揺れながら針が回転するアニメーション付き時計、110%×110%拡大サイズ）
- `START_BTN_IMG` スタートボタン。押すとタップ音が鳴り、`started = true` になる

### 2. レベル選択画面 (`difficulty === null` かつ `started === true`)
- タイトルは`TITLE_IMG`を再利用（`level-title-img`クラス、ホーム画面より上余白は少なめ）
- 4つの難易度ボタンが縦一列（幅50%・文字サイズは元の200%相当に調整済み）
- 画面下部に、送ってもらった素材から切り出した「覗きこむマスコット」画像（`LEVEL_PEEK_IMG`）
- 「◀︎もどる」でホーム画面へ（`handleBackToHome`）

### 3. 問題画面 (`!finished` かつ `difficulty !== null`)
- `Header`コンポーネント（タイトル＋10個の星の進捗トラック）
- `ClockDisplay`（時計＋正解/不正解のリアクション）
- 4択ボタン（2×2グリッド、`BUTTON_BG`画像使用）
- 正解/不正解フィードバック、正解音・不正解音
- 「◀︎もどる」で難易度選択へ（`handleBackToMenu`）

### 4. 結果画面 (`finished === true`)
- ヘッダーとイラストの間に「もっとあそぶ」画像ボタン（`MOTTO_ASOBU_BTN_IMG`）
- 得点イラスト（`SCORE_IMAGES[correctCount]`、0〜100点の11枚、200%拡大、下部に12vh分の余白）
- 50点以上: 歓声＋拍手の効果音（`CHEER_SOUND_SRC`）
- 40点以下: 「間抜け」効果音（`MANUKE_SOUND_SRC`）
- 画面タップでもレベル選択へ戻れる（ボタンと両対応）

## 難易度仕様

| 難易度 | ID | 分の刻み | 数字 |
|---|---|---|---|
| やさしい | easy | 常に0分 | あり |
| ふつう | normal | 5分刻み | あり |
| むずかしい | hard | 1分刻み | あり |
| チャレンジ | challenge | 1分刻み | なし（`*_NONUM`アセット使用） |

- 出題ロジック: `newRound(diff)` が直前の問題と同じ時刻を連続で出さないようガード付きで乱数生成（最大30回リトライ）

## 埋め込みアセット一覧（全てbase64データURI定数）

### 画像
- `CLOCK_FACE_NEUTRAL` / `CLOCK_FACE_HAPPY`（数字あり・通常時/正解時）
- `CLOCK_FACE_NEUTRAL_NONUM` / `CLOCK_FACE_HAPPY_NONUM`（数字なし・チャレンジ用）
- `HAND_HOUR` / `HAND_MINUTE`（短針・長針。回転の中心は`PIVOT_X=50.58%, PIVOT_Y=58.55%`共通）
- `HEADER_BG`（問題画面上部の背景＋星トラックの土台）
- `STAR_CORRECT` / `STAR_WRONG`（進捗の星、黄色/グレー）
- `BUTTON_BG`（選択肢ボタンの背景画像）
- `TITLE_IMG`（「MOPIKOのなんじでしょう？」タイトル、ホーム画面とレベル選択画面で共用）
- `START_BTN_IMG`（スタートボタン）
- `MOTTO_ASOBU_BTN_IMG`（「もっとあそぶ」ボタン、結果画面）
- `LEVEL_PEEK_IMG`（レベル選択画面下部の覗きこむマスコット）
- `SCORE_IMG_0` 〜 `SCORE_IMG_100`（11枚、10点刻み）＋`SCORE_IMAGES`配列（correctCount×10点に対応）

### 音声（全てWeb Audio API経由で再生。`new Audio()`はこの環境でブロックされたため不使用）
- `CORRECT_SOUND_SRC`（正解音）
- `MANUKE_SOUND_SRC`（40点以下の結果画面）
- `CHEER_SOUND_SRC`（50点以上の結果画面、歓声＋拍手）
- `TAP_SOUND_SRC`（スタート/難易度選択/もっとあそぶボタン共通のタップ音）
- `HOME_BGM_SRC`（ホーム画面＋レベル選択画面のBGM、ループ再生）
- `GAME_BGM_SRC`（問題画面＋結果画面のBGM、ループ再生）
- 不正解音は合成音（サイン波/ノコギリ波、`playWrongSound`関数内で生成、埋め込みファイルなし）

## 重要な技術ポイント

### 時計の針の回転
- `PIVOT_X` / `PIVOT_Y` は全時計画像で共通の中心点
- `hourAngle = ((hour % 12) + minute / 60) * 30 - 180`（短針画像がデフォルトで下向きのため-180度補正）
- `minuteAngle = minute * 6`
- 長針レイヤーは短針の下（z軸で背面）に配置

### 星の進捗表示
- `STAR_X`配列（10箇所の%座標）、`STAR_Y = 78.04`、`STAR_SIZE = 5.28%`
- 一度不正解になったラウンドは、後で正解してもグレーのまま
  （`results[roundIndex] !== 'wrong'` のガード条件で判定）

### 音声システム（★重要・落とし穴あり）
- **`new Audio()`はこの開発環境でブロックされる**ため、効果音・BGMともにWeb Audio API
  （`AudioContext` + `decodeAudioData` + `AudioBufferSourceNode`）で統一実装している
- 効果音は単発再生（`sharedXxxBuffer` / `sharedXxxBufferLoading`でデコード結果をキャッシュ）
- BGMは2トラックシステム（`playBGMTrack(key)`, key は `'home'` または `'game'`）
  - 画面が切り替わるたびに`useEffect`が現在のトラックを判定し、切り替えが必要なら
    前のトラックを`stop()`して新しいトラックを最初から再生する
  - 完全なシームレスクロスフェードではなく、切り替え時に一度止めて頭出しする方式
- ブラウザの自動再生制限に対応するため、ページ内の最初のユーザー操作（`pointerdown`/`keydown`）
  で`AudioContext.resume()`を呼ぶリスナーを設置し、できるだけ早くBGMが鳴り始めるようにしている
  （ただし完全な「起動した瞬間から音が鳴る」は自動再生ポリシー上ブラウザでは不可能。
  ネイティブアプリ化すればこの制限はなくなる）

### レイアウトの落とし穴（既出のバグ、再発注意）
- **二重中央寄せバグ**: 親が`align-items: center`の状態で、子要素に
  `left: 50%; transform: translateX(-50%)`を追加すると位置がズレる。
  親のcenter配置に任せるか、bleed（画面幅からのはみ出し）が必要な場合のみ
  `position: relative; left: 50%; transform: translateX(-50%)`を使う
- **CSSアニメーションと静的transformの競合**: `transform: translateX(-50%)`を持つ要素に
  `animation`で`transform: translateY(...)`のキーフレームを当てると、
  アニメーション中は静的なtranslateXが無視されてズレる。
  キーフレーム側に`translateX(-50%) translateY(...)`とまとめて書く必要がある
  （`idleBob`アニメーションで実際に発生した）
- **細長くなるバグ**: 画像の拡大は必ず`width`基準で指定し`height: auto`にする。
  `height`基準で指定するとアスペクト比が崩れる

## 音声アセットの外部化（最優先タスク）

現状、音声ファイル6つが全てbase64でJSXファイル内に直接埋め込まれている。これがファイルサイズ肥大化の主因（BGM2つだけで合計約11MB）。

**Claude Codeで最初にやるべきこと:**
1. 各`*_SRC`定数のbase64データをデコードして、実ファイル（`.mp3`）として`assets/audio/`のようなフォルダに書き出す
2. コード側は`const CORRECT_SOUND_SRC = require('./assets/audio/correct.mp3')`
   （React Native/Expoの場合）または`import`ベースのURL参照に置き換える
3. Web Audio APIの`decodeAudioData`用にfetchでArrayBufferを取得する形に変更
   （`fetch(url).then(r => r.arrayBuffer())`）
4. 画像も同様に外部ファイル化を検討（現状はサイズが音声ほど深刻ではないが、
   保守性のためには分離した方がよい）

## 再利用可能なロジック（ネイティブ化時にそのまま移植できるもの）

- `randomTime(diff)` / `randomMinute` / `formatAnswer` / `makeChoices` の時刻生成・選択肢生成ロジック
- 時計の角度計算式（`hourAngle` / `minuteAngle`の式）
- 難易度定数（`DIFFICULTIES`配列）
- 星の進捗判定ロジック（一度不正解になったら正解してもグレーのまま、のガード条件）
- `newRound`の「直前と同じ問題を出さない」リトライロジック

## React Native / Expoへ移行する場合の主な差分

- Web Audio API → `expo-av`（`Audio.Sound.createAsync`）に置き換え
- CSS（`<style jsx>`的なインラインスタイル）→ `StyleSheet.create`
- `<img>` → `<Image>`
- タップイベント → `Pressable` / `TouchableOpacity`
- アニメーション（idleBob等）→ `Animated` API または `react-native-reanimated`

## App Store公開に向けて

- Apple Developer Program登録（$99/年）、Xcode、Macが必要
- Claude Code自体は必須ではないが、ネイティブ化の実装作業には有用
- 素材について: 個別パーツ（キャラ・ボタン・アイコン）は中身ギリギリでトリミングした
  背景透過PNGが望ましい（画面全体のレイアウト参考画像は1080×1920でよい）

## 現在のファイル

- `nanji-game.jsx`（約13MB、900行台のコード＋大量のbase64データ）
- これ1本で全機能が完結する単一ファイルReactコンポーネント
