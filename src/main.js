import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { APP_CONFIG } from './config.js';
import { AudioManager } from './audio-manager.js';
import { MiiAnimator } from './mii-animator.js';

const canvas = document.querySelector('#scene');
const loading = document.querySelector('#loading');
const loadingBar = document.querySelector('#loading-bar');
const loadingLabel = document.querySelector('#loading-label');
const soundToggle = document.querySelector('#sound-toggle');
const soundIcon = document.querySelector('#sound-icon');
const soundLabel = document.querySelector('#sound-label');
const rotateLeftButton = document.querySelector('#rotate-left');
const rotateRightButton = document.querySelector('#rotate-right');
const creditsOpen = document.querySelector('#credits-open');
const creditsDialog = document.querySelector('#credits-dialog');
const toast = document.querySelector('#toast');

const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const loader = new GLTFLoader();
const audio = new AudioManager(APP_CONFIG.sounds);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x8b64c9, 19, 44);

const camera = new THREE.PerspectiveCamera(
  APP_CONFIG.camera.fov,
  innerWidth / innerHeight,
  0.1,
  100,
);
camera.position.fromArray(APP_CONFIG.camera.position);
camera.lookAt(...APP_CONFIG.camera.lookAt);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const islandGroup = new THREE.Group();
islandGroup.name = 'RotatingIsland';
scene.add(islandGroup);

const clickableMeshes = [];
const interactiveFigures = new Map();
let miiAnimator = null;
let mainCharacter = null;
let hoveredId = null;
let toastTimer = 0;

let islandRotation = 0;
let angularVelocity = 0;
let rotatingVisualState = false;
let forcedRotationUntil = 0;

const pointerState = {
  active: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  lastTime: 0,
  travel: 0,
  dragged: false,
};

setupWorld();
setupUi();
renderer.setAnimationLoop(renderFrame);

try {
  const failedFigurines = await loadAllModels();
  loading.classList.add('is-hidden');
  if (failedFigurines.length > 0) {
    showToast(`Не завантажились: ${failedFigurines.join(', ')}`);
  }
} catch (error) {
  console.error('Не вдалося запустити Mii Island:', error);
  const loadingTitle = loading.querySelector('strong');
  if (loadingTitle) loadingTitle.textContent = 'Острів не завантажився';
  loadingLabel.textContent = 'Перевір інтернет-з’єднання та шляхи до моделей.';
  loadingBar.style.width = '100%';
  loading.classList.add('has-error');
}

function setupWorld() {
  scene.add(createSkyDome());
  scene.add(createStars());

  const hemi = new THREE.HemisphereLight(0xf6edff, 0x4c315f, 2.05);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff4dd, 3.1);
  sun.position.set(-7, 11, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -9;
  sun.shadow.camera.right = 9;
  sun.shadow.camera.top = 9;
  sun.shadow.camera.bottom = -9;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 32;
  sun.shadow.bias = -0.00035;
  scene.add(sun);

  const rim = new THREE.DirectionalLight(0xc59cff, 1.5);
  rim.position.set(8, 5, -7);
  scene.add(rim);

  const island = createIsland();
  islandGroup.add(island);

  addIslandDetails(islandGroup);
}

function createSkyDome() {
  const geometry = new THREE.SphereGeometry(58, 40, 24);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x0db5e4) },
      middleColor: { value: new THREE.Color(0x0db5e4) },
      bottomColor: { value: new THREE.Color(0x0db5e4) },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 middleColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y * 0.5 + 0.5;
        vec3 lower = mix(bottomColor, middleColor, smoothstep(0.0, 0.58, h));
        vec3 color = mix(lower, topColor, smoothstep(0.52, 1.0, h));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  return new THREE.Mesh(geometry, material);
}

function createStars() {
  const count = 180;
  const positions = new Float32Array(count * 3);
  const random = mulberry32(743921);

  for (let index = 0; index < count; index += 1) {
    const radius = 28 + random() * 22;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(0.1 + random() * 0.8);
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = Math.abs(radius * Math.cos(phi)) + 4;
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xf7eaff,
    size: 0.09,
    transparent: true,
    opacity: 0.52,
    sizeAttenuation: true,
    depthWrite: false,
  });
  return new THREE.Points(geometry, material);
}

