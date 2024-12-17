import "./style.css";
import * as THREE from "three";
import { Capsule } from "three/addons/math/Capsule.js";
import {
  EffectComposer,
  EXRLoader,
  OutlinePass,
  RenderPass,
  ShaderPass,
  UnrealBloomPass,
} from "three/examples/jsm/Addons.js";
import { initializeTerrain, updateTerrain } from "./utils/terrain";
import { updateCameraShake } from "./utils/cameraShake";
import {
  spawnObstacles,
  updateObstacles,
  checkBallObstacleCollisions,
  checkPlayerObstacleCollisions,
} from "./utils/obstacles";
import {
  spawnWalls,
  updateWalls,
  checkBallWallCollisions,
  checkPlayerWallCollisions,
} from "./utils/walls";
import {
  playWooshSound,
  listener,
  musicSound,
  analyser,
  playBreakSound,
} from "./utils/audioManager";
import { loadingManager } from "./utils/loadingManager";

export const clock = new THREE.Clock();
export const scene = new THREE.Scene();

export const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

camera.rotation.order = "YXZ";
camera.rotation.set(0, THREE.MathUtils.degToRad(180), 0);
camera.add(listener);

const fillLight1 = new THREE.HemisphereLight(0x8dc1de, 0x00668d, 2);
fillLight1.position.set(2, 1, 1);
scene.add(fillLight1);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
directionalLight.position.set(-5, 25, -1);
directionalLight.castShadow = true;
directionalLight.shadow.camera.near = 0.01;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.right = 30;
directionalLight.shadow.camera.left = -30;
directionalLight.shadow.camera.top = 30;
directionalLight.shadow.camera.bottom = -30;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.radius = 4;
directionalLight.shadow.bias = -0.00006;
scene.add(directionalLight);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const GRAVITY = 30;

const NUM_SPHERES = 100;
const SPHERE_RADIUS = 0.2;

const STEPS_PER_FRAME = 5;

const sphereGeometry = new THREE.IcosahedronGeometry(SPHERE_RADIUS, 5);
const sphereMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xaaaaaa,
  metalness: 0.9 + Math.random() * 0.1,
  roughness: 0.15 + Math.random() * 0.1,
  reflectivity: 0.85 + Math.random() * 0.15,
  clearcoat: 0.95 + Math.random() * 0.05,
  clearcoatRoughness: 0.03 + Math.random() * 0.04,
  transmission: 0.9 + Math.random() * 0.1,
});

const spheres: {
  mesh: THREE.Mesh;
  collider: THREE.Sphere;
  velocity: THREE.Vector3;
}[] = [];
let sphereIdx = 0;

for (let i = 0; i < NUM_SPHERES; i++) {
  const randomMaterial = sphereMaterial.clone();
  randomMaterial.metalness = 0.9 + Math.random() * 0.1;
  randomMaterial.roughness = 0.15 + Math.random() * 0.1;
  randomMaterial.reflectivity = 0.85 + Math.random() * 0.15;
  randomMaterial.clearcoat = 0.95 + Math.random() * 0.05;
  randomMaterial.clearcoatRoughness = 0.03 + Math.random() * 0.04;
  randomMaterial.transmission = 0.9 + Math.random() * 0.1;

  const sphere = new THREE.Mesh(sphereGeometry, randomMaterial);
  sphere.castShadow = true;
  sphere.receiveShadow = true;

  scene.add(sphere);

  spheres.push({
    mesh: sphere,
    collider: new THREE.Sphere(new THREE.Vector3(0, -100, 0), SPHERE_RADIUS),
    velocity: new THREE.Vector3(),
  });
}

export const playerCollider = new Capsule(
  new THREE.Vector3(0, 0.35, 0),
  new THREE.Vector3(0, 1, 0),
  0.35
);

const playerVelocity = new THREE.Vector3();
const playerDirection = new THREE.Vector3();

let playerOnFloor = false;
let mouseTime = 0;

const keyStates: { [key: string]: boolean } = {};

export const vector1 = new THREE.Vector3();
const vector2 = new THREE.Vector3();
const vector3 = new THREE.Vector3();

document.addEventListener("keydown", (event) => {
  keyStates[event.code] = true;
});

document.addEventListener("keyup", (event) => {
  keyStates[event.code] = false;
});

document.addEventListener("mousedown", () => {
  document.body.requestPointerLock();

  mouseTime = performance.now();
});

document.addEventListener("mouseup", () => {
  if (document.pointerLockElement !== null) throwBall();
});

document.body.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement === document.body) {
    camera.rotation.y -= event.movementX / 500;
    camera.rotation.x -= event.movementY / 500;
  }
});

