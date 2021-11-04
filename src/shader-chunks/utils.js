// ---
// Michael Walczyk - calc normal
// https://michaelwalczyk.com/blog-ray-marching.html
// ---

export const rm_calc_normal = `
vec3 calcNormal( vec3 p ) {
  const vec3 D = vec3(.001, 0., 0.);
  float dx = mapWorld( p + D.xyy ) - mapWorld( p - D.xyy );
  float dy = mapWorld( p + D.yxy ) - mapWorld( p - D.yxy );
  float dz = mapWorld( p + D.yyx ) - mapWorld( p - D.yyx );
  return normalize( vec3( dx, dy, dz ) );
}
`;

// ---
// Inigo Quilez - soft shadow
// https://www.iquilezles.org/www/articles/rmshadows/rmshadows.htm
// ---

export const rm_soft_shadow = `
float softshadow( vec3 ro, vec3 rd, float mint, float maxt, float k ) {
  float res = 1.0;
  
  for( float t=mint; t<maxt; ) {
    if ( t >= maxt ) break;
    vec3 p = ro + t * rd;
    float h = mapWorld(p);
    if( h<0.001 )
      return 0.0;
    res = min( res, k*h/t );
    t += h * max(0.01, uRmSoftShadow.distScale);
  }
  return res;
}
`;

// ---
// world pos from uv
// ---

export const rm_calc_world_pos = `
vec3 calcWorldPos( vec2 uv ) {
  vec4 p_clip = vec4( vec3(uv, 0.) * 2. - 1., 1. );
  vec4 p_view = uProjMatrixInv * p_clip;
  p_view /= p_view.w;
  return ( uViewMatrixInv * p_view ).xyz;
}
`;

// ---
// lights pars
// ---

export const rm_lights_pars = `
struct DLight { vec3 color; vec3 position; float intensity; bool visible; };
struct ALight { vec3 color; float intensity; bool visible; };
struct PLight { vec3 color; vec3 position; float distance; float decay; float intensity; bool visible; };

#if N_DLIGHTS > 0
uniform DLight dLights[N_DLIGHTS];
#endif 

#if N_ALIGHTS > 0
uniform ALight aLights[N_ALIGHTS];
#endif

#if N_PLIGHTS > 0
uniform PLight pLights[N_PLIGHTS];
#endif
`;

// ---
// ray march
// ---

export const rm_ray_march = `
struct Marching {
  int maxSteps;
  float maxTravelDist;
  float maxHitMargin;
  float distScale;
};
uniform Marching uRmMarching;

struct SoftShadow {
  float minT;
  float maxT;
  float k;
  float distScale;
};
uniform SoftShadow uRmSoftShadow;

struct Background {
  vec3 color;
  float alpha;
};
uniform Background uBackground;

#include <rm_calc_normal>
#include <rm_lights_pars>
#include <rm_soft_shadow>

float calcLightStrength( vec3 p, vec3 normal, vec3 Ld, float Li, float maxT ) {
  return max( 0., dot( normal, Ld ) ) * Li 
    * softshadow( p, Ld, uRmSoftShadow.minT, maxT, uRmSoftShadow.k );
}

vec4 rayMarch( vec3 ro, vec3 rd ) {
  float t = 0.0;
  vec4 c = vec4(uBackground.color, uBackground.alpha);

  for ( int i = 0 ; i < uRmMarching.maxSteps ; ++i ) {
    vec3 p = ro + t * rd;

    float distanceToClosest = mapWorld( p );
    if ( abs(distanceToClosest) < uRmMarching.maxHitMargin ) { // hit
      vec3 normal = calcNormal( p );
      c.rgba = vec4(0., 0., 0., 1.);

      #if N_ALIGHTS > 0
      for ( int i = 0 ; i < N_ALIGHTS ; i ++ ) {
        ALight L = aLights[i];
        c.rgb += L.color * L.intensity;
      }
      #endif

      #if N_DLIGHTS > 0
      for ( int i = 0 ; i < N_DLIGHTS ; i ++ ) {
        DLight L = dLights[i];
        if ( L.visible ) {
          vec3 Ld = normalize(L.position);
          c.rgb += L.color * calcLightStrength(p, normal, Ld, L.intensity, uRmSoftShadow.maxT);
        }
      }
      #endif

      #if N_PLIGHTS > 0
      for ( int i = 0; i < N_PLIGHTS; i ++ ) {
        PLight L = pLights[i];
        if ( L.visible ) {
          vec3 toL = L.position - p;
          float d = length(toL);
          vec3 Ld = normalize(toL);
          float k = 1.;
          if ( L.distance > 0. ) {
            k = pow(max(.001, 1. - d / L.distance), L.decay);
          }
          c.rgb += L.color * calcLightStrength(p, normal, Ld, L.intensity, d) * k;
        }
      }
      #endif
      break;
    }

    if ( t > uRmMarching.maxTravelDist ) { // miss
      break;
    }

    t += distanceToClosest * max(0.01, uRmMarching.distScale); // advance
  }
  return c; 
}
`;