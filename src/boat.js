import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';
import { TextureLoader, RepeatWrapping } from 'three';

const controls = {};
window.addEventListener('keydown', event => {
  controls[event.code] = true;
});
window.addEventListener('keyup', event => {
  controls[event.code] = false;
});

export function BoatModel() {
  const pivot = new THREE.Group();
  const loader = new GLTFLoader();

  const textureLoader = new TextureLoader();
  const destructorTexture = textureLoader.load(
    '/public/destructor_map.jpg'
  );
  destructorTexture.wrapS = RepeatWrapping;
  destructorTexture.wrapT = RepeatWrapping;

  const torretaTexture = textureLoader.load(
    '/public/torreta_map.jpg'
  );
  torretaTexture.wrapS = RepeatWrapping;
  torretaTexture.wrapT = RepeatWrapping;

  return new Promise((resolve, reject) => {
    loader.load(
      '/public/destructor.glb',
      gltf => {
        let boat, turret, cannon;
        gltf.scene.traverse(node => {
          if (node.name === 'destructor') {
            boat = node;
            boat.scale.set(1, 1, 1);
            boat.position.set(0, 0, 0);
            boat.rotateOnAxis(
              new THREE.Vector3(0, 1, 0),
              -Math.PI / 2
            );
            boat.castShadow = true;
            boat.receiveShadow = true;
            boat.material = new THREE.MeshStandardMaterial({
              map: destructorTexture,
            });
            pivot.add(boat);
          }
        });
        boat.traverse(node => {
          if (node.name === 'torreta') {
            turret = node;
            turret.castShadow = true;
            turret.receiveShadow = true;
            turret.material = new THREE.MeshStandardMaterial({
              map: torretaTexture,
            });
          }
        });
        turret.traverse(node => {
          console.log('Turret child:', node.name);
          if (node.name === 'canon') {
            cannon = node;
            cannon.castShadow = true;
          }
        });

        console.log(
          'Boat and turret set:',
          boat,
          turret,
          cannon
        );
        //pivot.add(model);

        // ensure updateTurret closes over turret/cannon
        function updateTurret(delta, time) {
          if (!turret || !cannon) return;
          if (controls['KeyJ']) {
            turret.rotateOnAxis(
              new THREE.Vector3(0, 1, 0),
              Math.PI * delta * 0.5
            );
          }
          if (controls['KeyL']) {
            turret.rotateOnAxis(
              new THREE.Vector3(0, 1, 0),
              -Math.PI * delta * 0.5
            );
          }
          if (controls['KeyI']) {
            cannon.rotateOnAxis(
              new THREE.Vector3(0, 0, 1),
              Math.PI * delta * 0.5
            );
          }
          if (controls['KeyK']) {
            cannon.rotateOnAxis(
              new THREE.Vector3(0, 0, 1),
              -Math.PI * delta * 0.5
            );
          }
          // limit cannon rotation
          const cannonRotation = cannon.rotation.z;
          // keep in mind and offset of 90 degrees
          const maxUp = THREE.MathUtils.degToRad(-45);
          const maxDown = THREE.MathUtils.degToRad(-95);
          if (cannonRotation > maxUp) {
            cannon.rotation.z = maxUp;
          } else if (cannonRotation < maxDown) {
            cannon.rotation.z = maxDown;
          }
        }

        resolve({ boat: pivot, cannon, updateTurret });
      },
      undefined,
      err => reject(err)
    );
  });
}
