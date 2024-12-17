import * as THREE from "three";
import { camera } from "../main";

let cameraShakeTime = 0;
let originalCameraRotation = new THREE.Euler();

export function triggerCameraShake() {
  if (cameraShakeTime <= 0) {
    originalCameraRotation.copy(camera.rotation);
  }
  cameraShakeTime = 0.9;
}

export function updateCameraShake(deltaTime: number, camera: THREE.Camera) {
  if (cameraShakeTime > 0) {
    const shakeIntensity = cameraShakeTime * 0.05;
    camera.rotation.x =
      originalCameraRotation.x + (Math.random() - 0.5) * shakeIntensity;
    camera.rotation.y =
      originalCameraRotation.y + (Math.random() - 0.5) * shakeIntensity;
    camera.rotation.z =
      originalCameraRotation.z + (Math.random() - 0.5) * shakeIntensity;

    cameraShakeTime -= deltaTime;

    if (cameraShakeTime <= 0) {
      camera.rotation.copy(originalCameraRotation);
    }
  }
}
