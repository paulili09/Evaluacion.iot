/**
 * Generador de sonido de relé mecánico físico y respuesta háptica.
 * Proporciona la sensación táctil y sonora de "click" de interruptor real
 * cada vez que el usuario presiona una luminaria o botón Bluetooth.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

const SOUND_STORAGE_KEY = 'lumi_sound_alerts';

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(SOUND_STORAGE_KEY) !== 'false';
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
  }
}

export function playRelayClick(isTurnOn: boolean = true) {
  try {
    if (!isSoundEnabled()) return;

    // Vibración háptica en celulares Android
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(isTurnOn ? [30, 20, 25] : [20]);
    }

    const ctx = getAudioContext();
    if (!ctx) return;

    // Doble chasquido electromagnético característico de relés de estado sólido / mecánicos de ESP32
    const now = ctx.currentTime;

    // Click 1: Impacto de la bobina
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = isTurnOn ? 'triangle' : 'sine';
    osc1.frequency.setValueAtTime(isTurnOn ? 980 : 650, now);
    osc1.frequency.exponentialRampToValueAtTime(140, now + 0.035);

    gain1.gain.setValueAtTime(0.28, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.035);

    // Click 2: Rebote mecánico de contacto (8ms después)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(isTurnOn ? 1400 : 900, now + 0.008);
    osc2.frequency.exponentialRampToValueAtTime(220, now + 0.042);

    gain2.gain.setValueAtTime(0.18, now + 0.008);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.042);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.008);
    osc2.stop(now + 0.042);
  } catch (err) {
    // Fallback silencioso si el audio está bloqueado por permisos del navegador
  }
}
