/* SUBX: Lightweight scroll-cinematic interactions. Works locally without CDN or external 3D libraries. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const ease = (v) => v * v * (3 - 2 * v);
  const header = $('#header');
  const topProgress = $('#pageProgress');
  const percent = $('#progressPercent');
  const menuToggle = $('#menuToggle');
  const mobileNav = $('#mobileNav');
  const navLinks = $$('.desktop-nav a');
  const stageLinks = $$('.stage-nav a');
  const allSections = $$('main section[id]');
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  // Menu: real accessible expanded state and links close it.
  const setMenu = (open) => {
    if (!menuToggle || !mobileNav) return;
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
    mobileNav.classList.toggle('open', open);
    mobileNav.inert = !open;
    document.body.classList.toggle('menu-open', open);
  };
  if (menuToggle) menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
  if (mobileNav) $$('a', mobileNav).forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setMenu(false); });
  window.addEventListener('resize', () => { if (window.innerWidth > 900) setMenu(false); }, { passive: true });

  // Progressive enhancement: disabled JS means visible content.
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    document.documentElement.classList.add('js-motion');
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('in-view'); observer.unobserve(entry.target);
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
    $$('.reveal').forEach(node => observer.observe(node));
  } else {
    $$('.reveal').forEach(node => node.classList.add('in-view'));
  }

  // Code examples are intentionally generic, not taken from any proprietary app.
  const snippets = {
    vision: [
      ['com', '// Turning possibility into architecture'],
      ['key', 'type Vision = {'],
      ['plain', '  clarity: boolean;'],
      ['plain', '  creativity: number;'],
      ['plain', '  precision: number;'],
      ['plain', '};'],
      ['plain', ''],
      ['key', 'const idea: Vision = {'],
      ['plain', '  clarity: true,'],
      ['plain', '  creativity: Infinity,'],
      ['plain', '  precision: 1.0'],
      ['plain', '};'],
      ['plain', ''],
      ['fn', 'export function build(future: Vision) {'],
      ['str', '  return "SUBX / beyond the expected";'],
      ['plain', '}']
    ],
    system: [
      ['com', '// A modular system with a clear intention'],
      ['key', 'class DigitalSystem {'],
      ['plain', '  constructor(idea) {'],
      ['plain', '    this.idea = idea;'],
      ['plain', '    this.status = "ready";'],
      ['plain', '  }'],
      ['plain', ''],
      ['fn', '  async launch() {'],
      ['plain', '    const design = await prototype();'],
      ['plain', '    const build = await engineer(design);'],
      ['str', '    return { build, experience: "human" };'],
      ['plain', '  }'],
      ['plain', '}'],
      ['plain', ''],
      ['key', 'new DigitalSystem("SUBX").launch();']
    ],
    future: [
      ['plain', '{'],
      ['str', '  "brand": "SUBX",'],
      ['str', '  "mission": "make ideas tangible",'],
      ['plain', '  "values": ['],
      ['str', '    "craft",'],
      ['str', '    "clarity",'],
      ['str', '    "curiosity"'],
      ['plain', '  ],'],
      ['plain', '  "systems": {'],
      ['str', '    "design": "intentional",'],
      ['str', '    "code": "resilient",'],
      ['str', '    "experience": "human-centered"'],
      ['plain', '  },'],
      ['plain', '  "futureReady": true'],
      ['plain', '}']
    ]
  };
  let currentCode = 'vision';
  const codeView = $('#codeView');
  const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const showCode = (name) => {
    if (!codeView || !snippets[name]) return;
    currentCode = name;
    codeView.innerHTML = snippets[name].map(([kind, line], i) => {
      const cls = kind === 'plain' ? '' : ` class="code-${kind}"`;
      return `<span class="line-no">${String(i+1).padStart(2,'0')} </span><span${cls}>${escapeHtml(line)}</span>`;
    }).join('\n');
    $$('.terminal-tab').forEach(tab => {
      const active = tab.dataset.code === name;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    codeView.scrollTop = 0;
  };
  $$('.terminal-tab').forEach(tab => tab.addEventListener('click', () => showCode(tab.dataset.code)));
  showCode('vision');

  const toast = $('#toast');
  let toastTimer;
  const notify = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2800);
  };
  const copyText = async (value) => {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(value); return true; } catch (_) { /* local files can block clipboard */ }
    }
    const scratch = document.createElement('textarea');
    scratch.value = value;
    scratch.setAttribute('readonly', '');
    scratch.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
    document.body.appendChild(scratch);
    scratch.focus(); scratch.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
    scratch.remove();
    return ok;
  };
  const copyBtn = $('#copyCode');
  if (copyBtn) copyBtn.addEventListener('click', async () => {
    const raw = snippets[currentCode].map(item => item[1]).join('\n');
    const success = await copyText(raw);
    notify(success ? 'تم نسخ الكود' : 'المتصفح منع النسخ. حدّد الكود وانسخه يدويًا.');
  });

  // Decorative code cloud. Fixed positions / frame; scroll changes every position.
  const codeSamples = ['0101 1010', '<system />', 'const future =', 'return build()', 'X.ENGINE', 'render()', '[0xA4F]', '01001011', '<Digital />', 'async init()', 'export default', '{ progress: 1 }', 'SUBX.execute()', 'UX + CODE', 'await create()', 'node.connect()', '0xFF00AA', 'design: true'];
  const particles = $('#codeParticles');
  if (particles) {
    let seed = 403;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 34; i++) {
      const span = document.createElement('span'); span.className = 'code-particle';
      span.textContent = codeSamples[Math.floor(random() * codeSamples.length)];
      span.style.setProperty('--left', (random() * 92 + 2).toFixed(1) + '%');
      span.style.setProperty('--top', (random() * 88 + 5).toFixed(1) + '%');
      span.style.setProperty('--dx', ((random() - .5) * 380).toFixed(0));
      span.style.setProperty('--dy', ((random() - .5) * 450).toFixed(0));
      span.style.setProperty('--rot', ((random() - .5) * 20).toFixed(0));
      span.style.setProperty('--alpha', (.15 + random() * .42).toFixed(2));
      fragment.appendChild(span);
    }
    particles.appendChild(fragment);
  }

  // Functional app mock: tabs update summary and sample bars. No fake backend.
  const appStates = {
    home: { balance:'12,540.00', growth:'↗ +5.2% هذا الشهر', heading:'ملخص الشهر', heights:[38,63,44,78,59,95,71] },
    records: { balance:'12,540.00', growth:'↗ 18 معاملة هذا الشهر', heading:'حركة المعاملات', heights:[25,80,51,61,42,86,58] },
    goals: { balance:'8,200.00', growth:'◎ من أصل 12,000 هدف ادخار', heading:'تقدّم الأهداف', heights:[19,24,36,46,55,65,73] },
    reports: { balance:'4,340.00', growth:'↗ صافي التدفق الشهري', heading:'تحليل المصروفات', heights:[73,49,67,35,78,47,66] }
  };
  $$('.phone-nav button').forEach(button => button.addEventListener('click', () => {
    const state = appStates[button.dataset.app];
    if (!state) return;
    $$('.phone-nav button').forEach(el => el.classList.toggle('active', el === button));
    const amount = $('#balanceAmount'); if (amount) amount.innerHTML = `${state.balance} <small>ر.س</small>`;
    const growth = $('.growth'); if (growth) growth.textContent = state.growth;
    const title = $('#chartTitle'); if (title) title.textContent = state.heading;
    $$('#demoBars i').forEach((bar, index) => bar.style.setProperty('--h', state.heights[index] + '%'));
  }));

  // Project details dialog.
  const dialog = $('#previewDialog');
  const previewOpen = $('#previewOpen');
  const previewClose = $('#previewClose');
  if (previewOpen && dialog) previewOpen.addEventListener('click', () => {
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
  });
  if (previewClose && dialog) previewClose.addEventListener('click', () => dialog.close ? dialog.close() : dialog.removeAttribute('open'));
  if (dialog) dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close ? dialog.close() : dialog.removeAttribute('open'); });
  const dialogGo = $('#dialogGo');
  if (dialogGo && dialog) dialogGo.addEventListener('click', () => dialog.close ? dialog.close() : dialog.removeAttribute('open'));

  // Local-only contact request compiler, honest about the lack of a backend.
  const form = $('#contactForm');
  if (form) form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const name = $('#clientName').value.trim(), type = $('#projectType').value, brief = $('#projectBrief').value.trim();
    if (!name || !brief) { notify('أكمل الاسم ووصف المشروع أولًا'); return; }
    const message = `طلب مشروع جديد — SUBX\n\nالاسم: ${name}\nنوع المشروع: ${type}\n\nالتفاصيل:\n${brief}\n\n— تم تجهيز الرسالة من موقع SUBX`;
    const success = await copyText(message);
    const help = $('#formHelp');
    if (success) {
      if (help) help.textContent = 'تم النسخ. الصق الملخص في وسيلة التواصل التي تفضّلها.';
      notify('تم نسخ ملخص مشروعك بنجاح');
    } else {
      if (help) { help.textContent = `تعذر النسخ تلقائيًا. يمكنك تحديد النص ونسخه:\n${message}`; help.style.whiteSpace = 'pre-wrap'; help.style.userSelect = 'text'; }
      notify('تعذر النسخ تلقائيًا؛ ملخص المشروع ظاهر أسفل النموذج');
    }
  });

  // Scroll engine: no position:sticky/fixed on robot or on the cinematic sections.
  // Each scene has independent document flow; its elements move *as the page itself moves*.
  const hero = $('#start'), robot = $('.robot-wrap');
  const exploded = $('#dismantle'), explosionCanvas = $('.explosion-canvas');
  const cpu = $('#cpu'), processor = $('.processor-visual');
  const code = $('#stream');
  let ticking = false;
  const sceneProgress = (element) => {
    if (!element) return 0;
    const rect = element.getBoundingClientRect(), vh = window.innerHeight;
    return clamp((vh - rect.top) / (vh + rect.height));
  };
  const onFrame = () => {
    ticking = false;
    const doc = document.documentElement;
    const maxY = Math.max(1, doc.scrollHeight - window.innerHeight);
    const page = clamp(window.scrollY / maxY);
    if (topProgress) topProgress.style.width = (page * 100).toFixed(2) + '%';
    if (percent) percent.textContent = String(Math.round(page * 100)).padStart(2,'0') + '%';
    if (header) header.classList.toggle('scrolled', window.scrollY > 25);
    if (!reducedMotion.matches) {
      if (hero && robot) {
        const progress = sceneProgress(hero);
        robot.style.transform = `translate3d(0,${(progress * 60).toFixed(1)}px,0) scale(${(1 + progress * .1).toFixed(3)}) rotate(${(progress * 2).toFixed(2)}deg)`;
      }
      if (exploded && explosionCanvas) {
        const progress = ease(sceneProgress(exploded));
        explosionCanvas.style.setProperty('--explode', progress.toFixed(3));
        explosionCanvas.style.setProperty('--shift', progress.toFixed(3));
      }
      if (cpu && processor) {
        const progress = sceneProgress(cpu);
        processor.style.setProperty('--cpu', progress.toFixed(3));
        processor.style.transform = `translate3d(0,${((.5 - progress) * 53).toFixed(1)}px,0)`;
      }
      if (code && particles) {
        const progress = sceneProgress(code);
        particles.style.setProperty('--code-progress', ((progress - .5) * 2).toFixed(3));
      }
    }
    const viewportMark = Math.min(window.innerHeight*.35,250);
    let active = allSections[0]?.id || 'start';
    for (const el of allSections) if (el.getBoundingClientRect().top <= viewportMark) active = el.id;
    navLinks.forEach(link => link.classList.toggle('active', link.hash === '#'+active));
    let mapActive = active;
    if (['method','about','contact'].includes(active)) mapActive = 'services';
    stageLinks.forEach(link => link.classList.toggle('active', link.hash === '#'+mapActive));
  };
  const requestFrame = () => { if (!ticking) { ticking = true; requestAnimationFrame(onFrame); } };
  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', requestFrame, { passive: true });
  reducedMotion.addEventListener?.('change', requestFrame);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) requestFrame(); });
  window.addEventListener('load', requestFrame);
  requestFrame();
})();
