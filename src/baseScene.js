import * as THREE from 'three';

export function BaseScene(scene) {
  const light = new THREE.DirectionalLight(0xffffff, 2);

  light.position.set(1, 1, 1);
  scene.add(light);

  const ambientLight = new THREE.AmbientLight(0x666666);
  scene.add(ambientLight);

  const grid = new THREE.GridHelper(10, 10);
  scene.add(grid);

  const axes = new THREE.AxesHelper(3);
  scene.add(axes);
}
