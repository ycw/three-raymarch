import * as sdfChunks from "./shader-chunks/sdf.js";
import * as utilsChunks from "./shader-chunks/utils.js";
import * as noiseChunks from "./shader-chunks/noise.js";
import * as transformChunks from "./shader-chunks/transform.js";

export function RayMarchPassGen({
  THREE,
  FullScreenQuad,
  Pass
}) {

  Object.assign(THREE.ShaderChunk, sdfChunks, utilsChunks, noiseChunks, transformChunks);

  return class RayMarchPass extends Pass {
    constructor({
      camera,
      mapWorld,
      lights = [],
      softShadow = {},
      marching = {},
      background = {}
    }) {
      super();

      this.marching = Object.assign({
        maxSteps: 100,
        maxTravelDist: 100,
        maxHitMargin: 0.001
      }, marching);

      this.background = Object.assign({
        color: new THREE.Color(0),
        alpha: 0
      }, background);

      this.softShadow = Object.assign({
        minT: 0.01,
        maxT: 100.0, // stop marching ( for dir. lights )
        k: 2.0, // "hardness"
        distScale: 1.0
      }, softShadow);


      this.lights = lights;
      this.camera = camera;

      this._aLights = [];
      this._dLights = [];
      this._pLights = [];
      this._setLights();

      this._fsQuad = new FullScreenQuad(new THREE.ShaderMaterial(
        shaderFn({
          aLights: this._aLights,
          dLights: this._dLights,
          pLights: this._pLights,
          mapWorld,
          glslVersion: THREE.GLSL3,
        })
      ));
      this._uniforms = this._fsQuad.material.uniforms;

      this._time = 0;
    }

    _setLights() {
      this._aLights.length = 0;
      this._dLights.length = 0;
      this._pLights.length = 0;
      for (const x of this.lights) {
        if (x instanceof THREE.AmbientLight) this._aLights.push(x);
        else if (x instanceof THREE.DirectionalLight) this._dLights.push(x);
        else if (x instanceof THREE.PointLight) this._pLights.push(x);
      }
    }

    render(renderer, writeBuffer, readBuffer, deltaTime) {
      this._uniforms['uTime'].value = (this._time += deltaTime);
      this._uniforms['uProjMatrixInv'].value = this.camera.projectionMatrixInverse;
      this._uniforms['uViewMatrixInv'].value = this.camera.matrixWorld;
      this._uniforms['uCameraPosition'].value = this.camera.position;
      this._setLights();
      this._uniforms['aLights'].value = this._aLights;
      this._uniforms['dLights'].value = this._dLights;
      this._uniforms['pLights'].value = this._pLights;
      this._uniforms['uRmSoftShadow'].value = this.softShadow;
      this._uniforms['uRmMarching'].value = this.marching;
      this._uniforms['uBackground'].value = this.background;

      if (this.renderToScreen) {
        renderer.setRenderTarget(null);
      } else {
        renderer.setRenderTarget(writeBuffer);
        if (this.clear) renderer.clear();
      }
      this._fsQuad.render(renderer);
    }

  };
}

// ----
// shader fn
// ----

const shaderFn = ({
  dLights,
  aLights,
  pLights,
  mapWorld,
  glslVersion,
}) => ({
  transparent: true,
  glslVersion,
  defines: {
    'N_DLIGHTS': dLights.length,
    'N_ALIGHTS': aLights.length,
    'N_PLIGHTS': pLights.length,
  },
  uniforms: {
    'uTime': { value: 0 },
    'uProjMatrixInv': { value: null },
    'uViewMatrixInv': { value: null },
    'uCameraPosition': { value: null },
    'dLights': { value: [] },
    'aLights': { value: [] },
    'pLights': { value: [] },
    'uRmMarching': { value: null },
    'uRmSoftShadow': { value: null },
    'uBackground': { value: null }
  },
  vertexShader: /* glsl */ `
    out vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1. );
  }`,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform mat4 uProjMatrixInv;
    uniform mat4 uViewMatrixInv;
    uniform vec3 uCameraPosition;
    in vec2 vUv;
    out vec4 fragColor;
    #include <rm_calc_world_pos>
    #include <rm_sdf>
    ${mapWorld}
    #include <rm_ray_march>
    void main() {
      vec3 p = calcWorldPos( vUv );
      vec3 ro = uCameraPosition;
      vec3 rd = normalize( p - ro );
      vec4 c = rayMarch( ro, rd );
      fragColor = c;
    }
  `
});