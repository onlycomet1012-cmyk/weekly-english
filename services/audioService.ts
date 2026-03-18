// Singleton AudioContext to avoid hitting mobile browser limits
let audioCtx: AudioContext | null = null;
let bgmInterval: any = null;
let nextNoteTime = 0;
let beatCount = 0;

// Distortion Curve Cache
let distortionCurve: Float32Array | null = null;

export type BgmTheme = 'DEFAULT' | 'FIRE' | 'ICE' | 'LIGHTNING' | 'WIND';
let currentTheme: BgmTheme = 'DEFAULT';
let isMuted = false;

export const toggleMute = () => {
    isMuted = !isMuted;
    if (isMuted) {
        stopBGM();
        window.speechSynthesis?.cancel();
    } else {
        startBGM();
    }
    return isMuted;
};

export const getIsMuted = () => isMuted;

// UNIFIED ROCK TEMPO (132 BPM - Driving Energy)
const BPM = 132;
const THEME_TEMPOS: Record<BgmTheme, number> = {
    DEFAULT: BPM, FIRE: BPM, ICE: BPM, LIGHTNING: BPM, WIND: BPM
};

const LOOKAHEAD = 25.0; // ms
const SCHEDULE_AHEAD_TIME = 0.1; // sec

// 5 Minutes Loop Logic (approx 132BPM * 5min / 4 beats = ~165 bars)
const MAX_BARS = 164; 

const getAudioContext = () => {
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
    }
  }
  return audioCtx;
};

export const resumeAudioContext = () => {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(e => console.error("Audio resume failed", e));
  }
};

export const setBgmTheme = (theme: BgmTheme) => {
    if (currentTheme !== theme) {
        currentTheme = theme;
    }
};

// ==========================================
// AUDIO UTILS
// ==========================================

const getDistortionCurve = (amount: number = 50) => {
    if (distortionCurve) return distortionCurve;
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
        const x = i * 2 / n_samples - 1;
        curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
    }
    distortionCurve = curve;
    return curve;
};

// ==========================================
// ROCK INSTRUMENTS
// ==========================================

const playRockKick = (time: number, vol = 1.0) => {
    if (!audioCtx || isMuted) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    // Punchy attack
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
    
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(time); osc.stop(time + 0.3);
};

