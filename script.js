/* =========================================================
   1. MATCHING GOLDEN HOUR FALLBACK PORTRAITS
   ========================================================= */
function buildFallbackPortrait(label) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750">
      <defs>
        <linearGradient id="gh" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#5b2812"/>
          <stop offset="55%" stop-color="#9e4f23"/>
          <stop offset="100%" stop-color="#f7c873"/>
        </linearGradient>
      </defs>
      <rect width="600" height="750" fill="url(#gh)"/>
      <circle cx="300" cy="300" r="105" fill="#fff8ee" opacity="0.18"/>
      <text x="300" y="330" font-size="86" text-anchor="middle">☀️</text>
      <text x="300" y="472" font-family="Georgia, serif" font-size="28" fill="#fff8ee" text-anchor="middle">${label}</text>
      <text x="300" y="516" font-family="Arial, sans-serif" font-size="18" fill="#ffe6ad" text-anchor="middle">Place her photo in this folder</text>
    </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

document.querySelectorAll("img").forEach((img) => {
  img.addEventListener("error", function () {
    if (!this.dataset.fallbackDone) {
      this.dataset.fallbackDone = "true";
      this.src = buildFallbackPortrait(this.dataset.label || "Her Portrait");
    }
  });
});

/* =========================================================
   2. LIVE BACKGROUND COLOR SWITCHER
   ========================================================= */
const themeList = [
  { id: "golden", label: "Golden Hour" },
  { id: "botanical", label: "Botanical Sage" },
  { id: "obsidian", label: "Obsidian Gold" }
];
let themeIdx = 0;

document.getElementById("themeBtn").addEventListener("click", () => {
  themeIdx = (themeIdx + 1) % themeList.length;
  document.body.setAttribute("data-theme", themeList[themeIdx].id);
  document.getElementById("themeLabel").textContent = themeList[themeIdx].label;
  drawWheel();
});

/* =========================================================
   3. BRAND-NEW AUDIO ENGINE + VINYL CRACKLE + LIVE VISUALIZER
      - Track 0: "Golden Hour Lo-Fi" (Jazz Maj9 Rhodes + soft pulse + vinyl crackle)
      - Track 1: "Sunbeam Kalimba" (Woody thumb-piano + sparkling wind chimes)
      - Custom MP3 upload wired into the same live visualizer
   ========================================================= */
const vinylDisc = document.getElementById("vinylDisc");
const tonearm = document.getElementById("tonearm");
const vinylPlayBtn = document.getElementById("vinylPlayBtn");
const navMusicBtn = document.getElementById("navMusicBtn");
const navMusicLabel = document.getElementById("navMusicLabel");
const nowPlaying = document.getElementById("nowPlaying");
const trackLoFiBtn = document.getElementById("trackLoFi");
const trackKalimbaBtn = document.getElementById("trackKalimba");
const customAudio = document.getElementById("customAudio");
const mp3Input = document.getElementById("mp3Input");

let audioCtx = null;
let masterGain = null;
let analyser = null;
let echoBus = null;
let crackleNode = null;
let crackleGain = null;
let mediaSourceBound = false;

let isPlaying = false;
let audioMode = "lofi"; // "lofi" | "kalimba" | "mp3"
let stepCount = 0;
let musicTimer = null;

// Cozy Lo-Fi Rhodes Jazz Progression (Fmaj9 → Dm9 → Bbmaj9 → C13)
const lofiChords = [
  { bass: 87.31, notes: [174.61, 220.0, 261.63, 329.63, 392.0], melody: [523.25, 440.0] },
  { bass: 73.42, notes: [146.83, 220.0, 261.63, 329.63, 349.23], melody: [392.0, 349.23] },
  { bass: 116.54, notes: [174.61, 220.0, 261.63, 293.66, 349.23], melody: [440.0, 523.25] },
  { bass: 65.41, notes: [164.81, 233.08, 293.66, 329.63, 440.0], melody: [392.0, 329.63] }
];

