import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  AirplaneController,
  AIRPLANE_KEYS,
} from './airplaneController.js';
import { AirplaneGeometry } from './airplaneModel.js';
import { BaseScene } from './baseScene.js';
import { createGroundBufferManual } from './terrain.js';
import { BoatModel } from './boat.js';
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
    mesh.position.set(0, -2, 0);
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
water.position.y = -1;
scene.add(water);

function triangleGeo() {
  // Define the vertices of the triangle
  const vertices = new Float32Array([
    -1.0,
    -1.0,
    0.0, // Vertex 0
    1.0,
    -1.0,
    0.0, // Vertex 1
    0.0,
    1.0,
    0.0, // Vertex 2
  ]);

  // Create a BufferGeometry
  const geometry = new THREE.BufferGeometry();

  // Set the position attribute
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(vertices, 3)
  );

  return geometry;
}

function windWakerWaves() {
  const wavesMat = new THREE.MeshPhongMaterial({
    color: 0x55aaff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6,
    emissive: 0x66bbff,
    emissiveIntensity: 0.3,
    //wireframe: true,
  });
  const group = new THREE.Group();
  const m1 = new THREE.Mesh(triangleGeo(), wavesMat);
  const m2 = new THREE.Mesh(triangleGeo(), wavesMat);
  group.add(m1);
  m1.rotation.set(Math.PI / 2, Math.PI / 4, Math.PI / 4);
  group.add(m2);
  m2.rotation.set(Math.PI / 2, -Math.PI / 4, -Math.PI / 4);
  return group;
}

const waves = windWakerWaves();
scene.add(waves);
waves.position.set(200, 1, 0);

const hangar = new THREE.Mesh(
  new THREE.BoxGeometry(20, 10, 20),
  new THREE.MeshPhongMaterial({ color: 0x888888 })
);
hangar.position.set(130, -3.5, 64);
scene.add(hangar);

const { airplane, updateFanRotation, updateTopLight } =
  AirplaneGeometry();
const airplaneSpawn = new THREE.Vector3(200, 2, 0);
scene.add(airplane);

const { pivot, updateTurret } = BoatModel();
pivot.position.set(214, -1, 1);
pivot.scale.set(0.5, 0.5, 0.5);
scene.add(pivot);

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

// --- Raycast Axis Helper ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const axisHelper = new THREE.AxesHelper(5);
scene.add(axisHelper);
axisHelper.visible = false;
window.addEventListener('mousemove', event => {
  // calculate mouse position in normalized device coordinates
  // (-1 to +1) for both components
  mouse.x =
    (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
  mouse.y =
    -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;

  // update the picking ray with the camera and mouse position
  raycaster.setFromCamera(mouse, cameras[mainCamera]);

  // calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects(scene.children);
  let closest = null;
  for (let i = 0; i < intersects.length; i++) {
    if (
      intersects[i].object !== axisHelper &&
      (intersects[i].distance < closest?.distance || !closest)
    ) {
      closest = intersects[i];
    }
  }
  if (closest) {
    axisHelper.position.copy(closest.point);
    axisHelper.visible = true;
  } else {
    axisHelper.visible = false;
  }
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
    )}°<br>` +
    `Raycast: ${
      axisHelper.visible
        ? `x:${axisHelper.position.x.toFixed(
            1
          )} y:${axisHelper.position.y.toFixed(
            1
          )} z:${axisHelper.position.z.toFixed(1)}`
        : '---'
    }<br>`;
}

// --- Animación ---
function updateWindWakerWaves(time) {
  // whenever the airplane is near the water, waves should
  // be scaled up, if going very fast, they should be
  // very big, if going slow, they should be small
  const dist = airplane.position.distanceTo(water.position);
  const speed = controller.getStatus().speed;
  const scale = Math.min(
    Math.max(0, 30 - dist) * 0.1 + speed * 0.05,
    10
  );
  //also, lets use time and make the waves jiggle a bit
  // based on speed, but not too much
  const waveMotion =
    0.75 + 0.25 * Math.sin(time * 3 + speed * 0.5);
  //position waves at airplane x,z but at water y
  waves.position.set(
    airplane.position.x,
    water.position.y,
    airplane.position.z
  );
  //waves.rotation.y = airplane.rotation.y;
  waves.quaternion.copy(airplane.quaternion);
  //final scale
  waves.scale.setScalar(scale * waveMotion);
}
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
  updateWindWakerWaves(clock.elapsedTime);
  updateTurret(dt, clock.elapsedTime);
  renderer.render(scene, cameras[mainCamera]);
  requestAnimationFrame(animate);
}

animate();
