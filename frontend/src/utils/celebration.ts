import confetti from 'canvas-confetti';

/**
 * Plays a pleasant, professional UPI payment success chime using Web Audio API.
 */
export const playSuccessChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    
    const notes = [
      { freq: 523.25, time: 0, duration: 0.15 },    // C5
      { freq: 659.25, time: 0.1, duration: 0.18 },   // E5
      { freq: 783.99, time: 0.2, duration: 0.22 },   // G5
      { freq: 1046.50, time: 0.32, duration: 0.45 },  // C6
    ];

    notes.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0.001, now + time);
      gain.gain.linearRampToValueAtTime(0.3, now + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + duration + 0.05);
    });
  } catch (e) {
    console.warn('Audio chime notification failed:', e);
  }
};

/**
 * Triggers a crisp 1-second flower shower (फूलों की बारिश) on payment verification.
 */
export const triggerFlowerShowerCelebration = (durationMs: number = 1000) => {
  try {
    playSuccessChime();

    // 1. Initial central flower & petal burst
    confetti({
      particleCount: 50,
      spread: 90,
      origin: { y: 0.6, x: 0.5 },
      colors: ['#FF69B4', '#FF1493', '#F43F5E', '#FB7185', '#FBBF24', '#10B981', '#F59E0B'],
      ticks: 120,
      gravity: 0.9,
      scalar: 1.2,
      shapes: ['circle', 'square'],
    });

    // 2. Soft flower rain for exactly 1 second (1000ms)
    const end = Date.now() + durationMs;
    const flowerColors = ['#FF69B4', '#FF1493', '#F43F5E', '#FB7185', '#FBBF24', '#FFA500', '#EC4899'];

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 90,
        spread: 120,
        origin: { x: Math.random(), y: -0.05 },
        colors: flowerColors,
        gravity: 0.8,
        scalar: 1.3,
        ticks: 120,
        drift: Math.random() - 0.5,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  } catch (err) {
    console.warn('Celebration confetti failed:', err);
  }
};