// Bright D-Major Pentatonic Kalimba Notes
const kalimbaPattern = [
  293.66, 369.99, 440.0, 587.33, 659.25, 587.33, 440.0, 369.99,
  329.63, 440.0, 587.33, 739.99, 659.25, 587.33, 493.88, 440.0
];

function setupAudioEngine() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.5;

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 64;

  // Warm stereo-feel delay
  echoBus = audioCtx.createDelay();
  echoBus.delayTime.value = 0.34;
  const fb = audioCtx.createGain();
  fb.gain.value = 0.28;
  const lp = audioCtx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1750;

  echoBus.connect(lp);
  lp.connect(fb);
  fb.connect(echoBus);
  lp.connect(masterGain);

  masterGain.connect(analyser);
  analyser.connect(audioCtx.destination);

  // Subtle Procedural Vinyl Crackle Loop
  const len = audioCtx.sampleRate * 3;
  const buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const r = Math.random();
    data[i] = r > 0.9992 ? (Math.random() * 2 - 1) * 0.45 : (Math.random() * 2 - 1) * 0.004;
  }
  crackleNode = audioCtx.createBufferSource();
  crackleNode.buffer = buffer;
  crackleNode.loop = true;

  const hp = audioCtx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1600;

  crackleGain = audioCtx.createGain();
  crackleGain.gain.value = 0;

  crackleNode.connect(hp);
  hp.connect(crackleGain);
  crackleGain.connect(masterGain);
  crackleNode.start();
}

function playRhodesTone(freq, delaySec = 0, dur = 1.8, amp = 0.085) {
  const now = audioCtx.currentTime + delaySec;
  const osc = audioCtx.createOscillator();
  const bell = audioCtx.createOscillator();
  const bellGain = audioCtx.createGain();
  const env = audioCtx.createGain();
  const lp = audioCtx.createBiquadFilter();

  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);
  bell.type = "triangle";
  bell.frequency.setValueAtTime(freq * 2, now);
  bellGain.gain.setValueAtTime(0.08, now);
  bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  lp.type = "lowpass";
  lp.frequency.setValueAtTime(1400, now);

  env.gain.setValueAtTime(0.0001, now);
  env.gain.linearRampToValueAtTime(amp, now + 0.03);
  env.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  osc.connect(lp);
  bell.connect(bellGain);
  bellGain.connect(lp);
  lp.connect(env);
  env.connect(masterGain);
  env.connect(echoBus);

  osc.start(now);
  bell.start(now);
  osc.stop(now + dur + 0.05);
  bell.stop(now + dur + 0.05);
}

function playSoftKick(delaySec = 0) {
  const now = audioCtx.currentTime + delaySec;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(105, now);
  osc.frequency.exponentialRampToValueAtTime(38, now + 0.14);
  g.gain.setValueAtTime(0.18, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.2);
}

function playKalimbaPluck(freq, delaySec = 0, isChime = false) {
  const now = audioCtx.currentTime + delaySec;
  const osc = audioCtx.createOscillator();
  const tine = audioCtx.createOscillator();
  const tineG = audioCtx.createGain();
  const env = audioCtx.createGain();

  osc.type = isChime ? "sine" : "triangle";
  osc.frequency.setValueAtTime(freq, now);

  // Woody kalimba tine click overtone
  tine.type = "sine";
  tine.frequency.setValueAtTime(freq * 2.92, now);
  tineG.gain.setValueAtTime(isChime ? 0.02 : 0.12, now);
  tineG.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

  env.gain.setValueAtTime(0.0001, now);
  env.gain.linearRampToValueAtTime(isChime ? 0.06 : 0.16, now + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, now + (isChime ? 2.0 : 0.95));

  osc.connect(env);
  tine.connect(tineG);
  tineG.connect(env);
  env.connect(masterGain);
  env.connect(echoBus);

  osc.start(now);
  tine.start(now);
  osc.stop(now + 2.1);
  tine.stop(now + 2.1);
}

function playWheelTick() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);
  g.gain.setValueAtTime(0.09, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.045);
}

