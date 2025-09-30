import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  AirplaneController,
  AIRPLANE_KEYS,
} from './airplaneController.js';
import { AirplaneGeometry } from './airplaneModel.js';
import { BaseScene } from './baseScene.js';
import { createGroundBufferManual } from './terrain.js';
let scene, camGral, renderer, container; //sceneManager;

let mainCamera = 0;
let cameras = [];

function setupThreeJs() {
  container = document.getElementById('container3D');

  renderer = new THREE.WebGLRenderer();
  scene = new THREE.Scene();

  container.appendChild(renderer.domElement);

  camGral = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camGral.position.set(250, 10, 0);
  camGral.lookAt(0, 0, 0);

  const controls = new OrbitControls(
    camGral,
    renderer.domElement
  );

  window.addEventListener('resize', onResize);
  window.addEventListener('beforeunload', () => {
    // Save camera position and rotation
    localStorage.setItem(
      'cameraPosition',
      JSON.stringify(camGral.position.toArray())
    );
    localStorage.setItem(
      'cameraRotation',
      JSON.stringify(camGral.rotation.toArray())
    );

    // If using OrbitControls or similar, save its target
    if (controls && controls.target) {
      localStorage.setItem(
        'controlsTarget',
        JSON.stringify(controls.target.toArray())
      );
    }
  });
  // Restore camera position and rotation
  const savedPosition = localStorage.getItem('cameraPosition');
  const savedRotation = localStorage.getItem('cameraRotation');
  const savedTarget = localStorage.getItem('controlsTarget');
  if (savedPosition) {
    const posArray = JSON.parse(savedPosition);
    camGral.position.fromArray(posArray);
  }
  if (savedRotation) {
    const rotArray = JSON.parse(savedRotation);
    camGral.rotation.fromArray(rotArray);
  }
  if (controls && controls.target && savedTarget) {
    const targetArray = JSON.parse(savedTarget);
    controls.target.fromArray(targetArray);
    controls.update();
  }
  onResize();
}

function onResize() {
  // update aspect ratios of all cameras
  for (let cam of cameras) {
    cam.aspect = container.offsetWidth / container.offsetHeight;
    cam.updateProjectionMatrix();
  }
  renderer.setSize(
    container.offsetWidth,
    container.offsetHeight
  );
}

setupThreeJs();

//axis helper and default lights
BaseScene(scene);

//TODO: better scene management
createGroundBufferManual(
  undefined,
  undefined,
  undefined,
  256,
  256,
  30,
  0.01,
  mesh => {
    mesh.position.set(0, 0, 0);
    scene.add(mesh);
  }
);
const water = new THREE.Mesh(
  new THREE.PlaneGeometry(10000, 10000),
  new THREE.MeshPhongMaterial({
    color: 0x0044ff,
    //transparent: true,
    //opacity: 0.6,
    //side: THREE.DoubleSide,
  })
);
water.rotation.x = -Math.PI / 2;
water.position.y = 0;
scene.add(water);

const { airplane, updateFanRotation, updateTopLight } =
  AirplaneGeometry();
const airplaneSpawn = new THREE.Vector3(200, 2, 0);
scene.add(airplane);

// chase cam setup
const camChasePlane = new THREE.PerspectiveCamera(
  90,
  window.innerWidth / window.innerHeight,
  0.1,
  10000
);
// Cámara: montada al avión (detrás y arriba)
airplane.add(camChasePlane);
camChasePlane.position.set(0, 3, 5);
camChasePlane.lookAt(new THREE.Vector3(0, 0, 0));

// cockpit cam setup
const camCockpit = new THREE.PerspectiveCamera(
  120,
  window.innerWidth / window.innerHeight,
  0.1,
  10000
);
// Cámara: montada al avión (detrás y arriba)
airplane.add(camCockpit);
camCockpit.position.set(0, 0.5, -0.5);
camCockpit.lookAt(new THREE.Vector3(0, 1, -10));