function createIsland() {
  const group = new THREE.Group();

  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(APP_CONFIG.island.radius, 4.75, 1.45, 64, 5),
    new THREE.MeshStandardMaterial({ color: 0x8b5a3e, roughness: 0.96, metalness: 0 }),
  );
  soil.position.y = -0.73;
  soil.castShadow = true;
  soil.receiveShadow = true;
  group.add(soil);

  const grass = new THREE.Mesh(
    new THREE.CylinderGeometry(APP_CONFIG.island.radius + 0.02, APP_CONFIG.island.radius, 0.28, 64, 1),
    new THREE.MeshStandardMaterial({ color: 0x55c96a, roughness: 0.9, metalness: 0 }),
  );
  grass.position.y = -0.02;
  grass.castShadow = true;
  grass.receiveShadow = true;
  group.add(grass);

  const underside = new THREE.Mesh(
    new THREE.ConeGeometry(4.72, 2.2, 48, 3, true),
    new THREE.MeshStandardMaterial({ color: 0x68432f, roughness: 1 }),
  );
  underside.position.y = -2.35;
  underside.rotation.x = Math.PI;
  underside.castShadow = true;
  group.add(underside);

  return group;
}

function addIslandDetails(parent) {
  const random = mulberry32(44219);
  const rockMaterial = new THREE.MeshStandardMaterial({ color: 0xbba6c7, roughness: 1 });
  const flowerStemMaterial = new THREE.MeshStandardMaterial({ color: 0x3e9f55, roughness: 1 });
  const flowerColors = [0xffe068, 0xff9ad1, 0xe8d0ff, 0xffffff];

  for (let index = 0; index < 12; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 2.1 + random() * 3.15;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.12 + random() * 0.14, 0),
      rockMaterial,
    );
    rock.position.set(Math.sin(angle) * radius, 0.18, Math.cos(angle) * radius);
    rock.scale.y = 0.55 + random() * 0.45;
    rock.rotation.set(random(), random(), random());
    rock.castShadow = true;
    parent.add(rock);
  }

  for (let index = 0; index < 16; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 1.6 + random() * 3.7;
    const flower = new THREE.Group();
    flower.position.set(Math.sin(angle) * radius, 0.17, Math.cos(angle) * radius);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.22, 6), flowerStemMaterial);
    stem.position.y = 0.1;
    flower.add(stem);

    const bloom = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 6),
      new THREE.MeshStandardMaterial({ color: flowerColors[index % flowerColors.length], roughness: 0.7 }),
    );
    bloom.position.y = 0.23;
    bloom.scale.y = 0.55;
    flower.add(bloom);
    parent.add(flower);
  }
}

async function loadAllModels() {
  const total = 1 + APP_CONFIG.figurines.length;
  const failedFigurines = [];
  let completed = 0;

  const updateLoading = (label) => {
    const percent = Math.round((completed / total) * 100);
    loadingBar.style.width = `${percent}%`;
    loadingLabel.textContent = `${percent}% · ${label}`;
  };

  // The central Mii is the core of the scene, so a failure here is fatal and
  // leaves a clear error message on the loading screen.
  updateLoading('головна Mii');
  await loadMainCharacter();
  completed += 1;
  updateLoading('фігурки');

  // Edge figurines are optional. One broken custom model should not prevent
  // the rest of the island from opening.
  for (const config of APP_CONFIG.figurines) {
    try {
      await loadFigurine(config);
    } catch (error) {
      console.error(`Не вдалося завантажити ${config.label}:`, error);
      failedFigurines.push(config.label);
    }
    completed += 1;
    updateLoading(config.label);
  }

  loadingBar.style.width = '100%';
  loadingLabel.textContent = failedFigurines.length > 0
    ? 'Готово з кількома пропущеними моделями'
    : 'Готово';

  return failedFigurines;
}