function runSoundtrack() {
  if (!isPlaying || audioMode === "mp3") return;

  if (audioMode === "lofi") {
    const ch = lofiChords[stepCount % lofiChords.length];
    playSoftKick(0);
    playSoftKick(1.1);
    playRhodesTone(ch.bass, 0, 2.1, 0.12);
    ch.notes.forEach((hz, i) => playRhodesTone(hz, i * 0.045, 2.0, 0.065));
    playRhodesTone(ch.melody[0], 0.55, 1.0, 0.075);
    playRhodesTone(ch.melody[1], 1.45, 0.95, 0.075);

    stepCount++;
    musicTimer = setTimeout(runSoundtrack, 2200);
  } else if (audioMode === "kalimba") {
    const note = kalimbaPattern[stepCount % kalimbaPattern.length];
    playKalimbaPluck(note, 0, false);
    if (stepCount % 4 === 0) {
      playKalimbaPluck(note * 0.5, 0, false);
    }
    if (stepCount % 5 === 0) {
      playKalimbaPluck(note * 2, 0.12, true); // soft wind chime sparkle
    }
    stepCount++;
    musicTimer = setTimeout(runSoundtrack, 340);
  }
}

function updatePlayerUI() {
  vinylDisc.classList.toggle("spinning", isPlaying);
  tonearm.classList.toggle("engaged", isPlaying);
  vinylPlayBtn.textContent = isPlaying ? "⏸ Pause Record" : "▶ Spin Record";
  navMusicBtn.classList.toggle("playing", isPlaying);
  navMusicLabel.textContent = isPlaying ? "Pause Vinyl" : "Play Vinyl";

  trackLoFiBtn.classList.toggle("active-track", audioMode === "lofi");
  trackKalimbaBtn.classList.toggle("active-track", audioMode === "kalimba");

  const label =
    audioMode === "lofi"
      ? "Golden Hour Lo-Fi Rhodes"
      : audioMode === "kalimba"
      ? "Sunbeam Kalimba & Chimes"
      : "Your Uploaded MP3 Track";
  nowPlaying.textContent = `${isPlaying ? "Now Spinning" : "Ready to spin"} • ${label}`;
}

function startPlayback() {
  setupAudioEngine();
  if (audioCtx.state === "suspended") audioCtx.resume();
  isPlaying = true;
  clearTimeout(musicTimer);

  if (audioMode === "mp3") {
    if (crackleGain) crackleGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.2);
    customAudio.play();
  } else {
    customAudio.pause();
    if (crackleGain) {
      crackleGain.gain.setTargetAtTime(audioMode === "lofi" ? 0.16 : 0.02, audioCtx.currentTime, 0.25);
    }
    runSoundtrack();
  }
  updatePlayerUI();
}

function pausePlayback() {
  isPlaying = false;
  clearTimeout(musicTimer);
  customAudio.pause();
  if (crackleGain && audioCtx) {
    crackleGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.2);
  }
  updatePlayerUI();
}

vinylPlayBtn.addEventListener("click", () => (isPlaying ? pausePlayback() : startPlayback()));
navMusicBtn.addEventListener("click", () => (isPlaying ? pausePlayback() : startPlayback()));

trackLoFiBtn.addEventListener("click", () => {
  audioMode = "lofi";
  stepCount = 0;
  isPlaying ? startPlayback() : updatePlayerUI();
});

trackKalimbaBtn.addEventListener("click", () => {
  audioMode = "kalimba";
  stepCount = 0;
  isPlaying ? startPlayback() : updatePlayerUI();
});

mp3Input.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  setupAudioEngine();
  customAudio.src = URL.createObjectURL(file);
  if (!mediaSourceBound) {
    const src = audioCtx.createMediaElementSource(customAudio);
    src.connect(masterGain);
    mediaSourceBound = true;
  }
  audioMode = "mp3";
  startPlayback();
});

