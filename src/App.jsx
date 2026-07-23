import React, { useState, useCallback, useEffect } from 'react';

import CLOCK_FACE_NEUTRAL from './assets/images/clock-face-neutral.jpg';
import CLOCK_FACE_HAPPY from './assets/images/clock-face-happy.jpg';
import HAND_HOUR from './assets/images/hand-hour.png';
import HAND_MINUTE from './assets/images/hand-minute.png';

import HEADER_BG from './assets/images/header-bg.png';
import BUTTON_BG from './assets/images/button-bg.jpg';
import CORRECT_SOUND_SRC from './assets/audio/correct.mp3';
import CHEER_SOUND_SRC from './assets/audio/cheer.mp3';
import MANUKE_SOUND_SRC from './assets/audio/manuke.mp3';
import STAR_CORRECT from './assets/images/star-correct.png';
import STAR_WRONG from './assets/images/star-wrong.png';

import CLOCK_FACE_NEUTRAL_NONUM from './assets/images/clock-face-neutral-nonum.jpg';
import CLOCK_FACE_HAPPY_NONUM from './assets/images/clock-face-happy-nonum.jpg';

import SCORE_IMG_0 from './assets/images/score-0.jpg';
import SCORE_IMG_10 from './assets/images/score-10.jpg';
import SCORE_IMG_20 from './assets/images/score-20.jpg';
import SCORE_IMG_30 from './assets/images/score-30.jpg';
import SCORE_IMG_40 from './assets/images/score-40.jpg';
import SCORE_IMG_50 from './assets/images/score-50.jpg';
import SCORE_IMG_60 from './assets/images/score-60.jpg';
import SCORE_IMG_70 from './assets/images/score-70.jpg';
import SCORE_IMG_80 from './assets/images/score-80.jpg';
import SCORE_IMG_90 from './assets/images/score-90.jpg';
import SCORE_IMG_100 from './assets/images/score-100.jpg';

import TITLE_IMG from './assets/images/title.jpg';
import START_BTN_IMG from './assets/images/start-btn.jpg';

import LEVEL_PEEK_IMG from './assets/images/level-peek.jpg';
import MOTTO_ASOBU_BTN_IMG from './assets/images/motto-asobu-btn.jpg';
import TAP_SOUND_SRC from './assets/audio/tap.mp3';
import HOME_BGM_SRC from './assets/audio/home-bgm.mp3';
import GAME_BGM_SRC from './assets/audio/game-bgm.mp3';

const SCORE_IMAGES = [SCORE_IMG_0, SCORE_IMG_10, SCORE_IMG_20, SCORE_IMG_30, SCORE_IMG_40, SCORE_IMG_50, SCORE_IMG_60, SCORE_IMG_70, SCORE_IMG_80, SCORE_IMG_90, SCORE_IMG_100];

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
// pivot point (clock center) shared by the face art and both hand images,
// measured as a percentage of the shared canvas
const PIVOT_X = 50.58;
const PIVOT_Y = 58.55;

// x-position (percent) of each of the 10 progress stars baked into the header art
const STAR_X = [28.962, 33.636, 38.31, 42.985, 47.659, 52.333, 56.999, 61.681, 66.347, 71.021];
const STAR_Y = 78.04;   // percent
const STAR_SIZE = 5.28; // percent of header width (60% smaller than before)

const TOTAL_ROUNDS = 10;

const DIFFICULTIES = [
  { id: 'easy', label: 'やさしい' },
  { id: 'normal', label: 'ふつう' },
  { id: 'hard', label: 'むずかしい' },
  { id: 'challenge', label: 'チャレンジ' },
];

function randomMinute(difficulty) {
  if (difficulty === 'easy') return 0;
  if (difficulty === 'normal') return Math.floor(Math.random() * 12) * 5; // 0,5,10...55
  return Math.floor(Math.random() * 60); // hard & challenge: any minute
}

function randomTime(difficulty) {
  const hour = HOURS[Math.floor(Math.random() * HOURS.length)];
  const minute = randomMinute(difficulty);
  return { hour, minute };
}

function formatAnswer(hour, minute) {
  return minute === 0 ? `${hour}じ` : `${hour}じ${minute}ふん`;
}

function makeChoices(correctHour, correctMinute, difficulty) {
  const correct = formatAnswer(correctHour, correctMinute);
  const choices = new Set([correct]);
  while (choices.size < 4) {
    const h = HOURS[Math.floor(Math.random() * HOURS.length)];
    const m = randomMinute(difficulty);
    choices.add(formatAnswer(h, m));
  }
  return Array.from(choices).sort(() => Math.random() - 0.5);
}

