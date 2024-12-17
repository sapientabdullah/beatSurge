import * as THREE from "three";
import {
  scene,
  playerZ,
  gameState,
  vector1,
  playerCollider,
  BALLS_PER_HIT,
  updateBallsUI,
} from "../main";
import { showFloatingScore } from "./floatingScore";
import { triggerCameraShake } from "./cameraShake";
import { playBreakSound, playCrashSound } from "./audioManager";
import { triggerDamageOverlay } from "./damageOverlay";
import {
  collisionDamageCooldown,
  decreasePlayerHealth,
  healthDecreaseAmount,
} from "./playerHealth";

export const walls: THREE.Mesh[] = [];
export const WALL_COUNT = 10;

export function spawnWalls(scene: THREE.Scene, playerZ: number) {
  const distanceAhead = 50;
  for (let i = 0; i < WALL_COUNT; i++) {
    const width = Math.random() * 4 + 2;
    const height = Math.random() * 8 + 3;
    const depth = Math.random() * 2 + 0.5;

    const wallGeometry = new THREE.BoxGeometry(width, height, depth);
    const randomColor = new THREE.Color();
    randomColor.setHSL(Math.random(), 0.5, 0.6);

    const wallMaterial = new THREE.MeshPhysicalMaterial({
      color: randomColor,
      transmission: 0.85 + Math.random() * 0.15,
      opacity: 1,
      transparent: true,
      roughness: 0.1 + Math.random() * 0.05,
      metalness: 0.05 + Math.random() * 0.15,
      clearcoat: 0.95 + Math.random() * 0.05,
      clearcoatRoughness: 0.03 + Math.random() * 0.07,
      reflectivity: 0.45 + Math.random() * 0.1,
    });

    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.castShadow = true;
    wall.receiveShadow = true;

    wall.position.set(
      (Math.random() - 0.5) * 30,
      height / 2,
      playerZ + distanceAhead + Math.random() * 50
    );

    scene.add(wall);
    walls.push(wall);
  }
}

export function updateWalls() {
  const distanceBehindPlayer = -20;
  walls.forEach((wall, index) => {
    if (wall.position.z < playerZ + distanceBehindPlayer) {
      scene.remove(wall);
      walls.splice(index, 1);
    }
  });

  if (walls.length < WALL_COUNT) {
    spawnWalls(scene, playerZ);
  }
}

export function checkBallWallCollisions(spheres: THREE.Mesh[]) {
  spheres.forEach((sphere) => {
    const sphereBox = new THREE.Box3().setFromObject(sphere);

    walls.forEach((wall, index) => {
      const wallBox = new THREE.Box3().setFromObject(wall);

      if (sphereBox.intersectsBox(wallBox)) {
        breakWall(wall);

        scene.remove(wall);

        walls.splice(index, 1);
      }
    });
  });
}

export function breakWall(wall: THREE.Mesh) {
  const wallPosition = wall.position.clone();
  const wallBox = new THREE.Box3().setFromObject(wall);
  const wallSize = {
    width: wallBox.max.x - wallBox.min.x,
    height: wallBox.max.y - wallBox.min.y,
    depth: wallBox.max.z - wallBox.min.z,
  };

  const wallMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x88ccee,
    transmission: 0.9,
    opacity: 0.95,
    transparent: true,
    roughness: 0.05,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    reflectivity: 0.9,
  });

  const debrisPieces = 50;

  for (let i = 0; i < debrisPieces; i++) {
    const shardWidth = wallSize.width * (Math.random() * 0.3 + 0.1);
    const shardHeight = wallSize.height * (Math.random() * 0.3 + 0.1);
    const shardDepth = wallSize.depth * (Math.random() * 0.2 + 0.05);

    const shardGeometry = new THREE.BoxGeometry(
      shardWidth,
      shardHeight,
      shardDepth
    );
    const shard = new THREE.Mesh(shardGeometry, wallMaterial);
    shard.castShadow = true;
    shard.receiveShadow = true;

    shard.position.set(
      wallPosition.x + (Math.random() - 0.5) * wallSize.width,
      wallPosition.y + (Math.random() - 0.5) * wallSize.height,
      wallPosition.z + (Math.random() - 0.5) * wallSize.depth
    );

    shard.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    scene.add(shard);

    shard.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      -Math.random() * 20 - 10,
      (Math.random() - 0.5) * 10
    );

    setTimeout(() => {
      scene.remove(shard);
    }, 4000);
  }

  playBreakSound(wall);

  gameState.availableBalls += BALLS_PER_HIT;
  updateBallsUI();

  showFloatingScore(scene, wall.position, BALLS_PER_HIT);
}

let lastDamageTime = 0;

export function checkPlayerWallCollisions() {
  const currentTime = Date.now();

  walls.forEach((wall) => {
    const wallBox = new THREE.Box3().setFromObject(wall);
    const center = vector1
      .addVectors(playerCollider.start, playerCollider.end)
      .multiplyScalar(0.5);
    const playerRadius = playerCollider.radius;

    if (wallBox.distanceToPoint(center) < playerRadius) {
      if (currentTime - lastDamageTime > collisionDamageCooldown) {
        triggerCameraShake();
        playCrashSound();
        triggerDamageOverlay();

        decreasePlayerHealth(healthDecreaseAmount);
        lastDamageTime = currentTime;
      }
    }
  });
}