// Live Frequency Visualizer Canvas
const vizCanvas = document.getElementById("vizCanvas");
const vCtx = vizCanvas.getContext("2d");

function renderVisualizer() {
  vCtx.clearRect(0, 0, vizCanvas.width, vizCanvas.height);
  const bars = 28;
  const gap = 5;
  const barW = (vizCanvas.width - gap * (bars + 1)) / bars;

  let freqData = null;
  if (analyser && isPlaying) {
    freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);
  }

  for (let i = 0; i < bars; i++) {
    const val = freqData ? freqData[i] / 255 : 0.08 + Math.sin(Date.now() * 0.003 + i * 0.4) * 0.04;
    const h = Math.max(6, val * (vizCanvas.height - 16));
    const x = gap + i * (barW + gap);
    const y = (vizCanvas.height - h) / 2;

    const grad = vCtx.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, "#ffe6ad");
    grad.addColorStop(1, "#e88d4f");
    vCtx.fillStyle = grad;
    vCtx.beginPath();
    vCtx.roundRect(x, y, barW, h, 4);
    vCtx.fill();
  }
  requestAnimationFrame(renderVisualizer);
}
renderVisualizer();

/* =========================================================
   4. INTRO GATE, TYPEWRITER & ARCH PORTRAIT TILT
   ========================================================= */
document.getElementById("enterBtn").addEventListener("click", () => {
  document.getElementById("welcomeGate").classList.add("hide");
  startPlayback();
  spawnSparkBurst(window.innerWidth / 2, window.innerHeight / 2, 110);
});

const typePhrases = [
  "your golden warmth & grace ☀️",
  "another luminous year ahead 🎂",
  "your radiant, unforgettable smile ✨",
  "everything that makes you extraordinary 👑"
];
const typeEl = document.getElementById("typewriter");
let tPhrase = 0, tChar = 0, tDel = false;

function loopType() {
  const txt = typePhrases[tPhrase];
  typeEl.textContent = txt.slice(0, tChar);
  if (!tDel && tChar < txt.length) {
    tChar++;
    setTimeout(loopType, 60);
  } else if (!tDel && tChar === txt.length) {
    tDel = true;
    setTimeout(loopType, 1650);
  } else if (tDel && tChar > 0) {
    tChar--;
    setTimeout(loopType, 32);
  } else {
    tDel = false;
    tPhrase = (tPhrase + 1) % typePhrases.length;
    setTimeout(loopType, 320);
  }
}
loopType();

const heroFrame = document.getElementById("heroFrame");
heroFrame.addEventListener("mousemove", (e) => {
  const r = heroFrame.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  heroFrame.style.transform = `rotateY(${x * 16}deg) rotateX(${-y * 16}deg)`;
});
heroFrame.addEventListener("mouseleave", () => {
  heroFrame.style.transform = "rotateY(0deg) rotateX(0deg)";
});

/* =========================================================
   5. 3D PAGE-TURNING PORTRAIT LOOKBOOK + LIGHTBOX + UPLOADER
   ========================================================= */
const pages = Array.from(document.querySelectorAll(".book-page"));
const pageIndicator = document.getElementById("pageIndicator");
const bookThumbs = document.getElementById("bookThumbs");
let currentPage = 0;

// Stack z-index so page 0 sits cleanly on top
pages.forEach((p, idx) => {
  p.style.zIndex = pages.length - idx;
});

// Build Thumbnail Strip for the 6 Portrait Pages
const portraitPages = pages.slice(1);
const thumbButtons = portraitPages.map((pg, i) => {
  const btn = document.createElement("button");
  btn.className = "b-thumb";
  const img = document.createElement("img");
  img.src = pg.querySelector("img").src;
  img.alt = `Portrait ${i + 1}`;
  img.addEventListener("error", () => (img.src = pg.querySelector("img").src));
  btn.appendChild(img);
  btn.addEventListener("click", () => goToPage(i + 1));
  bookThumbs.appendChild(btn);
  return btn;
});