async function loadMainCharacter() {
  const gltf = await loader.loadAsync(APP_CONFIG.mainCharacter.url);
  const wrapper = new THREE.Group();
  wrapper.name = 'MainCharacterWrapper';
  wrapper.position.fromArray(APP_CONFIG.mainCharacter.position);
  wrapper.rotation.y = THREE.MathUtils.degToRad(APP_CONFIG.mainCharacter.rotationY);

  mainCharacter = fitObject(gltf.scene, APP_CONFIG.mainCharacter.targetHeight, 'height');
  mainCharacter.position.y = 0.09;
  configureModelMeshes(mainCharacter, APP_CONFIG.mainCharacter.id);
  wrapper.add(mainCharacter);
  islandGroup.add(wrapper);

  const ring = createPedestal(1.1, 0x86ef9c, APP_CONFIG.mainCharacter.id);
  wrapper.add(ring);

  miiAnimator = new MiiAnimator(mainCharacter, gltf.animations);
}

async function loadFigurine(config) {
  const gltf = await loader.loadAsync(config.url);
  const angle = THREE.MathUtils.degToRad(config.angle);

  const anchor = new THREE.Group();
  anchor.name = `${config.id}-anchor`;
  anchor.position.set(
    Math.sin(angle) * config.radius,
    0.13,
    Math.cos(angle) * config.radius,
  );
  anchor.rotation.y = angle + THREE.MathUtils.degToRad(config.rotationOffset ?? 0);

  const effectGroup = new THREE.Group();
  effectGroup.name = `${config.id}-effect`;
  anchor.add(effectGroup);

  const model = fitObject(gltf.scene, config.targetSize, config.fit ?? 'height');
  model.position.y = 0.09;
  configureModelMeshes(model, config.id);
  effectGroup.add(model);

  const pedestal = createPedestal(0.76, 0xd7b4ff, config.id);
  effectGroup.add(pedestal);

  const label = createLabelSprite(config.label);
  label.position.y = getObjectHeight(model) + 0.43;
  label.userData.interactionId = config.id;
  effectGroup.add(label);

  islandGroup.add(anchor);
  interactiveFigures.set(config.id, {
    id: config.id,
    label: config.label,
    sound: config.sound,
    effectGroup,
    pedestal,
    elapsed: Infinity,
    duration: 0.9,
    baseY: effectGroup.position.y,
    baseRotation: effectGroup.rotation.y,
    labelSprite: label,
  });
}

function fitObject(object, targetSize, fitMode = 'height') {
  const wrapper = new THREE.Group();
  wrapper.add(object);
  object.updateMatrixWorld(true);

  const initialBox = new THREE.Box3().setFromObject(object);
  const initialSize = initialBox.getSize(new THREE.Vector3());
  const divisor = fitMode === 'max'
    ? Math.max(initialSize.x, initialSize.y, initialSize.z)
    : initialSize.y;

  if (!Number.isFinite(divisor) || divisor <= 0) {
    throw new Error(`Модель має некоректний розмір: ${object.name || 'unknown'}`);
  }

  object.scale.multiplyScalar(targetSize / divisor);
  object.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(object);
  const center = scaledBox.getCenter(new THREE.Vector3());
  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= scaledBox.min.y;
  object.updateMatrixWorld(true);

  return wrapper;
}

function configureModelMeshes(root, interactionId) {
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    object.frustumCulled = true;
    object.userData.interactionId = interactionId;
    clickableMeshes.push(object);

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material) continue;
      if ('envMapIntensity' in material) material.envMapIntensity = 0.7;
    }
  });
}

function createPedestal(radius, color, interactionId) {
  const group = new THREE.Group();
  group.userData.interactionId = interactionId;

  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0x41265f,
    roughness: 0.72,
    metalness: 0.05,
  });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.06, 0.18, 40), baseMaterial);
  base.position.y = -0.02;
  base.receiveShadow = true;
  base.castShadow = true;
  base.userData.interactionId = interactionId;
  clickableMeshes.push(base);
  group.add(base);

  const glowMaterial = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.24,
    roughness: 0.45,
  });
  const glow = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.79, 0.035, 10, 48), glowMaterial);
  glow.rotation.x = Math.PI / 2;
  glow.position.y = 0.08;
  glow.userData.interactionId = interactionId;
  clickableMeshes.push(glow);
  group.add(glow);

  group.userData.glowMaterial = glowMaterial;
  return group;
}

