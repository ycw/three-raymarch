# three-raymarch

A raymarching postprocessing pass for three.js.

[demo](https://ycw.github.io/three-raymarch/examples/basic/)

## Installation

via cdn

https://cdn.jsdelivr.net/gh/ycw/three-raymarch@{VERSION}/build/three-raymarch.js

or npm

`$ npm i ycw/three-raymarch`

`$ npm i ycw/three-raymarch#{VERSION_TAG}`

## Usage

```js
import * as THREE from "three"
import { FullScreenQuad, Pass } from "three/examples/jsm/postprocessing/EffectComposer"
import { RayMarchPassGen } from "three-raymarch"

const RayMarchPass = RayMarchPassGen({ THREE, FullScreeQuad, Pass });
const rayMarchPass = new RayMarchPass({

  // (required) 
  camera,

  // (required) Define our world in glsl; `float mapWorld(vec3) {..}`
  mapWorld, 

  // (optional) Array of ambient/directional/point lights
  lights, 
  
  // (optional) Config shadow
  softShadow: { 
    minT: 0.01, 
    maxT: 100.0,
    k: 2.0, // hardness 
    distScale: 1.0 // (0, 1] 
  },

  // (optional) Config marching
  marching: { 
    maxSteps: 1000,
    maxTravelDist: 100.0,
    maxHitMargin: 0.001, 
    distScale: 1.0  // (0, 1] 
  },

  // (optional) Config background 
  background: { 
    color: new THREE.Color(0, 0, 0), 
    alpha: 0 
  }
}));
```

## Thanks

- [Inigo Quilez](https://www.iquilezles.org/index.html)
- [Michael Walczyk](https://michaelwalczyk.com/blog-ray-marching.html)
- [mrdoob / three.js](https://github.com/mrdoob/three.js)
- [ashima / webgl-noise](https://github.com/ashima/webgl-noise/)
- [dmnsgn / glsl-rotate](https://github.com/dmnsgn/glsl-rotate)