function goToPage(target) {
  currentPage = Math.max(0, Math.min(pages.length - 1, target));
  pages.forEach((pg, idx) => {
    pg.classList.toggle("turned", idx < currentPage);
  });
  pageIndicator.textContent =
    currentPage === 0
      ? "Cover • 6 Portraits Inside"
      : `Portrait ${currentPage} of ${portraitPages.length} • Click portrait to zoom`;

  thumbButtons.forEach((b, i) => b.classList.toggle("active", i + 1 === currentPage));
}

document.getElementById("nextPageBtn").addEventListener("click", () => {
  goToPage(currentPage < pages.length - 1 ? currentPage + 1 : 0);
});
document.getElementById("prevPageBtn").addEventListener("click", () => {
  goToPage(currentPage > 0 ? currentPage - 1 : pages.length - 1);
});

// Click Cover to Open; Click Portrait Page to Zoom Lightbox
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxCaption = document.getElementById("lightboxCaption");

pages.forEach((pg, idx) => {
  pg.addEventListener("click", () => {
    if (idx === 0) {
      goToPage(1);
    } else if (idx === currentPage) {
      lightboxImg.src = pg.querySelector("img").src;
      lightboxCaption.textContent = pg.dataset.caption || "";
      lightbox.classList.add("open");
    }
  });
});

document.getElementById("closeLightbox").addEventListener("click", () => lightbox.classList.remove("open"));
lightbox.addEventListener("click", (e) => { if (e.target === lightbox) lightbox.classList.remove("open"); });