function createLabelSprite(text) {
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512;
  labelCanvas.height = 128;
  const context = labelCanvas.getContext('2d');

  context.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
  roundRect(context, 12, 14, 488, 96, 40);
  context.fillStyle = 'rgba(39, 20, 70, 0.84)';
  context.fill();
  context.strokeStyle = 'rgba(255, 255, 255, 0.23)';
  context.lineWidth = 4;
  context.stroke();
  context.fillStyle = '#ffffff';
  context.font = '700 38px Inter, Segoe UI, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 256, 64, 450);

  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.1, 0.525, 1);
  sprite.renderOrder = 4;
  return sprite;
}

function getObjectHeight(object) {
  const box = new THREE.Box3().setFromObject(object);
  return box.max.y - box.min.y;
}

function setupUi() {
  soundToggle.addEventListener('click', async () => {
    await audio.unlock();
    const muted = audio.toggleMuted();
    soundToggle.setAttribute('aria-pressed', String(muted));
    soundIcon.textContent = muted ? '🔇' : '🔊';
    soundLabel.textContent = muted ? 'Без звуку' : 'Звук';
    showToast(muted ? 'Звук вимкнено' : 'Звук увімкнено');
  });

  creditsOpen.addEventListener('click', () => creditsDialog.showModal());

  rotateLeftButton.addEventListener('click', () => kickRotation(1));
  rotateRightButton.addEventListener('click', () => kickRotation(-1));

  addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      kickRotation(1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      kickRotation(-1);
    }
  });

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('pointerleave', clearHover);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  addEventListener('resize', onResize);
}

function onPointerDown(event) {
  if (event.button !== 0 && event.pointerType === 'mouse') return;
  void audio.unlock();

  pointerState.active = true;
  pointerState.pointerId = event.pointerId;
  pointerState.startX = event.clientX;
  pointerState.startY = event.clientY;
  pointerState.lastX = event.clientX;
  pointerState.lastY = event.clientY;
  pointerState.lastTime = performance.now();
  pointerState.travel = 0;
  pointerState.dragged = false;
  canvas.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
  if (!pointerState.active || pointerState.pointerId !== event.pointerId) {
    updateHover(event);
    return;
  }

  const now = performance.now();
  const deltaX = event.clientX - pointerState.lastX;
  const deltaY = event.clientY - pointerState.lastY;
  const deltaTime = Math.max(0.008, (now - pointerState.lastTime) / 1000);
  pointerState.travel += Math.hypot(deltaX, deltaY);

  if (pointerState.travel > 4) {
    pointerState.dragged = true;
    canvas.classList.add('is-dragging');
    islandRotation += deltaX * APP_CONFIG.island.rotationSensitivity;
    angularVelocity = THREE.MathUtils.clamp(
      (deltaX * APP_CONFIG.island.rotationSensitivity) / deltaTime,
      -4.6,
      4.6,
    );
    forcedRotationUntil = now + 120;
    setRotationVisualState(true);
  }

  pointerState.lastX = event.clientX;
  pointerState.lastY = event.clientY;
  pointerState.lastTime = now;
}

function onPointerUp(event) {
  if (!pointerState.active || pointerState.pointerId !== event.pointerId) return;
  const wasDragged = pointerState.dragged;
  cleanupPointer(event.pointerId);

  if (!wasDragged) handleSceneClick(event);
}

function onPointerCancel(event) {
  if (pointerState.pointerId === event.pointerId) cleanupPointer(event.pointerId);
}

function cleanupPointer(pointerId) {
  pointerState.active = false;
  pointerState.pointerId = null;
  pointerState.dragged = false;
  canvas.classList.remove('is-dragging');
  if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
}

function onWheel(event) {
  event.preventDefault();
  void audio.unlock();

  const dominantDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
    ? event.deltaX
    : event.deltaY;
  const rotationDelta = dominantDelta * APP_CONFIG.island.wheelSensitivity;
  islandRotation += rotationDelta;
  angularVelocity = THREE.MathUtils.clamp(rotationDelta * 16, -3.2, 3.2);
  forcedRotationUntil = performance.now() + 230;
  setRotationVisualState(true);
}

function kickRotation(direction) {
  void audio.unlock();
  islandRotation += direction * 0.22;
  angularVelocity = direction * 1.65;
  forcedRotationUntil = performance.now() + 500;
  setRotationVisualState(true);
}


