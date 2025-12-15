import * as THREE from 'three';
//import { Sky } from 'three/addons/objects/Sky.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { Water } from 'three/examples/jsm/objects/Water.js';

export function BaseScene(
  scene,
  effectController,
  subdivisions
) {
  scene.fog = new THREE.Fog(0xcccccc, 500, 1000);

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
  function lightIntensity() {
    const theta = Math.PI * (sun.y + 0.1);
    const intensity = Math.max(
      0,
      Math.min(1, 1 - theta / Math.PI)
    );
    return intensity * 6;
  }

  const light = new THREE.DirectionalLight(
    //color based on sky
    lightColor(),
    //intensity based on sky
    //effectController.rayleigh * 0.5
    lightIntensity()
  );
  light.castShadow = true;

  light.castShadow = true;
  light.shadow.needsUpdate = true;
  light.shadow.camera.near = 0.01;
  light.shadow.camera.far = 500;
  light.shadow.camera.left = -50;
  light.shadow.camera.right = 50;
  light.shadow.camera.top = 50;
  light.shadow.camera.bottom = -50;
  light.shadow.mapSize.width = 526;
  light.shadow.mapSize.height = 526;
  /*
  ** only for debugging
  light.shadowCameraVisible = true; 
  // these six values define the boundaries of the yellow box seen above
  light.shadowCameraNear = 2;
  light.shadowCameraFar = 5;
  light.shadowCameraLeft = -0.5;
  light.shadowCameraRight = 0.5;
  light.shadowCameraTop = 0.5;
  light.shadowCameraBottom = -0.5;
  */
  light.position.copy(sun);
  scene.add(light);

  const water = new Water(
    new THREE.PlaneGeometry(10000, 10000),
    {
      textureWidth: subdivisions,
      textureHeight: subdivisions,
      waterNormals: new THREE.TextureLoader().load(
        '/waternormals.jpg',
        function (texture) {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        }
      ),
      alpha: 1.0,
      sunDirection: sun.clone(),
      sunColor: lightColor(),
      waterColor: 0x00065f,
      //0x001e0f,
      distortionScale: 3.7,
      fog: scene.fog !== undefined,
    }
  );

  water.rotation.x = -Math.PI / 2;
  water.position.y = -1;
  scene.add(water);

  // lets boost the ambient light a bit
  const ambientLight = new THREE.AmbientLight(0x666666, 1);
  scene.add(ambientLight);

  const grid = new THREE.GridHelper(10, 10);
  scene.add(grid);

  const axes = new THREE.AxesHelper(3);
  scene.add(axes);

  return water;
}