const playRockSnare = (time: number, vol = 0.8) => {
    if (!audioCtx || isMuted) return;
    // 1. Tonal body
    const osc = audioCtx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(250, time);
    const oscGain = audioCtx.createGain();
    oscGain.gain.setValueAtTime(vol * 0.5, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    
    // 2. Noise snap
    const bufferSize = audioCtx.sampleRate * 0.2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;
    
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(vol, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    
    osc.connect(oscGain); oscGain.connect(audioCtx.destination);
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(audioCtx.destination);
    
    osc.start(time); osc.stop(time + 0.2);
    noise.start(time);
};

const playHiHat = (time: number, open = false, vol = 0.3) => {
    if (!audioCtx || isMuted) return;
    const bufferSize = audioCtx.sampleRate * (open ? 0.3 : 0.05);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    
    const noise = audioCtx.createBufferSource(); noise.buffer = buffer;
    const filter = audioCtx.createBiquadFilter(); 
    filter.type = 'highpass'; filter.frequency.value = 8000;
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + (open ? 0.2 : 0.05));
    
    noise.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
    noise.start(time);
};

// SIMULATED ELECTRIC GUITAR (Power Chords)
const playDistortedGuitar = (rootFreq: number, time: number, duration: number, vol = 0.3) => {
    if (!audioCtx || isMuted) return;
    
    const masterGain = audioCtx.createGain();
    masterGain.gain.value = vol;
    
    // Distortion Stage
    const shaper = audioCtx.createWaveShaper();
    shaper.curve = getDistortionCurve(400); // Heavy distortion
    shaper.oversample = '4x';
    
    // Cabinet Simulation (Lowpass)
    const cabFilter = audioCtx.createBiquadFilter();
    cabFilter.type = 'lowpass';
    cabFilter.frequency.value = 3000;

    // Oscillators (Root + Fifth + Octave)
    const freqs = [rootFreq, rootFreq * 1.5, rootFreq * 2];
    
    freqs.forEach((f, i) => {
        const osc = audioCtx!.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = f;
        // Slight detune for thickness
        if (i === 0) osc.detune.value = -5;
        if (i === 1) osc.detune.value = 5;

        const oscGain = audioCtx!.createGain();
        oscGain.gain.setValueAtTime(0.5, time);
        // Palm mute effect: Short decay if duration is short
        const release = duration > 0.2 ? duration : 0.1;
        oscGain.gain.exponentialRampToValueAtTime(0.01, time + release);

        osc.connect(oscGain);
        oscGain.connect(shaper);
        osc.start(time);
        osc.stop(time + release);
    });

    shaper.connect(cabFilter);
    cabFilter.connect(masterGain);
    masterGain.connect(audioCtx.destination);
};

const playRockBass = (freq: number, time: number, duration: number, vol = 0.5) => {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    osc.type = 'sawtooth'; // Sawtooth for grit
    osc.frequency.value = freq;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(200, time + 0.1); // Pluck effect
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
    
    osc.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
    osc.start(time); osc.stop(time + duration);
};

const playLeadSynth = (freq: number, time: number, duration: number, theme: BgmTheme) => {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    // Theme-based timbre modification
    switch (theme) {
        case 'FIRE': 
            osc.type = 'sawtooth'; // Harsh
            filter.type = 'bandpass';
            filter.Q.value = 2;
            break;
        case 'ICE':
            osc.type = 'square'; // Hollow
            filter.type = 'lowpass';
            break;
        case 'LIGHTNING':
            osc.type = 'sawtooth';
            // Simple FM
            const lfo = audioCtx.createOscillator();
            lfo.frequency.value = 50;
            const lfoGain = audioCtx.createGain();
            lfoGain.gain.value = 500;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start(time); lfo.stop(time + duration);
            filter.type = 'highpass';
            break;
        case 'WIND':
            osc.type = 'triangle'; // Smooth
            filter.type = 'lowpass';
            break;
        default:
            osc.type = 'square'; // Classic
            filter.type = 'lowpass';
            break;
    }
    
    osc.frequency.setValueAtTime(freq, time);
    // Slide/Legato effect
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.05);

    filter.frequency.setValueAtTime(2000, time);
    
    gain.gain.setValueAtTime(0.15, time);
    gain.gain.linearRampToValueAtTime(0.1, time + duration * 0.8);
    gain.gain.linearRampToValueAtTime(0, time + duration);
    
    osc.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
    osc.start(time); osc.stop(time + duration);
};

// ==========================================
// 5-MINUTE ELECTRONIC ROCK COMPOSITION
// ==========================================

// Scales (E Minor Pentatonic / Natural Minor)
const NOTE_E2 = 82.41;
const NOTE_G2 = 98.00;
const NOTE_A2 = 110.00;
const NOTE_B2 = 123.47;
const NOTE_D3 = 146.83;
const NOTE_E3 = 164.81;
const NOTE_G3 = 196.00;
const NOTE_A3 = 220.00;
const NOTE_B3 = 246.94;
const NOTE_D4 = 293.66;
const NOTE_E4 = 329.63;

const scheduler = () => {
    if (!audioCtx) return;
    const tempo = THEME_TEMPOS['DEFAULT']; // Unified Tempo
    const secondsPerStep = 60.0 / tempo / 4; // 16th note

    while (nextNoteTime < audioCtx.currentTime + SCHEDULE_AHEAD_TIME) {
        scheduleElectronicRock(beatCount, nextNoteTime, secondsPerStep);
        nextNoteTime += secondsPerStep;
        beatCount++; 
    }
};

