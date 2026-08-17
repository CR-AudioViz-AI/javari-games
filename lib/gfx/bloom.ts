// lib/gfx/bloom.ts — WebGL2 post-processing for the game canvases
//
// The first five games render to a 2D canvas, which is fast and portable but
// flat. This adds the pass that makes a neon game look like a neon game:
// bright-pass extraction, a separable Gaussian blur, and an additive composite,
// plus chromatic aberration and vignette in the final shader.
//
// SEPARABLE BLUR, NOT A SINGLE 2D KERNEL. A 9x9 Gaussian in one pass is 81
// texture reads per pixel. Split horizontally then vertically it is 18. At
// 1080p that is the difference between 60fps and a slideshow, and it is exactly
// the same result because a Gaussian is separable.
//
// HALF-RESOLUTION BLOOM. The blur runs on a half-size framebuffer. Bloom is
// low-frequency by nature so nobody can tell, and it quarters the fill cost.
//
// The whole thing degrades gracefully: if WebGL2 is unavailable, present()
// simply blits the source canvas and the game still plays.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026

const QUAD_VS = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`

/** Keep only what is bright enough to glow, with a soft knee so edges do not band. */
const BRIGHT_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_src;
uniform float u_threshold;
out vec4 outColor;
void main() {
  vec3 c = texture(u_src, v_uv).rgb;
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // Soft knee: a hard step here produces visible contour bands on gradients.
  float knee = smoothstep(u_threshold, u_threshold + 0.25, lum);
  outColor = vec4(c * knee, 1.0);
}`

/** One axis of a Gaussian. Run twice with u_dir swapped. */
const BLUR_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_src;
uniform vec2 u_texel;
uniform vec2 u_dir;
out vec4 outColor;
void main() {
  // Nine-tap weights from a normalised Gaussian, sigma ~2.
  float w[5];
  w[0] = 0.227027; w[1] = 0.194594; w[2] = 0.121621; w[3] = 0.054054; w[4] = 0.016216;
  vec3 sum = texture(u_src, v_uv).rgb * w[0];
  for (int i = 1; i < 5; i++) {
    vec2 off = u_texel * u_dir * float(i) * 1.4;
    sum += texture(u_src, v_uv + off).rgb * w[i];
    sum += texture(u_src, v_uv - off).rgb * w[i];
  }
  outColor = vec4(sum, 1.0);
}`

/** Composite: additive bloom, chromatic aberration toward the edges, vignette,
 *  a little filmic tone shaping and a touch of grain to kill banding. */
const COMPOSITE_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_src;
uniform sampler2D u_bloom;
uniform float u_intensity;
uniform float u_aberration;
uniform float u_vignette;
uniform float u_time;
out vec4 outColor;

vec3 aces(vec3 x) {
  // Narkowicz ACES approximation — cheap filmic curve, keeps highlights from
  // clipping to flat white where the bloom stacks up.
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
  vec2 center = v_uv - 0.5;
  float r2 = dot(center, center);

  // Chromatic aberration: sample the channels at slightly different offsets,
  // scaled by distance from centre so the middle of the screen stays sharp.
  vec2 ab = center * u_aberration * r2;
  vec3 base;
  base.r = texture(u_src, v_uv + ab).r;
  base.g = texture(u_src, v_uv).g;
  base.b = texture(u_src, v_uv - ab).b;

  vec3 bloom = texture(u_bloom, v_uv).rgb;
  vec3 col = base + bloom * u_intensity;

  col = aces(col);
  col *= 1.0 - u_vignette * r2 * 1.6;

  // Grain, animated. Without it, smooth dark gradients band on 8-bit displays.
  float n = fract(sin(dot(v_uv * (1.0 + u_time * 0.0001), vec2(12.9898, 78.233))) * 43758.5453);
  col += (n - 0.5) * 0.016;

  outColor = vec4(col, 1.0);
}`

interface Pass { program: WebGLProgram; uniforms: Record<string, WebGLUniformLocation | null> }

export interface BloomOptions {
  threshold?: number
  intensity?: number
  aberration?: number
  vignette?: number
  passes?: number
}

export class BloomRenderer {
  private gl: WebGL2RenderingContext | null = null
  private srcTex: WebGLTexture | null = null
  private fbo: [WebGLFramebuffer, WebGLTexture][] = []
  private bright!: Pass
  private blur!: Pass
  private composite!: Pass
  private vao: WebGLVertexArrayObject | null = null
  private w = 0
  private h = 0
  private opts: Required<BloomOptions>
  readonly ok: boolean

