import * as THREE from "three";
import { loadingManager } from "./loadingManager";

export const audioLoader = new THREE.AudioLoader(loadingManager);
export const listener = new THREE.AudioListener();

export let breakSound: AudioBuffer | undefined;
export let wooshSound: AudioBuffer | undefined;
export let crashSound: THREE.Audio;
export let musicSound: THREE.Audio;
export let analyser: THREE.AudioAnalyser | undefined;

audioLoader.load("/audio/glass-shatter.mp3", (buffer) => {
  breakSound = buffer;
});

audioLoader.load("/audio/ball-throw.mp3", (buffer) => {
  wooshSound = buffer;
});

audioLoader.load("/audio/crash.mp3", (buffer) => {
  crashSound = new THREE.Audio(listener);
  crashSound.setBuffer(buffer);
  crashSound.setVolume(0.8);
});

audioLoader.load("/audio/music.mp3", (buffer) => {
  musicSound = new THREE.Audio(listener);
  musicSound.setBuffer(buffer);
  musicSound.setLoop(true);
  musicSound.setVolume(0.8);
  musicSound.play();

  analyser = new THREE.AudioAnalyser(musicSound, 256);
});

export function playBreakSound(object: THREE.Mesh) {
  if (breakSound) {
    const sound = new THREE.Audio(listener);
    sound.setBuffer(breakSound);
    sound.setVolume(1);
    object.add(sound);
    sound.play();
  }
}

export function playWooshSound() {
  if (wooshSound) {
    const sound = new THREE.Audio(listener);
    sound.setBuffer(wooshSound);
    sound.setVolume(0.8);
    sound.play();
  }
}

export function playCrashSound() {
  if (crashSound) {
    crashSound.stop();
    crashSound.play();
  }
}