// Controlador estable con minY = 2
const controller = new AirplaneController(airplane, {
  maxSpeed: 120,
  accelResponse: 2.2,
  drag: 0.015,

  pitchLimit: THREE.MathUtils.degToRad(45),
  bankLimit: THREE.MathUtils.degToRad(60),

  pitchCmdRateDeg: 60,
  bankCmdRateDeg: 90,

  pitchResponse: 5.0,
  bankResponse: 6.0,

  pitchCentering: 1.0,
  bankCentering: 1.5,

  turnRateGain: 1.3,
  yawTaxiRate: Math.PI * 1.4,

  stallSpeed: 12,
  ctrlVRange: 25,

  // *** NUEVO: altura mínima (suelo) ***
  minY: 2,
});
// Estado inicial en el origen (y=2), mirando -Z, throttle=0
controller.setTransform({
  position: airplaneSpawn,
  euler: new THREE.Euler(0, 0, 0, 'YXZ'), // heading=0 → forward -Z
  throttle: 0,
});
// --- HUD (opcional, si tenés un <div id="hud"> en tu HTML) ---
const hudEl = document.getElementById('hud');
function updateHUD() {
  if (!hudEl) return;
  const s = controller.getStatus();
  hudEl.innerHTML =
    `Vel: ${s.speed.toFixed(1)} u/s<br>` +
    `Throttle: ${(controller.getEnginePower() * 100) | 0}%<br>` +
    `Pitch/Bank: ${s.pitchDeg.toFixed(0)}° / ${s.bankDeg.toFixed(
      0
    )}°`;
}
const helpEl = document.getElementById('help');
function updateHelp() {
  if (!helpEl) return;
  if (mainCamera === 1 || mainCamera === 2) {
    helpEl.innerHTML = `▲/▼: Pitch • ◀/▶: Roll • PageUp/PageDown: Throttle • (mantené presionadas
		las flechas)<br />
		Consejo: subí throttle con PageUp y dale algo de roll para virar. <br />
		Presioná R para resetear la posición. <br />
		1,2,3,4,5,6,7,8 para cambiar cámara. <br />`;
  } else {
    helpEl.innerHTML = `Mouse: mover cámara • Rueda: zoom • Clic izquierdo: orbitar • Clic derecho: moverse  <br />
		1,2,3,4,5,6,7,8 para cambiar cámara. <br />`;
  }
}
window.addEventListener('keydown', e => {
  // *** NUEVO: tecla R para resetear a situación de despegue ***
  if (e.code === 'KeyR') {
    controller.setTransform({
      position: airplaneSpawn,
      euler: new THREE.Euler(0, 0, 0, 'YXZ'), // nivelado, nariz hacia -Z
      throttle: 0,
    });
    camGral.position.set(250, 10, 0);
    camGral.lookAt(0, 0, 0);
  }
  if (e.key === '1') {
    mainCamera = 0;
  } else if (e.key === '2') {
    mainCamera = 1;
  } else if (e.key === '3') {
    mainCamera = 2;
  }
});

cameras = [camGral, camChasePlane, camCockpit];
// --- Animación ---
const clock = new THREE.Clock();
function animate() {
  // clamp por si se pausa el tab
  const dt = Math.min(0.05, clock.getDelta());
  controller.update(dt);
  updateFanRotation(
    clock.elapsedTime,
    controller.getStatus().speed
  );
  updateTopLight(
    clock.elapsedTime,
    20 * 0.0001 * controller.getStatus().speed,
    mainCamera === 4
      ? 0xff0000
      : mainCamera === 5
      ? 0x00ff00
      : mainCamera === 6
      ? 0x0000ff
      : 0xffffff
  );
  updateHUD();
  updateHelp();
  renderer.render(scene, cameras[mainCamera]);
  requestAnimationFrame(animate);
}

animate();
