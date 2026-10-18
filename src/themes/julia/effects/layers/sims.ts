import { ember } from '../../fractal'
import { PALETTE, VERT } from '../../fractal-gl'
import { copyTo, sharedContext } from '../thumbs'
import { fitCanvas, type LayerFactory } from './layer'

// The three simulations: every pixel a double pendulum (after 2swap's
// swaptube, src/CUDA/pendulum_fractal.cu), Conway's Game of Life seeded from
// a Julia set's edge (after swaptube's ConwayScene), and Gray-Scott coral
// grown out of the set. They run on the GPU in the cards' shared context,
// ping-ponging between two textures, and the picture is copied onto the
// layer. Without WebGL, or without float textures, a smaller simulation runs
// on the CPU instead.

type Kind = 'pendulum' | 'life' | 'coral'

interface Spec {
  size: [number, number]
  float: boolean
  /** simulation steps per frame, and frames per step (life is slower) */
  steps: number
  every?: number
  nearest?: boolean
  init: string
  step: string
  show: string
}

const HEAD = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 uRes;
`

// Float textures cannot be filtered on most GPUs, so the show passes blend the
// four nearest cells themselves: the picture stays smooth however far the
// simulation is stretched over the band.
const BLEND = `ivec2 cl(ivec2 p) { return clamp(p, ivec2(0), textureSize(uS, 0) - 1); }
#define BILERP(F, q) { vec2 b_ = (q) - 0.5; ivec2 i_ = ivec2(floor(b_)); vec2 f_ = fract(b_); res = mix(mix(F(cl(i_)), F(cl(i_ + ivec2(1, 0))), f_.x), mix(F(cl(i_ + ivec2(0, 1))), F(cl(i_ + ivec2(1, 1))), f_.x), f_.y); }
`

const SPECS: Record<Kind, Spec> = {
  pendulum: {
    size: [640, 360],
    float: true,
    steps: 3,
    init: `${HEAD}uniform float uSeed;
void main() { vec2 uv = gl_FragCoord.xy / uRes; o = vec4((uv.x * 2.0 - 1.0) * 3.14159, (uv.y * 2.0 - 1.0) * 3.14159, 0.0, 0.0); }`,
    // equal masses and arms; RK4 at a fixed step
    step: `${HEAD}uniform sampler2D uS;
vec4 f(vec4 s) {
  float t1 = s.x, t2 = s.y, w1 = s.z, w2 = s.w, g = 9.81, d = t1 - t2, den = 3.0 - cos(2.0 * d);
  float a1 = (-3.0 * g * sin(t1) - g * sin(t1 - 2.0 * t2) - 2.0 * sin(d) * (w2 * w2 + w1 * w1 * cos(d))) / den;
  float a2 = (2.0 * sin(d) * (2.0 * w1 * w1 + 2.0 * g * cos(t1) + w2 * w2 * cos(d))) / den;
  return vec4(w1, w2, a1, a2);
}
void main() {
  vec4 s = texelFetch(uS, ivec2(gl_FragCoord.xy), 0);
  float h = 0.012;
  vec4 k1 = f(s), k2 = f(s + 0.5 * h * k1), k3 = f(s + 0.5 * h * k2), k4 = f(s + h * k3);
  o = s + h / 6.0 * (k1 + 2.0 * k2 + 2.0 * k3 + k4);
}`,
    // the angles wrap, so it is the colours that are blended, not the angles
    show: `${HEAD}uniform sampler2D uS;
${PALETTE}
${BLEND}
vec3 col(ivec2 p) {
  vec4 s = texelFetch(uS, p, 0);
  float a = 0.5 - 0.5 * cos(s.x), b = 0.5 - 0.5 * cos(s.y);
  return pal(0.12 + 0.55 * a * b + 0.3 * b * (1.0 - a));
}
void main() {
  vec3 res;
  BILERP(col, gl_FragCoord.xy / uRes * vec2(textureSize(uS, 0)))
  o = vec4(res, 1.0);
}`,
  },
  life: {
    size: [320, 180],
    float: false,
    steps: 1,
    every: 3,
    nearest: true,
    init: `${HEAD}uniform float uSeed; uniform vec2 uC;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed * 13.7) * 43758.5453); }
