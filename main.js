/* ===================================================================
   subx — main.js
   Three.js WebGL background + GSAP animations + dynamic app loader
   =================================================================== */

'use strict';

/* ── Wait for DOM ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initCursor();
  initNavbar();
  initScrollProgress();
  initWebGLBackground();
  initHeroAnimations();
  initScrollReveal();
  initTerminalTyper();
  initFilterButtons();
  loadApps();
  initMobileMenu();
});

/* ================================================================
   1. CUSTOM CURSOR
================================================================ */
function initCursor() {
  const outer = document.getElementById('cursor-outer');
  const inner = document.getElementById('cursor-inner');
  if (!outer || !inner) return;

  let mouseX = 0, mouseY = 0;
  let outerX = 0, outerY = 0;

  const onMove = e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    inner.style.left = mouseX + 'px';
    inner.style.top  = mouseY + 'px';
  };

  const tick = () => {
    outerX += (mouseX - outerX) * 0.12;
    outerY += (mouseY - outerY) * 0.12;
    outer.style.left = outerX + 'px';
    outer.style.top  = outerY + 'px';
    requestAnimationFrame(tick);
  };

  window.addEventListener('mousemove', onMove);
  tick();

  // Hover detection
  document.querySelectorAll('a, button, .app-card, .skill-chip, .filter-btn')
    .forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });
}

/* ================================================================
   2. NAVBAR SCROLL
================================================================ */
function initNavbar() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });
}

/* ================================================================
   3. SCROLL PROGRESS BAR
================================================================ */
function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100;
    bar.style.height = Math.min(pct, 100) + '%';
  }, { passive: true });
}

