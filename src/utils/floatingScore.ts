import * as THREE from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FontLoader, Font } from "three/examples/jsm/loaders/FontLoader.js";

let font: Font | undefined;

const fontLoader = new FontLoader();
fontLoader.load("/fonts/Helvetiker Regular Typeface.json", (loadedFont) => {
  font = loadedFont;
});

export function showFloatingScore(
  scene: THREE.Scene,
  position: THREE.Vector3,
  score: number
) {
  if (!font) return;

  const textGeometry = new TextGeometry(`+${score}`, {
    font: font,
    size: 0.6,
    height: 0.1,
    curveSegments: 12,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.02,
    bevelSegments: 5,
  });

  const textMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xffa500,
    metalness: 0.9,
    roughness: 0.1,
    transparent: true,
  });

  const textMesh = new THREE.Mesh(textGeometry, textMaterial);

  textMesh.position.copy(position);
  textMesh.position.y += 1;
  textMesh.rotation.y = Math.random() * Math.PI * 2;

  scene.add(textMesh);

  const start = performance.now();
  const duration = 1000;

  function updatePosition() {
    const elapsedTime = performance.now() - start;
    if (elapsedTime > duration) {
      scene.remove(textMesh);
      textGeometry.dispose();
      textMaterial.dispose();
      return;
    }

    textMesh.position.y += 0.05;
    textMesh.material.opacity = 1 - elapsedTime / duration;
    textMesh.material.transparent = true;

    const scale = 1 + Math.sin(elapsedTime * 0.002) * 0.1;
    textMesh.scale.set(scale, scale, scale);

    requestAnimationFrame(updatePosition);
  }

  updatePosition();
}