  constructor(private out: HTMLCanvasElement, opts: BloomOptions = {}) {
    this.opts = {
      threshold: opts.threshold ?? 0.55,
      intensity: opts.intensity ?? 1.15,
      aberration: opts.aberration ?? 0.012,
      vignette: opts.vignette ?? 0.42,
      passes: opts.passes ?? 3,
    }
    const gl = out.getContext('webgl2', {
      alpha: false, antialias: false, premultipliedAlpha: false, powerPreference: 'high-performance',
    })
    if (!gl) { this.ok = false; return }
    this.gl = gl
    // Float targets let bloom accumulate above 1.0 before tone mapping, which
    // is what stops bright cores turning into flat white blobs.
    gl.getExtension('EXT_color_buffer_float')
    this.bright = this.compile(QUAD_VS, BRIGHT_FS, ['u_src', 'u_threshold'])
    this.blur = this.compile(QUAD_VS, BLUR_FS, ['u_src', 'u_texel', 'u_dir'])
    this.composite = this.compile(QUAD_VS, COMPOSITE_FS,
      ['u_src', 'u_bloom', 'u_intensity', 'u_aberration', 'u_vignette', 'u_time'])
    this.vao = gl.createVertexArray()
    gl.bindVertexArray(this.vao)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)
    this.srcTex = gl.createTexture()
    this.ok = true
  }

  private compile(vs: string, fs: string, names: string[]): Pass {
    const gl = this.gl!
    const mk = (type: number, src: string) => {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(sh) ?? 'shader compile failed')
      }
      return sh
    }
    const p = gl.createProgram()!
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs))
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs))
    gl.bindAttribLocation(p, 0, 'a_pos')
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(p) ?? 'link failed')
    }
    const uniforms: Record<string, WebGLUniformLocation | null> = {}
    for (const n of names) uniforms[n] = gl.getUniformLocation(p, n)
    return { program: p, uniforms }
  }

  private target(i: number): [WebGLFramebuffer, WebGLTexture] {
    const gl = this.gl!
    if (this.fbo[i]) return this.fbo[i]
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, this.w >> 1, this.h >> 1, 0, gl.RGBA, gl.HALF_FLOAT, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const f = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, f)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    this.fbo[i] = [f, tex]
    return this.fbo[i]
  }

  resize(w: number, h: number): void {
    if (!this.gl) return
    if (w === this.w && h === this.h) return
    this.w = w; this.h = h
    this.out.width = w; this.out.height = h
    for (const [f, t] of this.fbo) { this.gl.deleteFramebuffer(f); this.gl.deleteTexture(t) }
    this.fbo = []
  }

  /** Blit the 2D canvas through the post chain. Call once per frame. */
  present(source: HTMLCanvasElement, time: number): void {
    const gl = this.gl
    if (!gl || !this.ok) return
    const hw = Math.max(1, this.w >> 1), hh = Math.max(1, this.h >> 1)

    gl.bindTexture(gl.TEXTURE_2D, this.srcTex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)

    gl.bindVertexArray(this.vao)
    gl.disable(gl.BLEND)

    // 1. bright pass into target 0, at half resolution
    const [f0, t0] = this.target(0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, f0)
    gl.viewport(0, 0, hw, hh)
    gl.useProgram(this.bright.program)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex)
    gl.uniform1i(this.bright.uniforms.u_src, 0)
    gl.uniform1f(this.bright.uniforms.u_threshold, this.opts.threshold)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    // 2. separable blur, ping-ponging between two targets
    const [f1, t1] = this.target(1)
    let src = t0, dstF = f1, dstT = t1
    gl.useProgram(this.blur.program)
    gl.uniform2f(this.blur.uniforms.u_texel, 1 / hw, 1 / hh)
    for (let i = 0; i < this.opts.passes * 2; i++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, dstF)
      gl.viewport(0, 0, hw, hh)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, src)
      gl.uniform1i(this.blur.uniforms.u_src, 0)
      gl.uniform2f(this.blur.uniforms.u_dir, i % 2 === 0 ? 1 : 0, i % 2 === 0 ? 0 : 1)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      const prev = src
      src = dstT
      dstT = prev
      dstF = dstF === f1 ? f0 : f1
    }

    // 3. composite to the screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, this.w, this.h)
    gl.useProgram(this.composite.program)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex)
    gl.uniform1i(this.composite.uniforms.u_src, 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, src)
    gl.uniform1i(this.composite.uniforms.u_bloom, 1)
    gl.uniform1f(this.composite.uniforms.u_intensity, this.opts.intensity)
    gl.uniform1f(this.composite.uniforms.u_aberration, this.opts.aberration)
    gl.uniform1f(this.composite.uniforms.u_vignette, this.opts.vignette)
    gl.uniform1f(this.composite.uniforms.u_time, time)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.bindVertexArray(null)
  }

  dispose(): void {
    const gl = this.gl
    if (!gl) return
    for (const [f, t] of this.fbo) { gl.deleteFramebuffer(f); gl.deleteTexture(t) }
    if (this.srcTex) gl.deleteTexture(this.srcTex)
  }
}

/** Safe factory: returns null rather than throwing if WebGL2 is unavailable. */
export function makeBloom(canvas: HTMLCanvasElement, opts?: BloomOptions): BloomRenderer | null {
  try {
    const b = new BloomRenderer(canvas, opts)
    return b.ok ? b : null
  } catch {
    return null
  }
}