window.addEventListener("resize", onWindowResize);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

let availableBalls = 10;
export const BALLS_PER_HIT = 3;

export const gameState = {
  availableBalls: availableBalls,
};

export const ballsElement = document.getElementById("balls") as HTMLDivElement;

export function updateBallsUI() {
  if (ballsElement) {
    ballsElement.textContent = `${gameState.availableBalls}`;
  }
}

updateBallsUI();

function throwBall() {
  if (gameState.availableBalls <= 0) {
    endGame();
    return;
  }

  const sphere = spheres[sphereIdx];

  camera.getWorldDirection(playerDirection);

  sphere.collider.center
    .copy(playerCollider.end)
    .addScaledVector(playerDirection, playerCollider.radius * 1.5);

  const impulse =
    30 + 30 * (1 - Math.exp((mouseTime - performance.now()) * 0.001));

  sphere.velocity.copy(playerDirection).multiplyScalar(impulse);
  sphere.velocity.addScaledVector(playerVelocity, 2);

  playWooshSound();

  gameState.availableBalls--;
  updateBallsUI();

  if (gameState.availableBalls <= 0) {
    endGame();
  }

  sphereIdx = (sphereIdx + 1) % spheres.length;
}

export function endGame() {
  stopDiamondSpawning();
  renderer.setAnimationLoop(null);

  const gameOverOverlay = document.getElementById("game-over-overlay");
  if (gameOverOverlay) {
    gameOverOverlay.classList.remove("hidden");
    gameOverOverlay.classList.add("flex");
  }
}

let difficulty = 1;
const difficultyIncreaseRate = 0.01;

function updatePlayer(deltaTime: number) {
  difficulty += difficultyIncreaseRate * deltaTime;

  playerVelocity.z += 50 * difficulty * deltaTime;

  playerVelocity.addScaledVector(playerVelocity, Math.exp(-4 * deltaTime) - 1);

  const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime);
  playerCollider.translate(deltaPosition);

  playerCollider.start.x = THREE.MathUtils.clamp(
    playerCollider.start.x,
    -15,
    15
  );
  playerCollider.end.x = THREE.MathUtils.clamp(playerCollider.end.x, -15, 15);

  camera.position.copy(playerCollider.end);
  playerZ = camera.position.z;
}

function playerSphereCollision(sphere: {
  collider: THREE.Sphere;
  velocity: THREE.Vector3;
}) {
  const center = vector1
    .addVectors(playerCollider.start, playerCollider.end)
    .multiplyScalar(0.5);

  const sphere_center = sphere.collider.center;

  const r = playerCollider.radius + sphere.collider.radius;
  const r2 = r * r;

  for (const point of [playerCollider.start, playerCollider.end, center]) {
    const d2 = point.distanceToSquared(sphere_center);

    if (d2 < r2) {
      const normal = vector1.subVectors(point, sphere_center).normalize();
      const v1 = vector2
        .copy(normal)
        .multiplyScalar(normal.dot(playerVelocity));
      const v2 = vector3
        .copy(normal)
        .multiplyScalar(normal.dot(sphere.velocity));

      playerVelocity.add(v2).sub(v1);
      sphere.velocity.add(v1).sub(v2);

      const d = (r - Math.sqrt(d2)) / 2;
      sphere_center.addScaledVector(normal, -d);
    }
  }
}

function spheresCollisions() {
  for (let i = 0, length = spheres.length; i < length; i++) {
    const s1 = spheres[i];

    for (let j = i + 1; j < length; j++) {
      const s2 = spheres[j];

      const d2 = s1.collider.center.distanceToSquared(s2.collider.center);
      const r = s1.collider.radius + s2.collider.radius;
      const r2 = r * r;

      if (d2 < r2) {
        const normal = vector1
          .subVectors(s1.collider.center, s2.collider.center)
          .normalize();
        const v1 = vector2.copy(normal).multiplyScalar(normal.dot(s1.velocity));
        const v2 = vector3.copy(normal).multiplyScalar(normal.dot(s2.velocity));

        s1.velocity.add(v2).sub(v1);
        s2.velocity.add(v1).sub(v2);

        const d = (r - Math.sqrt(d2)) / 2;

        s1.collider.center.addScaledVector(normal, d);
        s2.collider.center.addScaledVector(normal, -d);
      }
    }
  }
}

