import { MeshBasicMaterial } from 'three';
import glsl from 'glslify';

export default class Bulbasaur extends MeshBasicMaterial {
  /**
   * @param { import("three").MeshBasicMaterialParameters } params
   */
  constructor(params) {
    super({
      ...params,
    });
  }

  /**
   * @param { import("three").Shader } shader
   * @param { import("three").WebGLRenderer } renderer
   */
  onBeforeCompile(shader, renderer) {
    super.onBeforeCompile(shader, renderer);

    shader.uniforms.uTime = { value: 0 };

    const snoise4 = glsl`#pragma glslify: snoise4 = require(glsl-noise/simplex/4d)`;

    shader.vertexShader = shader.vertexShader.replace(
      'void main() {',
      [
        'uniform float uTime;',
        'varying vec3 vPosition;',
        snoise4,
        'float clampedSine(float t){',
        '   return (sin(t)+1.)*.5;',
        '}',
        'float random(vec2 st){',
        '   return fract(sin(dot(st.xy, vec2(12.9898,78.233)))* 43758.5453123);',
        '}',
        
        'void main() {',
        '   vPosition = position;',
      ].join('\n')
    );

    // // WAVE :
    // shader.vertexShader = shader.vertexShader.replace(
    //   '#include <project_vertex>',
    //   `
    //     transformed.x += sin(transformed.y*2.+uTime) * .5;
    //     #include <project_vertex>
    //   `
    // );

    // CHUBBY :
    // shader.vertexShader = shader.vertexShader.replace(
    //   '#include <project_vertex>', // passe de local à world
    //   `
    //       transformed = transformed + normalize(normal) * clampedSine(uTime);
    //       #include <project_vertex>
    //     `
    // );

    // // CHUBBY :
    // shader.vertexShader = shader.vertexShader.replace(
    //   '#include <project_vertex>', // passe de local à world
    //   `
    //         float a = atan(transformed.z, transformed.x);
    //             a += transformed.y * sin(uTime) * .5;

    //         transformed.xz = vec2(cos(a), sin(a)) * length(transformed.xz);

    //         #include <project_vertex>
    //     `
    // );

    // NOISE :
    // shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', [
    //     'transformed += snoise(vec4(position, uTime)) * .1;',
    //     '#include <project_vertex>',
    // ].join('\n'));

    // NOISE COLOR :
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', 
    [
        `uniform float uTime;`,
        `varying vec3 vPosition;`,
        // pal est une méthode qui sert à créer une palette/dégradé de couleur avec les valeurs qu'on lui donne
        `vec3 pal(in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d) {`,
        `   return a + b*cos( 6.28318*(c*t+d) );`,
        '}',
        snoise4,
        `void main() {`,
    ].join('\n'));

    // map_fragment permet de donner une valeur à diffuseColor. on doit donc l'include avant de faire nos modifs, càd avant que le shader chunk projette les positions transformées depuis l'objet dans le world
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', [
      '#include <map_fragment>',
      'float nt = snoise(vec4(vPosition, uTime));',
      'vec3 col = pal(nt, vec3(0.8,0.5,0.4),vec3(0.2,0.4,0.2),vec3(2.0,1.0,1.0),vec3(0.0,0.25,0.25));',
      'diffuseColor.rgb = floor(col*3.)/3.;',
    ].join('\n'));

    this.userData.shader = shader;
  }

  update(time) {
    if (this.userData?.shader) {
      this.userData.shader.uniforms.uTime.value = time;
    }
  }
}