// plays the user-provided correct-answer sound clip via the Web Audio API
// (HTMLAudioElement playback was unreliable in this environment, so we decode
// the clip once into an AudioBuffer and play it through the same AudioContext
// used for the wrong-answer buzzer)
let sharedCorrectBuffer = null;
let sharedCorrectBufferLoading = null;

function getSharedAudioCtx() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  return sharedAudioCtx;
}

// loads a sound source as an ArrayBuffer, whether it's a real file URL (normal
// dev/build) or an inlined base64 data: URI (single-file artifact build)
function loadArrayBuffer(url) {
  if (url.startsWith('data:')) {
    const base64 = url.split(',')[1];
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return Promise.resolve(bytes.buffer);
  }
  return fetch(url).then((r) => r.arrayBuffer());
}

function playCorrectSound() {
  try {
    const ctx = getSharedAudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    if (sharedCorrectBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = sharedCorrectBuffer;
      source.connect(ctx.destination);
      source.start(0);
      return;
    }
    if (!sharedCorrectBufferLoading) {
      sharedCorrectBufferLoading = loadArrayBuffer(CORRECT_SOUND_SRC)
        .then((arrayBuffer) => ctx.decodeAudioData(arrayBuffer))
        .then((buffer) => {
          sharedCorrectBuffer = buffer;
          return buffer;
        });
    }
    sharedCorrectBufferLoading.then((buffer) => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    }).catch((e) => console.error('audio decode/playback failed', e));
  } catch (e) {
    console.error('audio playback failed', e);
  }
}

// plays the cheering/applause sound for high scores (70 points and up)
let sharedCheerBuffer = null;
let sharedCheerBufferLoading = null;

function playCheerSound() {
  try {
    const ctx = getSharedAudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    if (sharedCheerBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = sharedCheerBuffer;
      source.connect(ctx.destination);
      source.start(0);
      return;
    }
    if (!sharedCheerBufferLoading) {
      sharedCheerBufferLoading = loadArrayBuffer(CHEER_SOUND_SRC)
        .then((arrayBuffer) => ctx.decodeAudioData(arrayBuffer))
        .then((buffer) => {
          sharedCheerBuffer = buffer;
          return buffer;
        });
    }
    sharedCheerBufferLoading.then((buffer) => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    }).catch((e) => console.error('audio decode/playback failed', e));
  } catch (e) {
    console.error('audio playback failed', e);
  }
}

// plays the "manuke" (goofy/blooper) sound for low scores (40 points and below)
let sharedManukeBuffer = null;
let sharedManukeBufferLoading = null;

function playManukeSound() {
  try {
    const ctx = getSharedAudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    if (sharedManukeBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = sharedManukeBuffer;
      source.connect(ctx.destination);
      source.start(0);
      return;
    }
    if (!sharedManukeBufferLoading) {
      sharedManukeBufferLoading = loadArrayBuffer(MANUKE_SOUND_SRC)
        .then((arrayBuffer) => ctx.decodeAudioData(arrayBuffer))
        .then((buffer) => {
          sharedManukeBuffer = buffer;
          return buffer;
        });
    }
    sharedManukeBufferLoading.then((buffer) => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    }).catch((e) => console.error('audio decode/playback failed', e));
  } catch (e) {
    console.error('audio playback failed', e);
  }
}

// plays a short "tap" sound when the start / difficulty / play-again buttons are pressed
let sharedTapBuffer = null;
let sharedTapBufferLoading = null;

function playTapSound() {
  try {
    const ctx = getSharedAudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    if (sharedTapBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = sharedTapBuffer;
      source.connect(ctx.destination);
      source.start(0);
      return;
    }
    if (!sharedTapBufferLoading) {
      sharedTapBufferLoading = loadArrayBuffer(TAP_SOUND_SRC)
        .then((arrayBuffer) => ctx.decodeAudioData(arrayBuffer))
        .then((buffer) => {
          sharedTapBuffer = buffer;
          return buffer;
        });
    }
    sharedTapBufferLoading.then((buffer) => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    }).catch((e) => console.error('audio decode/playback failed', e));
  } catch (e) {
    console.error('audio playback failed', e);
  }
}

