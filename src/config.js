/**
 * ГОЛОВНИЙ ФАЙЛ НАЛАШТУВАНЬ.
 * Тут можна міняти моделі, розміри, позиції, підписи та всі звуки.
 */
export const APP_CONFIG = {
  camera: {
    position: [0, 6.35, 13.4],
    lookAt: [0, 1.45, 0],
    fov: 40,
  },

  island: {
    radius: 5.9,
    rotationSensitivity: 0.0085,
    wheelSensitivity: 0.00155,
    inertiaDamping: 5.2,
  },

  mainCharacter: {
    id: 'mii',
    label: 'Головна Mii',
    url: './assets/models/mii_character.glb',
    targetHeight: 4.25,
    position: [0, 0.13, 0],
    rotationY: 0,
    angrySound: 'miiAngry',
  },

  /**
   * angle — позиція по колу в градусах.
   * rotationOffset — поправка напрямку самої моделі в градусах.
   * Якщо модель дивиться спиною, постав rotationOffset: 180.
   * fit: 'height' масштабує за висотою, 'max' — за найбільшим виміром.
   */
  figurines: [
    {
      id: 'hachiware',
      label: 'ХАЧІВАРЕ',
      url: './assets/models/hachiware.glb',
      angle: 18,
      radius: 4.35,
      targetSize: 1.55,
      fit: 'height',
      rotationOffset: 90,
      sound: 'hachiware',
    },
    {
      id: 'teto',
      label: 'ТЕТО',
      url: './assets/models/teto_plush.glb',
      angle: 108,
      radius: 4.15,
      targetSize: 1.62,
      fit: 'height',
      rotationOffset: 0,
      sound: 'teto',
    },
    {
      id: 'cat',
      label: 'З ДНЕМ НАРОДЖЕННЯ',
      url: './assets/models/cat.glb',
      angle: 198,
      radius: 4.25,
      targetSize: 1.7,
      fit: 'max',
      rotationOffset: -90,
      sound: 'cat',
    },
    {
      id: 'charlie',
      label: 'Навальний Чарлі',
      url: './assets/models/charlie/scene.gltf',
      angle: 288,
      radius: 4.2,
      targetSize: 1.76,
      fit: 'height',
      rotationOffset: 0,
      sound: 'charlie',
    },
  ],

  /**
   * ЩОБ ЗАМІНИТИ ЗВУК:
   * 1. Поклади .mp3/.ogg/.wav у assets/sounds/
   * 2. Зміни src нижче.
   * volume: 0..1, playbackRate: приблизно 0.5..2.
   */
  sounds: {
    spin: {
      src: './assets/sounds/spin-loop.wav',
      volume: 0.24,
      playbackRate: 1,
      loop: true,
    },
    miiAngry: {
      src: './assets/sounds/mii-angry.wav',
      volume: 0.62,
      playbackRate: 1,
    },
    hachiware: {
      src: './assets/sounds/hachiware.wav',
      volume: 0.62,
      playbackRate: 1,
    },
    teto: {
      src: './assets/sounds/teto.wav',
      volume: 0.58,
      playbackRate: 1,
    },
    cat: {
      src: './assets/sounds/cat.wav',
      volume: 0.58,
      playbackRate: 1,
    },
    charlie: {
      src: './assets/sounds/charlie.wav',
      volume: 0.55,
      playbackRate: 1,
    },
  },
};
