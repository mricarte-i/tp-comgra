import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AirplaneController, AIRPLANE_KEYS } from './airplaneController.js';
import { AirplaneGeometry } from './airplaneModel.js';
import { BaseScene } from './baseScene.js';
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
  camGral.position.set(0, 6, 6);
  camGral.lookAt(0, 0, 0);

  const controls = new OrbitControls(camGral, renderer.domElement);

  window.addEventListener('resize', onResize);
  onResize();
}

function onResize() {
  // update aspect ratios of all cameras
  for (let cam of cameras) {
    cam.aspect = container.offsetWidth / container.offsetHeight;
    cam.updateProjectionMatrix();
  }
  renderer.setSize(container.offsetWidth, container.offsetHeight);
}

setupThreeJs();
BaseScene(scene);

const plane = AirplaneGeometry();
scene.add(plane);

// chase cam setup
const camChasePlane = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  10000
);
// Cámara: montada al avión (detrás y arriba)
plane.add(camChasePlane);
camChasePlane.position.set(0, 5, 5);
camChasePlane.lookAt(new THREE.Vector3(0, 0, 0));

// cockpit cam setup
const camCockpit = new THREE.PerspectiveCamera(
  90,
  window.innerWidth / window.innerHeight,
  0.1,
  10000
);
// Cámara: montada al avión (detrás y arriba)
plane.add(camCockpit);
camCockpit.position.set(0, 0.5, -0.5);
camCockpit.lookAt(new THREE.Vector3(0, 1, -10));

// Controlador estable con minY = 2
const controller = new AirplaneController(plane, {
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
  position: new THREE.Vector3(0, 2, 0),
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
    `Pitch/Bank: ${s.pitchDeg.toFixed(0)}° / ${s.bankDeg.toFixed(0)}°`;
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
      position: new THREE.Vector3(0, 2, 0),
      euler: new THREE.Euler(0, 0, 0, 'YXZ'), // nivelado, nariz hacia -Z
      throttle: 0,
    });
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
  updateHUD();
  updateHelp();
  renderer.render(scene, cameras[mainCamera]);
  requestAnimationFrame(animate);
}

animate();
