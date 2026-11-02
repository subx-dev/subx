/** SUBX / INTERACTION CONTROLLER — scroll scenes, editor, mobile nav, forms. */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
  const smooth = (a, b, n) => {
    const t = clamp((n - a) / Math.max(.0001, b - a));
    return t * t * (3 - 2 * t);
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  const journey = $('.journey');
  const copyBlocks = $$('.story-copy');
  const phone = $('#phone-portal');
  const code = $('#code-portal');
  const core = $('#core-label');
  const pulses = $('#data-pulse');
  const track = $$('#step-track span');
  const header = $('.site-header');
  const scrollBar = $('#scroll-progress');
  const stars = $('#world-stars');
  const coordinates = $('#hud-coordinates');
  let currentProgress = 0;
  let scheduled = false;
  let visibleCodeLines = [];

  function showWindow(position, from, until, duration = .055) {
    const entrance = from === 0 ? 1 : smooth(from, from + duration, position);
    const exit = 1 - smooth(until - duration, until, position);
    return Math.min(entrance, exit);
  }
  function renderScroll() {
    scheduled = false;
    const scrollRange = Math.max(1, journey.offsetHeight - window.innerHeight);
    const distance = -journey.getBoundingClientRect().top;
    const p = clamp(distance / scrollRange);
    currentProgress = p;
    if (window.SUBXRobot) window.SUBXRobot.setProgress(p);

    for (const block of copyBlocks) {
      const from = Number(block.dataset.from);
      const until = Number(block.dataset.to);
      const alpha = showWindow(p, from, until, .05);
      block.style.setProperty('--copy-alpha', alpha.toFixed(3));
      block.style.setProperty('--copy-move', `${Math.round((1 - alpha) * 22)}px`);
      block.setAttribute('aria-hidden', alpha < .05 ? 'true' : 'false');
      block.style.visibility = alpha < .01 ? 'hidden' : 'visible';
      block.querySelectorAll('a').forEach(link => { link.tabIndex = alpha > .2 ? 0 : -1; });
    }

    const coreAlpha = showWindow(p, .27, .53, .04);
    core.style.opacity = coreAlpha.toFixed(3);
    core.style.transform = `translateY(${Math.round((.5 - p) * 50)}px)`;
    const pulseAlpha = showWindow(p, .38, .73, .06);
    pulses.style.opacity = pulseAlpha.toFixed(3);
    pulses.style.transform = `translateX(${Math.round((.52 - p) * 60)}px)`;

    const phoneAlpha = showWindow(p, .55, .84, .075);
    const scalePhone = p < .70 ? lerp(.40, .85, smooth(.55, .71, p)) : lerp(.85, 4.1, smooth(.71, .84, p));
    phone.style.opacity = phoneAlpha.toFixed(3);
    phone.style.setProperty('--phone-scale', scalePhone.toFixed(3));
    phone.style.setProperty('--phone-rotate', `${lerp(-10, 0, smooth(.58, .72, p)).toFixed(2)}deg`);
    phone.style.visibility = phoneAlpha < .01 ? 'hidden' : 'visible';

    const codeAlpha = showWindow(p, .76, 1.005, .09);
    const codeScale = lerp(.72, 1, smooth(.77, .86, p));
    code.style.opacity = codeAlpha.toFixed(3);
    code.style.setProperty('--code-scale', codeScale.toFixed(3));
    code.style.pointerEvents = codeAlpha > .75 ? 'auto' : 'none';
    code.style.visibility = codeAlpha < .01 ? 'hidden' : 'visible';

    // Every code line enters as the scroll travels deeper through the application.
    const lineProportion = smooth(.79, .94, p);
    const showCount = Math.ceil(visibleCodeLines.length * lineProportion);
    visibleCodeLines.forEach((line, i) => line.classList.toggle('appeared', i < showCount));

    const step = Math.min(track.length - 1, Math.floor(p * track.length));
    track.forEach((dot, index) => dot.classList.toggle('active', index === step));
    const status = p < .23 ? 'EXPLORATION / READY' : p < .41 ? 'SCAN / ACTIVE' : p < .58 ? 'CORE / CONNECTED' : p < .77 ? 'APP / LIVE' : 'SOURCE / OPEN';
    coordinates.textContent = status;
    stars.style.setProperty('--star-move', `${Math.round(p * -120)}px`);
    header.classList.toggle('scrolled', window.scrollY > 38);
    scrollBar.style.width = `${(window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight) * 100).toFixed(2)}%`;
  }

  function scrollChanged() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(renderScroll);
  }
  window.addEventListener('scroll', scrollChanged, { passive: true });
  window.addEventListener('resize', scrollChanged, { passive: true });

  const sources = {
    app: {
      file: 'App.kt',
      source: `// SUBX / Android experience — illustrative snippet
class AmwaliApp : ComponentActivity() {
    override fun onCreate(savedState: Bundle?) {
        super.onCreate(savedState)
        setContent {
            AmwaliTheme {
                FinanceDashboard()
            }
        }
    }
}

@Composable
fun FinanceDashboard() {
    Text(text = "أموالي")
    BalanceCard(amount = 125480)
    QuickActions()
}`
    },
    ui: {
      file: 'Interface.tsx',
      source: `// SUBX / Interface — illustrative snippet
type Experience = {
    name: string;
    category: string;
    ready: boolean;
};

export function ProjectCard({ project }) {
    const { name, category } = project;

    return (
        <article className="project-card">
            <h2>{name}</h2>
            <p>{category}</p>
            <button>Explore project</button>
        </article>
    );
}`
    },
    logic: {
      file: 'Logic.py',
      source: `# SUBX / Product logic — illustrative snippet
from dataclasses import dataclass

@dataclass
class Transaction:
    amount: float
    category: str


def calculate_balance(transactions):
    """Balance = income minus expenses."""
    balance = 0.0
    for item in transactions:
        balance += item.amount
    return round(balance, 2)

print("SUBX system ready")`
    }
  };
  let activeFile = 'app';
  function highlight(line) {
    const fragment = document.createDocumentFragment();
    const pattern = /(\/\/.*$|#.*$|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:class|fun|override|val|const|let|return|export|function|type|from|import|def|for|in|if|true|false|setContent|print)\b|\b(?:Composable|Bundle|ComponentActivity|AmwaliTheme|FinanceDashboard|BalanceCard|QuickActions|Text|Transaction|String|Boolean|float|str|dataclass)\b|\b\d+(?:\.\d+)?\b)/g;
    let previous = 0, token;
    while ((token = pattern.exec(line))) {
      if (token.index > previous) fragment.append(document.createTextNode(line.slice(previous, token.index)));
      const word = token[0];
      const span = document.createElement('span');
      const isComment = word.startsWith('//') || word.startsWith('#');
      const isString = /^['"]/.test(word);
      const isNumeric = /^\d/.test(word);
      const isType = /^[A-Z]/.test(word) && !isString;
      span.className = isComment ? 'tok-comment' : isString ? 'tok-str' : isNumeric ? 'tok-num' : isType ? 'tok-type' : /^(fun|function|def|print|setContent)$/.test(word) ? 'tok-fun' : 'tok-key';
      span.textContent = word;
      fragment.append(span);
      previous = pattern.lastIndex;
    }
    if (previous < line.length) fragment.append(document.createTextNode(line.slice(previous)));
    return fragment;
  }
  function showCode(file) {
    if (!sources[file]) return;
    activeFile = file;
    $('#code-path').textContent = sources[file].file;
    $$('.code-tab').forEach(button => {
      const selected = button.dataset.file === file;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    const target = $('#code-lines');
    target.replaceChildren();
    visibleCodeLines = sources[file].source.split('\n').map((line, index) => {
      const row = document.createElement('div');
      row.className = 'code-row';
      const number = document.createElement('span');
      number.className = 'line-no';
      number.textContent = index + 1;
      const content = document.createElement('span');
      content.className = 'line-content';
      content.append(highlight(line));
      row.append(number, content);
      target.appendChild(row);
      return row;
    });
    scrollChanged();
    // If the user switches files with the editor already visible, reveal that tab immediately.
    if (currentProgress > .86) visibleCodeLines.forEach(line => line.classList.add('appeared'));
  }
  $$('.code-tab').forEach(tab => tab.addEventListener('click', () => showCode(tab.dataset.file)));
  showCode('app');

  const toast = $('#toast');
  let toastTimer;
  function notify(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2700);
  }
  $('#copy-code').addEventListener('click', async () => {
    const text = sources[activeFile].source;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const selection = document.createElement('textarea');
        selection.value = text;
        selection.style.position = 'fixed';
        selection.style.opacity = '0';
        document.body.appendChild(selection);
        selection.select();
        const done = document.execCommand('copy');
        selection.remove();
        if (!done) throw new Error('Copy denied');
      }
      notify('تم نسخ المقطع البرمجي');
    } catch (error) {
      notify('تعذّر النسخ. يمكنك تحديد النص ونسخه يدويًا.');
    }
  });

  // Mobile navigation is accessible, closes on selection and Escape.
  const menuButton = $('#menu-toggle');
  const mobileNav = $('#mobile-nav');
  function closeMenu() {
    mobileNav.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'فتح القائمة');
  }
  menuButton.addEventListener('click', () => {
    const shouldOpen = mobileNav.hidden;
    mobileNav.hidden = !shouldOpen;
    menuButton.setAttribute('aria-expanded', String(shouldOpen));
    menuButton.setAttribute('aria-label', shouldOpen ? 'إغلاق القائمة' : 'فتح القائمة');
  });
  $$('a', mobileNav).forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  document.addEventListener('click', event => {
    if (!mobileNav.hidden && !mobileNav.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });

  // Reveal other sections when actually reached; defer if a browser is too old.
  const sections = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .09, rootMargin: '0px 0px -25px 0px' });
    sections.forEach(section => revealObserver.observe(section));
  } else {
    sections.forEach(section => section.classList.add('visible'));
  }

  // No backend is implied: the visitor reviews the message in their own email app.
  const contactForm = $('#contact-form');
  contactForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;
    const data = new FormData(contactForm);
    const name = String(data.get('name') || '').trim();
    const subject = String(data.get('subject') || '').trim();
    const message = String(data.get('message') || '').trim();
    if (!name || !subject || !message) return;
    const mailSubject = encodeURIComponent(`[SUBX] ${subject}`);
    const mailBody = encodeURIComponent(`الاسم: ${name}\n\nالرسالة:\n${message}\n\nأُرسلت عبر نموذج SUBX`);
    window.location.href = `mailto:maa321584@gmail.com?subject=${mailSubject}&body=${mailBody}`;
    notify('تم تجهيز الرسالة. أكمل الإرسال من تطبيق البريد.');
  });

  // On in-page navigation, keep the motion synchronised, even after returning from the footer.
  scrollChanged();
  window.addEventListener('load', scrollChanged);
})();