// two-track BGM system: 'home' plays on the home/level-select screens,
// 'game' plays during the quiz/result screens. Switching tracks stops the
// previous one and starts the new one from the beginning.
let currentBGMKey = null;
let currentBGMSource = null;
const bgmBufferCache = {}; // key -> decoded AudioBuffer
const bgmBufferLoading = {}; // key -> Promise<AudioBuffer>

function getBGMSrc(key) {
  return key === 'game' ? GAME_BGM_SRC : HOME_BGM_SRC;
}

function loadBGMBuffer(ctx, key) {
  if (bgmBufferCache[key]) {
    return Promise.resolve(bgmBufferCache[key]);
  }
  if (!bgmBufferLoading[key]) {
    bgmBufferLoading[key] = loadArrayBuffer(getBGMSrc(key))
      .then((arrayBuffer) => ctx.decodeAudioData(arrayBuffer))
      .then((buffer) => {
        bgmBufferCache[key] = buffer;
        return buffer;
      });
  }
  return bgmBufferLoading[key];
}

function playBGMTrack(key) {
  if (currentBGMKey === key) return; // already playing this track
  try {
    const ctx = getSharedAudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    // stop whichever track is currently playing
    if (currentBGMSource) {
      try {
        currentBGMSource.stop(0);
      } catch (e) {
        // already stopped; ignore
      }
      currentBGMSource = null;
    }
    currentBGMKey = key;
    loadBGMBuffer(ctx, key).then((buffer) => {
      // if the screen changed again before this finished loading, don't start a stale track
      if (currentBGMKey !== key) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0.35; // keep BGM quieter than sound effects
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);
      currentBGMSource = source;
    }).catch((e) => console.error('BGM decode/playback failed', e));
  } catch (e) {
    console.error('BGM playback failed', e);
  }
}

// low double "buzz" for wrong answers
let sharedAudioCtx = null;
function playWrongSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
    const ctx = sharedAudioCtx;
    const now = ctx.currentTime;
    const buzz = (start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 130;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.linearRampToValueAtTime(0.25, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.05);
    };
    buzz(0, 0.22);
    buzz(0.28, 0.22);
  } catch (e) {
    console.error('audio playback failed', e);
  }
}

// header art (title + 10-star progress track) with correct/wrong stars overlaid live
function Header({ results }) {
  return (
    <div className="header-wrap">
      <img src={HEADER_BG} className="header-bg" alt="なんじでしょう？" draggable={false} />
      {results.map((r, i) =>
        r ? (
          <img
            key={i}
            src={r === 'correct' ? STAR_CORRECT : STAR_WRONG}
            className="progress-star"
            alt={r === 'correct' ? 'せいかい' : 'ふせいかい'}
            draggable={false}
            style={{
              left: `${STAR_X[i]}%`,
              top: `${STAR_Y}%`,
              width: `${STAR_SIZE}%`,
            }}
          />
        ) : null
      )}
    </div>
  );
}

// the clock: character face art + rotating hour/minute hand art, all sharing one pivot
function ClockDisplay({ hour, minute, mood, animationClass, noNumbers }) {
  // hour hand artwork points down by default (its long side falls below the pivot),
  // so we add a 180deg correction; the minute hand artwork already points up by default
  const hourAngle = ((hour % 12) + minute / 60) * 30 - 180;
  const minuteAngle = minute * 6;

  const faceSrc = noNumbers
    ? (mood === 'happy' ? CLOCK_FACE_HAPPY_NONUM : CLOCK_FACE_NEUTRAL_NONUM)
    : (mood === 'happy' ? CLOCK_FACE_HAPPY : CLOCK_FACE_NEUTRAL);

  return (
    <div className={`clock-display ${animationClass || ''}`}>
      <img
        src={faceSrc}
        className="layer face-layer"
        alt="とけいのかお"
        draggable={false}
      />
      <img
        src={HAND_MINUTE}
        className="layer hand-layer"
        alt="ちょうしん"
        draggable={false}
        style={{ transform: `rotate(${minuteAngle}deg)`, transformOrigin: `${PIVOT_X}% ${PIVOT_Y}%` }}
      />
      <img
        src={HAND_HOUR}
        className="layer hand-layer"
        alt="たんしん"
        draggable={false}
        style={{ transform: `rotate(${hourAngle}deg)`, transformOrigin: `${PIVOT_X}% ${PIVOT_Y}%` }}
      />
      {mood === 'happy' && (
        <div className="sparkles">
          <span>✦</span>
          <span>✦</span>
          <span>✦</span>
        </div>
      )}
    </div>
  );
}

