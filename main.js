/* ============================================================================
   SUBX — interactive Arabic portfolio
   No build tools. Works directly on GitHub Pages or a local HTTP server.
   All portfolio apps come from /update/apps.json.
   ============================================================================ */
(() => {
  'use strict';

  // Replace this placeholder with your real inbox before publishing.
  const SITE_CONFIG = Object.freeze({
    email: 'your-email@example.com',
    projectFile: 'update/apps.json'
  });

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const state = {
    pointer: { x: 0, y: 0, clientX: -1000, clientY: -1000 },
    scrollProgress: 0,
    scrollY: window.scrollY,
    stage: 0,
    apps: [],
    filter: 'all',
    lastToastTimeout: null
  };

  // --------------------------------------------------------------------------
  // General UX / scroll navigation
  // --------------------------------------------------------------------------
  function initGeneralUI() {
    const boot = $('#bootScreen');
    const hideBoot = () => boot?.classList.add('is-hidden');
    window.setTimeout(hideBoot, prefersReducedMotion ? 0 : 900);
    window.addEventListener('load', hideBoot, { once: true });
    $('#footerYear').textContent = new Date().getFullYear();

    const header = $('#siteHeader');
    const progress = $('#scrollProgress');
    const sections = $$('.section-stage');
    const navLinks = $$('.nav-link');
    let scheduledScroll = false;

    function updateScrollState() {
      scheduledScroll = false;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      state.scrollY = window.scrollY;
      state.scrollProgress = clamp(window.scrollY / max, 0, 1);
      progress.style.width = `${(state.scrollProgress * 100).toFixed(3)}%`;
      header.classList.toggle('scrolled', window.scrollY > 38);
      let stage = 0;
      for (let i = 0; i < sections.length; i += 1) {
        if (sections[i].getBoundingClientRect().top <= innerHeight * .54) stage = Number(sections[i].dataset.stage);
      }
      state.stage = stage;
      const chosen = sections[clamp(stage, 0, sections.length - 1)];
      navLinks.forEach(a => a.classList.toggle('active', chosen?.id === a.hash.slice(1)));
    }
    window.addEventListener('scroll', () => {
      if (!scheduledScroll) {
        scheduledScroll = true;
        window.requestAnimationFrame(updateScrollState);
      }
    }, { passive: true });
    window.addEventListener('resize', updateScrollState, { passive: true });
    updateScrollState();

    const menuButton = $('#menuToggle');
    const mobileNav = $('#mobileNav');
    function toggleMenu(open) {
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
      header.classList.toggle('mobile-open', open);
      document.body.classList.toggle('menu-open', open);
      mobileNav.inert = !open;
    }
    menuButton.addEventListener('click', () => toggleMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
    $$('#mobileNav a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));
    window.addEventListener('keydown', e => { if (e.key === 'Escape') toggleMenu(false); });
    window.addEventListener('resize', () => { if (innerWidth > 900) toggleMenu(false); }, { passive: true });

    // Cursor-driven atmospheric lighting; no forced reflow and disabled on touch.
    if (finePointer && !prefersReducedMotion) {
      const glow = $('#cursorGlow');
      window.addEventListener('pointermove', e => {
        state.pointer.clientX = e.clientX;
        state.pointer.clientY = e.clientY;
        state.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        state.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
        glow.style.transform = `translate3d(${e.clientX - 230}px, ${e.clientY - 230}px, 0)`;
        const art = $('#brandHologram');
        if (art && window.scrollY < window.innerHeight * 1.1) {
          const rect = art.parentElement.getBoundingClientRect();
          const dx = clamp((e.clientX - (rect.left + rect.width / 2)) / rect.width, -1, 1);
          const dy = clamp((e.clientY - (rect.top + rect.height / 2)) / rect.height, -1, 1);
          // Responsive scaling is in CSS: only set tilt on larger screens.
          if (innerWidth >= 1121) art.style.transform = `rotateY(${dx * 7}deg) rotateX(${-dy * 5}deg)`;
        }
      }, { passive: true });
    }

    initContact();
    initScrollReveals();
  }

  function toast(message) {
    const element = $('#toast');
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(state.lastToastTimeout);
    state.lastToastTimeout = setTimeout(() => element.classList.remove('show'), 3300);
  }

  function initContact() {
    const email = SITE_CONFIG.email.trim();
    const placeholderEmail = !email || email === 'your-email@example.com';
    const subject = encodeURIComponent('مشروع جديد مع subx');
    $('#contactEmailLink').href = `mailto:${placeholderEmail ? '' : email}?subject=${subject}`;
    $('#contactEmailLink').addEventListener('click', e => {
      if (!placeholderEmail) return;
      e.preventDefault();
      toast('تنبيه لصاحب الموقع: أضف بريدك الحقيقي في main.js لتفعيل التواصل.');
    });
    $('#copyEmailButton').addEventListener('click', async () => {
      if (placeholderEmail) {
        toast('أضف بريد التواصل في SITE_CONFIG داخل main.js أولًا.');
        return;
      }
      try {
        await navigator.clipboard.writeText(email);
        toast('تم نسخ البريد الإلكتروني بنجاح.');
      } catch {
        // Clipboard permissions may fail on non-secure contexts; select text instead.
        toast(`البريد: ${email}`);
      }
    });
  }

  function initScrollReveals() {
    const candidates = $$('.reveal, [data-reveal]');
    if (prefersReducedMotion) return;

    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      gsap.fromTo('.hero-copy .reveal', { opacity: 0, y: 43, filter: 'blur(6px)' }, {
        opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, stagger: .11,
        ease: 'power3.out', delay: .3, clearProps: 'filter,transform,opacity'
      });
      candidates.filter(el => !el.closest('.hero-copy')).forEach(el => {
        gsap.fromTo(el, { opacity: 0, y: 45 }, {
          opacity: 1, y: 0, duration: .85, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 89%', once: true },
          clearProps: 'opacity,transform'
        });
      });
      // The panels remain in the document flow; the scroll position changes the
      // animation state instead of pinning the whole website to a fixed screen.
      gsap.to('.marquee-track', {
        xPercent: -8, ease: 'none', scrollTrigger: {
          trigger: '.marquee-section', start: 'top bottom', end: 'bottom top', scrub: 1.1
        }
      });
      gsap.to('.process-orb', {
        rotate: 70, y: -42, ease: 'none', scrollTrigger: {
          trigger: '#process', start: 'top bottom', end: 'bottom top', scrub: 1.3
        }
      });
    } else if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: .13 });
      candidates.forEach(el => { el.classList.add('will-reveal'); observer.observe(el); });
    }
  }

  // --------------------------------------------------------------------------
  // Portfolio data — dynamic JSON in the GitHub 'update' folder.
  // --------------------------------------------------------------------------
  const CATEGORY_NAME = { android: 'تطبيق أندرويد', web: 'موقع ويب', tools: 'أداة رقمية' };
  function safeUrl(value) {
    if (!value || typeof value !== 'string') return '';
    try {
      const resolved = new URL(value.trim(), document.baseURI);
      return ['http:', 'https:'].includes(resolved.protocol) ? resolved.href : '';
    } catch { return ''; }
  }
  function element(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined && text !== null) el.textContent = String(text);
    return el;
  }
  function appendText(parent, tag, className, value) {
    const child = element(tag, className, value);
    parent.append(child);
    return child;
  }
  function normalizeApps(payload) {
    const array = Array.isArray(payload) ? payload : payload?.apps;
    if (!Array.isArray(array)) throw new Error('apps.json should contain an apps array.');
    return array.filter(item => item && typeof item === 'object' && item.name).map((item, idx) => ({
      id: String(item.id || `project-${idx}`),
      name: String(item.name),
      latinName: String(item.latinName || ''),
      description: String(item.description || ''),
      icon: String(item.icon || '✳'),
      category: ['android','web','tools'].includes(item.category) ? item.category : 'tools',
      platform: String(item.platform || CATEGORY_NAME[item.category] || 'مشروع رقمي'),
      status: String(item.status || 'قيد العمل'),
      featured: Boolean(item.featured),
      tags: Array.isArray(item.tags) ? item.tags.slice(0, 5).map(String) : [],
      accent: /^#[0-9a-f]{6}$/i.test(item.accent || '') ? item.accent : '#9b51e0',
      links: Array.isArray(item.links) ? item.links.slice(0,3) : []
    }));
  }
  function renderCard(app, index) {
    const card = element('article', `project-card${app.featured ? ' featured' : ''}`);
    card.style.setProperty('--card-accent', app.accent);
    card.setAttribute('aria-label', `مشروع ${app.name}`);

    const visual = element('div','project-visual');
    appendText(visual,'span','project-visual-serial mono',`SUBX / ${String(index + 1).padStart(3,'0')}`);
    const frame = element('div','project-icon-frame');
    const possibleImage = /^(assets\/|update\/|https?:\/\/).+\.(png|jpe?g|webp|svg)(\?.*)?$/i.test(app.icon);
    if (possibleImage && safeUrl(app.icon)) {
      const img = element('img','project-icon-image');
      img.src = safeUrl(app.icon);
      img.alt = '';
      img.loading = 'lazy';
      img.onerror = () => { img.replaceWith(element('span','project-icon','✳')); };
      frame.append(img);
    } else {
      appendText(frame,'span','project-icon',app.icon.slice(0,3));
    }
    visual.append(frame);
    appendText(visual,'span','project-visual-tag mono','DESIGNED TO MATTER');
    card.append(visual);

    const content = element('div','project-card-content');
    const meta = element('div','project-meta');
    appendText(meta,'span','project-platform',app.platform);
    appendText(meta,'span','project-status',app.status);
    content.append(meta);

    const titleRow = element('div','project-title-row');
    appendText(titleRow,'h3','project-title',app.name);
    if (app.latinName) {
      const roman = appendText(titleRow,'span','project-title-en mono',app.latinName);
      roman.dir = 'ltr';
    }
    content.append(titleRow);
    appendText(content,'p','project-description',app.description);

    const tags = element('div','project-tags mono');
    app.tags.forEach(tag => appendText(tags,'span','',tag));
    content.append(tags);
    const links = element('div','project-links');
    const provided = app.links.length ? app.links : [{ label: 'قريبًا', url: '' }];
    provided.forEach(link => {
      const href = safeUrl(link?.url);
      const anchor = element(href ? 'a' : 'span', `project-link${href ? '' : ' is-disabled'}`);
      anchor.append(document.createTextNode(String(link?.label || (href ? 'عرض المشروع' : 'قريبًا'))));
      appendText(anchor,'span','',href ? '↗' : '⌛');
      if (href) {
        anchor.href = href;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.setAttribute('aria-label', `${link?.label || 'عرض المشروع'} — ${app.name} (يفتح في نافذة جديدة)`);
      }
      links.append(anchor);
    });
    content.append(links);
    card.append(content);
    if (finePointer && !prefersReducedMotion) initCardTilt(card);
    return card;
  }
  function initCardTilt(card) {
    let raf = 0;
    card.addEventListener('pointermove', e => {
      if (window.innerWidth <= 900) return;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const b = card.getBoundingClientRect();
        const x = ((e.clientX - b.left) / b.width - .5) * 2;
        const y = ((e.clientY - b.top) / b.height - .5) * 2;
        card.style.transform = `perspective(1100px) rotateY(${x * -3.2}deg) rotateX(${y * 2.7}deg) translateY(-4px)`;
      });
    }, { passive: true });
    card.addEventListener('pointerleave', () => {
      if (raf) cancelAnimationFrame(raf);
      card.style.transform = '';
    });
  }
  function renderProjects() {
    const grid = $('#projectsGrid');
    const visible = state.filter === 'all' ? state.apps : state.apps.filter(app => app.category === state.filter);
    const fragment = document.createDocumentFragment();
    if (!visible.length) {
      const empty = element('div','project-empty glass');
      appendText(empty,'p','','لا توجد مشاريع في هذا القسم حاليًا. جرّب قسمًا آخر.');
      fragment.append(empty);
    } else {
      visible.forEach((app, index) => fragment.append(renderCard(app,index)));
    }
    grid.replaceChildren(fragment);
    grid.setAttribute('aria-busy','false');
    if (window.gsap && !prefersReducedMotion && visible.length) {
      gsap.fromTo($$('.project-card',grid), { opacity: 0, y: 28, scale: .98 }, {
        opacity: 1, y: 0, scale: 1, duration: .55, stagger: .07, ease: 'power3.out', clearProps: 'opacity,transform'
      });
    }
  }
  async function initProjects() {
    $$('.filter').forEach(button => button.addEventListener('click', () => {
      if (state.filter === button.dataset.filter) return;
      state.filter = button.dataset.filter;
      $$('.filter').forEach(b => {
        const active = b === button;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      renderProjects();
    }));
    try {
      // A relative URL is critical for GitHub Pages project sites: /repo-name/.
      const url = new URL(SITE_CONFIG.projectFile, document.baseURI);
      const response = await fetch(url.href, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      state.apps = normalizeApps(await response.json());
      $('#projectTotal').textContent = String(state.apps.length).padStart(2,'0');
      $('#filterAllCount').textContent = String(state.apps.length).padStart(2,'0');
      $('#syncText').textContent = 'LOCAL JSON / SYNCED';
      renderProjects();
    } catch (error) {
      console.error('[SUBX] Project loading error:', error);
      $('#syncText').textContent = 'SYNC FAILED';
      $('#projectsGrid').setAttribute('aria-busy','false');
      const wrapper = element('div','project-error glass');
      appendText(wrapper,'strong','','تعذّر تحميل قائمة المشاريع.');
      appendText(wrapper,'p','','تأكد أن ملف update/apps.json موجود وصحيح. عند التجربة محليًا، افتح الموقع عبر خادم HTTP وليس بالنقر المباشر على index.html.');
      const note = appendText(wrapper,'code','', 'python -m http.server 8000');
      note.dir = 'ltr';
      $('#projectsGrid').replaceChildren(wrapper);
    }
  }

  // --------------------------------------------------------------------------
  // THREE.JS: reactive spatial scene with real scroll-dependent transitions.
  // Background scene is deliberately separate from the content layer.
  // --------------------------------------------------------------------------
  function initWebGL() {
    if (!window.THREE || prefersReducedMotion) return;
    const THREE = window.THREE;
    const canvas = $('#webglCanvas');
    const isMobile = innerWidth <= 650;
    const webglSupported = (() => {
      try { const c = document.createElement('canvas'); return Boolean(c.getContext('webgl2') || c.getContext('webgl')); }
      catch { return false; }
    })();
    if (!webglSupported) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true, powerPreference: 'high-performance' });
    } catch (error) {
      console.warn('[SUBX] WebGL unavailable:', error);
      return;
    }
    renderer.setClearColor(0x000000,0);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isMobile ? 1.25 : 1.65));
    renderer.setSize(innerWidth,innerHeight,false);
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x080611,.052);
    const camera = new THREE.PerspectiveCamera(51,innerWidth / innerHeight,.1,100);
    camera.position.set(0,0,10.5);

    const sculpture = new THREE.Group();
    scene.add(sculpture);

    // A faceted iridescent core with two layered rotating geometric cages.
    const shellGeometry = new THREE.IcosahedronGeometry(1.9,1);
    const shellMaterial = new THREE.MeshBasicMaterial({ color: 0xa36aff, wireframe: true, transparent: true, opacity: .27, depthWrite: false });
    const cage = new THREE.Mesh(shellGeometry,shellMaterial);
    sculpture.add(cage);

    const innerGeometry = new THREE.IcosahedronGeometry(1.45,2);
    const innerMaterial = new THREE.MeshPhongMaterial({ color: 0x42167a, emissive: 0x321055, shininess: 100, specular: 0xc79dff, transparent: true, opacity: .46, flatShading: true, side: THREE.DoubleSide, depthWrite: false });
    const core = new THREE.Mesh(innerGeometry,innerMaterial);
    sculpture.add(core);

    const knot = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.52,.047,210,9,2,5),
      new THREE.MeshBasicMaterial({ color: 0xbb8bff, transparent: true, opacity: .43, wireframe: true, depthWrite: false })
    );
    sculpture.add(knot);

    const ringGroup = new THREE.Group();
    for (let i=0;i<3;i+=1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.35 + i*.22,.008,3,130),
        new THREE.MeshBasicMaterial({ color: i === 1 ? 0x7653df : 0xc394ff, transparent: true, opacity: .25 - i*.05, depthWrite: false })
      );
      ring.rotation.x = Math.PI * (.30 + i*.23);
      ring.rotation.y = i*.86;
      ringGroup.add(ring);
    }
    sculpture.add(ringGroup);

    // Connected neural particles orbit the core (not a static image).
    const nodesCount = isMobile ? 90 : 180;
    const nodeGeometry = new THREE.BufferGeometry();
    const nodeArray = new Float32Array(nodesCount * 3);
    for (let i=0;i<nodesCount;i+=1) {
      const phi = Math.acos(1 - 2 * ((i+.5)/nodesCount));
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 2.55 + (Math.random()-.5)*.85;
      nodeArray[i*3] = r*Math.sin(phi)*Math.cos(theta);
      nodeArray[i*3+1] = r*Math.sin(phi)*Math.sin(theta);
      nodeArray[i*3+2] = r*Math.cos(phi);
    }
    nodeGeometry.setAttribute('position', new THREE.BufferAttribute(nodeArray,3));
    const nodePoints = new THREE.Points(nodeGeometry,new THREE.PointsMaterial({ color: 0xd1a7ff, size: .031, transparent: true, opacity: .81, sizeAttenuation: true, depthWrite: false }));
    sculpture.add(nodePoints);
    const lineVertices=[];
    for (let i=0;i<nodesCount;i+=1) {
      const a = i*3;
      const connections=[];
      for (let j=0;j<nodesCount;j+=1) {
        if (i===j) continue;
        const b=j*3;
        const dx=nodeArray[a]-nodeArray[b];
        const dy=nodeArray[a+1]-nodeArray[b+1];
        const dz=nodeArray[a+2]-nodeArray[b+2];
        const d2=dx*dx+dy*dy+dz*dz;
        if (d2<1.2) connections.push({j,d2});
      }
      connections.sort((a,b)=>a.d2-b.d2);
      for (const candidate of connections.slice(0,2)) {
        const b=candidate.j*3;
        lineVertices.push(nodeArray[a],nodeArray[a+1],nodeArray[a+2],nodeArray[b],nodeArray[b+1],nodeArray[b+2]);
      }
    }
    const networkGeo = new THREE.BufferGeometry();
    networkGeo.setAttribute('position',new THREE.Float32BufferAttribute(lineVertices,3));
    const network = new THREE.LineSegments(networkGeo,new THREE.LineBasicMaterial({ color: 0x8c65d1, transparent: true, opacity: .12, depthWrite: false }));
    sculpture.add(network);

    // Deep starfield, intentionally kept low contrast behind Arabic typography.
    const starsCount = isMobile ? 650 : 1700;
    const starArray = new Float32Array(starsCount*3);
    for (let i=0;i<starsCount;i+=1) {
      starArray[i*3] = (Math.random()-.5)*33;
      starArray[i*3+1] = (Math.random()-.5)*26;
      starArray[i*3+2] = -3-Math.random()*24;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position',new THREE.BufferAttribute(starArray,3));
    const stars = new THREE.Points(starGeo,new THREE.PointsMaterial({ color: 0xb095ed, size: .029, transparent: true, opacity: .43, depthWrite: false }));
    scene.add(stars);

    // Reactive, undulating wire surface. Vertices are deformed each frame.
    const waveGeometry = new THREE.PlaneGeometry(19,11,isMobile?27:49,isMobile?16:24);
    const wavePositions = waveGeometry.attributes.position;
    const waveOriginal = Float32Array.from(wavePositions.array);
    const waveMaterial = new THREE.MeshBasicMaterial({ color: 0x9251da, wireframe: true, transparent: true, opacity: .095, depthWrite: false, side: THREE.DoubleSide });
    const wave = new THREE.Mesh(waveGeometry,waveMaterial);
    wave.rotation.x = -Math.PI*.42;
    wave.position.set(0,-4.25,-4.2);
    scene.add(wave);

    const pointA = new THREE.PointLight(0x9d43fe,10,17);
    pointA.position.set(4,3,4);
    const pointB = new THREE.PointLight(0x5693ea,3,18);
    pointB.position.set(-4,-2,3);
    scene.add(pointA,pointB,new THREE.AmbientLight(0x60359e,.8));

    const STAGES = [
      {x:-2.5,y:.25,z:0,scale:1,rot:.35,opacity:.28},
      {x:3.2,y:-.45,z:-2,scale:.7,rot:1.4,opacity:.15},
      {x:0,y:1.2,z:-1.8,scale:.88,rot:3.15,opacity:.26},
      {x:-3.1,y:0,z:-1.3,scale:.87,rot:4.3,opacity:.2},
      {x:2.95,y:.1,z:-1.6,scale:.76,rot:5.1,opacity:.2},
      {x:0,y:0,z:-1.5,scale:1.3,rot:6.2,opacity:.32}
    ];
    const sceneTransition = { stage: 0, intensity: 0, burst: 0 };
    const pointerSmooth = { x: 0, y: 0 };
    const clock = new THREE.Clock();
    let last = 0;
    let running = true;

    function onResize() {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth <= 650 ? 1.25 : 1.65));
      renderer.setSize(innerWidth,innerHeight,false);
    }
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', () => {
      running = !document.hidden;
      if (running) { clock.getDelta(); requestAnimationFrame(tick); }
    });

    // Clicks radiate through the 3D field as shockwave rings.
    function shockwave(x,y) {
      if (!running) return;
      const coords = new THREE.Vector3((x/innerWidth)*2-1,-(y/innerHeight)*2+1,.52).unproject(camera);
      const direction = coords.sub(camera.position).normalize();
      const distance = -camera.position.z / direction.z;
      const impact = camera.position.clone().add(direction.multiplyScalar(distance));
      const material = new THREE.MeshBasicMaterial({color:0xc28afa,transparent:true,opacity:.68,side:THREE.DoubleSide,depthWrite:false});
      const ring = new THREE.Mesh(new THREE.RingGeometry(.94,1,96),material);
      ring.position.set(impact.x,impact.y,-.1);
      ring.scale.setScalar(.08);
      scene.add(ring);
      if (window.gsap) {
        gsap.to(ring.scale,{x:4.9,y:4.9,duration:1.4,ease:'power2.out'});
        gsap.to(material,{opacity:0,duration:1.3,ease:'power2.out',onComplete:()=>{
          scene.remove(ring); ring.geometry.dispose(); material.dispose();
        }});
      } else {
        // All non-GSAP browsers still respond to clicks with core acceleration.
        scene.remove(ring); ring.geometry.dispose(); material.dispose();
      }
      sceneTransition.burst = 1;
    }
    window.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('button,a')) return;
      shockwave(e.clientX,e.clientY);
    }, { passive: true });

    function tick() {
      if (!running) return;
      const delta = Math.min(clock.getDelta(),.04);
      const elapsed = clock.elapsedTime;
      const stageIndex = clamp(state.stage,0,STAGES.length-1);
      const target = STAGES[stageIndex];
      const k = 1 - Math.pow(.004,delta);
      sceneTransition.stage = lerp(sceneTransition.stage,stageIndex,k*.35);
      sceneTransition.burst = Math.max(0,sceneTransition.burst-delta*.65);
      pointerSmooth.x = lerp(pointerSmooth.x,state.pointer.x,k*.65);
      pointerSmooth.y = lerp(pointerSmooth.y,state.pointer.y,k*.65);
      const worldX = innerWidth < 900 ? 0 : target.x;

      sculpture.position.x = lerp(sculpture.position.x,worldX+pointerSmooth.x*.38,k*.6);
      sculpture.position.y = lerp(sculpture.position.y,target.y-pointerSmooth.y*.27,k*.65);
      sculpture.position.z = lerp(sculpture.position.z,target.z,k*.65);
      const baseScale = innerWidth<=650 ? target.scale*.70 : target.scale;
      const scale=lerp(sculpture.scale.x,baseScale*(1+sceneTransition.burst*.18),k*.75);
      sculpture.scale.setScalar(scale);
      sculpture.rotation.y += delta*(.11+sceneTransition.burst*.95);
      sculpture.rotation.x = lerp(sculpture.rotation.x,target.rot*.16+pointerSmooth.y*.17+Math.sin(elapsed*.18)*.1,k*.37);
      sculpture.rotation.z = lerp(sculpture.rotation.z,Math.sin(elapsed*.14)*.12+state.scrollProgress*.34,k*.33);
      core.rotation.y -= delta*.16;
      core.rotation.z += delta*.08;
      knot.rotation.x += delta*.23;
      knot.rotation.y -= delta*.13;
      cage.rotation.y += delta*.09;
      ringGroup.rotation.z += delta*.12;
      ringGroup.rotation.x -= delta*.06;
      nodePoints.rotation.y += delta*.075;
      network.rotation.y += delta*.075;
      stars.rotation.y += delta*.0018;
      stars.position.x = pointerSmooth.x*.12;
      stars.position.y = -pointerSmooth.y*.11;
      pointA.position.x = 4+pointerSmooth.x*3;
      pointA.position.y = 3-pointerSmooth.y*2;
      shellMaterial.opacity = lerp(shellMaterial.opacity,target.opacity+sceneTransition.burst*.22,k*.5);

      // Cursor and scrolling BOTH perturb the wave rather than reusing a looped video.
      if (elapsed-last >= (innerWidth<=650 ? .052 : .031)) {
        last=elapsed;
        const intensity=1+state.scrollProgress*1.7+sceneTransition.burst*3;
        for (let i=0;i<wavePositions.count;i+=1) {
          const x=waveOriginal[i*3];
          const y=waveOriginal[i*3+1];
          const dx=x-pointerSmooth.x*4;
          const dy=y+pointerSmooth.y*2;
          const ripple = Math.sin(Math.sqrt(dx*dx+dy*dy)*1.6-elapsed*2.1);
          const z=Math.sin(x*.8+elapsed*.75)*.17+Math.cos(y*1.04-elapsed*.55)*.24+ripple*.12*intensity;
          wavePositions.setZ(i,z);
        }
        wavePositions.needsUpdate=true;
      }
      wave.rotation.z = state.scrollProgress*.3;
      camera.position.x=lerp(camera.position.x,pointerSmooth.x*.2,k*.4);
      camera.position.y=lerp(camera.position.y,-pointerSmooth.y*.15,k*.4);
      camera.lookAt(0,0,0);
      renderer.render(scene,camera);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // Keep the site fully functional when third-party animation CDNs are blocked.
  initGeneralUI();
  initProjects();
  initWebGL();
})();