function updateSpheres(deltaTime: number) {
  spheres.forEach((sphere) => {
    sphere.collider.center.addScaledVector(sphere.velocity, deltaTime);

    sphere.velocity.y -= GRAVITY * deltaTime;

    const damping = Math.exp(-1.5 * deltaTime) - 1;
    sphere.velocity.addScaledVector(sphere.velocity, damping);

    playerSphereCollision(sphere);
  });

  spheresCollisions();

  for (const sphere of spheres) {
    sphere.mesh.position.copy(sphere.collider.center);
  }
}

function getSideVector() {
  camera.getWorldDirection(playerDirection);
  playerDirection.y = 0;
  playerDirection.normalize();
  playerDirection.cross(camera.up);

  return playerDirection;
}

function controls(deltaTime: number) {
  const speedDelta = deltaTime * (playerOnFloor ? 25 : 8);
  const lateralSpeedMultiplier = 5;

  if (keyStates["KeyA"]) {
    playerVelocity.add(
      getSideVector().multiplyScalar(-speedDelta * lateralSpeedMultiplier)
    );
  }

  if (keyStates["KeyD"]) {
    playerVelocity.add(
      getSideVector().multiplyScalar(speedDelta * lateralSpeedMultiplier)
    );
  }
}

function teleportPlayerIfOob() {
  if (camera.position.y <= -25) {
    playerCollider.start.set(0, 0.35, 0);
    playerCollider.end.set(0, 1, 0);
    playerCollider.radius = 0.35;
    camera.position.copy(playerCollider.end);
    camera.rotation.set(0, 0, 0);
  }
}

export let playerZ = 0;

function updateDebris(deltaTime: number) {
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh && object.userData.velocity) {
      object.position.addScaledVector(object.userData.velocity, deltaTime);

      object.userData.velocity.y -= GRAVITY * deltaTime * 0.5;

      object.userData.velocity.multiplyScalar(0.98);
    }
  });
}

const diamonds: THREE.Mesh[] = [];
const DIAMOND_SPAWN_INTERVAL = 10000;

const diamondGeometry = new THREE.OctahedronGeometry(2);
const diamondMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x00ffff,
  emissive: 0x00ffff,
  emissiveIntensity: 0.75,
  transmission: 0.9,
  opacity: 0.95,
  transparent: true,
  roughness: 0.05,
  metalness: 0.8,
  clearcoat: 1.0,
  clearcoatRoughness: 0.02,
  reflectivity: 0.9,
});

let autofireActive = false;
let autofireTimeout: number;

function spawnDiamond() {
  const diamond = new THREE.Mesh(diamondGeometry, diamondMaterial.clone());
  diamond.castShadow = true;
  diamond.receiveShadow = true;

  diamond.position.set(
    (Math.random() - 0.5) * 20,
    Math.random() * 3 + 1,
    playerZ + 50 + Math.random() * 50
  );

  diamond.userData.pulseSpeed = Math.random() * 0.02 + 0.01;

  scene.add(diamond);
  diamonds.push(diamond);
}

setInterval(() => {
  spawnDiamond();
}, DIAMOND_SPAWN_INTERVAL);

function updateDiamonds(_deltaTime: number) {
  const distanceBehindPlayer = -20;

  diamonds.forEach((diamond, index) => {
    const pulseSpeed = diamond.userData.pulseSpeed;
    const pulseScale = 1 + 0.2 * Math.sin(performance.now() * pulseSpeed);
    diamond.scale.set(pulseScale, pulseScale, pulseScale);

    if (diamond.position.z < playerZ + distanceBehindPlayer) {
      scene.remove(diamond);
      diamonds.splice(index, 1);
    }
  });
}

function breakDiamond(diamond: THREE.Mesh) {
  const diamondPosition = diamond.position.clone();

  const debrisPieces = 20;

  for (let i = 0; i < debrisPieces; i++) {
    const debrisGeometry = new THREE.TetrahedronGeometry(0.2);
    const debrisMaterial = Array.isArray(diamond.material)
      ? diamond.material.map((mat) => mat.clone())
      : diamond.material.clone();
    const debrisPiece = new THREE.Mesh(debrisGeometry, debrisMaterial);

    debrisPiece.position.set(
      diamondPosition.x + (Math.random() - 0.5) * 1,
      diamondPosition.y + (Math.random() - 0.5) * 1,
      diamondPosition.z + (Math.random() - 0.5) * 1
    );

    debrisPiece.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    debrisPiece.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5
    );

    scene.add(debrisPiece);

    setTimeout(() => {
      scene.remove(debrisPiece);
    }, 4000);
  }

  playBreakSound(diamond);
}

