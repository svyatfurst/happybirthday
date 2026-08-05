export class AudioManager {
  constructor(soundConfig) {
    this.config = soundConfig;
    this.muted = false;
    this.unlocked = false;
    this.unlockPromise = null;
    this.loopPlayers = new Map();
    this.requestedLoops = new Set();
    this.fadeFrames = new Map();

    for (const [id, config] of Object.entries(soundConfig)) {
      if (!config.loop) continue;
      const audio = this.#makeAudio(config);
      audio.loop = true;
      this.loopPlayers.set(id, audio);
    }
  }

  #makeAudio(config) {
    const audio = new Audio(config.src);
    audio.preload = 'auto';
    audio.volume = this.muted ? 0 : (config.volume ?? 1);
    audio.playbackRate = config.playbackRate ?? 1;
    return audio;
  }

  /**
   * Browsers normally allow audio only after a user gesture. We unlock it on
   * pointer-down without blocking the drag itself. A temporary probe is used,
   * so it cannot accidentally pause the real spin loop during the first drag.
   */
  unlock() {
    if (this.unlocked) return Promise.resolve();
    if (this.unlockPromise) return this.unlockPromise;

    const firstLoopEntry = Object.entries(this.config).find(([, config]) => config.loop);
    if (!firstLoopEntry) {
      this.unlocked = true;
      return Promise.resolve();
    }

    const [, config] = firstLoopEntry;
    const probe = this.#makeAudio({ ...config, volume: 0 });
    probe.loop = false;
    probe.volume = 0;

    this.unlockPromise = probe.play()
      .then(() => {
        probe.pause();
        probe.currentTime = 0;
        this.unlocked = true;
        this.#syncRequestedLoops();
      })
      .catch(() => {
        // A later click/drag will try again; this is normal under autoplay rules.
        this.unlockPromise = null;
      });

    return this.unlockPromise;
  }

  setMuted(value) {
    this.muted = Boolean(value);

    for (const [id, audio] of this.loopPlayers) {
      audio.volume = this.muted ? 0 : (this.config[id].volume ?? 1);
    }

    if (!this.muted) this.#syncRequestedLoops();
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  play(id) {
    const config = this.config[id];
    if (!config || this.muted) return;

    const audio = this.#makeAudio(config);
    audio.loop = false;
    audio.play().catch(() => {});
  }

  startLoop(id) {
    const audio = this.loopPlayers.get(id);
    const config = this.config[id];
    if (!audio || !config) return;

    this.requestedLoops.add(id);

    const pendingFrame = this.fadeFrames.get(id);
    if (pendingFrame) cancelAnimationFrame(pendingFrame);
    this.fadeFrames.delete(id);

    audio.volume = this.muted ? 0 : (config.volume ?? 1);
    if (!this.muted && audio.paused) audio.play().catch(() => {});
  }

  stopLoop(id, fadeMs = 150) {
    this.requestedLoops.delete(id);

    const audio = this.loopPlayers.get(id);
    const config = this.config[id];
    if (!audio || audio.paused) return;

    const pendingFrame = this.fadeFrames.get(id);
    if (pendingFrame) cancelAnimationFrame(pendingFrame);

    const startingVolume = audio.volume;
    const startedAt = performance.now();

    const fade = (now) => {
      // The loop may have been requested again before the fade finished.
      if (this.requestedLoops.has(id)) {
        audio.volume = this.muted ? 0 : (config.volume ?? 1);
        this.fadeFrames.delete(id);
        return;
      }

      const progress = Math.min(1, (now - startedAt) / fadeMs);
      audio.volume = startingVolume * (1 - progress);
      if (progress < 1) {
        this.fadeFrames.set(id, requestAnimationFrame(fade));
        return;
      }

      audio.pause();
      audio.currentTime = 0;
      audio.volume = this.muted ? 0 : (config.volume ?? 1);
      this.fadeFrames.delete(id);
    };

    this.fadeFrames.set(id, requestAnimationFrame(fade));
  }

  #syncRequestedLoops() {
    if (this.muted) return;

    for (const id of this.requestedLoops) {
      const audio = this.loopPlayers.get(id);
      const config = this.config[id];
      if (!audio || !config) continue;
      audio.volume = config.volume ?? 1;
      if (audio.paused) audio.play().catch(() => {});
    }
  }
}
