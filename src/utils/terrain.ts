import * as THREE from "three";
import { clock, hslToRgb, scene } from "../main";
import { analyser } from "./audioManager";

export const terrainSize = 2000;
export const chunkCount = 5;

export const terrainChunks: THREE.Mesh[] = [];

export function createTerrainChunk(x: number, z: number) {
  const terrainGeometry = new THREE.PlaneGeometry(
    terrainSize,
    terrainSize,
    100,
    100
  );
  const terrainMaterial = new THREE.MeshStandardMaterial({
    side: THREE.DoubleSide,
    color: 0x808080,
    wireframe: true,
  });
  const terrainChunk = new THREE.Mesh(terrainGeometry, terrainMaterial);
  terrainChunk.rotation.x = -Math.PI / 2;
  terrainChunk.position.set(x, -5, z);
  terrainChunk.receiveShadow = true;
  scene.add(terrainChunk);
  terrainChunks.push(terrainChunk);
}

export function updateTerrain(camera: THREE.Camera) {
  if (!analyser) return;
  const playerPos = camera.position;

  terrainChunks.forEach((chunk) => {
    if (chunk.position.z < playerPos.z - terrainSize) {
      chunk.position.z += terrainSize * chunkCount;
    }
    if (chunk.position.x < playerPos.x - terrainSize) {
      chunk.position.x += terrainSize * chunkCount;
    }

    const beatStrength = analyser!.getAverageFrequency();
    let glowStrength = Math.pow(beatStrength / 256, 2);
    glowStrength = Math.min(glowStrength, 0.5);

    const hue = (clock.getElapsedTime() * 0.1) % 1;
    const saturation = 0.6;
    const lightness = 0.5 + glowStrength * 0.2;
    const [r, g, b] = hslToRgb(hue, saturation, lightness);

    (chunk.material as THREE.MeshStandardMaterial).color.setRGB(r, g, b);
  });
}

export function initializeTerrain() {
  for (let i = 0; i < chunkCount; i++) {
    for (let j = 0; j < chunkCount; j++) {
      createTerrainChunk(i * terrainSize, j * terrainSize);
    }
  }
}