function clearHover() {
  if (pointerState.active) return;
  setHighlight(hoveredId, false);
  hoveredId = null;
  canvas.classList.remove('is-hovering');
}

function updateHover(event) {
  if (pointerState.active) return;
  const id = raycastInteraction(event);
  if (id === hoveredId) return;

  setHighlight(hoveredId, false);
  hoveredId = id;
  setHighlight(hoveredId, true);
  canvas.classList.toggle('is-hovering', Boolean(id));
}

function setHighlight(id, active) {
  if (!id) return;
  const record = interactiveFigures.get(id);
  const pedestal = id === APP_CONFIG.mainCharacter.id
    ? islandGroup.getObjectByName('MainCharacterWrapper')?.children.find((child) => child.userData.glowMaterial)
    : record?.pedestal;
  const material = pedestal?.userData.glowMaterial;
  if (material) material.emissiveIntensity = active ? 0.82 : 0.24;

  if (record?.labelSprite) {
    record.labelSprite.scale.set(active ? 2.28 : 2.1, active ? 0.57 : 0.525, 1);
  }
}

function handleSceneClick(event) {
  const id = raycastInteraction(event);
  if (!id) return;

  if (id === APP_CONFIG.mainCharacter.id) {
    miiAnimator?.annoy();
    audio.play(APP_CONFIG.mainCharacter.angrySound);
    showToast('Не тицяй мене! 😾');
    return;
  }

  const record = interactiveFigures.get(id);
  if (!record) return;
  record.elapsed = 0;
  audio.play(record.sound);
  showToast(`${record.label} ✨`);
}

function raycastInteraction(event) {
  const rect = canvas.getBoundingClientRect();
  pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointerNdc, camera);

  const hits = raycaster.intersectObjects(clickableMeshes, false);
  for (const hit of hits) {
    const id = hit.object.userData.interactionId;
    if (id) return id;
  }
  return null;
}

function setRotationVisualState(active) {
  if (active === rotatingVisualState) return;
  rotatingVisualState = active;
  miiAnimator?.setRotating(active);
  if (active) audio.startLoop('spin');
  else audio.stopLoop('spin');
}

function updateRotation(deltaSeconds) {
  if (!pointerState.active || !pointerState.dragged) {
    islandRotation += angularVelocity * deltaSeconds;
    angularVelocity *= Math.exp(-APP_CONFIG.island.inertiaDamping * deltaSeconds);
  }

  islandGroup.rotation.y = islandRotation;

  const stillMoving = Math.abs(angularVelocity) > 0.035;
  const forced = performance.now() < forcedRotationUntil;
  const activelyDragging = pointerState.active && pointerState.dragged;
  setRotationVisualState(activelyDragging || stillMoving || forced);
}

function updateFigureEffects(deltaSeconds) {
  for (const record of interactiveFigures.values()) {
    if (record.elapsed >= record.duration) continue;
    record.elapsed += deltaSeconds;
    const progress = Math.min(1, record.elapsed / record.duration);
    const envelope = Math.sin(progress * Math.PI);

    record.effectGroup.position.y = record.baseY + Math.abs(Math.sin(progress * Math.PI * 3)) * 0.32 * envelope;
    record.effectGroup.rotation.y = record.baseRotation + Math.sin(progress * Math.PI * 5) * 0.22 * envelope;
    const scale = 1 + envelope * 0.1;
    record.effectGroup.scale.setScalar(scale);

    if (progress >= 1) {
      record.effectGroup.position.y = record.baseY;
      record.effectGroup.rotation.y = record.baseRotation;
      record.effectGroup.scale.setScalar(1);
      record.elapsed = Infinity;
    }
  }
}

function renderFrame() {
  const deltaSeconds = Math.min(clock.getDelta(), 0.05);
  updateRotation(deltaSeconds);
  updateFigureEffects(deltaSeconds);
  miiAnimator?.update(deltaSeconds);

  if (!prefersReducedMotion) {
    const stars = scene.children.find((child) => child.isPoints);
    if (stars) stars.rotation.y += deltaSeconds * 0.012;
  }

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight, false);
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 1250);
}

function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function mulberry32(seed) {
  return function random() {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
