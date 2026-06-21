// Web Audio API Synthesizer for Gesture Arena
// Provides latency-free retro-arcade sounds without requiring static audio files.

class AudioManager {
  private ctx: AudioContext | null = null;
  private mainVolumeNode: GainNode | null = null;
  private musicVolumeNode: GainNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.5;
  private musicInterval: any = null;

  constructor() {
    // AudioContext will be initialized on first user interaction due to browser autoplay policies
  }

  private init() {
    if (this.ctx) return;
    
    // Support standard and webkit audio context
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();
    
    // Main volume control
    this.mainVolumeNode = this.ctx.createGain();
    this.mainVolumeNode.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    this.mainVolumeNode.connect(this.ctx.destination);

    // Background music volume control
    this.musicVolumeNode = this.ctx.createGain();
    this.musicVolumeNode.gain.setValueAtTime(this.isMuted ? 0 : this.volume * 0.25, this.ctx.currentTime);
    this.musicVolumeNode.connect(this.ctx.destination);
  }

  public setSettings(isMuted: boolean, volume: number) {
    this.isMuted = isMuted;
    this.volume = volume;

    if (!this.ctx) return;

    const targetSFXVolume = isMuted ? 0 : volume;
    const targetMusicVolume = isMuted ? 0 : volume * 0.22;

    if (this.mainVolumeNode && this.ctx) {
      this.mainVolumeNode.gain.linearRampToValueAtTime(targetSFXVolume, this.ctx.currentTime + 0.1);
    }
    if (this.musicVolumeNode && this.ctx) {
      this.musicVolumeNode.gain.linearRampToValueAtTime(targetMusicVolume, this.ctx.currentTime + 0.1);
    }
  }

  public resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play a soft tactile click/pop for UI buttons
  public playClick() {
    this.resume();
    if (!this.ctx || !this.mainVolumeNode || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    // Fast frequency sweep down creates a satisfying "pop"
    osc.frequency.setValueAtTime(1000, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.mainVolumeNode);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  // Generates 1 second of white noise for sound synthesis
  private getNoiseBuffer(): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext not initialized');
    const bufferSize = this.ctx.sampleRate * 1.0; 
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // Play a noise-synthesized swoosh for hand slashing
  public playSlash() {
    this.resume();
    if (!this.ctx || !this.mainVolumeNode || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer();

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(1800, now + 0.1);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.25);
      filter.Q.setValueAtTime(4.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.03); 
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.22);
      
      oscGain.gain.setValueAtTime(0, now);
      oscGain.gain.linearRampToValueAtTime(0.08, now + 0.03);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.mainVolumeNode);

      osc.connect(oscGain);
      oscGain.connect(this.mainVolumeNode);

      noise.start(now);
      noise.stop(now + 0.28);
      
      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {
      console.error('Failed to play synthesized slash sound:', e);
    }
  }

  // Play a squishy wet impact for fruit slicing
  public playSplat() {
    this.resume();
    if (!this.ctx || !this.mainVolumeNode || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;

      const noise = this.ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer();

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.15);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.linearRampToValueAtTime(300, now + 0.1);

      oscGain.gain.setValueAtTime(0.12, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.mainVolumeNode);

      osc.connect(oscGain);
      oscGain.connect(this.mainVolumeNode);

      noise.start(now);
      noise.stop(now + 0.18);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {
      console.error('Failed to play synthesized splat sound:', e);
    }
  }