const scheduleElectronicRock = (totalStep: number, time: number, stepDur: number) => {
    // 16 steps per bar
    const bar = Math.floor(totalStep / 16) % MAX_BARS;
    const step = totalStep % 16;
    
    // === SONG STRUCTURE ===
    // 0-16: Intro (Synth Arp building)
    // 16-32: Verse 1 (Bass + Drums + Light Guitar)
    // 32-48: Pre-Chorus (Rising tension)
    // 48-64: Chorus 1 (Full Power)
    // 64-80: Verse 2 (Variation)
    // 80-96: Chorus 2
    // 96-120: Bridge (Atmospheric, Breakdown)
    // 120-136: Solo (High energy lead)
    // 136-152: Final Chorus (Max intensity)
    // 152-164: Outro (Fade out)

    const isChorus = (bar >= 48 && bar < 64) || (bar >= 80 && bar < 96) || (bar >= 136 && bar < 152);
    const isBridge = (bar >= 96 && bar < 120);
    const isSolo = (bar >= 120 && bar < 136);
    const isIntro = (bar < 16);
    const isOutro = (bar >= 152);
    const isVerse = !isChorus && !isBridge && !isSolo && !isIntro && !isOutro;

    // --- DRUMS ---
    if (!isIntro && !isOutro) {
        // KICK
        if (step === 0 || step === 10) playRockKick(time);
        if (isChorus && step === 2) playRockKick(time); // More driving kick in chorus
        
        // SNARE
        if (step === 4 || step === 12) {
             // Heavier snare in chorus
             playRockSnare(time, isChorus ? 1.0 : 0.7);
        }
        
        // HI-HAT
        if (step % 2 === 0) playHiHat(time, step === 2 || step === 14, 0.2); // Open hat accents
        if (isSolo || isChorus) {
            if (step % 2 !== 0) playHiHat(time, false, 0.1); // 16th notes in intense parts
        }
    } else if (isIntro && bar > 8) {
        // Intro build up drums
        if (step % 4 === 0) playRockKick(time);
    }

    // --- BASS ---
    // Root notes progression: E - G - A - C/D
    let root = NOTE_E2;
    if (bar % 8 >= 4) root = NOTE_G2; // Change chord
    if (bar % 8 >= 6) root = NOTE_A2;

    if (!isIntro && !isOutro) {
        if (isChorus) {
             // Straight 8ths driving bass
             if (step % 2 === 0) playRockBass(root, time, stepDur * 2);
        } else if (isVerse) {
             // Funky/Rhythmic bass
             if (step === 0 || step === 3 || step === 6 || step === 10) playRockBass(root, time, stepDur);
        } else if (isBridge) {
             // Long sustained bass
             if (step === 0) playRockBass(root / 2, time, stepDur * 16);
        }
    }

    // --- GUITAR (Power Chords) ---
    if (isChorus || isSolo || (isVerse && bar % 2 === 1)) {
        // Chord progression logic
        let chordRoot = NOTE_E3;
        if (bar % 4 === 1) chordRoot = NOTE_G3;
        if (bar % 4 === 2) chordRoot = NOTE_A3;
        if (bar % 4 === 3) chordRoot = NOTE_D3; // Turnaround

        if (isChorus) {
            // Sustained chords
            if (step === 0) playDistortedGuitar(chordRoot, time, stepDur * 8);
            if (step === 8) playDistortedGuitar(chordRoot, time, stepDur * 8); // Restrum
        } else if (isVerse) {
            // Palm mutes (Chugs)
            if (step === 0 || step === 2 || step === 4) playDistortedGuitar(chordRoot, time, stepDur * 0.5, 0.2);
        }
    }

    // --- LEAD SYNTH / SOLO ---
    // Use currentTheme to color the solo
    if (isSolo || (isChorus && step % 4 === 0)) {
        // Solo Scale: E Minor Pentatonic
        const scale = [NOTE_E4, NOTE_G4, NOTE_A4, NOTE_B4, NOTE_D5, NOTE_E5];
        
        // Procedural melody based on bar hash to keep it consistent but pseudo-random
        const seed = (bar * 16 + step) * 9301 + 49297;
        const rnd = (seed % 233280) / 233280;

        if (step % 2 === 0 && rnd > 0.3) {
            const noteIdx = Math.floor(rnd * scale.length);
            // Higher octave for solo
            const note = scale[noteIdx] * (isSolo ? 1.5 : 1); 
            playLeadSynth(note, time, stepDur * 2, currentTheme);
        }
    }

    // --- ARPEGGIATOR (Background texture) ---
    if (isIntro || isBridge || isOutro) {
        if (step % 2 === 0) {
            const arpNotes = [NOTE_E3, NOTE_G3, NOTE_B3, NOTE_E4];
            // Up and down pattern
            const idx = (step / 2) % 4;
            playLeadSynth(arpNotes[idx], time, stepDur, 'DEFAULT');
        }
    }
};

