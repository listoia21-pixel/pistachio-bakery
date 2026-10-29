// Pistachio Bakery — page behaviour: reveals, the dock, the reels wall, the minicake builder,
// the price list preview and the drag row. Everything on the page works and reads without it.
const WA = '573223311314';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (n) => '$' + n.toLocaleString('es-CO');

// Reveal once on entering the viewport
(() => {
  document.querySelectorAll('.tiles .tile').forEach((t, i) => t.style.setProperty('--k', i % 4));
  const targets = document.querySelectorAll('[data-reveal], .reels, .steps, .visit');
  if (!('IntersectionObserver' in window)) { targets.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
  targets.forEach((el) => io.observe(el));
  addEventListener('load', () => setTimeout(() => targets.forEach((el) => {
    const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in');
  }), 2500));
})();

// The dock appears once the hero has scrolled away
(() => {
  const dock = document.querySelector('.dock'), hero = document.querySelector('.hero');
  if (!dock || !hero || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(([e]) => dock.classList.toggle('is-on', !e.isIntersecting), { threshold: 0 }).observe(hero);
})();

// Reels wall: play while visible, with a pause button; posters only under reduced motion
(() => {
  const section = document.querySelector('.reels');
  if (!section) return;
  const clips = [...section.querySelectorAll('video')];
  const btn = section.querySelector('.reels__toggle');
  let paused = reduced;
  const sync = (visible) => clips.forEach((v) => { if (visible && !paused) v.play().catch(() => {}); else v.pause(); });
  const label = () => { btn.textContent = paused ? 'Ver video' : 'Pausar video'; btn.setAttribute('aria-pressed', String(paused)); };
  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(visible); }, { threshold: 0.15 }).observe(section);
  btn.addEventListener('click', () => { paused = !paused; label(); sync(visible); });
  label();
})();