// decorative clock for the title screen: gently bobs up and down, hands spin continuously
function IdleClock() {
  return (
    <div className="idle-clock-bob">
      <div className="clock-display idle-clock">
        <img
          src={CLOCK_FACE_NEUTRAL}
          className="layer face-layer"
          alt="とけいのかお"
          draggable={false}
        />
        <img
          src={HAND_MINUTE}
          className="layer hand-layer idle-hand-minute"
          alt="ちょうしん"
          draggable={false}
          style={{ transformOrigin: `${PIVOT_X}% ${PIVOT_Y}%` }}
        />
        <img
          src={HAND_HOUR}
          className="layer hand-layer idle-hand-hour"
          alt="たんしん"
          draggable={false}
          style={{ transformOrigin: `${PIVOT_X}% ${PIVOT_Y}%` }}
        />
      </div>
    </div>
  );
}

export default function ClockGame() {
  const [started, setStarted] = useState(false); // false = on the home/title screen
  const [difficulty, setDifficulty] = useState(null); // null = on the difficulty menu
  const [time, setTime] = useState({ hour: 12, minute: 0 });
  const [choices, setChoices] = useState([]);
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | null
  const [results, setResults] = useState(Array(TOTAL_ROUNDS).fill(null));
  const [roundIndex, setRoundIndex] = useState(0); // 0-based
  const [locked, setLocked] = useState(false);
  const [finished, setFinished] = useState(false);

  // switch BGM track automatically based on which screen is showing:
  // home screen + level-select screen share one track, quiz + result share another
  useEffect(() => {
    const onGameScreen = started && difficulty !== null;
    playBGMTrack(onGameScreen ? 'game' : 'home');
  }, [started, difficulty]);

  // browsers block audio until the very first user gesture on the page, so as soon
  // as that happens (tap/click/key anywhere) we resume the audio context immediately
  // rather than waiting for a specific button - this gets music playing as early as possible
  useEffect(() => {
    const unlock = () => {
      try {
        const ctx = getSharedAudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
      } catch (e) {
        // ignore
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const newRound = useCallback((diff) => {
    setTime((prevTime) => {
      let t = randomTime(diff);
      let guard = 0;
      // avoid showing the exact same time as the previous round back-to-back
      while (t.hour === prevTime.hour && t.minute === prevTime.minute && guard < 30) {
        t = randomTime(diff);
        guard += 1;
      }
      setChoices(makeChoices(t.hour, t.minute, diff));
      return t;
    });
    setFeedback(null);
    setLocked(false);
  }, []);

  function handleSelectDifficulty(id) {
    setDifficulty(id);
    setResults(Array(TOTAL_ROUNDS).fill(null));
    setRoundIndex(0);
    setFinished(false);
    newRound(id);
  }

  function handleChoice(choice) {
    if (locked || finished) return;
    const correct = formatAnswer(time.hour, time.minute);
    setLocked(true);
    if (choice === correct) {
      setFeedback('correct');
      playCorrectSound();
      setResults((prev) => {
        const next = [...prev];
        // once a round has been marked wrong, its star stays grey even if answered correctly afterward
        if (next[roundIndex] !== 'wrong') {
          next[roundIndex] = 'correct';
        }
        return next;
      });
      setTimeout(() => {
        if (roundIndex + 1 >= TOTAL_ROUNDS) {
          setResults((prev) => {
            const finalCorrectCount = prev.filter((r) => r === 'correct').length;
            if (finalCorrectCount >= 5) {
              playCheerSound();
            } else if (finalCorrectCount <= 4) {
              playManukeSound();
            }
            return prev;
          });
          setFinished(true);
        } else {
          setRoundIndex((r) => r + 1);
          newRound(difficulty);
        }
      }, 1200);
    } else {
      setFeedback('wrong');
      playWrongSound();
      setResults((prev) => {
        const next = [...prev];
        next[roundIndex] = 'wrong';
        return next;
      });
      setTimeout(() => setLocked(false), 900);
    }
  }

  function handleRestart() {
    setDifficulty(null);
  }

  function handleBackToMenu() {
    setDifficulty(null);
  }

  function handleBackToHome() {
    setStarted(false);
    setDifficulty(null);
  }

  const mood = feedback === 'correct' ? 'happy' : 'neutral';
  const correctCount = results.filter((r) => r === 'correct').length;
  const isChallenge = difficulty === 'challenge';

  return (
    <div className={`wrap ${finished ? 'wrap-result' : ''}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;700&family=Zen+Maru+Gothic:wght@500;700&display=swap');

        .wrap {
          font-family: 'Zen Maru Gothic', 'Fredoka', sans-serif;
          background: #FFFFFF;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 16px 40px;
          box-sizing: border-box;
          color: #2E3A46;
          overflow-x: hidden;
        }
        .wrap.wrap-result {
          padding-bottom: 0;
        }
        .header-wrap {
          position: relative;
          width: 130%;
          max-width: 494px;
          margin-left: -15%;
          margin-right: -15%;
        }
        .header-bg {
          display: block;
          width: 100%;
          height: auto;
          user-select: none;
          pointer-events: none;
        }
        .progress-star {
          position: absolute;
          transform: translate(-50%, -50%);
          user-select: none;
          pointer-events: none;
        }
        .clock-display {
          position: relative;
          width: 100%;
          max-width: 340px;
          aspect-ratio: 700 / 662;
          margin: 4px auto 0;
        }
        .clock-display.bounce {
          animation: bounce 0.6s ease;
        }
        .clock-display.shake {
          animation: shake 0.5s ease;
        }
        .layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          user-select: none;
          pointer-events: none;
        }
        .sparkles span {
          position: absolute;
          font-size: 20px;
          color: #FFC93C;
          animation: sparkle 0.8s ease forwards;
        }
        .sparkles span:nth-child(1) { top: 4%; left: 6%; animation-delay: 0s; }
        .sparkles span:nth-child(2) { top: 0%; right: 10%; animation-delay: 0.12s; }
        .sparkles span:nth-child(3) { bottom: 30%; right: 2%; animation-delay: 0.24s; }
        @keyframes sparkle {
          0% { transform: scale(0) rotate(0deg); opacity: 0; }
          40% { transform: scale(1.3) rotate(20deg); opacity: 1; }
          100% { transform: scale(0.6) rotate(40deg); opacity: 0; }
        }
        @keyframes bounce {
          0% { transform: translateY(0); }
          30% { transform: translateY(-16px); }
          55% { transform: translateY(0); }
          75% { transform: translateY(-6px); }
          100% { transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .choices {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 7px;
          width: 100%;
          max-width: 300px;
          margin: 22px auto 0;
        }
        .choice-btn {
          position: relative;
          font-family: 'Zen Maru Gothic', sans-serif;
          font-size: 19px;
          font-weight: 700;
          color: #FFFFFF;
          border: none;
          cursor: pointer;
          background-image: url(${BUTTON_BG});
          background-size: 100% 100%;
          background-repeat: no-repeat;
          background-color: transparent;
          aspect-ratio: 500 / 166;
          width: 100%;
          transition: transform 0.08s ease;
        }
        .choice-btn:active {
          transform: translateY(2px) scale(0.98);
        }
        .choice-btn:disabled {
          opacity: 0.7;
        }
        .feedback-msg {
          margin-top: 16px;
          font-weight: 700;
          font-size: 16px;
          min-height: 22px;
        }
        .feedback-msg.correct { color: #2E8B47; }
        .feedback-msg.wrong { color: #D9503F; }
        .back-link {
          display: block;
          margin: 28px auto 0;
          background: none;
          border: none;
          color: #8FA4BE;
          font-family: 'Zen Maru Gothic', sans-serif;
          font-size: 14px;
          cursor: pointer;
          padding: 6px 10px;
        }
        .back-link:active {
          opacity: 0.6;
        }
        .result-card {
          position: relative;
          margin-top: 24px;
          width: 100%;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          padding-bottom: 12vh;
          cursor: pointer;
        }
        .score-img {
          width: 200%;
          height: auto;
          user-select: none;
          pointer-events: none;
        }
        .restart-btn-img {
          display: block;
          margin: 16px auto 0;
          border: none;
          background: none;
          padding: 0;
          cursor: pointer;
          width: 220px;
          transition: transform 0.08s ease;
        }
        .restart-btn-img img {
          display: block;
          width: 100%;
          height: auto;
          pointer-events: none;
        }
        .restart-btn-img:active {
          transform: translateY(2px) scale(0.98);
        }
        .menu-card {
          margin-top: 36px;
          width: 100%;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .menu-choices {
          max-width: 320px;
          grid-template-columns: 1fr;
        }
        .menu-choices .choice-btn {
          width: 50%;
          font-size: 19px;
          margin: 0 auto;
        }
        .level-peek-img {
          width: 90%;
          max-width: 340px;
          height: auto;
          margin-top: auto;
          padding-top: 24px;
          user-select: none;
          pointer-events: none;
        }
        .home-title-img {
          display: block;
          width: 56%;
          max-width: 256px;
          height: auto;
          margin: 64px auto 0;
          user-select: none;
          pointer-events: none;
        }
        .level-title-img {
          display: block;
          width: 56%;
          max-width: 256px;
          height: auto;
          margin: 20px auto 0;
          user-select: none;
          pointer-events: none;
        }
        .idle-clock-bob {
          position: relative;
          left: 50%;
          transform: translateX(-50%);
          animation: idleBob 2.2s ease-in-out infinite;
          margin: 20px auto 32px;
          width: 121%;
          max-width: 484px;
        }
        .idle-clock {
          position: relative;
          width: 100%;
          aspect-ratio: 700 / 662;
        }
        .idle-hand-minute {
          animation: idleSpin 4s linear infinite;
        }
        .idle-hand-hour {
          animation: idleSpin 9s linear infinite;
        }
        @keyframes idleBob {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-14px); }
        }
        @keyframes idleSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .start-btn-img {
          display: block;
          border: none;
          background: none;
          padding: 0;
          cursor: pointer;
          width: 220px;
          transition: transform 0.08s ease;
        }
        .start-btn-img img {
          display: block;
          width: 100%;
          height: auto;
          pointer-events: none;
        }
        .start-btn-img:active {
          transform: translateY(2px) scale(0.98);
        }
        @media (prefers-reduced-motion: reduce) {
          .clock-display.bounce, .clock-display.shake { animation: none; }
          .sparkles span { animation: none; opacity: 0; }
          .idle-clock-bob, .idle-hand-minute, .idle-hand-hour { animation: none; }
        }
      `}</style>

      {!started ? (
        <>
          <img src={TITLE_IMG} className="home-title-img" alt="MOPIKOのなんじでしょう？" draggable={false} />
          <IdleClock />
          <button
            className="start-btn-img"
            onClick={() => {
              playTapSound();
              setStarted(true);
            }}
          >
            <img src={START_BTN_IMG} alt="スタート" draggable={false} />
          </button>
        </>
      ) : (
        <>
          {difficulty === null ? (
            <img
              src={TITLE_IMG}
              className="level-title-img"
              alt="MOPIKOのなんじでしょう？"
              draggable={false}
            />
          ) : (
            <Header results={results} />
          )}

      {difficulty === null ? (
        <div className="menu-card">
          <div className="choices menu-choices">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                className="choice-btn"
                onClick={() => {
                  playTapSound();
                  handleSelectDifficulty(d.id);
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
          <button className="back-link" onClick={handleBackToHome}>
            ◀︎ もどる
          </button>
          <img
            src={LEVEL_PEEK_IMG}
            className="level-peek-img"
            alt=""
            draggable={false}
          />
        </div>
      ) : !finished ? (
        <>
          <ClockDisplay
            hour={time.hour}
            minute={time.minute}
            mood={mood}
            animationClass={feedback === 'correct' ? 'bounce' : feedback === 'wrong' ? 'shake' : ''}
            noNumbers={isChallenge}
          />

          <div className="choices">
            {choices.map((c) => (
              <button
                key={c}
                className="choice-btn"
                onClick={() => handleChoice(c)}
                disabled={locked}
              >
                {c}
              </button>
            ))}
          </div>

          <div className={`feedback-msg ${feedback || ''}`}>
            {feedback === 'correct' && 'せいかい！すごいね！'}
            {feedback === 'wrong' && 'おしい！もういちど！'}
          </div>

          <button className="back-link" onClick={handleBackToMenu}>
            ◀︎ もどる
          </button>
        </>
      ) : (
        <>
          <button
            className="restart-btn-img"
            onClick={() => {
              playTapSound();
              handleRestart();
            }}
          >
            <img src={MOTTO_ASOBU_BTN_IMG} alt="もっとあそぶ" draggable={false} />
          </button>
          <div className="result-card" onClick={handleRestart} role="button" tabIndex={0}>
            <img
              src={SCORE_IMAGES[correctCount]}
              className="score-img"
              alt={`${correctCount * 10}てん`}
              draggable={false}
            />
          </div>
        </>
      )}
        </>
      )}
    </div>
  );
}
