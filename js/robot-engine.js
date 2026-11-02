/**
 * SUBX / ROBOT ENGINE
 * A tiny dependency-free WebGL scene. All geometry is generated locally.
 * The visitor controls the camera by scrolling; no remote 3D assets are needed.
 */
(() => {
  'use strict';

  const canvas = document.getElementById('world');
  if (!canvas) return;
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
    powerPreference: 'default'
  });

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!gl) {
    canvas.style.display = 'none';
    const fallback = document.createElement('div');
    fallback.className = 'robot-fallback';
    fallback.innerHTML = `
      <div class="fallback-robot"><svg viewBox="0 0 320 430" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="robotmetal" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#8b7abd"/><stop offset=".48" stop-color="#3d3165"/><stop offset="1" stop-color="#17172f"/></linearGradient><linearGradient id="robotvisor" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#202953"/><stop offset="1" stop-color="#080d23"/></linearGradient></defs>
        <g stroke="#b29ce6" stroke-width="3"><path d="M159 74V42"/><circle cx="159" cy="33" r="13" fill="#9ceeff"/>
        <rect x="54" y="80" rx="45" width="212" height="159" fill="url(#robotmetal)"/><rect x="75" y="119" width="171" height="75" rx="24" fill="url(#robotvisor)" stroke="#6b61ab"/>
        <rect x="92" y="139" width="56" height="27" rx="10" fill="#8ceaff" stroke="none"/><rect x="174" y="139" width="56" height="27" rx="10" fill="#8ceaff" stroke="none"/>
        <rect x="90" y="241" width="140" height="129" rx="24" fill="url(#robotmetal)"/><rect x="32" y="258" width="49" height="101" rx="22" fill="url(#robotmetal)"/><rect x="239" y="258" width="49" height="101" rx="22" fill="url(#robotmetal)"/>
        <circle cx="160" cy="304" r="36" fill="#131a39" stroke="#9e64ff" stroke-width="9"/><circle cx="160" cy="304" r="16" fill="#7bebff" stroke="none"/>
        <rect x="112" y="362" width="34" height="54" rx="14" fill="url(#robotmetal)"/><rect x="174" y="362" width="34" height="54" rx="14" fill="url(#robotmetal)"/></g>
      </svg></div>
      <div class="fallback-tunnel">
        <div class="tunnel-gate"></div><div class="tunnel-gate"></div>
        <div class="tunnel-gate"></div><div class="tunnel-gate"></div>
        <div class="tunnel-gate"></div><div class="tunnel-gate"></div>
        <div class="tunnel-code">010110 / 100101 / SUBX / CORE / SYSTEM</div>
      </div>`;
    canvas.insertAdjacentElement('afterend', fallback);
    const fallRobot = fallback.querySelector('.fallback-robot');
    const fallTunnel = fallback.querySelector('.fallback-tunnel');
    const gates = Array.from(fallback.querySelectorAll('.tunnel-gate'));
    const sf = (a, b, t) => {
      const k = Math.max(0, Math.min(1, (t - a) / (b - a)));
      return k * k * (3 - 2 * k);
    };
    window.SUBXRobot = {
      supported: false,
      setProgress(p) {
        const fade = 1 - sf(.32, .48, p);
        const grow = 1 + sf(.14, .42, p) * 3.2;
        fallRobot.style.opacity = String(fade);
        fallRobot.style.transform = `translate(-50%,-50%) scale(${grow})`;
        fallTunnel.style.opacity = String(sf(.36, .48, p) * (1 - sf(.70, .80, p)));
        gates.forEach((gate, i) => {
          const size = Math.pow(1.7, i * -.64 + (p - .38) * 10);
          gate.style.transform = `translate(-50%,-50%) rotate(${45 + i * 13 + p * 45}deg) scale(${size})`;
        });
      },
      resize() {}
    };
    return;
  }

  const vs = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    uniform mat4 uModel;
    uniform mat4 uViewProjection;
    varying vec3 vNormal;
    varying vec3 vWorld;
    void main() {
      vec4 world = uModel * vec4(aPosition, 1.0);
      vWorld = world.xyz;
      vNormal = normalize(mat3(uModel) * aNormal);
      gl_Position = uViewProjection * world;
    }
  `;
  const fs = `
    precision mediump float;
    varying vec3 vNormal;
    varying vec3 vWorld;
    uniform vec3 uColor;
    uniform vec3 uCamera;
    uniform float uEmit;
    uniform float uOpacity;
    uniform float uTime;
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 light = normalize(vec3(-0.35, 0.83, 0.9));
      vec3 side = normalize(vec3(0.86, 0.05, 0.64));
      vec3 viewDir = normalize(uCamera - vWorld);
      float diffuse = max(dot(normal, light), 0.0);
      float edgeLight = max(dot(normal, side), 0.0);
      vec3 reflected = reflect(-light, normal);
      float highlight = pow(max(dot(reflected, viewDir), 0.0), 34.0);
      float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 2.7);
      vec3 shaded = uColor * (0.26 + 0.72 * diffuse + 0.19 * edgeLight);
      shaded += highlight * vec3(0.51, 0.54, 0.87);
      shaded += fresnel * vec3(0.12, 0.17, 0.36);
      shaded += uColor * uEmit * (1.13 + 0.13 * sin(uTime * 2.4));
      gl_FragColor = vec4(shaded, uOpacity);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`WebGL shader: ${gl.getShaderInfoLog(shader)}`);
    }
    return shader;
  }

  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Cannot link WebGL program');
  } catch (error) {
    console.warn('[SUBX] Graphics unavailable:', error);
    canvas.style.display = 'none';
    window.SUBXRobot = { setProgress() {}, resize() {} };
    return;
  }

  gl.useProgram(program);
  const attrs = {
    position: gl.getAttribLocation(program, 'aPosition'),
    normal: gl.getAttribLocation(program, 'aNormal')
  };
  const uniforms = {
    model: gl.getUniformLocation(program, 'uModel'),
    vp: gl.getUniformLocation(program, 'uViewProjection'),
    color: gl.getUniformLocation(program, 'uColor'),
    camera: gl.getUniformLocation(program, 'uCamera'),
    emit: gl.getUniformLocation(program, 'uEmit'),
    opacity: gl.getUniformLocation(program, 'uOpacity'),
    time: gl.getUniformLocation(program, 'uTime')
  };
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.CULL_FACE);

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, t) => { const n = clamp((t - a) / (b - a)); return n * n * (3 - 2 * n); };
  const color = (hex) => {
    const raw = hex.replace('#', '');
    return [parseInt(raw.slice(0, 2), 16) / 255, parseInt(raw.slice(2, 4), 16) / 255, parseInt(raw.slice(4, 6), 16) / 255];
  };
  const length3 = ([x, y, z]) => Math.hypot(x, y, z) || 1;
  const normal3 = (v) => { const d = length3(v); return v.map((x) => x / d); };

  // Column-major matrices, compatible with GLSL.
  function identity() { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
  function multiply(a, b) {
    const result = new Array(16);
    for (let col = 0; col < 4; col++) for (let row = 0; row < 4; row++) {
      let value = 0;
      for (let k = 0; k < 4; k++) value += a[k * 4 + row] * b[col * 4 + k];
      result[col * 4 + row] = value;
    }
    return result;
  }
  function translate(x, y, z) { const m = identity(); m[12] = x; m[13] = y; m[14] = z; return m; }
  function scale(x, y, z) { const m = identity(); m[0] = x; m[5] = y; m[10] = z; return m; }
  function rotateX(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; }
  function rotateY(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; }
  function rotateZ(a) { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, 0, -s, c, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
  function perspective(fov, aspect, near, far) {
    const f = 1 / Math.tan(fov / 2), q = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * q, -1, 0, 0, 2 * far * near * q, 0];
  }
  function lookAt(eye, target) {
    const z = normal3([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]);
    const x = normal3([z[2], 0, -z[0]]);
    const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
      -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]),
      -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]),
      -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]), 1];
  }
  function composed(position, rotation = [0, 0, 0], dimensions = [1, 1, 1]) {
    let m = translate(...position);
    m = multiply(m, rotateY(rotation[1]));
    m = multiply(m, rotateX(rotation[0]));
    m = multiply(m, rotateZ(rotation[2]));
    return multiply(m, scale(...dimensions));
  }

  const geometries = new Map();
  function makeGeometry(name, build) {
    if (geometries.has(name)) return geometries.get(name);
    const positions = [], normals = [], indices = [];
    build(positions, normals, indices);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    const geometry = { positionBuffer, normalBuffer, indexBuffer, count: indices.length };
    geometries.set(name, geometry);
    return geometry;
  }

  function roundedBox(w, h, d, radius = .1, segments = 7) {
    const key = `rounded:${w},${h},${d},${radius},${segments}`;
    return makeGeometry(key, (vertices, normals, faces) => {
      const half = [w / 2, h / 2, d / 2];
      const inner = half.map((value) => Math.max(0, value - radius));
      for (let axis = 0; axis < 3; axis++) for (const side of [-1, 1]) {
        const u = (axis + 1) % 3, v = (axis + 2) % 3;
        const start = vertices.length / 3;
        for (let iy = 0; iy <= segments; iy++) for (let ix = 0; ix <= segments; ix++) {
          const pos = [0, 0, 0];
          pos[axis] = side * half[axis];
          pos[u] = lerp(-half[u], half[u], ix / segments);
          pos[v] = lerp(-half[v], half[v], iy / segments);
          const center = pos.map((value, i) => Math.max(-inner[i], Math.min(inner[i], value)));
          const direction = normal3(pos.map((value, i) => value - center[i]));
          for (let k = 0; k < 3; k++) {
            vertices.push(center[k] + direction[k] * radius);
            normals.push(direction[k]);
          }
        }
        for (let y = 0; y < segments; y++) for (let x = 0; x < segments; x++) {
          const a = start + y * (segments + 1) + x;
          faces.push(a, a + 1, a + segments + 1, a + 1, a + segments + 2, a + segments + 1);
        }
      }
    });
  }
  function sphere(radius = 1, stacks = 13, slices = 22) {
    const key = `sphere:${radius}:${stacks}:${slices}`;
    return makeGeometry(key, (vertices, normals, faces) => {
      for (let y = 0; y <= stacks; y++) for (let x = 0; x <= slices; x++) {
        const theta = y / stacks * Math.PI, phi = x / slices * Math.PI * 2;
        const n = [Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi)];
        vertices.push(...n.map(v => v * radius)); normals.push(...n);
      }
      for (let y = 0; y < stacks; y++) for (let x = 0; x < slices; x++) {
        const a = y * (slices + 1) + x, b = a + slices + 1;
        faces.push(a, b, a + 1, a + 1, b, b + 1);
      }
    });
  }
  function torus(major = 1, minor = .07, rings = 48, tubeSegments = 9) {
    const key = `torus:${major}:${minor}:${rings}:${tubeSegments}`;
    return makeGeometry(key, (vertices, normals, faces) => {
      for (let i = 0; i <= rings; i++) for (let j = 0; j <= tubeSegments; j++) {
        const a = i / rings * Math.PI * 2, b = j / tubeSegments * Math.PI * 2;
        const n = [Math.cos(a) * Math.cos(b), Math.sin(a) * Math.cos(b), Math.sin(b)];
        vertices.push((major + minor * Math.cos(b)) * Math.cos(a), (major + minor * Math.cos(b)) * Math.sin(a), minor * Math.sin(b));
        normals.push(...n);
      }
      for (let i = 0; i < rings; i++) for (let j = 0; j < tubeSegments; j++) {
        const a = i * (tubeSegments + 1) + j, b = a + tubeSegments + 1;
        faces.push(a, a + 1, b, b, a + 1, b + 1);
      }
    });
  }
  function cylinder(radius = 1, height = 1, slices = 20) {
    const key = `cylinder:${radius}:${height}:${slices}`;
    return makeGeometry(key, (vertices, normals, faces) => {
      for (let i = 0; i <= slices; i++) for (const y of [-height / 2, height / 2]) {
        const a = i / slices * Math.PI * 2, x = Math.cos(a), z = Math.sin(a);
        vertices.push(x * radius, y, z * radius); normals.push(x, 0, z);
      }
      for (let i = 0; i < slices; i++) { const a = i * 2; faces.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    });
  }

  const robot = [], inner = [], tunnel = [];
  function mesh(group, geometry, hex, position = [0, 0, 0], options = {}) {
    const object = {
      geometry, color: color(hex), position, rotation: options.rotation || [0, 0, 0],
      scale: options.scale || [1, 1, 1], emit: options.emit || 0,
      alpha: options.alpha ?? 1,
      motion: options.motion ?? .7,
      phase: options.phase ?? 0,
      glow: Boolean(options.glow)
    };
    group.push(object);
    return object;
  }
  const box = (group, w, h, d, r, col, pos, options) => mesh(group, roundedBox(w, h, d, r), col, pos, options);
  const ball = (group, r, col, pos, options) => mesh(group, sphere(r), col, pos, options);
  const ring = (group, R, thickness, col, pos, options) => mesh(group, torus(R, thickness), col, pos, options);

  // Head and face — engineered rather than using a flat background animation.
  box(robot, 3.13, 2.19, 1.59, .43, '#7765a1', [0, 1.46, 0], { motion: .5 });
  box(robot, 2.93, 1.98, 1.67, .40, '#2d2e59', [0, 1.42, .05], { motion: .5 });
  box(robot, 2.75, 1.14, .13, .27, '#0a1532', [0, 1.51, .91], { motion: .48 });
  box(robot, 2.50, .90, .048, .21, '#0d2542', [0, 1.53, .994], { motion: .48 });
  box(robot, .78, .31, .11, .12, '#67edff', [-.66, 1.64, 1.06], { emit: 1.15, motion: .45 });
  box(robot, .78, .31, .11, .12, '#67edff', [.66, 1.64, 1.06], { emit: 1.15, motion: .45 });
  box(robot, .42, .16, .12, .07, '#bfffff', [-.68, 1.66, 1.13], { emit: .65, motion: .45 });
  box(robot, .42, .16, .12, .07, '#bfffff', [.66, 1.66, 1.13], { emit: .65, motion: .45 });
  box(robot, .67, .042, .09, .02, '#ca9eff', [0, 1.07, 1.03], { emit: .9, motion: .48 });
  box(robot, 1.48, .055, .08, .02, '#33204f', [0, 2.00, 1.04], { motion: .55 });
  for (const x of [-1, 1]) {
    box(robot, .35, .80, .96, .15, '#b39cdb', [x * 1.63, 1.42, 0], { motion: .8 });
    box(robot, .14, .42, .50, .065, '#6de4ff', [x * 1.83, 1.40, .08], { emit: .9, motion: .85 });
    ball(robot, .082, '#ddcfff', [x * 1.21, .74, .76], { emit: .3 });
  }
  mesh(robot, cylinder(.085, .43), '#c0b2df', [0, 2.75, 0], { motion: 1.4 });
  ball(robot, .23, '#a470ff', [0, 3.07, 0], { emit: 1.1, motion: 1.6 });
  ball(robot, .13, '#e0c3ff', [0, 3.07, 0], { emit: 1.2, motion: 1.6 });

  // Mechanical neck and torso.
  mesh(robot, cylinder(.35, .38), '#3c3b6c', [0, .20, -.11]);
  ring(robot, .37, .06, '#a774ff', [0, .15, .11], { emit: .75 });
  box(robot, 2.45, 2.13, 1.50, .47, '#595180', [0, -.90, -.05], { motion: .18 });
  box(robot, 2.28, 1.92, 1.58, .37, '#232543', [0, -.91, -.01], { motion: .18 });
  box(robot, 1.83, 1.10, .08, .25, '#30365e', [0, -.62, .80], { motion: .2 });
  ring(robot, .55, .095, '#a16cff', [0, -.82, .90], { emit: .9, motion: .14 });
  ring(robot, .39, .044, '#53e7ff', [0, -.82, .99], { emit: 1.25, motion: .10 });
  ball(robot, .23, '#77dbff', [0, -.82, 1.06], { emit: 1.25, motion: .05 });
  ball(robot, .13, '#d8ffff', [0, -.82, 1.19], { emit: 1.1, motion: .05 });
  for (let j = 0; j < 3; j++) for (const side of [-1, 1]) {
    box(robot, .26, .055, .08, .015, '#6c6d97', [side * .80, -.48 - j * .18, .89], { motion: .2 });
  }
  box(robot, 1.58, .1, .15, .05, '#8a73b6', [0, -1.79, .20], { motion: .2 });
  for (const side of [-1, 1]) {
    ball(robot, .38, '#8a76ba', [side * 1.42, -.52, -.04], { motion: .75 });
    box(robot, .57, 1.02, .70, .22, '#5b5984', [side * 1.66, -1.08, 0], { rotation: [0, 0, -side * .12], motion: .92 });
    ball(robot, .25, '#6e6b9f', [side * 1.73, -1.58, 0], { motion: .98 });
    box(robot, .50, .83, .67, .21, '#272b51', [side * 1.82, -2.03, .02], { rotation: [0, 0, -side * .1], motion: 1.03 });
    box(robot, .34, .23, .71, .11, '#b17aff', [side * 1.84, -2.37, .07], { emit: .5, motion: 1.15 });
    box(robot, .59, .79, .81, .18, '#58517d', [side * .59, -2.18, -.04], { motion: .48 });
    box(robot, .73, .31, 1.1, .12, '#302e56', [side * .59, -2.73, .27], { motion: .60 });
    box(robot, .56, .06, .49, .02, '#8d67ed', [side * .59, -2.32, .40], { emit: .55, motion: .5 });
  }

  // Visible circuitry inside the head: revealed when the shell pulls apart.
  for (let y = 0; y < 6; y++) {
    box(inner, 2.18, .034, .07, .015, y % 2 ? '#57cffa' : '#a875ff', [0, 1.03 + y * .16, -.30 - y * .09], { emit: .75 });
  }
  for (let x = -3; x <= 3; x++) {
    box(inner, .039, .93, .08, .01, x % 2 ? '#ba82ff' : '#67e0ff', [x * .3, 1.47, -.62], { emit: .8 });
    ball(inner, .075, '#baf7ff', [x * .3, 1.03, -.51], { emit: 1.05 });
  }
  ring(inner, .72, .048, '#b881ff', [0, 1.49, -.77], { emit: .95 });
  ring(inner, .49, .052, '#65e6ff', [0, 1.49, -.85], { emit: 1.05 });
  ball(inner, .29, '#764bf2', [0, 1.49, -.97], { emit: .85 });
  ball(inner, .14, '#b3edff', [0, 1.49, -.70], { emit: 1.2 });

  // Data tunnel: repeated gateways, circuit rails, floating fragments.
  for (let i = 0; i < 12; i++) {
    const z = -2.8 - i * 2.45;
    const hue = i % 3 === 0 ? '#71defc' : '#9464ee';
    ring(tunnel, 2.7, .046, hue, [0, 0, z], { emit: .90, phase: i * .3 });
    ring(tunnel, 2.40, .018, '#4c367f', [0, 0, z - .08], { emit: .30, phase: i * -.21 });
    for (let q = 0; q < 8; q++) {
      const a = q / 8 * Math.PI * 2 + i * .32;
      const px = Math.cos(a) * 2.84, py = Math.sin(a) * 2.84;
      box(tunnel, .17, .34, .48, .055, q % 2 ? '#2b3157' : '#534376', [px, py, z], { rotation: [0, 0, a - Math.PI / 2], phase: i * .16 });
      if (q % 2 === 0) ball(tunnel, .07, '#9cdfff', [px, py, z + .22], { emit: .98, phase: i * .13 });
    }
    for (const x of [-1.65, 1.65]) {
      box(tunnel, .032, .035, 2.2, .01, '#61c5ff', [x, -1.05, z - 1.10], { emit: .55 });
    }
  }
  for (let i = 0; i < 38; i++) {
    const angle = i * 2.399, radial = 1.12 + i % 5 * .29, z = -4.0 - (i % 17) * 1.6;
    box(tunnel, .095, .095, .16, .025, i % 4 ? '#855acf' : '#72d6ff',
      [Math.cos(angle) * radial, Math.sin(angle) * radial, z], { emit: .5, phase: i * .23 });
  }

  function drawObject(object, parent, alpha, time, scatter = 0, index = 0) {
    if (alpha < .005) return;
    const shift = [0, 0, 0];
    if (scatter > 0) {
      const a = (index * 2.399963) % (Math.PI * 2);
      const d = object.motion * scatter;
      shift[0] = Math.cos(a) * d * 2.3;
      shift[1] = Math.sin(a) * d * 1.7;
      shift[2] = (index % 5 - 2) * .6 * d;
    }
    const local = composed([
      object.position[0] + shift[0], object.position[1] + shift[1], object.position[2] + shift[2]
    ], object.rotation, object.scale);
    const model = multiply(parent, local);
    gl.uniformMatrix4fv(uniforms.model, false, new Float32Array(model));
    gl.uniform3fv(uniforms.color, object.color);
    gl.uniform1f(uniforms.emit, object.emit);
    gl.uniform1f(uniforms.opacity, alpha * object.alpha);
    gl.uniform1f(uniforms.time, time);
    gl.bindBuffer(gl.ARRAY_BUFFER, object.geometry.positionBuffer);
    gl.vertexAttribPointer(attrs.position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attrs.position);
    gl.bindBuffer(gl.ARRAY_BUFFER, object.geometry.normalBuffer);
    gl.vertexAttribPointer(attrs.normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attrs.normal);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.geometry.indexBuffer);
    gl.drawElements(gl.TRIANGLES, object.geometry.count, gl.UNSIGNED_SHORT, 0);
  }

  let progress = 0, drawing = true, width = 1, height = 1, pixelRatio = 1;
  function resize() {
    const bounds = canvas.getBoundingClientRect();
    pixelRatio = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.45 : 1.65);
    width = Math.max(1, Math.floor(bounds.width * pixelRatio));
    height = Math.max(1, Math.floor(bounds.height * pixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }
  function setProgress(value) { progress = clamp(value); }
  const interpolateKeys = (keys, t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const a = keys[i - 1], b = keys[i];
        return lerp(a[1], b[1], smooth(a[0], b[0], t));
      }
    }
    return keys[keys.length - 1][1];
  };
  let startedAt = performance.now();
  function render(now) {
    requestAnimationFrame(render);
    if (document.hidden) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight) return;
    if (canvas.width !== Math.floor(rect.width * pixelRatio) || canvas.height !== Math.floor(rect.height * pixelRatio)) resize();
    const time = reducedMotion ? 0 : (now - startedAt) * .001;
    const mobile = innerWidth < 760;
    const robotX = mobile ? 0 : -2.2;
    const robotY = mobile ? -2.4 : 0;

    const cameraZ = interpolateKeys([[0, 13.7], [.12, 12.8], [.27, 6.9], [.40, 1.16], [.58, -9], [.77, -18.6], [1, -25]], progress);
    const lookX = interpolateKeys([[0, 0], [.25, robotX + .22], [.39, robotX], [.55, 0], [.76, 0]], progress);
    const lookY = interpolateKeys([[0, mobile ? .18 : .1], [.24, robotY + 1.30], [.40, robotY + 1.46], [.58, 0], [.77, 0]], progress);
    // Keep the view forward when flying into the head and the internal circuit tunnel.
    const eye = [lookX, lookY, cameraZ];
    const vp = multiply(
      perspective((mobile ? 43 : 39) * Math.PI / 180, width / height, .055, 110),
      lookAt(eye, [lookX, lookY, cameraZ - 1])
    );

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(uniforms.vp, false, new Float32Array(vp));
    gl.uniform3fv(uniforms.camera, new Float32Array(eye));

    const idle = reducedMotion ? 0 : Math.sin(time * 1.1) * .07;
    let parent = composed([robotX, robotY + idle, 0], [Math.sin(time * .3) * .025, -.16 + (Math.sin(time * .37) * .075), 0]);
    const disassemble = smooth(.29, .47, progress);
    const robotAlpha = 1 - smooth(.37, .51, progress);
    const shellAlpha = robotAlpha * (1 - .12 * smooth(.24, .32, progress));
    // Avoid the robot obscuring the tunnel after crossing the face.
    if (shellAlpha > .001) {
      robot.forEach((object, i) => drawObject(object, parent, shellAlpha, time, disassemble, i));
    }
    const insideAlpha = smooth(.28, .38, progress) * (1 - smooth(.46, .55, progress));
    if (insideAlpha > .001) {
      parent = composed([robotX, robotY, 0]);
      inner.forEach((object, i) => drawObject(object, parent, insideAlpha, time, 0, i));
    }

    // Tunnel is part of the same 3D scene; its parallax is produced by the camera travel.
    const tunnelAlpha = smooth(.37, .51, progress) * (1 - smooth(.70, .89, progress));
    if (tunnelAlpha > .001) {
      const world = identity();
      tunnel.forEach((object, i) => {
        const swirl = Math.sin(time * .26 + object.phase) * .025;
        const localParent = object.geometry === null ? world : multiply(world, rotateZ(swirl));
        drawObject(object, localParent, tunnelAlpha, time, 0, i);
      });
    }
  }

  window.SUBXRobot = { setProgress, resize, supported: true };
  window.addEventListener('resize', resize, { passive: true });
  resize();
  requestAnimationFrame(render);
})();