void main() {
  vec2 f = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y * 2.8;
  vec2 c = uC + vec2(0.05 * sin(uSeed), 0.04 * cos(uSeed * 1.7));
  vec2 z = vec2(f.x, -f.y);
  int k = 0;
  for (; k < 60; k++) { z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c; if (dot(z, z) > 16.0) break; }
  float alive = (k > 5 && k < 60 && h(gl_FragCoord.xy) < 0.55) ? 1.0 : 0.0;
  o = vec4(alive, alive, 0.0, 1.0);
}`,
    step: `${HEAD}uniform sampler2D uS;
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy), sz = ivec2(uRes);
  int n = 0;
  for (int dy = -1; dy <= 1; dy++)
    for (int dx = -1; dx <= 1; dx++) {
      if (dx == 0 && dy == 0) continue;
      n += texelFetch(uS, (p + ivec2(dx, dy) + sz) % sz, 0).r > 0.5 ? 1 : 0;
    }
  vec4 s = texelFetch(uS, p, 0);
  float alive = (s.r > 0.5 && (n == 2 || n == 3)) || (s.r < 0.5 && n == 3) ? 1.0 : 0.0;
  o = vec4(alive, max(alive, s.g * 0.93), 0.0, 1.0);
}`,
    // live cells are round embers once there is room to draw them round; the
    // trails they leave are blended smooth
    show: `${HEAD}uniform sampler2D uS;
${PALETTE}
${BLEND}
float trail(ivec2 p) { return texelFetch(uS, p, 0).g; }
void main() {
  vec2 sz = vec2(textureSize(uS, 0));
  vec2 q = gl_FragCoord.xy / uRes * sz;
  float alive = texelFetch(uS, cl(ivec2(q)), 0).r;
  float res;
  BILERP(trail, q)
  float disc = alive * (1.0 - smoothstep(0.3, 0.5, length(fract(q) - 0.5)));
  float room = clamp((uRes.x / sz.x - 2.0) * 0.5, 0.0, 1.0);
  o = vec4(pal(0.05 + 0.5 * res + 0.42 * mix(alive, disc, room)), 1.0);
}`,
  },
  coral: {
    size: [512, 288],
    float: true,
    steps: 18,
    init: `${HEAD}uniform float uSeed; uniform vec2 uC;
void main() {
  vec2 f = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y * 2.9;
  vec2 z = vec2(f.x, -f.y);
  int k = 0;
  for (; k < 70; k++) { z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + uC; if (dot(z, z) > 16.0) break; }
  float v = (k > 14 && k < 70) ? 1.0 : 0.0;
  o = vec4(1.0 - v * 0.5, v * 0.25, 0.0, 1.0);
}`,
    step: `${HEAD}uniform sampler2D uS; uniform vec3 uDrop;
vec2 at(ivec2 p, ivec2 sz) { return texelFetch(uS, (p + sz) % sz, 0).rg; }
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy), sz = ivec2(uRes);
  vec2 s = at(p, sz);
  vec2 lap = -s
    + 0.2 * (at(p + ivec2(1, 0), sz) + at(p + ivec2(-1, 0), sz) + at(p + ivec2(0, 1), sz) + at(p + ivec2(0, -1), sz))
    + 0.05 * (at(p + ivec2(1, 1), sz) + at(p + ivec2(-1, 1), sz) + at(p + ivec2(1, -1), sz) + at(p + ivec2(-1, -1), sz));
  float u = s.x, v = s.y, F = 0.0545, K = 0.062, uvv = u * v * v;
  u += 1.0 * lap.x - uvv + F * (1.0 - u);
  v += 0.5 * lap.y + uvv - (F + K) * v;
  if (uDrop.z > 0.0 && length(gl_FragCoord.xy - uDrop.xy) < 7.0) v = 0.5;
  o = vec4(clamp(u, 0.0, 1.0), clamp(v, 0.0, 1.0), 0.0, 1.0);
}`,
    show: `${HEAD}uniform sampler2D uS;