// Helper constants for solo
const NOTE_G4 = 392.00;
const NOTE_A4 = 440.00;
const NOTE_B4 = 493.88;
const NOTE_D5 = 587.33;
const NOTE_E5 = 659.25;

export const startBGM = () => {
    if (isMuted) return;
    resumeAudioContext();
    const ctx = getAudioContext();
    if (!ctx) return;
    
    if (ctx.state === 'suspended') {
        ctx.resume();
    }
    
    if (bgmInterval) clearInterval(bgmInterval);
    
    nextNoteTime = ctx.currentTime + 0.1;
    beatCount = 0; // Always start from beginning for the full 5-min journey
    
    bgmInterval = setInterval(scheduler, LOOKAHEAD);
};

export const stopBGM = () => {
    if (bgmInterval) {
        clearInterval(bgmInterval);
        bgmInterval = null;
    }
};

// ==========================================
// SFX (Existing)
// ==========================================

export const playSuccessSound = () => {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const playNote = (freq: number, startTime: number, duration: number) => {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(startTime); osc.stop(startTime + duration);
  };
  playNote(659.25, now, 0.8);
  playNote(523.25, now + 0.25, 1.2);
};

export const playErrorSound = () => {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator(); const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.2);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + 0.3);
};

export const playVictorySound = () => {
  stopBGM(); 
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const playNote = (freq: number, startTime: number, duration: number, type: OscillatorType = 'triangle') => {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(startTime); osc.stop(startTime + duration);
  };
  playNote(523.25, now, 0.2);
  playNote(659.25, now + 0.15, 0.2);
  playNote(783.99, now + 0.30, 0.2);
  playNote(1046.50, now + 0.45, 0.8, 'sine');
  
  const bufferSize = ctx.sampleRate * 1; 
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource(); noise.buffer = buffer;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.1, now + 0.45);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
  noise.connect(noiseGain); noiseGain.connect(ctx.destination);
  noise.start(now + 0.45);
};

export const playShootSound = () => {
  if (isMuted) return;
  const ctx = getAudioContext(); if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator(); const gain = ctx.createGain();
  osc.type = 'square'; osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
  gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(now); osc.stop(now + 0.1);
};

export const playHitSound = () => {
  if (isMuted) return;
  const ctx = getAudioContext(); if (!ctx) return;
  const t = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 0.1;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource(); noise.buffer = buffer;
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1000, t); filter.frequency.linearRampToValueAtTime(100, t + 0.1);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.2, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  noise.start(t);
};

export const playHealSound = () => {
    if (isMuted) return;
    const ctx = getAudioContext(); if (!ctx) return;
    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; 
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator(); osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.05);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, t + i * 0.05);
        gain.gain.linearRampToValueAtTime(0.1, t + i * 0.05 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.3);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(t + i * 0.05); osc.stop(t + i * 0.05 + 0.3);
    });
};

export const speakText = (text: string, rate: number = 1.0) => {
  if (!('speechSynthesis' in window) || isMuted) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US'; utterance.rate = rate; utterance.pitch = 1.15; 
  const voices = window.speechSynthesis.getVoices();
  const preferredNames = ['Samantha', 'Google US English', 'Zira', 'Jenny', 'Susan', 'Vicki', 'Kathy'];
  const femaleVoice = voices.find(v => preferredNames.some(name => v.name.includes(name)) && v.lang.startsWith('en'));
  const fallbackVoice = voices.find(v => v.lang.startsWith('en'));
  if (femaleVoice) { utterance.voice = femaleVoice; } else if (fallbackVoice) { utterance.voice = fallbackVoice; }
  window.speechSynthesis.speak(utterance);
};