// Local Instant Photo Previewer
document.getElementById("photoPicker").addEventListener("change", (e) => {
  const files = Array.from(e.target.files);
  const targets = [document.getElementById("mainPortrait"), ...portraitPages.map((p) => p.querySelector("img"))];

  files.slice(0, targets.length).forEach((file, idx) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      targets[idx].src = ev.target.result;
      if (idx > 0) thumbButtons[idx - 1].querySelector("img").src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  if (files.length) {
    goToPage(1);
    spawnSparkBurst(window.innerWidth / 2, window.innerHeight / 3, 75);
  }
});

setTimeout(() => {
  portraitPages.forEach((pg, i) => {
    thumbButtons[i].querySelector("img").src = pg.querySelector("img").src;
  });
}, 140);

/* =========================================================
   6. CRYSTAL FIREFLY WISH JAR
   ========================================================= */
const wishJar = document.getElementById("wishJar");
const wishDisplay = document.getElementById("wishDisplay");
const jarCounter = document.getElementById("jarCounter");
const customWishInput = document.getElementById("customWishInput");

const jarWishes = [
  "May your new year feel like golden sunlight—warm, peaceful, and quietly magical. ☀️",
  "Wishing you mornings with calm coffee, days with bright smiles, and nights with gentle dreams. ✨",
  "May every goal your heart has been dreaming of bloom effortlessly this year. 🌿",
  "Never forget how rare, admirable, and deeply appreciated your presence is. 👑",
  "May unexpected blessings, joyful laughter, and good health follow you everywhere. 💫",
  "Happy Birthday, [Her Name]! Here is to your brightest, happiest chapter yet. 🎂"
];
let wishCursor = 0;

wishJar.addEventListener("click", () => {
  wishJar.classList.add("pop-cork");
  setTimeout(() => wishJar.classList.remove("pop-cork"), 500);

  const r = wishJar.getBoundingClientRect();
  spawnSparkBurst(r.left + r.width / 2, r.top + 25, 45);
  if (audioCtx) playKalimbaPluck(659.25, 0, true);

  const text = jarWishes[wishCursor % jarWishes.length];
  wishCursor++;

  wishDisplay.innerHTML = `<span class="parchment-icon">🌟</span><p>${text}</p>`;
  jarCounter.textContent = `Wish ${((wishCursor - 1) % jarWishes.length) + 1} of ${jarWishes.length} released`;
});

document.getElementById("addWishBtn").addEventListener("click", () => {
  const val = customWishInput.value.trim();
  if (!val) return;
  jarWishes.unshift(val + " ✨");
  wishCursor = 0;
  customWishInput.value = "";
  jarCounter.textContent = `${jarWishes.length} glowing wishes waiting inside`;
  wishDisplay.innerHTML = `<span class="parchment-icon">💫</span><p>Your wish was sealed inside the jar! Tap the jar to release it.</p>`;
  spawnSparkBurst(window.innerWidth / 2, window.innerHeight / 2, 40);
});

/* =========================================================
   7. SPIN THE GOLDEN BIRTHDAY BLESSING WHEEL
   ========================================================= */
const wheelCanvas = document.getElementById("wheelCanvas");
const wCtx = wheelCanvas.getContext("2d");
const spinBtn = document.getElementById("spinBtn");
const wheelResult = document.getElementById("wheelResult");

const slices = [
  { label: "Pure Peace", desc: "A year of calm skies, gentle days, and zero unnecessary stress. 🌿" },
  { label: "Big Dream", desc: "Your favorite unspoken dream takes a huge leap into reality! ✨" },
  { label: "Golden Luck", desc: "Unexpected happy coincidences and good news all year long. ☀️" },
  { label: "Endless Smiles", desc: "Countless reasons to laugh until your cheeks hurt. 💫" },
  { label: "Royal Treat", desc: "You are officially the Birthday Queen—treat yourself to your favorite thing today! 👑" },
  { label: "Bright Health", desc: "Abundant energy, warmth, and radiant well-being every single day. 💛" },
  { label: "Sweet Adventure", desc: "An unforgettable trip or exciting new memory awaits you soon! 🗺️" },
  { label: "Pure Magic", desc: "Everything you touch turns golden in this brand-new chapter. 🎂" }
];

let wheelAngle = 0;
let isSpinning = false;

function drawWheel() {
  const cx = wheelCanvas.width / 2;
  const cy = wheelCanvas.height / 2;
  const radius = cx - 8;
  const arc = (Math.PI * 2) / slices.length;

  const isLight = document.body.getAttribute("data-theme") === "botanical";
  const segColors = isLight
    ? ["#46664b", "#d8c39e", "#638468", "#c48d4e"]
    : ["#5b2812", "#c87a3b", "#7d3a1a", "#e6b262"];

  wCtx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);

  slices.forEach((s, i) => {
    const start = wheelAngle + i * arc;
    const end = start + arc;

    wCtx.beginPath();
    wCtx.moveTo(cx, cy);
    wCtx.arc(cx, cy, radius, start, end);
    wCtx.closePath();
    wCtx.fillStyle = segColors[i % segColors.length];
    wCtx.fill();
    wCtx.strokeStyle = "rgba(255, 240, 200, 0.45)";
    wCtx.lineWidth = 2;
    wCtx.stroke();

    wCtx.save();
    wCtx.translate(cx, cy);
    wCtx.rotate(start + arc / 2);
    wCtx.textAlign = "right";
    wCtx.fillStyle = i % 2 === 1 && !isLight ? "#241006" : "#fff8ee";
    wCtx.font = "600 13px 'DM Sans', sans-serif";
    wCtx.fillText(s.label, radius - 18, 5);
    wCtx.restore();
  });

  // Center Gold Medallion
  wCtx.beginPath();
  wCtx.arc(cx, cy, 26, 0, Math.PI * 2);
  wCtx.fillStyle = "#ffe6ad";
  wCtx.fill();
  wCtx.strokeStyle = "#7a3b18";
  wCtx.lineWidth = 3;
  wCtx.stroke();

  wCtx.fillStyle = "#3a1a0c";
  wCtx.font = "16px serif";
  wCtx.textAlign = "center";
  wCtx.fillText("☀️", cx, cy + 6);
}

drawWheel();