function checkBallDiamondCollisions() {
  spheres.forEach((sphere) => {
    const sphereBox = new THREE.Box3().setFromObject(sphere.mesh);

    diamonds.forEach((diamond, index) => {
      const diamondBox = new THREE.Box3().setFromObject(diamond);

      if (sphereBox.intersectsBox(diamondBox)) {
        breakDiamond(diamond);
        scene.remove(diamond);
        diamonds.splice(index, 1);

        activateAutofire(5000);
      }
    });
  });
}

let overlayMesh: THREE.Mesh;

function createScreenOverlay() {
  const overlayGeometry = new THREE.PlaneGeometry(2, 2);
  const overlayMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
    },
    transparent: true,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uIntensity;
      varying vec2 vUv;

      void main() {
        vec3 color = vec3(0.1, 0.1, 1.0);
        float alpha = sin(uTime * 10.0) * 0.05 + 0.2;
        alpha *= uIntensity;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });

  overlayMesh = new THREE.Mesh(overlayGeometry, overlayMaterial);
  overlayMesh.frustumCulled = false;
  scene.add(overlayMesh);
}

createScreenOverlay();

function activateAutofire(duration: number) {
  clearTimeout(autofireTimeout);
  autofireActive = true;
  (
    overlayMesh.material as THREE.ShaderMaterial
  ).uniforms.uIntensity.value = 1.0;

  autofireTimeout = setTimeout(() => {
    autofireActive = false;
    fadeOutScreenOverlay();
  }, duration);
}

function fadeOutScreenOverlay() {
  const fadeDuration = 1.0;
  const startIntensity = (overlayMesh.material as THREE.ShaderMaterial).uniforms
    .uIntensity.value;
  const fadeStartTime = clock.getElapsedTime();

  function fadeOut() {
    const elapsedTime = clock.getElapsedTime() - fadeStartTime;
    const t = elapsedTime / fadeDuration;
    (overlayMesh.material as THREE.ShaderMaterial).uniforms.uIntensity.value =
      THREE.MathUtils.lerp(startIntensity, 0, t);

    if (t < 1) {
      requestAnimationFrame(fadeOut);
    } else {
      (
        overlayMesh.material as THREE.ShaderMaterial
      ).uniforms.uIntensity.value = 0;
    }
  }

  fadeOut();
}

const buildings: THREE.Mesh[] = [];

function createBuildings() {
  const numBuildings = 250;
  const minDistance = 50;
  const maxDistance = 1000;
  const minHeight = 5;
  const maxHeight = 50;
  const sideDistance = 40;

  for (let i = 0; i < numBuildings; i++) {
    const width = Math.random() * 5 + 5;
    const depth = Math.random() * 5 + 5;
    const height = Math.random() * (maxHeight - minHeight) + minHeight;

    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({
      color: 0x808080,
      metalness: 0.6,
      roughness: 0.8,
    });
    const building = new THREE.Mesh(geometry, material);

    (building as any).buildingHeight = height;

    building.castShadow = true;
    building.receiveShadow = true;

    const side = Math.random() < 0.5 ? -1 : 1;
    const x = side * (sideDistance + Math.random() * 20);
    const z = Math.random() * (maxDistance - minDistance) + minDistance;
    building.position.set(x, height / 2, z);

    buildings.push(building);
    scene.add(building);
  }
}

function updateBuildings() {
  const playerPositionZ = camera.position.z;

  buildings.forEach((building) => {
    const distanceBehindPlayer = 50;
    if (building.position.z < playerPositionZ - distanceBehindPlayer) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = side * (50 + Math.random() * 20);
      const z = playerPositionZ + Math.random() * 100 + 50;
      const height = (building as any).buildingHeight;
      building.position.set(x, height / 2, z);
    }
  });
}

let composer: EffectComposer, outlinePass: OutlinePass;

