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

export const obstacles: THREE.Mesh[] = [];
export const OBSTACLE_COUNT = 10;

export function spawnObstacles() {
  const distanceAhead = 100;
  for (let i = 0; i < OBSTACLE_COUNT; i++) {
    const shapeType = Math.floor(Math.random() * 4);
    let geometry;
    switch (shapeType) {
      case 0:
        geometry = new THREE.BoxGeometry(
          Math.random() * 4 + 2,
          Math.random() * 6 + 3,
          Math.random() * 2 + 0.5
        );
        break;
      case 1:
        geometry = new THREE.SphereGeometry(Math.random() * 2 + 1, 16, 16);
        break;
      case 2:
        geometry = new THREE.CylinderGeometry(
          Math.random() * 1 + 0.5,
          Math.random() * 1 + 0.5,
          Math.random() * 6 + 3,
          16
        );
        break;
      case 3:
        geometry = new THREE.TorusGeometry(
          Math.random() * 1 + 0.5,
          Math.random() * 0.5 + 0.2,
          16,
          100
        );
        break;
    }

    const randomColor = new THREE.Color();
    randomColor.setHSL(Math.random(), 0.5, 0.6);
    const material = new THREE.MeshPhysicalMaterial({
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

    const obstacle = new THREE.Mesh(geometry, material);
    obstacle.castShadow = true;
    obstacle.receiveShadow = true;

    const forwardDistance = distanceAhead + Math.random() * 50;
    obstacle.position.set(
      (Math.random() - 0.5) * 10,
      Math.random() * 10 + 1,
      playerZ + forwardDistance
    );

    obstacle.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    scene.add(obstacle);
    obstacles.push(obstacle);
  }
}

export function updateObstacles() {
  const distanceBehindPlayer = -20;
  obstacles.forEach((obstacle, index) => {
    if (obstacle.position.z < playerZ + distanceBehindPlayer) {
      scene.remove(obstacle);
      obstacles.splice(index, 1);
    }
  });

  if (obstacles.length < OBSTACLE_COUNT) {
    spawnObstacles();
  }
}

export function checkBallObstacleCollisions(spheres: THREE.Mesh[]) {
  spheres.forEach((sphere) => {
    const sphereBox = new THREE.Box3().setFromObject(sphere);

    obstacles.forEach((obstacle, index) => {
      const obstacleBox = new THREE.Box3().setFromObject(obstacle);

      if (sphereBox.intersectsBox(obstacleBox)) {
        breakObstacle(obstacle);
        scene.remove(obstacle);
        obstacles.splice(index, 1);
      }
    });
  });
}

export function breakObstacle(obstacle: THREE.Mesh) {
  const obstaclePosition = obstacle.position.clone();
  const debrisPieces = 50;

  for (let i = 0; i < debrisPieces; i++) {
    const debrisGeometry = new THREE.TetrahedronGeometry(
      Math.random() * 0.5 + 0.1
    );
    const debrisMaterial = new THREE.MeshPhysicalMaterial({
      color: (obstacle.material as THREE.MeshPhysicalMaterial).color,
      transmission: 0.85 + Math.random() * 0.15,
      opacity: 1,
      transparent: true,
      roughness: 0.1 + Math.random() * 0.05,
      metalness: 0.05 + Math.random() * 0.15,
      clearcoat: 0.95 + Math.random() * 0.05,
      clearcoatRoughness: 0.03 + Math.random() * 0.07,
      reflectivity: 0.45 + Math.random() * 0.1,
    });

    const debrisPiece = new THREE.Mesh(debrisGeometry, debrisMaterial);

    debrisPiece.scale.set(
      Math.random() * 0.3 + 0.1,
      Math.random() * 0.3 + 0.1,
      Math.random() * 0.3 + 0.1
    );

    debrisPiece.position.set(
      obstaclePosition.x + (Math.random() - 0.5) * 2,
      obstaclePosition.y + (Math.random() - 0.5) * 2,
      obstaclePosition.z + (Math.random() - 0.5) * 2
    );

    debrisPiece.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    scene.add(debrisPiece);

    debrisPiece.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 15,
      -(Math.random() * 15 + 10),
      (Math.random() - 0.5) * 15
    );

    setTimeout(() => {
      scene.remove(debrisPiece);
    }, 3000);
  }

  playBreakSound(obstacle);

  gameState.availableBalls += BALLS_PER_HIT;
  updateBallsUI();

  showFloatingScore(scene, obstacle.position, BALLS_PER_HIT);
}

let lastDamageTime = 0;

export function checkPlayerObstacleCollisions() {
  const currentTime = Date.now();

  obstacles.forEach((obstacle) => {
    const obstacleBox = new THREE.Box3().setFromObject(obstacle);
    const center = vector1
      .addVectors(playerCollider.start, playerCollider.end)
      .multiplyScalar(0.5);
    const playerRadius = playerCollider.radius;

    if (obstacleBox.distanceToPoint(center) < playerRadius) {
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