// Minicake builder
(() => {
  const form = document.querySelector('#pedido');
  if (!form) return;
  const view = document.querySelector('.cakeview');
  const cake = view.querySelector('.cake');
  const msg = cake.querySelector('.cake__top > .cake__msg');
  const paper = cake.querySelector('.cake__paper'), paperMsg = paper.querySelector('.cake__msg');
  const hidden = cake.querySelector('.cake__hidden'), hiddenMsg = hidden.querySelector('.cake__msg');
  const ribbon = cake.querySelector('.cake__ribbon');
  const glitter = cake.querySelector('.cake__glitter');
  const photo = cake.querySelector('.cake__photo');
  const burnBtn = document.querySelector('.cakeview__burn');
  const order = form.querySelector('[data-order]');
  const totalEl = form.querySelector('[data-total]');
  const count = form.querySelector('[data-count]');
  const upload = form.querySelector('.upload');
  const ocultoBox = form.querySelector('.oculto');
  const fecha = form.querySelector('#fecha');
  fecha.min = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);

  // a small seeded random so the sprinkles stay put between redraws
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const colours = ['#e94f64', '#f6c544', '#4fb3d9', '#7cc36d', '#f08bb0', '#9b6fd6', '#ff9a3c'];

  // points along the edge of the cake top, in percent, for a circle or a heart
  const edge = (shape, t, inset) => {
    if (shape === 'corazón') {
      const x = 16 * Math.sin(t) ** 3;
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      const k = (50 - inset) / 17.5;
      return [50 + x * k, 47 - y * k];
    }
    return [50 + Math.cos(t) * (50 - inset), 50 + Math.sin(t) * (50 - inset)];
  };

  const draw = (shape) => {
    seed = 7;
    const spr = cake.querySelector('.cake__sprinkles'), pip = cake.querySelector('.cake__piping');
    spr.innerHTML = ''; pip.innerHTML = ''; glitter.innerHTML = '';
    for (let i = 0; i < 78; i++) {
      const t = (i / 78) * Math.PI * 2 + rnd() * 0.08;
      const [x, y] = edge(shape, t, 8 + rnd() * 6);
      const s = document.createElement('i');
      s.style.cssText = `left:${x}%;top:${y}%;--a:${Math.round(rnd() * 180)}deg;--c:${colours[i % colours.length]}`;
      spr.append(s);
    }
    for (let i = 0; i < 30; i++) {
      const [x, y] = edge(shape, (i / 30) * Math.PI * 2, 7);
      const d = document.createElement('i'); d.style.cssText = `left:${x}%;top:${y}%`; pip.append(d);
    }
    for (let i = 0; i < 26; i++) {
      const g = document.createElement('i');
      g.style.cssText = `left:${14 + rnd() * 72}%;top:${14 + rnd() * 72}%;--d:${(rnd() * 1.8).toFixed(2)}s`;
      glitter.append(g);
    }
  };

  // The lettering is piped onto the cake, so it is drawn, not set: wrap the words, take the largest
  // size that fits the box, and give each line the small tilt of a hand holding a piping bag.
  const faces = { hand: (s) => `${s}px "Gochi Hand", cursive`, print: (s) => `600 ${s}px Fredoka, sans-serif` };
  const inks = { hand: '#1f1418', print: '#8e3150' };
  const wrap = (ctx, text, w) => {
    const lines = []; let line = '';
    for (const word of text.split(/\s+/)) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width <= w) line = test;
      else { if (!line || ctx.measureText(word).width > w) return null; lines.push(line); line = word; }
    }
    if (line) lines.push(line);
    return lines;
  };
  const paint = (cv, text, kind = 'hand') => {
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, r.width, r.height);
    let lo = 6, hi = Math.min(r.height, 150), lines = [text];
    while (hi - lo > 0.5) {
      const s = (lo + hi) / 2; ctx.font = faces[kind](s);
      const l = wrap(ctx, text, r.width * 0.96);
      if (l && l.length * s * 1.04 <= r.height) { lo = s; lines = l; } else hi = s;
    }
    ctx.font = faces[kind](lo); ctx.fillStyle = inks[kind]; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lh = lo * 1.04, top = r.height / 2 - ((lines.length - 1) * lh) / 2;
    lines.forEach((ln, i) => {
      ctx.save(); ctx.translate(r.width / 2, top + i * lh);
      if (kind === 'hand') ctx.rotate(((i % 2 ? 1 : -1) * (0.6 + (ln.length % 3) * 0.4) * Math.PI) / 180);
      ctx.fillText(ln, 0, 0); ctx.restore();
    });
  };

  let photoURL = null, lastShape = null;
  const read = () => {
    const d = new FormData(form);
    const extras = [...form.querySelectorAll('input[name="extra"]:checked')];
    const oculto = form.querySelector('input[name="oculto"]:checked');
    return {
      text: (d.get('mensaje') || '').trim(), secret: (d.get('secreto') || '').trim(), shape: d.get('forma'),
      sabor: d.get('sabor'), relleno: d.get('relleno'), qty: +d.get('cantidad'), fecha: d.get('fecha'),
      extras, oculto: oculto.value, ocultoPrice: +oculto.dataset.price, ocultoLabel: oculto.nextElementSibling.textContent,
    };
  };

  const update = () => {
    const s = read();
    const has = (v) => s.extras.some((e) => e.value === v);
    count.textContent = form.mensaje.value.length;
    cake.dataset.shape = s.shape;
    if (s.shape !== lastShape) { draw(s.shape); lastShape = s.shape; }
    cake.classList.toggle('is-vintage', has('vintage'));
    glitter.hidden = !has('glitter');
    upload.hidden = !has('foto');
    cake.classList.toggle('has-photo', has('foto'));
    photo.hidden = !has('foto');
    if (has('foto')) photo.src = photoURL || 'assets/fotos/sm/patitos.webp';
    ocultoBox.hidden = !s.oculto;

    const main = s.text || 'Tu mensaje aquí';
    const secret = s.secret || 'Sorpresa';
    paper.hidden = s.oculto !== 'quemar' || (reduced && paper.classList.contains('is-burnt'));
    burnBtn.hidden = s.oculto !== 'quemar';
    ribbon.hidden = s.oculto !== 'cinta';
    hidden.hidden = s.oculto !== 'cinta';
    cake.classList.toggle('has-ribbon', s.oculto === 'cinta');
    paint(msg, s.oculto === 'quemar' ? secret : main);
    if (s.oculto === 'quemar') paint(paperMsg, main, 'print');
    if (s.oculto === 'cinta') paint(hiddenMsg, secret);
    view.setAttribute('aria-label', `Vista previa: minicake ${s.shape} con el mensaje «${main}»` + (s.oculto ? ` y el mensaje oculto «${secret}»` : ''));

    const base = s.qty === 2 ? 73000 : 45000;
    const add = (s.extras.reduce((n, e) => n + +e.dataset.price, 0) + s.ocultoPrice) * s.qty;
    const total = base + add;
    totalEl.textContent = fmt(total);

    const lines = [
      `Hola Pistachio, quiero ${s.qty === 2 ? '2 minicakes' : 'un minicake'}.`,
      `Mensaje: "${main}"`,
      s.oculto ? `Mensaje oculto (${s.oculto === 'quemar' ? 'para quemar' : 'con cinta'}): "${secret}"` : '',
      `Forma: ${s.shape}. Pastel de ${s.sabor.toLowerCase()} con relleno de ${s.relleno.toLowerCase()}.`,
      s.extras.length ? `Extras: ${s.extras.map((e) => e.closest('.extra').querySelector('.extra__name').firstChild.textContent.trim()).join(', ')}.` : '',
      has('foto') ? 'Les envío la foto por aquí.' : '',
      s.fecha ? `Para el ${new Date(s.fecha + 'T12:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}.` : '',
      `Total que vi en la página: ${fmt(total)} (domicilio en Bogotá incluido). ¿Me confirman cobertura?`,
    ].filter(Boolean);
    order.href = `https://wa.me/${WA}?text=${encodeURIComponent(lines.join('\n'))}`;
  };

  form.addEventListener('input', update);
  form.addEventListener('change', (e) => {
    if (e.target.name === 'foto' && e.target.files[0]) {
      if (photoURL) URL.revokeObjectURL(photoURL);
      photoURL = URL.createObjectURL(e.target.files[0]);
    }
    if (e.target.name === 'oculto') { paper.classList.remove('is-burnt'); paper.style.removeProperty('--burn'); ribbon.classList.remove('is-up'); burnBtn.textContent = 'Quémalo para ver'; }
    update();
  });
  form.addEventListener('submit', (e) => e.preventDefault());

  burnBtn.addEventListener('click', () => {
    const burnt = paper.classList.toggle('is-burnt');
    if (reduced) paper.hidden = burnt;
    else paper.style.setProperty('--burn', burnt ? '80%' : '0%');
    burnBtn.textContent = burnt ? 'Volver a tapar' : 'Quémalo para ver';
  });
  ribbon.addEventListener('click', () => ribbon.classList.toggle('is-up'));
  ribbon.setAttribute('role', 'button'); ribbon.tabIndex = 0;
  ribbon.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ribbon.classList.toggle('is-up'); } });

  let raf;
  addEventListener('resize', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); });
  // the shape change animates clip-path; repaint once the box has settled
  cake.addEventListener('transitionend', update);
  update();
  Promise.all([document.fonts.load('40px "Gochi Hand"'), document.fonts.load('600 40px Fredoka')]).then(update, update);
})();