function setupPostProcessing() {
  const renderPass = new RenderPass(scene, camera);

  composer = new EffectComposer(renderer);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,
    0.4,
    100
  );
  bloomPass.threshold = 0.002;
  bloomPass.strength = 0.6;
  bloomPass.radius = 0;
  composer.addPass(bloomPass);

  outlinePass = new OutlinePass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    scene,
    camera
  );

  outlinePass.edgeStrength = 2;
  outlinePass.edgeGlow = 0.5;
  outlinePass.edgeThickness = 1;
  outlinePass.pulsePeriod = 0;

  outlinePass.visibleEdgeColor.setRGB(1, 0, 0);
  outlinePass.hiddenEdgeColor.setRGB(0, 0, 0);
  outlinePass.selectedObjects = buildings;

  composer.addPass(outlinePass);

  const chromaticAberrationShader = {
    uniforms: {
      tDiffuse: { value: null },
      amount: { value: 0.0015 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float amount;
      varying vec2 vUv;
      void main() {
        vec2 offset = amount * vec2(1.0 - vUv.y, 1.0 - vUv.x);
        vec4 cr = texture2D(tDiffuse, vUv + offset);
        vec4 cg = texture2D(tDiffuse, vUv);
        vec4 cb = texture2D(tDiffuse, vUv - offset);
        gl_FragColor = vec4(cr.r, cg.g, cb.b, 1.0);
      }
    `,
  };

  const chromaticAberrationPass = new ShaderPass(chromaticAberrationShader);
  composer.addPass(chromaticAberrationPass);
}

setupPostProcessing();

export function hslToRgb(h: number, s: number, l: number) {
  let r, g, b;
  if (s == 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [r, g, b];
}

function updateObstaclesGlow() {
  if (!analyser) return;

  const beatStrength = analyser.getAverageFrequency();
  let glowStrength = Math.pow(beatStrength / 128, 2);
  glowStrength = Math.min(glowStrength, 1);

  outlinePass.edgeStrength = 2 + glowStrength * 5;
  outlinePass.edgeGlow = 0.2 + glowStrength * 20;
  outlinePass.edgeThickness = 2 + glowStrength * 5;

  const time = clock.getElapsedTime();
  const hue = (time * 0.1) % 1;
  const saturation = 0.6;
  const lightness = 0.5 + glowStrength * 0.2;

  const [r, g, b] = hslToRgb(hue, saturation, lightness);
  outlinePass.visibleEdgeColor.setRGB(r, g, b);
  outlinePass.hiddenEdgeColor.setRGB(0, 0, 0);
}

let isPaused = false;
let diamondSpawnIntervalId: number;

function startDiamondSpawning() {
  diamondSpawnIntervalId = setInterval(() => {
    if (!isPaused) spawnDiamond();
  }, DIAMOND_SPAWN_INTERVAL);
}

function stopDiamondSpawning() {
  clearInterval(diamondSpawnIntervalId);
}

function toggleMusic() {
  if (musicSound) {
    if (isPaused) {
      musicSound.pause();
    } else {
      musicSound.play();
    }
  }
}

function togglePause() {
  isPaused = !isPaused;
  const pauseOverlay = document.getElementById("pause-overlay");

  if (isPaused) {
    stopDiamondSpawning();
    toggleMusic();
    pauseOverlay?.classList.remove("hidden");
    pauseOverlay?.classList.add("flex");
    renderer.setAnimationLoop(null);
  } else {
    startDiamondSpawning();
    toggleMusic();
    pauseOverlay?.classList.add("hidden");
    renderer.setAnimationLoop(animate);
  }
}

document.addEventListener("keydown", (event) => {
  if (event.key === "p") {
    togglePause();
  }
});

let lastAutofireTime = 0;
const AUTO_FIRE_INTERVAL = 200;

function handleVisibilityChange() {
  if (document.hidden) {
    renderer.setAnimationLoop(null);
  } else {
    renderer.setAnimationLoop(animate);
  }
}

document.addEventListener("visibilitychange", handleVisibilityChange);

function animate() {
  if (isPaused) return;
  const deltaTime = Math.min(0.05, clock.getDelta()) / STEPS_PER_FRAME;
  updateTerrain(camera);
  updateBuildings();

  if (overlayMesh && (overlayMesh.material as THREE.ShaderMaterial).uniforms) {
    (overlayMesh.material as THREE.ShaderMaterial).uniforms.uTime.value =
      clock.getElapsedTime();
  }

  if (
    autofireActive &&
    performance.now() - lastAutofireTime > AUTO_FIRE_INTERVAL
  ) {
    throwBall();
    lastAutofireTime = performance.now();
  }

  for (let i = 0; i < STEPS_PER_FRAME; i++) {
    controls(deltaTime);
    updateCameraShake(deltaTime, camera);
    updatePlayer(deltaTime);
    checkPlayerWallCollisions();
    checkPlayerObstacleCollisions();
    updateSpheres(deltaTime);
    checkBallWallCollisions(spheres.map((sphere) => sphere.mesh));
    checkBallObstacleCollisions(spheres.map((sphere) => sphere.mesh));
    checkBallDiamondCollisions();
    updateDebris(deltaTime);
    updateObstacles();
    updateObstaclesGlow();
    updateWalls();
    updateDiamonds(deltaTime);
    teleportPlayerIfOob();
  }

  composer.render();
}

initializeTerrain();
createBuildings();

spawnWalls(scene, playerZ);
spawnObstacles();

new EXRLoader(loadingManager).load("/background.exr", (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = texture;
  scene.environment = texture;
});
