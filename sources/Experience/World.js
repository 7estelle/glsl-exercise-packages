import * as THREE from 'three';
import Experience from './Experience.js';
import fragmentShader from './shaders/2D.frag';
import vertexShader from './shaders/2D.vert';
import Bulbasaur from './Material/Bulbasaur.js';

export default class World {
  constructor(_options) {
    this.experience = new Experience();
    this.config = this.experience.config;
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.cursor = { x: 0, y: 0 };

    this.resources.on('groupEnd', (_group) => {
      if (_group.name === 'base') {
        // this.setup2D();
        this.setup3D();
      }
    });
  }

  setup2D() {
    const map = this.resources.items.bob;

    window.addEventListener('mousemove', (event) => {
      this.cursor.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.cursor.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    this.plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({
        map,
        side: THREE.DoubleSide,
        uniforms: {
          uImage: { value: map },
          uTime: { value: this.elapsedTime },
          uSize: {
            value: new THREE.Vector2(window.innerWidth, window.innerHeight),
          },
          uCursor: { value: new THREE.Vector2(this.cursor.x, this.cursor.y) },
        },
        vertexShader,
        fragmentShader,
      })
    );

    this.scene.add(this.plane);
    this.elapsedTime = 0;
  }

  setup3D() {
    /**
     * @type {import ('three').Texture}
     */
    const map = this.resources.items.diffuse;
    map.flipY = false;
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    this.material = new Bulbasaur({
      map,
    });

    /**
     * @type {import ('three').Object3D}
     */
    const model = this.resources.items.bulbisaur.scene;
    model.traverse((o) => {
      if (o.isMesh) o.material = this.material;
    });
    model.scale.set(0.3, 0.3, 0.3);
    this.scene.add(model);
  }

  resize() {}

  update() {
    this.deltaTime = this.time - window.performance.now();
    this.elapsedTime = window.performance.now() * 0.001;
    this.time = window.performance.now();

    if (this.plane) {
      this.plane.material.uniforms.uTime.value = this.elapsedTime;

      const cursorPosition = new THREE.Vector3();
      // Projetez les coordonnées de la souris sur le plan XY de la scène
      cursorPosition.set(
        this.cursor.x,
        this.cursor.y,
        this.experience.camera.instance.position.z
      ); // 0.5 est la profondeur de la projection

      cursorPosition.unproject(this.experience.camera.instance); // Projetez les coordonnées sur le plan XY
      cursorPosition.sub(this.experience.camera.instance.position).normalize(); // Normalisez le vecteur résultant
      cursorPosition.multiplyScalar(
        -this.experience.camera.instance.position.z
      ); // Ajustez la profondeur

      // Utilisez "cursorPosition" comme la position 3D du curseur dans votre application Three.js
      this.plane.material.uniforms.uCursor.value = cursorPosition;
    }

    if (this.material) {
      this.material.update(this.elapsedTime);
    }
  }

  destroy() {}
}
