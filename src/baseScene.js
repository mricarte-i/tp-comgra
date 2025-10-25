import * as THREE from 'three';
//import { Sky } from 'three/addons/objects/Sky.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

export function BaseScene(scene, effectController) {
  const sky = new Sky();
  sky.scale.setScalar(450000);

  let sun = new THREE.Vector3();

  const uniforms = sky.material.uniforms;
  uniforms['turbidity'].value = effectController.turbidity;
  uniforms['rayleigh'].value = effectController.rayleigh;
  uniforms['mieCoefficient'].value =
    effectController.mieCoefficient;
  uniforms['mieDirectionalG'].value =
    effectController.mieDirectionalG;

  const phi = THREE.MathUtils.degToRad(
    90 - effectController.elevation
  );
  const theta = THREE.MathUtils.degToRad(
    effectController.azimuth
  );

  sun.setFromSphericalCoords(1, phi, theta);

  uniforms['sunPosition'].value.copy(sun);

  scene.add(sky);

  function lightColor() {
    const theta = Math.PI * (sun.y + 0.1);
    const intensity = Math.max(
      0,
      Math.min(1, 1 - theta / Math.PI)
    );
    const color = new THREE.Color(0xffffff);
    color.multiplyScalar(intensity);
    return color;
  }

  const light = new THREE.DirectionalLight(
    //color based on sky
    lightColor(),
    //intensity based on sky
    effectController.rayleigh * 0.5
  );

  light.position.copy(sun);
  scene.add(light);

  // lets boost the ambient light a bit
  const ambientLight = new THREE.AmbientLight(0x666666, 0.75);
  scene.add(ambientLight);

  const grid = new THREE.GridHelper(10, 10);
  scene.add(grid);

  const axes = new THREE.AxesHelper(3);
  scene.add(axes);
}