// ==========================================
// ELEMENTAL HIT SOUNDS
// ==========================================

export const playFireHitSound = () => {
  if (isMuted) return;
  const ctx = getAudioContext(); if (!ctx) return;
  const t = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 0.3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource(); noise.buffer = buffer;
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, t); filter.frequency.exponentialRampToValueAtTime(50, t + 0.25);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
  noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  noise.start(t);
};

export const playIceHitSound = () => {
    if (isMuted) return;
    const ctx = getAudioContext(); if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator(); osc.type = 'triangle'; 
    osc.frequency.setValueAtTime(2200, t); osc.frequency.exponentialRampToValueAtTime(1500, t + 0.15);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.15);
};

export const playLightningHitSound = () => {
    if (isMuted) return;
    const ctx = getAudioContext(); if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, t); osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    const filter = ctx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 800;
    osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.15);
};

export const playWindHitSound = () => {
    if (isMuted) return;
    const ctx = getAudioContext(); if (!ctx) return;
    const t = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buffer;
    const filter = ctx.createBiquadFilter(); filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, t); filter.frequency.linearRampToValueAtTime(1200, t + 0.2); 
    filter.Q.value = 2; 
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    noise.start(t);
};

export const playFireShootSound = () => {
    if (isMuted) return;
    const ctx = getAudioContext(); if (!ctx) return;
    const t = ctx.currentTime;
    // Fire: A low, whooshing burst
    const bufferSize = ctx.sampleRate * 0.25;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0); 
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    
    const noise = ctx.createBufferSource(); noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter(); 
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, t); 
    filter.frequency.exponentialRampToValueAtTime(50, t + 0.25);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, t); 
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
    
    noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    noise.start(t);
};

export const playIceShootSound = () => {
    if (isMuted) return;
    const ctx = getAudioContext(); if (!ctx) return;
    const t = ctx.currentTime;
    // Ice: A sharp, high-pitched crystalline tinkle
    const osc1 = ctx.createOscillator(); osc1.type = 'sine';
    const osc2 = ctx.createOscillator(); osc2.type = 'triangle';
    
    osc1.frequency.setValueAtTime(2000, t); 
    osc1.frequency.exponentialRampToValueAtTime(3000, t + 0.1);
    
    osc2.frequency.setValueAtTime(2500, t);
    osc2.frequency.exponentialRampToValueAtTime(4000, t + 0.15);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, t); 
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    
    osc1.connect(gain); osc2.connect(gain); gain.connect(ctx.destination);
    osc1.start(t); osc1.stop(t + 0.15);
    osc2.start(t); osc2.stop(t + 0.15);
};

export const playLightningShootSound = () => {
    if (isMuted) return;
    const ctx = getAudioContext(); if (!ctx) return;
    const t = ctx.currentTime;
    // Lightning: A sharp, crackling zap
    const osc = ctx.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2000, t); 
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
    
    // Add some noise for the crackle
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0); 
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    const noise = ctx.createBufferSource(); noise.buffer = buffer;
    
    const noiseFilter = ctx.createBiquadFilter(); 
    noiseFilter.type = 'highpass'; 
    noiseFilter.frequency.value = 3000;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, t); 
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    
    osc.connect(gain);
    noise.connect(noiseFilter); noiseFilter.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(t); osc.stop(t + 0.1);
    noise.start(t);
};

export const playWindShootSound = () => {
    if (isMuted) return;
    const ctx = getAudioContext(); if (!ctx) return;
    const t = ctx.currentTime;
    // Wind: A quick, airy swoosh
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0); 
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    
    const noise = ctx.createBufferSource(); noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter(); 
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, t); 
    filter.frequency.exponentialRampToValueAtTime(1200, t + 0.2);
    filter.Q.value = 1.5;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, t); 
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    
    noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    noise.start(t);
};