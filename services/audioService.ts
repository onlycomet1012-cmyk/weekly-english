// Singleton AudioContext to avoid hitting mobile browser limits
let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
    }
  }
  return audioCtx;
};

// Call this on user interaction (e.g. click) to unlock audio on iOS
export const resumeAudioContext = () => {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(e => console.error("Audio resume failed", e));
  }
};

// Simple synth sounds to avoid external dependencies
export const playSuccessSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  const now = ctx.currentTime;

  // Helper to play a bell-like note
  const playNote = (freq: number, startTime: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine'; // Sine wave for a pure bell tone
    osc.frequency.setValueAtTime(freq, startTime);

    // Envelope for bell sound: fast attack, exponential decay
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02); // Quick attack
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // Long decay

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  // Play "Ding" (High Note, e.g., E5)
  playNote(659.25, now, 0.8);

  // Play "Dong" (Lower Note, e.g., C5) slightly later
  playNote(523.25, now + 0.25, 1.2);
};

export const playErrorSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.2);

  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.3);
};

export const playVictorySound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  const playNote = (freq: number, startTime: number, duration: number, type: OscillatorType = 'triangle') => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  // C Major Arpeggio fanfare
  playNote(523.25, now, 0.2);       // C5
  playNote(659.25, now + 0.15, 0.2); // E5
  playNote(783.99, now + 0.30, 0.2); // G5
  playNote(1046.50, now + 0.45, 0.8, 'sine'); // C6 (Long)
  
  // Confetti sound (noise burst)
  const bufferSize = ctx.sampleRate * 1; 
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.1, now + 0.45);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
  noise.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now + 0.45);
};

export const speakText = (text: string, rate: number = 0.9) => {
  if (!('speechSynthesis' in window)) return;
  
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate; 
  
  // Try to find a good English voice
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || 
                         voices.find(v => v.lang.startsWith('en'));
  
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  window.speechSynthesis.speak(utterance);
};