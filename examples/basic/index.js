import * as THREE from '//cdn.skypack.dev/three@0.134'
import { OrbitControls } from '//cdn.skypack.dev/three@0.134/examples/jsm/controls/OrbitControls'
import { EffectComposer, FullScreenQuad, Pass } from '//cdn.skypack.dev/three@0.134/examples/jsm/postprocessing/EffectComposer'
import { RayMarchPassGen } from '../../build/three-raymarch.js'

// ----
// main
// ----

const renderer = new THREE.WebGLRenderer({ alpha: true });
const camera = new THREE.PerspectiveCamera(75, 2, .01, 100);
const controls = new OrbitControls(camera, renderer.domElement);

camera.position.set(0, 0, 5);
controls.enableDamping = true;

const lights = [
  new THREE.AmbientLight('white', .1),
  new THREE.DirectionalLight('powderblue', .5),
  new THREE.PointLight('wheat', 2, 8, 1)
];

const mapWorld = `
#include <rm_noise>
#include <rm_transform>
float mapWorld( vec3 p ) {
  float n = cnoise(vec3(p.xy, uTime));
  vec3 d = vec3(n*p.y*.2, n*p.x*.2+sin(uTime)*.2, n);
  vec3 q = opDisplace(p, d*.2);
  
  vec3 q0 = opTx( q, mat4(rotation3d(vec3(-1.), uTime*.4)) );
  float sd0 = sdBoxFrame(q0, vec3(2.), .2);
  
  vec3 q1 = opTx( q, mat4(rotation3d(vec3(1.), uTime*.2)) );
  float sd1 = sdBoxFrame(q1, vec3(2.), .1);

  return opSmoothUnion(sd0, sd1, 1.);
}
`;

// ----
// render
// ----

const composer = new EffectComposer(renderer);
const RayMarchPass = RayMarchPassGen({ THREE, Pass, FullScreenQuad });

composer.addPass(new RayMarchPass({ 
  camera,
  mapWorld, 
  lights, 
  softShadow: { 
    minT: 0.01,  
    maxT: 100.0, 
    k: 4.,
    distScale: 1
  },
  marching: { 
    maxSteps: 500, 
    maxTravelDist: 100.,
    maxHitMargin: .001,  
    distScale: 1.
  },
  background: { 
    color: new THREE.Color(0, 0, 0), 
    alpha: 0 
  }
}));

renderer.setAnimationLoop(() => {
  controls.update();
  composer.render();
});

// ----
// view
// ----

function resize(w, h, dpr = devicePixelRatio) {
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  composer.setPixelRatio(dpr);
  composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', () => resize(innerWidth >> 1, innerHeight >> 1));
dispatchEvent(new Event('resize'));
document.body.prepend(renderer.domElement);