spinBtn.addEventListener("click", () => {
  if (isSpinning) return;
  isSpinning = true;
  spinBtn.disabled = true;
  wheelResult.classList.remove("show");

  const startAngle = wheelAngle;
  const totalSpin = Math.PI * 2 * (5 + Math.random() * 3) + Math.random() * Math.PI * 2;
  const duration = 3800;
  const startTime = performance.now();
  let lastSliceIdx = -1;

  function animateWheel(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const ease = 1 - Math.pow(1 - t, 3.5);
    wheelAngle = startAngle + totalSpin * ease;
    drawWheel();

    // Pointer is at top (-PI/2)
    const arc = (Math.PI * 2) / slices.length;
    const norm = ((-Math.PI / 2 - wheelAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const idx = Math.floor(norm / arc);
    if (idx !== lastSliceIdx) {
      lastSliceIdx = idx;
      playWheelTick();
    }

    if (t < 1) {
      requestAnimationFrame(animateWheel);
    } else {
      isSpinning = false;
      spinBtn.disabled = false;
      const win = slices[idx];
      wheelResult.innerHTML = `<strong>✨ ${win.label} ✨</strong><p>${win.desc}</p>`;
      wheelResult.classList.add("show");
      spawnSparkBurst(window.innerWidth / 2, window.innerHeight / 2, 95);
    }
  }
  requestAnimationFrame(animateWheel);
});

/* =========================================================
   8. INTERACTIVE BIRTHDAY CAKE (TAP + MIC BLOW)
   ========================================================= */
const candles = Array.from(document.querySelectorAll(".candle"));
const cakeStatus = document.getElementById("cakeStatus");
const cakeMessage = document.getElementById("cakeMessage");
const blowBtn = document.getElementById("blowBtn");
const relightBtn = document.getElementById("relightBtn");
const micBtn = document.getElementById("micBtn");

let micStream = null;
let micActive = false;

function checkCake() {
  const lit = candles.filter((c) => !c.classList.contains("blown")).length;
  if (lit === 0) {
    cakeStatus.textContent = "All candles blown out! Happy Birthday! 🎉";
    cakeMessage.classList.add("show");
    blowBtn.style.display = "none";
    micBtn.style.display = "none";
    relightBtn.style.display = "inline-block";
    stopMic();
    spawnSparkBurst(window.innerWidth / 2, window.innerHeight / 2, 130);
  } else {
    cakeStatus.textContent = `${lit} glowing candle${lit > 1 ? "s" : ""} left!`;
  }
}

candles.forEach((c) => {
  c.addEventListener("click", () => {
    if (!c.classList.contains("blown")) {
      c.classList.add("blown");
      checkCake();
    }
  });
});

function blowAllCandles() {
  candles.forEach((c, idx) => {
    setTimeout(() => {
      c.classList.add("blown");
      if (idx === candles.length - 1) checkCake();
    }, idx * 100);
  });
}

blowBtn.addEventListener("click", blowAllCandles);

relightBtn.addEventListener("click", () => {
  candles.forEach((c) => c.classList.remove("blown"));
  cakeMessage.classList.remove("show");
  blowBtn.style.display = "inline-block";
  micBtn.style.display = "inline-block";
  relightBtn.style.display = "none";
  cakeStatus.textContent = "Tap each flame, press the button, or blow gently into your microphone!";
});

function stopMic() {
  micActive = false;
  if (micStream) {
    micStream.getTracks().forEach((t) => t.stop());
    micStream = null;
  }
  micBtn.textContent = "🎙️ Blow Into Mic";
}

micBtn.addEventListener("click", async () => {
  if (micActive) return stopMic();
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setupAudioEngine();
    const micSrc = audioCtx.createMediaStreamSource(micStream);
    const micAnalyser = audioCtx.createAnalyser();
    micAnalyser.fftSize = 256;
    micSrc.connect(micAnalyser);

    const buf = new Uint8Array(micAnalyser.frequencyBinCount);
    micActive = true;
    micBtn.textContent = "🎙️ Listening... Blow Now!";
    cakeStatus.textContent = "Blow gently toward your microphone to put out the flames!";

    function listenLoop() {
      if (!micActive) return;
      micAnalyser.getByteFrequencyData(buf);
      const level = buf.reduce((a, b) => a + b, 0) / buf.length;
      if (level > 46) {
        blowAllCandles();
        stopMic();
        return;
      }
      requestAnimationFrame(listenLoop);
    }
    listenLoop();
  } catch {
    cakeStatus.textContent = "Microphone unavailable — tap each flame or press 'Blow Out Candles'!";
  }
});

/* =========================================================
   9. AMBIENT SUNLIT DUST MOTES + GOLDEN SPARKLER CURSOR TRAIL
   ========================================================= */
const ambCanvas = document.getElementById("ambientCanvas");
const aCtx = ambCanvas.getContext("2d");
const spkCanvas = document.getElementById("sparklerCanvas");
const sCtx = spkCanvas.getContext("2d");

let motes = [];
let sparks = [];

function resizeCanvases() {
  ambCanvas.width = spkCanvas.width = window.innerWidth;
  ambCanvas.height = spkCanvas.height = window.innerHeight;

  motes = Array.from({ length: 58 }, () => ({
    x: Math.random() * ambCanvas.width,
    y: Math.random() * ambCanvas.height,
    r: Math.random() * 2.8 + 0.8,
    vx: (Math.random() - 0.5) * 0.35,
    vy: -(Math.random() * 0.38 + 0.12),
    phase: Math.random() * Math.PI * 2
  }));
}

function animateMotes() {
  aCtx.clearRect(0, 0, ambCanvas.width, ambCanvas.height);
  motes.forEach((m) => {
    m.x += m.vx + Math.sin(m.phase) * 0.15;
    m.y += m.vy;
    m.phase += 0.02;

    if (m.y < -10) {
      m.y = ambCanvas.height + 10;
      m.x = Math.random() * ambCanvas.width;
    }
    const alpha = 0.2 + 0.55 * Math.abs(Math.sin(m.phase));
    aCtx.beginPath();
    aCtx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    aCtx.fillStyle = `rgba(255, 224, 150, ${alpha})`;
    aCtx.fill();
  });
  requestAnimationFrame(animateMotes);
}

function spawnSparkBurst(x, y, count = 70) {
  const cols = ["#ffe6ad", "#f7c873", "#f29f6d", "#ffffff", "#ffba7a"];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = Math.random() * 7 + 1.8;
    sparks.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 2.2,
      size: Math.random() * 3.2 + 1.2,
      color: cols[Math.floor(Math.random() * cols.length)],
      life: 65 + Math.random() * 35
    });
  }
}