/* ================================================================
   4. THREE.JS WEBGL BACKGROUND — Interactive Particle Field
================================================================ */
function initWebGLBackground() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  // Scene
  const scene    = new THREE.Scene();
  const W        = window.innerWidth;
  const H        = window.innerHeight;
  const camera   = new THREE.PerspectiveCamera(60, W / H, 0.1, 2000);
  camera.position.set(0, 0, 120);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  // ── Mouse tracking ────────────────────────────────────────
  const mouse  = new THREE.Vector2(0, 0);
  const target = new THREE.Vector2(0, 0);

  window.addEventListener('mousemove', e => {
    mouse.x = (e.clientX / window.innerWidth  - 0.5) * 2;
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // ── Click ripple ──────────────────────────────────────────
  let clickRipple = { active: false, x: 0, y: 0, t: 0 };
  canvas.addEventListener('click', e => {
    clickRipple = {
      active: true,
      x: (e.clientX / window.innerWidth  - 0.5) * 200,
      y: -(e.clientY / window.innerHeight - 0.5) * 200,
      t: 0
    };
  });

  // ── Geometry: Main particle sphere ───────────────────────
  const PARTICLE_COUNT = 5500;
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colours   = new Float32Array(PARTICLE_COUNT * 3);
  const sizes     = new Float32Array(PARTICLE_COUNT);
  const phases    = new Float32Array(PARTICLE_COUNT);

  const colPrimary  = new THREE.Color('#8A2BE2');
  const colAccent   = new THREE.Color('#c084fc');
  const colBright   = new THREE.Color('#e879f9');
  const colDeep     = new THREE.Color('#4a1a8a');

  const palette = [colPrimary, colAccent, colBright, colDeep];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Distribute in sphere shell
    const r     = 60 + Math.random() * 80;
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);

    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi) - 30;

    const c = palette[Math.floor(Math.random() * palette.length)];
    colours[i * 3]     = c.r;
    colours[i * 3 + 1] = c.g;
    colours[i * 3 + 2] = c.b;

    sizes[i]  = Math.random() * 2.5 + 0.4;
    phases[i] = Math.random() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colours, 3));
  geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime:  { value: 0 },
      uMouse: { value: new THREE.Vector2() },
      uPixelRatio: { value: renderer.getPixelRatio() }
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      uniform float uTime;
      uniform vec2 uMouse;
      uniform float uPixelRatio;

      void main() {
        vColor = color;
        vec3 pos = position;

        // Wave distortion
        float wave = sin(pos.x * 0.05 + uTime * 0.8) *
                     cos(pos.y * 0.04 + uTime * 0.6) * 4.0;
        pos.z += wave;

        // Mouse attraction — subtle pull
        vec2 toMouse = uMouse * 100.0 - pos.xy;
        float dist = length(toMouse);
        float attract = smoothstep(80.0, 0.0, dist) * 6.0;
        pos.xy += normalize(toMouse + 0.0001) * attract;

        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = size * uPixelRatio * (200.0 / -mvPos.z);
        gl_Position  = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;

      void main() {
        vec2 uv  = gl_PointCoord - 0.5;
        float r  = length(uv);
        if (r > 0.5) discard;

        float alpha = smoothstep(0.5, 0.1, r);
        float glow  = smoothstep(0.5, 0.0, r) * 0.6;
        gl_FragColor = vec4(vColor + glow, alpha * 0.85);
      }
    `,
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
    vertexColors: true,
  });

  const particleMesh = new THREE.Points(geo, mat);
  scene.add(particleMesh);

  // ── Wireframe Icosahedron ────────────────────────────────
  const icoGeo = new THREE.IcosahedronGeometry(38, 1);
  const icoMat = new THREE.MeshBasicMaterial({
    color: 0x8A2BE2,
    wireframe: true,
    transparent: true,
    opacity: 0.08,
  });
  const ico = new THREE.Mesh(icoGeo, icoMat);
  scene.add(ico);

  // ── Ambient Ring Lines ───────────────────────────────────
  const ringGroup = new THREE.Group();
  scene.add(ringGroup);

  for (let ri = 0; ri < 3; ri++) {
    const rGeo = new THREE.TorusGeometry(45 + ri * 18, 0.3, 2, 80);
    const rMat = new THREE.MeshBasicMaterial({
      color: ri === 1 ? 0xc084fc : 0x8A2BE2,
      transparent: true,
      opacity: 0.07 - ri * 0.01,
    });
    const ring = new THREE.Mesh(rGeo, rMat);
    ring.rotation.x = Math.PI / 3 * ri;
    ring.rotation.y = Math.PI / 5 * ri;
    ringGroup.add(ring);
  }

  // ── Grid plane ───────────────────────────────────────────
  const gridHelper = new THREE.GridHelper(400, 40, 0x4a1a8a, 0x200040);
  gridHelper.position.y = -80;
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.18;
  scene.add(gridHelper);

  // ── Resize ───────────────────────────────────────────────
  window.addEventListener('resize', () => {
    const W = window.innerWidth, H = window.innerHeight;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
  });

  // ── Scroll influence ─────────────────────────────────────
  let scrollY = 0;
  window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
  }, { passive: true });

  // ── Animation Loop ───────────────────────────────────────
  let time = 0;
  const clock = new THREE.Clock();

  const animate = () => {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    time += delta;

    // Smooth mouse
    target.x += (mouse.x - target.x) * 0.04;
    target.y += (mouse.y - target.y) * 0.04;

    // Update shader uniforms
    mat.uniforms.uTime.value  = time;
    mat.uniforms.uMouse.value.set(target.x, -target.y);

    // Rotate particle mesh with mouse
    particleMesh.rotation.y = time * 0.04 + target.x * 0.3;
    particleMesh.rotation.x = time * 0.02 + target.y * 0.15;

    // Scroll parallax
    particleMesh.position.y = -scrollY * 0.04;
    gridHelper.position.y   = -80 - scrollY * 0.02;

    // Click ripple — displace particles
    if (clickRipple.active) {
      clickRipple.t += delta * 2;
      const posArr = geo.attributes.position.array;
      const rippleR = clickRipple.t * 40;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const dx = posArr[i*3]   - clickRipple.x;
        const dy = posArr[i*3+1] - clickRipple.y;
        const d  = Math.sqrt(dx*dx + dy*dy);
        if (Math.abs(d - rippleR) < 8) {
          const force = (1 - clickRipple.t / 2) * 3;
          posArr[i*3+2] += force * Math.sin(d * 0.1 - time * 5);
        }
      }
      geo.attributes.position.needsUpdate = true;
      if (clickRipple.t > 2) clickRipple.active = false;
    }

    // Ico rotation
    ico.rotation.y = time * 0.1  + target.x * 0.5;
    ico.rotation.x = time * 0.07 + target.y * 0.3;

    // Ring slow drift
    ringGroup.rotation.y = time * 0.05;
    ringGroup.rotation.z = Math.sin(time * 0.1) * 0.15;

    // Camera subtle drift
    camera.position.x = target.x * 8;
    camera.position.y = -target.y * 6;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  };

  animate();
}

/* ================================================================
   5. HERO ANIMATIONS (GSAP if available, else CSS fallback)
================================================================ */
function initHeroAnimations() {
  // Typewriter effect for hero title line2
  const el = document.querySelector('.hero-title .line2');
  if (!el) return;

  const words = ['مطور متكامل', 'هاكر إيثيقي', 'بناء تطبيقات', 'مبدع رقمي'];
  let wi = 0, ci = 0, deleting = false;

  const type = () => {
    const word = words[wi % words.length];
    if (!deleting) {
      el.textContent = word.slice(0, ++ci);
      if (ci === word.length) {
        deleting = true;
        setTimeout(type, 1800);
        return;
      }
    } else {
      el.textContent = word.slice(0, --ci);
      if (ci === 0) {
        deleting = false;
        wi++;
      }
    }
    setTimeout(type, deleting ? 50 : 100);
  };

  setTimeout(type, 1200);

  // Count-up stats
  document.querySelectorAll('.stat-num').forEach(el => {
    const raw = el.dataset.count;
    if (!raw) return;
    const target = parseInt(raw.replace(/\D/g, ''), 10);
    let current = 0;
    const dur = 2000;
    const step = target / (dur / 16);
    const tick = () => {
      current = Math.min(current + step, target);
      el.textContent = Math.floor(current).toLocaleString('ar-EG') + (raw.includes('+') ? '+' : '');
      if (current < target) requestAnimationFrame(tick);
    };
    // Delay until visible
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { tick(); obs.disconnect(); }
    });
    obs.observe(el);
  });
}

/* ================================================================
   6. SCROLL REVEAL
================================================================ */
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

  els.forEach(el => obs.observe(el));
}

/* ================================================================
   7. TERMINAL TYPER
================================================================ */
function initTerminalTyper() {
  const body = document.getElementById('terminal-body');
  if (!body) return;

  const lines = [
    { type: 'cmd',    text: 'subx --init portfolio' },
    { type: 'success',text: '✓ تهيئة مشروع subx بنجاح' },
    { type: 'cmd',    text: 'subx deploy --platform github-pages' },
    { type: 'info',   text: 'جارٍ رفع الملفات...' },
    { type: 'output', text: '● index.html     ✓' },
    { type: 'output', text: '● style.css      ✓' },
    { type: 'output', text: '● main.js        ✓' },
    { type: 'output', text: '● update/apps.json  ✓' },
    { type: 'success',text: '🚀 النشر مكتمل! https://subx.dev' },
    { type: 'cmd',    text: 'subx apps --list' },
    { type: 'output', text: 'تم تحميل ٦ تطبيقات بنجاح' },
    { type: 'success',text: 'النظام جاهز — subx >_' },
  ];

  let li = 0, ci = 0;
  let currentDiv = null;
  let cursorEl = null;

  const prompt = '<span class="t-prompt">subx@dev:~$</span> ';

  const renderLine = () => {
    if (li >= lines.length) {
      // Blinking cursor stays
      return;
    }
    const line = lines[li];

    if (ci === 0) {
      currentDiv = document.createElement('div');
      currentDiv.className = 't-line';

      if (line.type === 'cmd') {
        currentDiv.innerHTML = prompt;
      }

      if (cursorEl) cursorEl.remove();
      cursorEl = document.createElement('span');
      cursorEl.className = 't-cursor';
      currentDiv.appendChild(cursorEl);
      body.appendChild(currentDiv);
    }

    const ch = line.text[ci];
    const typeSpan = currentDiv.querySelector(`.t-${line.type}`) ||
      (() => {
        const s = document.createElement('span');
        s.className = `t-${line.type}`;
        currentDiv.insertBefore(s, cursorEl);
        return s;
      })();

    typeSpan.textContent += ch;
    ci++;

    body.scrollTop = body.scrollHeight;

    if (ci < line.text.length) {
      setTimeout(renderLine, line.type === 'cmd' ? 55 : 18);
    } else {
      li++;
      ci = 0;
      const delay = line.type === 'cmd' ? 500 : 300;
      setTimeout(renderLine, delay);
    }
  };

  // Start when visible
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { renderLine(); obs.disconnect(); }
  }, { threshold: 0.3 });
  obs.observe(body);
}

/* ================================================================
   8. LOAD APPS FROM update/apps.json
================================================================ */
let allApps = [];
let activeFilter = 'الكل';

async function loadApps() {
  const grid = document.getElementById('apps-grid');
  if (!grid) return;

  // Show skeleton
  grid.innerHTML = Array(6).fill(null).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-line" style="width:40%;height:18px"></div>
      <div class="skeleton-line" style="width:80%;margin-top:.5rem"></div>
      <div class="skeleton-line" style="width:70%"></div>
      <div class="skeleton-line" style="width:55%;margin-top:.5rem"></div>
    </div>
  `).join('');

  try {
    const res = await fetch('./update/apps.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allApps = await res.json();

    // Build filter buttons
    buildFilterButtons();

    // Render
    renderApps(allApps);

  } catch (err) {
    console.error('Failed to load apps:', err);
    grid.innerHTML = `
      <div class="error-state">
        <span class="icon">⚠️</span>
        <h3>تعذّر تحميل التطبيقات</h3>
        <p>تأكد من وجود ملف <code>update/apps.json</code></p>
      </div>
    `;
  }
}

