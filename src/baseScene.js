import * as THREE from 'three';
//import { Sky } from 'three/addons/objects/Sky.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import * as dat from 'dat.gui';

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

  /*
  ** DEBUG:
  ** GUI for sun and sky parameters
  const gui = new dat.GUI({ width: 400 });
  const params = {
    ...effectController,
  };
  gui
    .add(params, 'elevation', 0, 90)
    .name('elevation')
    .onChange(updateSun);
  gui
    .add(params, 'azimuth', -180, 180)
    .name('azimuth')
    .onChange(updateSun);

  gui
    .add(uniforms.turbidity, 'value', 0, 10)
    .name('turbidity')
    .onChange(updateSun);
  gui
    .add(uniforms.rayleigh, 'value', 0, 4)
    .name('rayleigh')
    .onChange(updateSun);
  gui
    .add(uniforms.mieCoefficient, 'value', 0, 0.1)
    .name('mieCoefficient')
    .onChange(updateSun);
  gui
    .add(uniforms.mieDirectionalG, 'value', 0, 1)
    .name('mieDirectionalG')
    .onChange(updateSun);

  function updateSun() {
    const phi = THREE.MathUtils.degToRad(90 - params.elevation);
    const theta = THREE.MathUtils.degToRad(params.azimuth);

    sun.setFromSphericalCoords(1, phi, theta);

    uniforms['sunPosition'].value.copy(sun);

    light.position.copy(sun);

    water.material.uniforms['sunDirection'].value.copy(sun);

    console.log('new effectController:', {
      elevation: params.elevation,
      azimuth: params.azimuth,
      turbidity: uniforms['turbidity'].value,
      rayleigh: uniforms['rayleigh'].value,
      mieCoefficient: uniforms['mieCoefficient'].value,
      mieDirectionalG: uniforms['mieDirectionalG'].value,
    });

    //scene.environment = pmremGenerator.fromScene(sky).texture;
  }
    */

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
    return intensity * 6 + 0.2;
  }

  const light = new THREE.DirectionalLight(
    //color based on sky
    lightColor(),
    //intensity based on sky
    //effectController.rayleigh * 0.5
    lightIntensity()
  );

  light.castShadow = true;
  light.receiveShadow = true;
  light.shadow.bias = -0.00001;
  light.shadow.normalBias = 0.01;
  light.shadow.radius = 0.5;

  let d = 60;
  light.shadow.camera.left = -d;
  light.shadow.camera.right = d;
  light.shadow.camera.top = d;
  light.shadow.camera.bottom = -d;
  light.shadow.camera.near = 0.00001;
  light.shadow.camera.far = 10000;

  light.shadow.mapSize.width = 1024;
  light.shadow.mapSize.height = 1024;
  light.position.copy(sun);

  /*
  const helper = new THREE.DirectionalLightHelper(
    light.shadow.camera,
    5,
    0xff0000
  );
  scene.add(helper);
  */
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
  console.log('Sun light position:', light.position);
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
  const ambientLight = new THREE.AmbientLight(0x666666, 2);
  scene.add(ambientLight);

  const grid = new THREE.GridHelper(10, 10);
  scene.add(grid);

  const axes = new THREE.AxesHelper(3);
  scene.add(axes);

  return water;
}