// Price list: the row under the pointer (or focus) brings up its picture in the frame
(() => {
  const frame = document.querySelector('.menu__frame');
  if (!frame) return;
  const img = frame.querySelector('[data-frame]'), cap = frame.querySelector('[data-frame-cap]');
  const rows = document.querySelectorAll('.menu__row[data-preview]');
  rows.forEach((r) => { const pre = new Image(); pre.src = r.dataset.preview; });
  let current = img.getAttribute('src'), timer;
  const show = (row) => {
    const src = row.dataset.preview;
    if (src === current) return;
    current = src; clearTimeout(timer);
    img.classList.add('is-swap');
    timer = setTimeout(() => { img.src = src; cap.textContent = row.dataset.cap; img.classList.remove('is-swap'); }, 200);
  };
  rows.forEach((r) => { r.addEventListener('pointerenter', () => show(r)); r.addEventListener('focus', () => show(r)); });
})();

// Drag row: buttons step by one column, the bar shows how far along the row is
(() => {
  const row = document.querySelector('.steps__row');
  if (!row) return;
  const bar = document.querySelector('.steps__bar span');
  const [prev, next] = document.querySelectorAll('.steps__btn');
  const stepW = () => row.querySelector('.step').getBoundingClientRect().width + 32;
  const sync = () => {
    const max = row.scrollWidth - row.clientWidth;
    const p = max > 0 ? row.scrollLeft / max : 1;
    bar.style.setProperty('--p', (0.12 + p * 0.88).toFixed(3));
    prev.disabled = row.scrollLeft < 4; next.disabled = row.scrollLeft > max - 4;
  };
  [prev, next].forEach((b) => b.addEventListener('click', () => row.scrollBy({ left: stepW() * +b.dataset.dir, behavior: reduced ? 'auto' : 'smooth' })));
  row.addEventListener('scroll', sync, { passive: true });
  addEventListener('resize', sync);
  sync();
})();
