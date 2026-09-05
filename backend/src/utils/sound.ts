// Web Audio API chime sound synthesizer for instant real-time notifications
export function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // Frequency sequence for a pleasant double-chime (D5 -> A5)
    const notes = [
      { freq: 587.33, duration: 0.15, delay: 0 },
      { freq: 880.00, duration: 0.25, delay: 0.12 }
    ];

    notes.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.delay);

      gain.gain.setValueAtTime(0.3, ctx.currentTime + note.delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + note.delay + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + note.delay);
      osc.stop(ctx.currentTime + note.delay + note.duration);
    });
  } catch (e) {
    console.warn('Notification sound play error:', e);
  }
}

// Distinct, energetic 3-note pop-chime alert specifically for NEW CHAT MESSAGES 💬
export function playNewMessageSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // Catchy 3-step pop tone (A5 -> E6 -> A6) with smooth exponential decay
    const notes = [
      { freq: 880.00, duration: 0.08, delay: 0, type: 'sine' as OscillatorType, vol: 0.35 },
      { freq: 1318.51, duration: 0.12, delay: 0.07, type: 'triangle' as OscillatorType, vol: 0.40 },
      { freq: 1760.00, duration: 0.20, delay: 0.15, type: 'sine' as OscillatorType, vol: 0.30 }
    ];

    notes.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = note.type;
      osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.delay);

      gain.gain.setValueAtTime(note.vol, ctx.currentTime + note.delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + note.delay + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + note.delay);
      osc.stop(ctx.currentTime + note.delay + note.duration);
    });
  } catch (e) {
    console.warn('New message sound play error:', e);
  }
}

