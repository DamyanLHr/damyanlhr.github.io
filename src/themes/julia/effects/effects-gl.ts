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

export const GL_MODES = {
  plain: 0,
  relief: 2,
  ripple: 3,
  field: 4,
  traps: 5,
  heartbeat: 6,
} as const
export type GlMode = keyof typeof GL_MODES

const FRAG = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 uRes, uC, uAt, uOff, uP;
uniform float uSpan, uAngle, uMaxF, uT, uRipple;
uniform int uMode;
uniform vec2 uCyc[8];
uniform int uCycN;
${PALETTE}
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
  for (int k = 0; k < 400; k++) {
    if (k >= mx) break;
    dz = 2.0 * vec2(z.x * dz.x - z.y * dz.y, z.x * dz.y + z.y * dz.x);
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + uC;
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
  if (it >= mx) {
    float v2 = clamp(dot(z, z), 0.0, 4.0);
    col = vec3(14.0 + v2 * 9.0, 8.0 + v2 * 3.0, 9.0 + v2 * 1.5) / 255.0;
    if (uMode == 6) {
      float f = float(conv) * 0.55 - uT * 3.2;
      float beat = 0.5 + 0.5 * sin(f);
      col = mix(col, pal(0.55 + 0.35 * beat), 0.85 * beat);
    }
  } else {
    col = pal(v);
    if (uMode == 2) {
      vec2 u = normalize(vec2(z.x * dz.x + z.y * dz.y, z.y * dz.x - z.x * dz.y) / dot(dz, dz));
      vec2 L = normalize(uP - p);
      float h = 1.6;
      float r = max(0.0, (dot(u, L) + h) / (1.0 + h));
      float near = smoothstep(0.04, 0.4, v);
      col = col * (0.28 + 0.95 * r) + vec3(1.0, 0.62, 0.32) * pow(r, 10.0) * 0.35 * near;
    }
    if (uMode == 3) {
      col += vec3(1.0, 0.42, 0.1) * smoothstep(0.035, 0.0, abs(fract(nu * 0.5) - 0.5)) * 0.07;
      if (uRipple > -1.0)
        col += vec3(1.0, 0.5, 0.15) * smoothstep(1.2, 0.0, abs(nu - uRipple)) * 0.55 * clamp(uRipple / uMaxF * 3.0, 0.0, 1.0);
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
  o = vec4(col, 1.0);
}`

export interface EffectState {
  mode: GlMode
  maxIter?: number
  /** the pointer's lamp, trap or field-line focus, in the plane */
  p?: [number, number]
  t?: number
  /** the ripple's front, in escape-time units; below zero for none */
  ripple?: number
  cycle?: [number, number][] | null
}

export interface EffectGl {
  render: (view: PlaneView, state: EffectState) => void
  dispose: () => void
}

const NAMES = [
  'uRes',
  'uC',
  'uAt',
  'uOff',
  'uP',
  'uSpan',
  'uAngle',
  'uMaxF',
  'uT',
  'uRipple',
  'uMode',
  'uCyc',
  'uCycN',
] as const

export function createEffectGl(canvas: HTMLCanvasElement): EffectGl | null {
  if (!probeGl()) return null
  const gl = canvas.getContext('webgl2', CTX_OPTS)
  if (!gl) return null
  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null
  }
  const vs = compile(gl.VERTEX_SHADER, VERT)
  const fs = compile(gl.FRAGMENT_SHADER, FRAG)
  const program = gl.createProgram()
  if (!vs || !fs || !program) return null
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null
  gl.useProgram(program)
  const u = Object.fromEntries(NAMES.map((n) => [n, gl.getUniformLocation(program, n)])) as Record<
    (typeof NAMES)[number],
    WebGLUniformLocation | null
  >
  const cyc = new Float32Array(16)

  return {
    render(v, s) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.round(canvas.clientWidth * dpr)
      const h = Math.round(canvas.clientHeight * dpr)
      if (!w || !h) return
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      gl.viewport(0, 0, w, h)
      gl.uniform2f(u.uRes, w, h)
      gl.uniform2f(u.uC, v.re, v.im)
      gl.uniform2f(u.uAt, v.cx, v.cy)
      gl.uniform2f(u.uOff, v.off[0], v.off[1])
      gl.uniform1f(u.uSpan, v.span)
      gl.uniform1f(u.uAngle, v.angle)
      gl.uniform2f(u.uP, ...(s.p ?? [9, 9]))
      gl.uniform1f(u.uMaxF, Math.min(400, s.maxIter ?? 170))
      gl.uniform1f(u.uT, s.t ?? 0)
      gl.uniform1f(u.uRipple, s.ripple ?? -2)
      gl.uniform1i(u.uMode, GL_MODES[s.mode])
      const n = Math.min(8, s.cycle?.length ?? 0)
      cyc.fill(0)
      for (let i = 0; i < n; i++) cyc.set(s.cycle![i], i * 2)
      gl.uniform2fv(u.uCyc, cyc)
      gl.uniform1i(u.uCycN, n)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
    dispose() {
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