  // Play a booming rumble for bomb detonation
  public playExplosion() {
    this.resume();
    if (!this.ctx || !this.mainVolumeNode || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;

      const noise = this.ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer();

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(250, now);
      filter.frequency.exponentialRampToValueAtTime(40, now + 0.8);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.6, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.6);

      const oscFilter = this.ctx.createBiquadFilter();
      oscFilter.type = 'lowpass';
      oscFilter.frequency.setValueAtTime(150, now);

      oscGain.gain.setValueAtTime(0.5, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.mainVolumeNode);

      osc.connect(oscFilter);
      oscFilter.connect(oscGain);
      oscGain.connect(this.mainVolumeNode);

      noise.start(now);
      noise.stop(now + 1.0);

      osc.start(now);
      osc.stop(now + 0.85);
    } catch (e) {
      console.error('Failed to play synthesized explosion sound:', e);
    }
  }

  // Play an ascending major arpeggio for a correct gesture hit
  public playSuccess() {
    this.resume();
    if (!this.ctx || !this.mainVolumeNode || this.isMuted) return;

    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.mainVolumeNode) return;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      
      // Add subtle vibraphone-like pitch bend
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.01, now + idx * 0.06 + 0.12);

      gain.gain.setValueAtTime(0, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);

      osc.connect(gain);
      gain.connect(this.mainVolumeNode);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.3);
    });
  }

  // Play a de-tuned descending buzz for a failure/wrong gesture
  public playFailure() {
    this.resume();
    if (!this.ctx || !this.mainVolumeNode || this.isMuted) return;

    const now = this.ctx.currentTime;
    
    // Create two slightly detuned oscillators for a richer "buzz"
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    
    osc1.frequency.setValueAtTime(150, now);
    osc1.frequency.linearRampToValueAtTime(80, now + 0.25);
    
    osc2.frequency.setValueAtTime(147, now);
    osc2.frequency.linearRampToValueAtTime(78, now + 0.25);

    // Lowpass filter to sweep out the harsh high frequencies
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.25);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.mainVolumeNode);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  }

  // Play a high-pitched glittering chime for a combo level-up
  public playCombo() {
    this.resume();
    if (!this.ctx || !this.mainVolumeNode || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.15); // A6

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, now); // E6
    osc2.frequency.exponentialRampToValueAtTime(2637.02, now + 0.15); // E7

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.mainVolumeNode);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.45);
    osc2.stop(now + 0.45);
  }

  // Play a dramatic sad synth chord sequence for Game Over
  public playGameOver() {
    this.resume();
    if (!this.ctx || !this.mainVolumeNode || this.isMuted) return;

    const now = this.ctx.currentTime;
    // A minor descending arpeggio with retro synth filter sweep
    const notes = [440, 392, 349.23, 293.66, 220]; // A4, G4, F4, D4, A3
    
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.mainVolumeNode) return;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, now + idx * 0.12);
      filter.frequency.exponentialRampToValueAtTime(100, now + idx * 0.12 + 0.5);

      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.12 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.6);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.mainVolumeNode);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.7);
    });
  }

  // Periodically plays a ambient chord sequence for background music
  public startBackgroundMusic() {
    this.resume();
    this.stopBackgroundMusic(); // avoid multiple intervals
    
    if (!this.ctx || !this.musicVolumeNode) return;

    const progressions = [
      [110.00, 220.00, 261.63, 329.63, 392.00], // Am7: A2, A3, C4, E4, G4
      [87.31, 174.61, 261.63, 329.63, 349.23],  // Fmaj7: F2, F3, C4, E4, F4
      [130.81, 261.63, 293.66, 329.63, 392.00], // Cmaj9: C3, C4, D4, E4, G4
      [98.00, 196.00, 293.66, 392.00, 440.00],  // Gadd9: G2, G3, D4, G4, A4
    ];

    let chordIndex = 0;
    
    const playChord = () => {
      if (!this.ctx || !this.musicVolumeNode || this.isMuted) return;
      const now = this.ctx.currentTime;
      const chord = progressions[chordIndex];
      
      chord.forEach((freq) => {
        if (!this.ctx || !this.musicVolumeNode) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        // Warm triangle wave for soft ambient sound
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        // Low pass filter to make it soft and warm
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);
        
        // Soft attack and slow decay
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 1.5);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.8);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicVolumeNode);

        osc.start(now);
        osc.stop(now + 5.0);
      });

      chordIndex = (chordIndex + 1) % progressions.length;
    };

    // Play immediately
    playChord();
    
    // Play every 5 seconds
    this.musicInterval = setInterval(playChord, 5000);
  }

  public stopBackgroundMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const audioManager = new AudioManager();
export default audioManager;