// Delicate golden sparkler cursor trail
let lastTrail = 0;
window.addEventListener("mousemove", (e) => {
  const now = performance.now();
  if (now - lastTrail < 28) return;
  lastTrail = now;
  sparks.push({
    x: e.clientX,
    y: e.clientY,
    vx: (Math.random() - 0.5) * 1.4,
    vy: (Math.random() - 0.5) * 1.4 - 0.4,
    size: Math.random() * 2.2 + 0.9,
    color: Math.random() > 0.4 ? "#ffe6ad" : "#f29f6d",
    life: 28
  });
});

function animateSparks() {
  sCtx.clearRect(0, 0, spkCanvas.width, spkCanvas.height);
  sparks = sparks.filter((p) => p.life > 0);
  sparks.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.vx *= 0.98;
    p.life--;
    sCtx.beginPath();
    sCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    sCtx.fillStyle = p.color;
    sCtx.globalAlpha = Math.max(0, p.life / 45);
    sCtx.fill();
  });
  sCtx.globalAlpha = 1;
  requestAnimationFrame(animateSparks);
}

document.getElementById("sparkleBurstBtn").addEventListener("click", () => {
  spawnSparkBurst(window.innerWidth * 0.3, window.innerHeight * 0.45, 75);
  spawnSparkBurst(window.innerWidth * 0.7, window.innerHeight * 0.45, 75);
});

window.addEventListener("resize", resizeCanvases);
resizeCanvases();
animateMotes();
animateSparks();
