import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';

export function BoatModel() {
  const pivot = new THREE.Group();
  const loader = new GLTFLoader();
  let boat, turret, cannon; //destrutor, torreta, canon

  loader.load(
    '/public/destructor.glb',
    gltf => {
      gltf.scene.traverse(node => {
        if (node.name === 'destructor') {
          boat = node;
          boat.scale.set(1, 1, 1);
          boat.position.set(0, 0, 0);
          boat.castShadow = true;
          boat.receiveShadow = true;
          pivot.add(boat);
        }
      });
      boat.traverse(node => {
        if (node.name === 'torreta') {
          turret = node;
          turret.castShadow = true;
          turret.receiveShadow = true;
        }
      });
      turret.traverse(node => {
        if (node.name === 'canon') {
          cannon = node;
          cannon.castShadow = true;
        }
      });

      console.log('Boat and turret set:', boat, turret, cannon);
      //pivot.add(model);
    },
    progEv => {
      console.log(
        `Boat ${((progEv.loaded / progEv.total) * 100).toFixed(
          2
        )}% loaded`
      );
    },
    err => {
      console.error(
        'An error happened while loading the boat model:',
        err
      );
    }
  );

  function updateTurret(delta, time) {
    if (!turret || !cannon) return;
    turret.rotation.y += delta * 0.5; // Rotate at 0.5 radians per second
    // Optional: Add some up-and-down motion to the cannon
    cannon.rotation.z = Math.sin(time * 0.1) * 5;
  }

  return { pivot, updateTurret };
}
