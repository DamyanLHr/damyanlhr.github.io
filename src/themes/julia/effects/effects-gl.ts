import { CTX_OPTS, PALETTE, probeGl, VERT } from '../fractal-gl'
import type { PlaneView } from './view'

// One shader for every GL plate effect, switched by a mode uniform. Each mode
// reads a different by-product of the same iteration, so none of them costs
// more than the plain render:
//   plain     escape time (and the scroll dive, which only moves the view)
//   relief    the derivative as a surface normal, lit by a lamp at uP
//   ripple    equipotential contours, plus a wave front at uRipple
//   field     lines of constant external angle, lit near uP
//   traps     how close each orbit passes to a trap at uP
//   heartbeat inside the set, rings of time-to-reach the attracting cycle
//
// and five that draw a different picture of the same plane, developing out
// of the plain set as uAmount rises (the first three after 2swap's swaptube,
// src/CUDA/mandelbrot.cu and complex_functions.cuh):
//   shape     z <- z^x + c with the exponent x moving
//   mandjul   each pixel sliding from being c to being the starting point
//   ship      the Mandelbrot, Burning Ship and Tricorn switches, blended
//   newton    Newton's method on four drifting roots; the pointer carries one
//   phoenix   the Phoenix fractal, its memory breathing

export const GL_MODES = {
  plain: 0,
  relief: 2,
  ripple: 3,
  field: 4,
  traps: 5,
  heartbeat: 6,
  shape: 7,
  mandjul: 8,
  newton: 9,
  phoenix: 10,
  ship: 11,
} as const
export type GlMode = keyof typeof GL_MODES