function buildFilterButtons() {
  const container = document.getElementById('filter-buttons');
  if (!container) return;

  const categories = ['الكل', ...new Set(allApps.map(a => a.category))];

  container.innerHTML = categories.map(cat => `
    <button class="filter-btn ${cat === 'الكل' ? 'active' : ''}"
            data-cat="${cat}">${cat}</button>
  `).join('');

  container.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.cat;
      container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filtered = activeFilter === 'الكل'
        ? allApps
        : allApps.filter(a => a.category === activeFilter);
      renderApps(filtered);
    });
  });
}

function renderApps(apps) {
  const grid = document.getElementById('apps-grid');
  if (!grid) return;

  if (!apps.length) {
    grid.innerHTML = `
      <div class="error-state">
        <span class="icon">📭</span>
        <h3>لا توجد تطبيقات في هذه الفئة</h3>
      </div>
    `;
    return;
  }

  grid.innerHTML = apps.map((app, i) => `
    <article class="app-card reveal reveal-delay-${(i % 4) + 1}"
             style="--card-gradient: ${app.gradient || 'linear-gradient(135deg, #8A2BE2, #c084fc)'}"
             data-id="${app.id}">
      <div class="shimmer"></div>

      <div class="card-top">
        <div class="card-icon-wrap"
             style="background: ${app.gradient || 'linear-gradient(135deg,#8A2BE2,#c084fc)'}33">
          <span role="img" aria-label="${app.name}">${app.icon || '📦'}</span>
        </div>
        ${app.badge ? `<span class="card-badge" style="background:${app.badgeColor || '#8A2BE2'}">${app.badge}</span>` : ''}
      </div>

      <div>
        <div class="card-name">${app.name}</div>
        <div class="card-version">v${app.version || '1.0.0'}</div>
      </div>

      <p class="card-desc">${app.description}</p>

      ${app.tags && app.tags.length ? `
        <div class="card-tags">
          ${app.tags.map(t => `<span class="card-tag">#${t}</span>`).join('')}
        </div>
      ` : ''}

      <div class="card-footer">
        <div class="card-meta">
          <span class="card-meta-item" title="التحميلات">
            ⬇️ ${app.downloads || '0'}
          </span>
          <span class="card-meta-item" title="التقييم">
            ⭐ ${app.stars || '5.0'}
          </span>
        </div>
        <div class="card-actions">
          <a href="${app.link || '#'}" class="card-btn card-btn-ghost" target="_blank">عرض</a>
          <a href="${app.downloadLink || '#'}" class="card-btn card-btn-primary" target="_blank">تحميل ↓</a>
        </div>
      </div>
    </article>
  `).join('');

  // Re-observe new cards for scroll reveal
  initScrollReveal();

  // Re-attach cursor hover
  grid.querySelectorAll('.app-card').forEach(card => {
    card.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    card.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });
}

/* ================================================================
   9. MOBILE MENU
================================================================ */
function initMobileMenu() {
  const toggle = document.getElementById('nav-toggle');
  const links  = document.getElementById('nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
    const bars = toggle.querySelectorAll('span');
    if (links.classList.contains('open')) {
      bars[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      bars[1].style.opacity   = '0';
      bars[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      bars.forEach(b => { b.style.transform = ''; b.style.opacity = ''; });
    }
  });

  // Close on link click
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      links.classList.remove('open');
    });
  });
}

/* ================================================================
   10. FILTER BUTTONS (init placeholders before JSON loads)
================================================================ */
function initFilterButtons() {
  // populated by buildFilterButtons after fetch
}
