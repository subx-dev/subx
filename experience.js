/**
 * SUBX 2.0 / THE SCROLL IS THE CAMERA.
 * A self-contained, direct scroll-driven 4-stage timeline.
 * 1. A full metallic robot is always visible at first paint.
 * 2. Head, arms, torso and legs detach as the page advances.
 * 3. The exposed processor flies into camera and fills the frame.
 * 4. Deterministically random code fragments fly from its circuitry.
 * Does not depend on WebGL, WebGL extensions, network, CDN or animation libraries.
 */
(() => {
  'use strict';

  const one = (selector, root = document) => root.querySelector(selector);
  const all = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = (a, b, value) => {
    const u = clamp((value - a) / Math.max(b - a, 0.000001));
    return u * u * (3 - 2 * u);
  };
  const windowAlpha = (value, a, b, fade = 0.055) =>
    Math.min(a === 0 ? 1 : ease(a, a + fade, value), 1 - ease(b - fade, b, value));
  const stage = one('#odyssey-stage');
  const section = one('.subx-odyssey');
  const rig = one('#robot-rig');
  const chip = one('#processor-wrap');
  const beam = one('#processor-beam');
  const storm = one('#code-storm');
  const copyBlocks = all('.scene-copy');
  const parts = {
    antenna: one('#part-antenna'),
    head: one('#part-head'),
    neck: one('#part-neck'),
    leftArm: one('#part-left-arm'),
    rightArm: one('#part-right-arm'),
    leftChest: one('#part-left-chest'),
    rightChest: one('#part-right-chest'),
    hip: one('#part-hip'),
    leftLeg: one('#part-left-leg'),
    rightLeg: one('#part-right-leg')
  };
  const offsets = {
    antenna: [-165, -175, -30],
    head: [-180, -145, -9],
    neck: [0, -90, 4],
    leftArm: [-145, -20, -34],
    rightArm: [145, -20, 34],
    leftChest: [-115, -35, -23],
    rightChest: [115, -35, 23],
    hip: [0, 95, 4],
    leftLeg: [-68, 170, 12],
    rightLeg: [68, 170, -12]
  };
  const partDelay = {
    antenna: .13,
    head: .16,
    leftArm: .20,
    rightArm: .20,
    leftChest: .275,
    rightChest: .275,
    neck: .31,
    hip: .33,
    leftLeg: .35,
    rightLeg: .35
  };

  // Random-looking but seeded, so positions do not jump between scroll events.
  function createRandom(seed) {
    let state = seed >>> 0;
    return () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }
  const random = createRandom(0x5ABABEEF);
  const snippets = [
    'const future = build(idea);',
    'if (signal.ready) activate();',
    'await system.initialize();',
    'function create() { return magic; }',
    '0xAB 0x4F 0x91 0xFF',
    '01001001 11001010 1010',
    'class Engine extends Vision {',
    'console.log("SUBX ONLINE");',
    '<Component state="active" />',
    'import { innovation } from "subx";',
    'render(innovation);',
    'while (true) { imagine(); }',
    '01 / INITIALIZING SYSTEM',
    'CORE::PROCESS(0x8F1C);',
    'let creativity = Infinity;',
    '// behind every pixel',
    '>>> DEPLOY COMPLETED',
    'node.connect(graph.core);',
    'const speed = 120;',
    'return compose(ideas);',
    'for (let i = 0; i < 100; i++)',
    'export default function SUBX()',
    '{ status: 200, mode: "LIVE" }',
    'new Experience({ motion: true });',
    'SELECT * FROM possibilities;',
    '01110011 01110101 01100010 01111000',
    'shader.fragment = neon;',
    'interface Future { design: true; }',
    'data.stream = connect();',
    'compile(/* the impossible */);',
    'const engine = new Studio();',
    'CPU.CLOCK = 4_000_000_000;',
    'SYSTEM::BOOT_OK',
    'requestAnimationFrame(render);'
  ];
  const codeFragments = [];
  const fragmentCount = window.innerWidth < 761 ? 68 : 105;
  for (let index = 0; index < fragmentCount; index++) {
    const element = document.createElement('span');
    const type = index % 5 === 0 ? 'number' : index % 7 === 0 ? 'comment' : index % 3 === 0 ? 'string' : 'keyword';
    element.className = `code-frag ${type}`;
    element.textContent = snippets[Math.floor(random() * snippets.length)];
    const item = {
      element,
      x: random() * 112 - 6,
      y: random() * 116 - 8,
      depth: random(),
      spin: random() * 36 - 18,
      velocity: .45 + random() * 1.3,
      threshold: random() * .33,
      side: random() > .5 ? 1 : -1
    };
    storm.appendChild(element);
    codeFragments.push(item);
  }

  const stepLabels = ['ROBOT ONLINE', 'DECONSTRUCTING UNIT', 'PROCESSOR EXPOSED', 'SOURCE UNLOCKED'];
  const chapters = all('.odyssey-chapters span');
  const stepDisplay = one('#current-step');
  const readout = one('#sys-readout');
  const stageCaption = one('#stage-caption');
  const pageBar = one('#scroll-progress');
  const header = one('.site-header');
  let isQueued = false;
  let lastStep = -1;
  let stageVisible = true;

  function setPart(part, x, y, rotation, extent, alpha) {
    part.style.transform = `translate3d(${(x * extent).toFixed(1)}px, ${(y * extent).toFixed(1)}px, 0) rotate(${(rotation * extent).toFixed(1)}deg)`;
    part.style.opacity = alpha.toFixed(3);
  }

  function paint() {
    isQueued = false;
    const rect = section.getBoundingClientRect();
    const range = Math.max(1, section.offsetHeight - window.innerHeight);
    const position = clamp(-rect.top / range);
    const isSceneVisible = rect.bottom > 0 && rect.top < window.innerHeight;
    stageVisible = isSceneVisible;

    const arrival = ease(0, .13, position);
    const explode = ease(.13, .51, position);
    const zoomIn = ease(.46, .73, position);
    const codeProgress = ease(.66, .95, position);
    const codeIn = ease(.66, .83, position);
    const robotFade = 1 - ease(.46, .61, position);
    const chipFade = ease(.35, .49, position) * (1 - ease(.72, .85, position));
    const centerOffset = window.innerWidth < 761 ? 0 : -50;
    const introDrift = mix(65, 0, arrival);

    rig.style.setProperty('--rig-scale', mix(.81, 1.1, arrival) * (1 + .15 * explode + .33 * zoomIn));
    rig.style.setProperty('--rig-y', `${(introDrift - 18 * explode - 38 * zoomIn).toFixed(1)}px`);
    rig.style.setProperty('--rig-x', `${(12 * explode + centerOffset * zoomIn).toFixed(1)}px`);
    rig.style.setProperty('--rig-roll', `${mix(7, 0, arrival) + 4 * explode}deg`);
    rig.style.setProperty('--rig-alpha', robotFade.toFixed(3));
    rig.style.visibility = robotFade < .005 ? 'hidden' : 'visible';

    for (const [name, part] of Object.entries(parts)) {
      const [dx, dy, dr] = offsets[name];
      const local = ease(partDelay[name], Math.min(.54, partDelay[name] + .22), position);
      // Pieces also move offstage, revealing the central skeleton and core.
      const fading = 1 - ease(.40, .57, position);
      setPart(part, dx, dy, dr, local, fading);
    }
    one('#bot-skeleton').style.opacity = String(ease(.26, .38, position) * (1 - ease(.47, .59, position)));
    one('#bot-light').style.opacity = String(1 - ease(.44, .55, position));

    chip.style.setProperty('--chip-alpha', chipFade.toFixed(3));
    chip.style.setProperty('--chip-scale', mix(.24, 1.15, ease(.37, .52, position)) * mix(1, 6.3, zoomIn));
    chip.style.setProperty('--chip-roll', `${mix(-18, 0, ease(.37, .59, position)) + (zoomIn * 8)}deg`);
    chip.style.setProperty('--chip-y', `${mix(55, -35, ease(.37, .67, position)).toFixed(1)}px`);
    chip.style.setProperty('--chip-x', `${(-centerOffset * ease(.5, .7, position)).toFixed(1)}px`);
    chip.style.visibility = chipFade < .005 ? 'hidden' : 'visible';

    const flash = ease(.69, .76, position) * (1 - ease(.79, .89, position));
    beam.style.setProperty('--beam-alpha', (flash * .9).toFixed(3));
    beam.style.setProperty('--beam-scale', mix(.12, 12, ease(.69, .88, position)).toFixed(3));
    stage.style.setProperty('--code-alpha', codeIn.toFixed(3));
    stage.style.setProperty('--tunnel-alpha', `${ease(.65, .78, position) * (1 - ease(.83, .94, position))}`);
    stage.style.setProperty('--tunnel-scale', `${mix(.25, 2.6, codeProgress)}`);
    stage.style.setProperty('--tunnel-turn', `${codeProgress * 45}deg`);
    stage.style.setProperty('--star-shift', `${(-position * 155).toFixed(1)}px`);
    stage.style.setProperty('--grid-shift', `${(position * 54).toFixed(1)}px`);
    stage.style.setProperty('--nebula-drift', `${(-position * 95).toFixed(1)}px`);
    stage.style.setProperty('--halo-rotation', `${position * 70}deg`);
    stage.style.setProperty('--halo-scale', `${mix(1, 1.8, zoomIn)}`);
    stage.style.setProperty('--halo-opacity', `${1 - ease(.62, .79, position)}`);

    for (const block of copyBlocks) {
      const enter = Number(block.dataset.from);
      const leave = Number(block.dataset.to);
      const alpha = windowAlpha(position, enter, leave, .06);
      block.style.setProperty('--scene-opacity', alpha.toFixed(3));
      const lifetime = clamp((position - enter) / Math.max(.01, leave - enter));
      const drift = window.innerWidth < 761 ? 45 : 90;
      const travel = drift * (1 - lifetime * 2);
      block.style.setProperty('--scene-travel', `${travel.toFixed(1)}px`);
      block.style.visibility = alpha < .015 ? 'hidden' : 'visible';
      block.style.pointerEvents = alpha > .7 ? 'auto' : 'none';
      block.querySelectorAll('a').forEach(link => { link.tabIndex = alpha > .7 ? 0 : -1; });
    }

    // Each fragment has its own trajectory, revealing new syntax with each scroll tick.
    if (isSceneVisible && position > .61) {
      const areaW = window.innerWidth;
      const areaH = window.innerHeight;
      for (const item of codeFragments) {
        const local = clamp((codeProgress - item.threshold) / Math.max(0.01, 1 - item.threshold));
        const topBand = areaW < 761 ? 0.43 : 0.16;
        const usableH = areaH * (1 - topBand);
        const y = areaH * topBand + (((usableH * item.y / 100) - local * usableH * item.velocity * .95 + usableH * 3) % usableH);
        const x = areaW * (item.x / 100) + item.side * 90 * local * item.depth;
        const zoom = mix(.42 + .3 * item.depth, 1 + 1.35 * item.depth, local);
        item.element.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${(item.spin * local).toFixed(1)}deg) scale(${zoom.toFixed(2)})`;
        item.element.style.opacity = `${Math.min(1, ease(0, .14, local)) * (0.3 + .68 * item.depth)}`;
      }
    } else if (position <= .61) {
      codeFragments.forEach(item => { item.element.style.opacity = '0'; });
    }

    const step = position < .22 ? 0 : position < .46 ? 1 : position < .76 ? 2 : 3;
    if (step !== lastStep) {
      lastStep = step;
      stepDisplay.textContent = String(step + 1).padStart(2, '0');
      readout.textContent = stepLabels[step];
      stageCaption.textContent = [
        'SUBX / ROBOT MODEL 001 / ENTRANCE',
        'SUBX / ARMATURE / DETACHING COMPONENTS',
        'SUBX / CORE CLOCK / 4.00 GHZ',
        'SUBX / LIVE CODE / EXECUTING IDEAS'
      ][step];
      chapters.forEach((item, idx) => item.classList.toggle('is-on', idx === step));
    }
    stage.style.setProperty('--meter-fill', `${(position * 100).toFixed(1)}%`);
    header.classList.toggle('scrolled', window.scrollY > 36);
    const totalScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    pageBar.style.width = `${(100 * window.scrollY / totalScroll).toFixed(2)}%`;
  }

  function askPaint() {
    if (isQueued) return;
    isQueued = true;
    requestAnimationFrame(paint);
  }
  window.addEventListener('scroll', askPaint, { passive:true });
  window.addEventListener('resize', askPaint, { passive:true });
  window.addEventListener('load', askPaint);

  // Navigation + content interactivity; nothing is a dead decorative control.
  const toggle = one('#menu-toggle');
  const menu = one('#mobile-nav');
  function closeMenu() {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'فتح القائمة');
  }
  toggle.addEventListener('click', () => {
    const shouldOpen = menu.hidden;
    menu.hidden = !shouldOpen;
    toggle.setAttribute('aria-expanded', String(shouldOpen));
    toggle.setAttribute('aria-label', shouldOpen ? 'إغلاق القائمة' : 'فتح القائمة');
  });
  all('a', menu).forEach(item => item.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  document.addEventListener('click', event => {
    if (!menu.hidden && !menu.contains(event.target) && !toggle.contains(event.target)) closeMenu();
  });

  const content = all('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    }, { threshold:.09, rootMargin:'0px 0px -25px 0px' });
    content.forEach(item => observer.observe(item));
  } else {
    content.forEach(item => item.classList.add('visible'));
  }

  const toast = one('#toast');
  let toastTimeout;
  function notify(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
  }
  const form = one('#contact-form');
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const fields = new FormData(form);
    const name = String(fields.get('name') || '').trim();
    const subject = String(fields.get('subject') || '').trim();
    const message = String(fields.get('message') || '').trim();
    if (!name || !subject || !message) return;
    const emailSubject = encodeURIComponent(`[SUBX] ${subject}`);
    const emailBody = encodeURIComponent(`الاسم: ${name}\n\nالرسالة:\n${message}\n\nأُرسلت عبر نموذج SUBX`);
    window.location.href = `mailto:maa321584@gmail.com?subject=${emailSubject}&body=${emailBody}`;
    notify('جهزنا الرسالة؛ أكمل إرسالها من تطبيق البريد.');
  });

  // If JS is delayed or the page is resumed at a hash, first paint still works.
  paint();
})();