const FRAG = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 uRes, uC, uAt, uOff, uP, uQ;
uniform float uSpan, uAngle, uMaxF, uT, uRipple, uAmount, uDim;
uniform int uMode;
uniform vec2 uCyc[8];
uniform int uCycN;
${PALETTE}
vec2 cmul(vec2 a, vec2 b) { return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
vec2 cinv(vec2 b) { return vec2(b.x, -b.y) / dot(b, b); }
vec2 cpow(vec2 z, vec2 w) {
  float r = length(z);
  if (r < 1e-12) return vec2(0.0);
  float th = atan(z.y, z.x), lr = log(r);
  float nr = exp(w.x * lr - w.y * th), na = w.y * lr + w.x * th;
  return nr * vec2(cos(na), sin(na));
}
vec3 escapeCol(int k, int mx, vec2 z) {
  if (k >= mx) {
    float v2 = clamp(dot(z, z), 0.0, 4.0);
    return vec3(14.0 + v2 * 9.0, 8.0 + v2 * 3.0, 9.0 + v2 * 1.5) / 255.0;
  }
  float nu = float(k) + 1.0 - log2(max(log2(max(dot(z, z), 1.0001)), 1e-3));
  return pal(nu / float(mx) * 2.4);
}

// The five pictures that are not the Julia set itself. p is the point of the
// plane under the pixel; uQ is the pointer across the band, -1..1.
vec3 another(vec2 p) {
  float t = uT;
  if (uMode == 7) {
    vec2 c = p + vec2(-0.35, 0.0);
    vec2 x = vec2(2.0 + 1.35 * (0.5 - 0.5 * cos(t * 0.33)) + uQ.x * 0.6, 0.32 * sin(t * 0.21));
    vec2 z = vec2(0.0);
    int k = 0;
    for (; k < 90; k++) { z = cpow(z, x) + c; if (dot(z, z) > 16.0) break; }
    return escapeCol(k, 90, z);
  }
  if (uMode == 8) {
    // folds into the page's own Julia set, nudged by the pointer
    float b = 0.5 - 0.5 * cos(t * 0.42);
    vec2 cj = uC + uQ * vec2(0.12, 0.1);
    vec2 q = p + mix(vec2(-0.55, 0.0), vec2(0.0), b);
    vec2 z = mix(vec2(0.0), q, b), c = mix(q, cj, b);
    int k = 0;
    for (; k < 130; k++) { z = cmul(z, z) + c; if (dot(z, z) > 16.0) break; }
    return escapeCol(k, 130, z);
  }
  if (uMode == 9) {
    vec2 r0 = length(uP) < 5.0 ? uP : vec2(cos(t * 0.31), sin(t * 0.37)) * 0.9;
    vec2 r1 = vec2(cos(t * 0.23 + 2.1), sin(t * 0.29 + 2.1)) * 1.05;
    vec2 r2 = vec2(cos(-t * 0.19 + 4.0), sin(-t * 0.21 + 4.0)) * 0.8;
    vec2 r3 = vec2(cos(t * 0.17 + 5.3), sin(t * 0.13 + 5.3)) * 1.2;
    vec2 z = p;
    int hit = -1, n = 0;
    for (; n < 40; n++) {
      vec2 s = cinv(z - r0) + cinv(z - r1) + cinv(z - r2) + cinv(z - r3);
      z -= cinv(s);
      if (length(z - r0) < 1e-3) hit = 0;
      else if (length(z - r1) < 1e-3) hit = 1;
      else if (length(z - r2) < 1e-3) hit = 2;
      else if (length(z - r3) < 1e-3) hit = 3;
      if (hit >= 0) break;
    }
    float k = float(n);
    vec3 b = hit == 0 ? pal(0.55) : hit == 1 ? pal(0.34) : hit == 2 ? pal(0.74) : hit == 3 ? pal(0.9) : vec3(0.03);
    // fast convergence is bright, the fractal borders where it hesitates are
    // dark, and each extra step is a band, so the basins show their contours
    vec3 col = b * (0.12 + 0.88 * exp(-k * 0.11)) * (0.82 + 0.18 * cos(k * 1.4));
    float d = min(min(length(p - r0), length(p - r1)), min(length(p - r2), length(p - r3)));
    return col + vec3(1.0, 0.85, 0.6) * (1.0 - smoothstep(0.0, 0.035, d));
  }
  if (uMode == 10) {
    vec2 z = vec2(p.y, p.x), zp = vec2(0.0);
    float pp = -0.5 + 0.07 * sin(t * 0.5) + uQ.x * 0.08;
    int k = 0;
    for (; k < 110; k++) { vec2 zn = cmul(z, z) + vec2(0.5667, 0.0) + pp * zp; zp = z; z = zn; if (dot(z, z) > 16.0) break; }
    return escapeCol(k, 110, z);
  }
  float a = clamp(0.5 - 0.5 * cos(t * 0.27) + uQ.x * 0.3, 0.0, 1.0);
  float cj = clamp(0.5 - 0.5 * cos(t * 0.19 + 1.3) + uQ.y * 0.3, 0.0, 1.0);
  vec2 c = p + vec2(-0.45, -0.15), z = vec2(0.0);
  int k = 0;
  for (; k < 110; k++) {
    float zr = mix(z.x, abs(z.x), a), zi = mix(z.y, abs(z.y), a);
    z = vec2(zr * zr - zi * zi, 2.0 * zr * zi * (1.0 - 2.0 * cj)) + c;
    if (dot(z, z) > 16.0) break;
  }
  return escapeCol(k, 110, z);
}

void main() {
  float scale = uSpan / min(uRes.x, uRes.y);
  vec2 d = vec2(gl_FragCoord.x - uAt.x * uRes.x, (uRes.y - gl_FragCoord.y) - uAt.y * uRes.y) * scale;
  float ca = cos(uAngle), sa = sin(uAngle);
  vec2 p = vec2(d.x * ca - d.y * sa, d.x * sa + d.y * ca) + uOff;
  vec2 z = p, dz = vec2(1.0, 0.0);
  int mx = int(uMaxF);
  int it = mx;
  int conv = mx;
  float trap = 1e9;
  float mn = 1e9;
  for (int k = 0; k < 400; k++) {
    if (k >= mx) break;
    dz = 2.0 * vec2(z.x * dz.x - z.y * dz.y, z.x * dz.y + z.y * dz.x);
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + uC;
    mn = min(mn, dot(z, z));
    if (uMode == 5) trap = min(trap, length(z - uP));
    if (uMode == 6 && conv == mx) {
      for (int j = 0; j < 8; j++) {
        if (j >= uCycN) break;
        if (length(z - uCyc[j]) < 0.02) conv = k;
      }
    }
    if (dot(z, z) > 256.0) { it = k; break; }
  }
  vec3 col;
  float nu = float(it) + 1.0 - log2(log2(max(dot(z, z), 1.0001)) * 0.5);
  // Coloured against the base count, not the live one: a dive raises the
  // count to keep the boundary sharp, and dividing by it would dim everything.
  float v = nu / min(uMaxF, 170.0) * 2.2;
  vec3 base;
  if (it >= mx) {
    // the inside, shaded by how close its orbit comes to zero (as fractal-gl.ts)
    float v2 = clamp(dot(z, z), 0.0, 4.0);
    vec3 deep = vec3(14.0 + v2 * 9.0, 8.0 + v2 * 3.0, 9.0 + v2 * 1.5) / 255.0;
    col = max(deep, pal(0.05 + 0.26 * exp(-2.2 * sqrt(mn))) * 0.85);
    base = col;
    if (uMode == 6) {
      float f = float(conv) * 0.55 - uT * 3.2;
      float beat = 0.5 + 0.5 * sin(f);
      col = mix(col, pal(0.55 + 0.35 * beat), 0.85 * beat);
    }
  } else {
    col = pal(v);
    base = col;
    if (uMode == 2) {
      vec2 u = normalize(vec2(z.x * dz.x + z.y * dz.y, z.y * dz.x - z.x * dz.y) / dot(dz, dz));
      vec2 L = normalize(uP - p);
      float h = 1.6;
      float r = max(0.0, (dot(u, L) + h) / (1.0 + h));
      float near = smoothstep(0.04, 0.4, v);
      col = col * (0.28 + 0.95 * r) + vec3(1.0, 0.62, 0.32) * pow(r, 10.0) * 0.35 * near;
    }
    if (uMode == 3) {
      col += vec3(1.0, 0.42, 0.1) * (1.0 - smoothstep(0.0, 0.035, abs(fract(nu * 0.5) - 0.5))) * 0.07;
      if (uRipple > -1.0)
        // the front: a bright contour that runs outward through the field and
        // only fades in its last few levels, so it reads all the way out
        col += vec3(1.0, 0.5, 0.15) * (1.0 - smoothstep(0.0, 2.2, abs(nu - uRipple))) * 0.8 * smoothstep(0.0, 6.0, uRipple);
    }
    if (uMode == 4) {
      float ang = atan(z.y, z.x) / 6.2831853;
      float line = smoothstep(0.43, 0.5, abs(fract(ang * 8.0) - 0.5));
      float near = exp(-length(p - uP) * 2.6);
      col = col * 0.85 + vec3(1.0, 0.5, 0.18) * line * (0.16 + 0.85 * near);
    }
  }
  if (uMode == 5) {
    float g = exp(-trap * 3.5);
    col = mix(col * 0.55, pal(0.35 + 0.6 * g), 0.75 * g) + vec3(1.0, 0.8, 0.55) * pow(g, 8.0) * 0.4;
  }
  if (uMode >= 7) col = another(p);
  // uAmount develops the effect out of the plain set: 0 is the set alone.
  // uDim turns the whole picture down toward the page's ground.
  o = vec4(mix(vec3(10.0, 11.0, 13.0) / 255.0, mix(base, col, uAmount), uDim), 1.0);
}`

export interface EffectState {
  mode: GlMode
  /** how far the effect has developed out of the plain set, 0..1 (default 1) */
  amount?: number
  maxIter?: number
  /** the pointer's lamp, trap or field-line focus, in the plane */
  p?: [number, number]
  /** the pointer across the surface, -1..1 each way, for effects that read it as a dial */
  q?: [number, number]
  t?: number
  /** the ripple's front, in escape-time units; below zero for none */
  ripple?: number
  cycle?: [number, number][] | null
}

export interface EffectGl {
  /**
   * Draws at the canvas's own size times `scale` (a resolution cut for slow
   * devices), or at an explicit pixel size for an offscreen canvas. False when
   * nothing was drawn because the program is still compiling.
   */
  render: (
    view: PlaneView,
    state: EffectState,
    size?: { width: number; height: number } | { scale: number },
    extra?: DrawExtra,
  ) => boolean
  /** Whether the program has finished compiling, so a render will draw. */
  ready: () => boolean
  dispose: () => void
}

export interface DrawExtra {
  /** how far the picture is turned down toward the ground, 0..1 (default 1, none) */
  dim?: number
  /** draw only this many device pixels from the top; the rest is left empty */
  clip?: number
}

const NAMES = [
  'uRes',
  'uC',
  'uAt',
  'uOff',
  'uP',
  'uQ',
  'uSpan',
  'uAngle',
  'uMaxF',
  'uT',
  'uRipple',
  'uAmount',
  'uDim',
  'uMode',
  'uCyc',
  'uCycN',
] as const

export function createEffectGl(
  canvas: HTMLCanvasElement,
  opts: { preserve?: boolean; parallel?: boolean } = {},
): EffectGl | null {
  if (!probeGl()) return null
  // An offscreen canvas that is copied from after drawing must keep its pixels.
  const gl = canvas.getContext('webgl2', { ...CTX_OPTS, preserveDrawingBuffer: !!opts.preserve })
  if (!gl) return null
  const program = buildProgram(gl, FRAG, !!opts.parallel)
  if (!program) return null
  let u: Record<(typeof NAMES)[number], WebGLUniformLocation | null> | null = null
  const ready = () => {
    if (u) return true
    if (!program.ready()) return false
    u = Object.fromEntries(NAMES.map((n) => [n, gl.getUniformLocation(program.p, n)])) as Record<
      (typeof NAMES)[number],
      WebGLUniformLocation | null
    >
    return true
  }
  const cyc = new Float32Array(16)

  return {
    ready,
    render(v, s, size, extra) {
      if (!ready() || !u) return false
      let w: number
      let h: number
      if (size && 'width' in size) {
        w = size.width
        h = size.height
      } else {
        const dpr = Math.min(window.devicePixelRatio || 1, 2) * (size?.scale ?? 1)
        w = Math.round(canvas.clientWidth * dpr)
        h = Math.round(canvas.clientHeight * dpr)
      }
      if (!w || !h) return false
      if (size && 'width' in size) {
        // An offscreen canvas shared by many sizes only ever grows; the frame
        // goes in its bottom-left corner, where `copyTo` reads it from.
        if (canvas.width < w || canvas.height < h) {
          canvas.width = Math.max(canvas.width, w)
          canvas.height = Math.max(canvas.height, h)
        }
      } else if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      // the context may be shared with the simulations, so claim it each time
      gl.useProgram(program.p)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, w, h)
      // Only the band shows on a band page; the rows under it are not drawn.
      const clip = extra?.clip
      if (clip !== undefined && clip < h) {
        gl.enable(gl.SCISSOR_TEST)
        gl.scissor(0, Math.max(0, h - Math.ceil(clip)), w, Math.ceil(clip))
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
      } else gl.disable(gl.SCISSOR_TEST)
      gl.uniform2f(u.uRes, w, h)
      gl.uniform2f(u.uC, v.re, v.im)
      gl.uniform2f(u.uAt, v.cx, v.cy)
      gl.uniform2f(u.uOff, v.off[0], v.off[1])
      gl.uniform1f(u.uSpan, v.span)
      gl.uniform1f(u.uAngle, v.angle)
      gl.uniform2f(u.uP, ...(s.p ?? [9, 9]))
      gl.uniform2f(u.uQ, ...(s.q ?? [0, 0]))
      gl.uniform1f(u.uMaxF, Math.min(400, s.maxIter ?? 170))
      gl.uniform1f(u.uT, s.t ?? 0)
      gl.uniform1f(u.uRipple, s.ripple ?? -2)
      gl.uniform1f(u.uAmount, s.amount ?? 1)
      gl.uniform1f(u.uDim, extra?.dim ?? 1)
      gl.uniform1i(u.uMode, GL_MODES[s.mode])
      const n = Math.min(8, s.cycle?.length ?? 0)
      cyc.fill(0)
      for (let i = 0; i < n; i++) cyc.set(s.cycle![i], i * 2)
      gl.uniform2fv(u.uCyc, cyc)
      gl.uniform1i(u.uCycN, n)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      gl.disable(gl.SCISSOR_TEST)
      return true
    },
    dispose() {
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}

/**
 * Compiles and links a program. With `parallel`, and the driver's
 * KHR_parallel_shader_compile, nothing waits on the compile: asking for a
 * shader's status straight after compiling it is what makes the main thread
 * stall until the driver is done (tens to hundreds of milliseconds for the
 * effects shader on some machines). `ready()` polls instead, so callers can
 * skip a frame and try again.
 */
export function buildProgram(gl: WebGL2RenderingContext, frag: string, parallel: boolean) {
  const vs = gl.createShader(gl.VERTEX_SHADER)
  const fs = gl.createShader(gl.FRAGMENT_SHADER)
  const p = gl.createProgram()
  if (!vs || !fs || !p) return null
  gl.shaderSource(vs, VERT)
  gl.shaderSource(fs, frag)
  gl.compileShader(vs)
  gl.compileShader(fs)
  gl.attachShader(p, vs)
  gl.attachShader(p, fs)
  gl.linkProgram(p)
  const ext = parallel ? gl.getExtension('KHR_parallel_shader_compile') : null
  let state: 'pending' | 'ok' | 'failed' = 'pending'
  const settle = () => {
    state = gl.getProgramParameter(p, gl.LINK_STATUS) ? 'ok' : 'failed'
    return state === 'ok'
  }
  if (!ext && !settle()) return null
  return {
    p,
    ready() {
      if (state === 'pending') {
        if (!gl.getProgramParameter(p, ext!.COMPLETION_STATUS_KHR)) return false
        settle()
      }
      return state === 'ok'
    },
  }
}