${PALETTE}
${BLEND}
float v(ivec2 p) { return texelFetch(uS, p, 0).g; }
void main() {
  float res;
  BILERP(v, gl_FragCoord.xy / uRes * vec2(textureSize(uS, 0)))
  o = vec4(pal(0.04 + res * 2.6), 1.0);
}`,
  },
}

interface Prog {
  p: WebGLProgram
  u: (name: string) => WebGLUniformLocation | null
}

const programs = new WeakMap<WebGL2RenderingContext, Map<string, Prog | null>>()

function program(gl: WebGL2RenderingContext, src: string): Prog | null {
  let cache = programs.get(gl)
  if (!cache) programs.set(gl, (cache = new Map()))
  if (cache.has(src)) return cache.get(src)!
  const sh = (type: number, s: string) => {
    const x = gl.createShader(type)!
    gl.shaderSource(x, s)
    gl.compileShader(x)
    return gl.getShaderParameter(x, gl.COMPILE_STATUS) ? x : null
  }
  const vs = sh(gl.VERTEX_SHADER, VERT)
  const fs = sh(gl.FRAGMENT_SHADER, src)
  const p = gl.createProgram()
  let out: Prog | null = null
  if (vs && fs && p) {
    gl.attachShader(p, vs)
    gl.attachShader(p, fs)
    gl.linkProgram(p)
    if (gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const locs = new Map<string, WebGLUniformLocation | null>()
      out = {
        p,
        u: (n) => {
          if (!locs.has(n)) locs.set(n, gl.getUniformLocation(p, n))
          return locs.get(n)!
        },
      }
    }
  }
  cache.set(src, out)
  return out
}

function gpuSim(kind: Kind, canvas: HTMLCanvasElement, c: [number, number]) {
  const gl = sharedContext()
  const spec = SPECS[kind]
  if (!gl || (spec.float && !gl.getExtension('EXT_color_buffer_float'))) return null
  const init = program(gl, spec.init)
  const step = program(gl, spec.step)
  const show = program(gl, spec.show)
  if (!init || !step || !show) return null
  const [w, h] = spec.size
  const target = () => {
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    if (spec.float) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, null)
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    // float textures cannot be filtered; the life grid wants its square cells
    const filter = spec.float || spec.nearest ? gl.NEAREST : gl.LINEAR
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const fb = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    return { tex, fb }
  }
  let a = target()
  let b = target()
  let seed = Math.random() * 6
  let drop: [number, number] | null = null
  let frame = 0

  const pass = (p: Prog, fb: WebGLFramebuffer | null, src: WebGLTexture | null, rw = w, rh = h) => {
    gl.useProgram(p.p)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
    gl.viewport(0, 0, rw, rh)
    gl.uniform2f(p.u('uRes'), rw, rh)
    if (src) {
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, src)
      gl.uniform1i(p.u('uS'), 0)
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
  const reset = () => {
    gl.useProgram(init.p)
    gl.uniform1f(init.u('uSeed'), seed)
    gl.uniform2f(init.u('uC'), c[0], c[1])
    pass(init, a.fb, null)
    frame = 0
  }
  reset()

  return {
    step(n = 1) {
      for (let k = 0; k < n; k++) {
        frame++
        if (spec.every && frame % spec.every) continue
        for (let i = 0; i < spec.steps; i++) {
          gl.useProgram(step.p)
          if (kind === 'coral')
            gl.uniform3f(step.u('uDrop'), drop?.[0] ?? 0, drop?.[1] ?? 0, drop ? 1 : 0)
          pass(step, b.fb, a.tex)
          const s = a
          a = b
          b = s
        }
        drop = null
      }
    },
    draw() {
      const [cw, ch] = fitCanvas(canvas, 1800, 2)
      const off = gl.canvas as HTMLCanvasElement
      if (off.width < cw || off.height < ch) {
        off.width = Math.max(off.width, cw)
        off.height = Math.max(off.height, ch)
      }
      pass(show, null, a.tex, cw, ch)
      copyTo(canvas, cw, ch)
    },
    press(fx: number, fy: number) {
      if (kind === 'coral') drop = [fx * w, (1 - fy) * h]
      else {
        seed += 1.3
        reset()
      }
    },
    dispose() {
      for (const t of [a, b]) {
        gl.deleteTexture(t.tex)
        gl.deleteFramebuffer(t.fb)
      }
    },
  }
}

// ---------------------------------------------------------------- CPU floor

function cpuSim(kind: Kind, canvas: HTMLCanvasElement, c: [number, number]) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const W = 128
  const H = 72
  const A = new Float32Array(W * H * 4)
  const B = new Float32Array(W * H * 4)
  let cur = A
  let nxt = B
  let seed = Math.random() * 6
  let frame = 0
  const small = document.createElement('canvas')
  small.width = W
  small.height = H
  const sctx = small.getContext('2d')!
  const img = sctx.createImageData(W, H)
  const escape = (fx: number, fy: number, scale: number, max: number, cc: [number, number]) => {
    let x = fx * scale
    let y = -fy * scale
    let k = 0
    for (; k < max && x * x + y * y < 16; k++) {
      const t = x * x - y * y + cc[0]
      y = 2 * x * y + cc[1]
      x = t
    }
    return k
  }
  const reset = () => {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4
        const fx = (x - W / 2) / H
        const fy = (y - H / 2) / H
        if (kind === 'pendulum') {
          cur[i] = ((x / W) * 2 - 1) * Math.PI
          cur[i + 1] = (((H - 1 - y) / H) * 2 - 1) * Math.PI
          cur[i + 2] = cur[i + 3] = 0
        } else if (kind === 'life') {
          const cc: [number, number] = [c[0] + 0.05 * Math.sin(seed), c[1] + 0.04 * Math.cos(seed)]
          const k = escape(fx, fy, 2.8, 60, cc)
          cur[i] = cur[i + 1] = k > 5 && k < 60 && Math.random() < 0.55 ? 1 : 0
        } else {
          const k = escape(fx, fy, 2.9, 70, c)
          const v = k > 14 && k < 70 ? 1 : 0
          cur[i] = 1 - v * 0.5
          cur[i + 1] = v * 0.25
        }
      }
    frame = 0
  }
  reset()
  const g = 9.81
  const f = (s: number[]) => {
    const [t1, t2, w1, w2] = s
    const d = t1 - t2
    const den = 3 - Math.cos(2 * d)
    return [
      w1,
      w2,
      (-3 * g * Math.sin(t1) -
        g * Math.sin(t1 - 2 * t2) -
        2 * Math.sin(d) * (w2 * w2 + w1 * w1 * Math.cos(d))) /
        den,
      (2 * Math.sin(d) * (2 * w1 * w1 + 2 * g * Math.cos(t1) + w2 * w2 * Math.cos(d))) / den,
    ]
  }
  let drop: [number, number] | null = null
  const once = () => {
    const at = (x: number, y: number, k: number) => cur[(((y + H) % H) * W + ((x + W) % W)) * 4 + k]
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4
        if (kind === 'pendulum') {
          const s = [cur[i], cur[i + 1], cur[i + 2], cur[i + 3]]
          const h = 0.012
          const k1 = f(s)
          const k2 = f(s.map((v, j) => v + 0.5 * h * k1[j]))
          const k3 = f(s.map((v, j) => v + 0.5 * h * k2[j]))
          const k4 = f(s.map((v, j) => v + h * k3[j]))
          for (let j = 0; j < 4; j++)
            nxt[i + j] = s[j] + (h / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])
        } else if (kind === 'life') {
          let n = 0
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && at(x + dx, y + dy, 0) > 0.5) n++
          const alive = (cur[i] > 0.5 && (n === 2 || n === 3)) || (cur[i] < 0.5 && n === 3) ? 1 : 0
          nxt[i] = alive
          nxt[i + 1] = Math.max(alive, cur[i + 1] * 0.93)
        } else {
          const u = cur[i]
          const v = cur[i + 1]
          const lap = (k: number) =>
            -at(x, y, k) +
            0.2 * (at(x + 1, y, k) + at(x - 1, y, k) + at(x, y + 1, k) + at(x, y - 1, k)) +
            0.05 *
              (at(x + 1, y + 1, k) +
                at(x - 1, y + 1, k) +
                at(x + 1, y - 1, k) +
                at(x - 1, y - 1, k))
          const uvv = u * v * v
          let nv = v + 0.5 * lap(1) + uvv - (0.0545 + 0.062) * v
          if (drop && Math.hypot(x - drop[0], y - drop[1]) < 2) nv = 0.5
          nxt[i] = Math.min(1, Math.max(0, u + lap(0) - uvv + 0.0545 * (1 - u)))
          nxt[i + 1] = Math.min(1, Math.max(0, nv))
        }
      }
    const t = cur
    cur = nxt
    nxt = t
    drop = null
  }
  return {
    step(n = 1) {
      for (let k = 0; k < n; k++) {
        frame++
        if (kind === 'life' && frame % 3) continue
        for (let i = 0; i < (kind === 'coral' ? 4 : 1); i++) once()
      }
    },
    draw() {
      const d = img.data
      for (let i = 0, p = 0; i < W * H; i++, p += 4) {
        const s = i * 4
        let v: number
        if (kind === 'pendulum') {
          const a = 0.5 - 0.5 * Math.cos(cur[s])
          const b = 0.5 - 0.5 * Math.cos(cur[s + 1])
          v = 0.12 + 0.55 * a * b + 0.3 * b * (1 - a)
        } else if (kind === 'life') v = 0.05 + 0.55 * cur[s + 1] + 0.38 * cur[s]
        else v = 0.04 + cur[s + 1] * 2.6
        const col = ember(v)
        d[p] = col[0]
        d[p + 1] = col[1]
        d[p + 2] = col[2]
        d[p + 3] = 255
      }
      sctx.putImageData(img, 0, 0)
      const [cw, ch] = fitCanvas(canvas, 900, 1.5)
      ctx.imageSmoothingEnabled = kind !== 'life'
      ctx.drawImage(small, 0, 0, cw, ch)
    },
    press(fx: number, fy: number) {
      if (kind === 'coral') drop = [fx * W, fy * H]
      else {
        seed += 1.3
        reset()
      }
    },
    dispose() {},
  }
}

function simLayer(kind: Kind): LayerFactory {
  return (canvas, view) => {
    const c: [number, number] = [view.re, view.im]
    const sim = gpuSim(kind, canvas, c) ?? cpuSim(kind, canvas, c)
    if (!sim) return null
    let born = performance.now()
    return {
      frame(now) {
        // the pendulums settle into noise in half a minute; start them again
        if (kind === 'pendulum' && now - born > 26000) {
          sim.press(0.5, 0.5)
          born = now
        }
        sim.step()
        sim.draw()
        return true
      },
      still() {
        sim.step(kind === 'pendulum' ? 90 : kind === 'life' ? 60 : 160)
        sim.draw()
      },
      press(fx, fy) {
        sim.press(fx, fy)
        born = performance.now()
      },
      resize() {},
      dispose: () => sim.dispose(),
    }
  }
}

export const pendulum = simLayer('pendulum')
export const life = simLayer('life')
export const coral = simLayer('coral')
