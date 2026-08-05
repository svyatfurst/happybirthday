import * as THREE from 'three';

export class MiiAnimator {
  constructor(model, clips) {
    this.mixer = new THREE.AnimationMixer(model);
    this.actions = new Map(clips.map((clip) => [clip.name, this.mixer.clipAction(clip)]));
    this.current = null;
    this.rotating = false;
    this.angry = false;

    this.mixer.addEventListener('finished', (event) => {
      if (event.action !== this.actions.get('Annoyed')) return;
      this.angry = false;
      this.#playLoop(this.rotating ? 'Happy' : 'Idle', 0.14);
    });

    this.#playLoop('Idle', 0);
  }

  #transitionTo(action, fade, restart = false) {
    if (!action) return;

    if (action === this.current) {
      if (restart) {
        action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
      }
      return;
    }

    this.current?.fadeOut(fade);
    action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).fadeIn(fade).play();
    this.current = action;
  }

  #playLoop(name, fade = 0.16) {
    const action = this.actions.get(name);
    if (!action) return;
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = false;
    this.#transitionTo(action, fade);
  }

  setRotating(value) {
    this.rotating = Boolean(value);
    if (this.angry) return;
    this.#playLoop(this.rotating ? 'Happy' : 'Idle', 0.17);
  }

  annoy() {
    const action = this.actions.get('Annoyed');
    if (!action) return;
    this.angry = true;
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    this.#transitionTo(action, 0.1, true);
  }

  update(deltaSeconds) {
    this.mixer.update(deltaSeconds);
  }
}
