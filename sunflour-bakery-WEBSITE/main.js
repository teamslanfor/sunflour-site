/* Sunflour Bakery – site interactions (no dependencies) */
(function () {
  'use strict';
  document.documentElement.classList.remove('no-js');
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const S = window.SITE || {};
  const params = new URLSearchParams(location.search);

  /* Header */
  const hdr = $('.hdr');
  const onScroll = () => hdr && hdr.classList.toggle('scrolled', window.scrollY > 10);
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

  /* Mobile menu */
  const burger = $('.burger'), nav = $('.nav');
  if (burger && nav) {
    const close = () => { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; };
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open)); document.body.style.overflow = open ? 'hidden' : '';
    });
    $$('a', nav).forEach((a) => a.addEventListener('click', close));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  /* Reveal on scroll – with fallbacks so content is never left hidden */
  const rv = $$('.rv'); const show = (el) => el.classList.add('in');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }), { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    rv.forEach((el) => io.observe(el));
    let t = false;
    const sweep = () => { t = false; const h = innerHeight; rv.forEach((el) => { if (!el.classList.contains('in') && el.getBoundingClientRect().top < h) show(el); }); };
    addEventListener('scroll', () => { if (!t) { t = true; requestAnimationFrame(sweep); } }, { passive: true });
    addEventListener('load', sweep);
  } else rv.forEach(show);
  setTimeout(() => rv.forEach(show), 2500);

  /* Menu: category filter (sidebar + mobile chips), search, result count */
  const cards = $$('.shop .pcard');
  if (cards.length) {
    const catBtns = $$('[data-cat-btn]'), search = $('#menu-search'), count = $('#count'), empty = $('.empty');
    let cat = params.get('cat') || 'all';
    const apply = () => {
      const q = (search && search.value.trim().toLowerCase()) || '';
      let n = 0;
      cards.forEach((c) => {
        const ok = (cat === 'all' || c.dataset.cat === cat) && (!q || c.textContent.toLowerCase().includes(q));
        c.classList.toggle('hide', !ok); if (ok) n++;
      });
      catBtns.forEach((b) => { const on = b.dataset.catBtn === cat; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
      if (count) count.textContent = `Showing ${n} of ${cards.length} items`;
      if (empty) empty.style.display = n ? 'none' : 'block';
    };
    catBtns.forEach((b) => b.addEventListener('click', () => { cat = b.dataset.catBtn; apply(); }));
    if (search) search.addEventListener('input', apply);
    apply();
  }

  /* Gallery: filters + lightbox with previous/next */
  const gBtns = $$('.gfil button'), gItems = $$('.gi');
  gBtns.forEach((b) => b.addEventListener('click', () => {
    gBtns.forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
    gItems.forEach((it) => it.classList.toggle('hide', b.dataset.f !== 'all' && it.dataset.cat !== b.dataset.f));
  }));
  const lb = $('.lightbox');
  if (lb) {
    let idx = 0;
    const visible = () => gItems.filter((g) => !g.classList.contains('hide'));
    const openAt = (i) => { const v = visible(); idx = (i + v.length) % v.length; const it = v[idx]; $('img', lb).src = $('img', it).src; $('img', lb).alt = it.dataset.cap; $('figcaption', lb).textContent = it.dataset.cap; lb.hidden = false; };
    const closeLb = () => { lb.hidden = true; };
    gItems.forEach((it) => it.addEventListener('click', () => { openAt(visible().indexOf(it)); $('.lb-x', lb).focus(); }));
    $('.lb-x', lb).addEventListener('click', closeLb);
    $('.lb-prev', lb).addEventListener('click', () => openAt(idx - 1));
    $('.lb-next', lb).addEventListener('click', () => openAt(idx + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
    document.addEventListener('keydown', (e) => {
      if (lb.hidden) return;
      if (e.key === 'Escape') closeLb(); if (e.key === 'ArrowLeft') openAt(idx - 1); if (e.key === 'ArrowRight') openAt(idx + 1);
    });
  }

  /* Pre-fill forms from links (?item=..., ?type=...) */
  const item = params.get('item'), type = params.get('type');
  if (item) { const m = $('#message') || $('#design'); if (m && !m.value) m.value = `I’d like to ask about: ${item}\n`; }
  if (type) { const r = $(`input[name="cake_type"][value="${type}"], input[name="event_type"][value="${type}"]`); if (r) r.checked = true; }
  const prod = params.get('product'); if (prod && $('#product')) { const o = Array.from($('#product').options).find((x) => x.value === prod); if (o) o.selected = true; }

  /* Forms – sent by email through FormSubmit; graceful fallback to email/WhatsApp/phone */
  const rules = {
    name: (v) => v.trim().length >= 2 || 'Please enter your name.',
    contact: (v) => { const t = v.trim(); return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t) || t.replace(/\D/g, '').length >= 10 || 'Please enter a valid phone number or email.'; },
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Please enter a valid email address.',
    phone: (v) => { const d = v.replace(/\D/g, ''); return (d.length >= 10 && d.length <= 13) || 'Please enter a valid phone number, e.g. 07700 900123.'; },
    guests: (v) => (+v >= 1 && +v <= 1000) || 'Please enter the number of guests.',
    event_date: (v) => !!v || 'Please choose your event date.',
    product: (v) => !!v || 'Please choose a product.',
    message: (v) => v.trim().length >= 5 || 'Please tell us a little more.',
    date_needed: (v) => !!v || 'Please choose your collection date.',
    design: (v) => v.trim().length >= 5 || 'Please describe the design you’d like.',
  };
  $$('form[data-send]').forEach((form) => {
    const fields = $$('input, textarea, select', form).filter((el) => rules[el.name] && el.required);
    const check = (el) => {
      const res = rules[el.name](el.value), box = el.closest('.f'), err = box && $('.err', box), ok = res === true;
      if (box) box.classList.toggle('bad', !ok); if (err) err.textContent = ok ? '' : res; el.setAttribute('aria-invalid', String(!ok));
      return ok;
    };
    fields.forEach((el) => { el.addEventListener('blur', () => check(el)); el.addEventListener('input', () => { const bx = el.closest('.f'); if (bx && bx.classList.contains('bad')) check(el); }); });
    const file = $('input[type=file]', form);
    if (file) file.addEventListener('change', () => {
      const f = file.files[0], hint = $('.hint', file.closest('.f'));
      if (f && f.size > 5 * 1024 * 1024) { file.value = ''; if (hint) hint.textContent = 'That image is over 5 MB. Please choose a smaller one.'; }
      else if (hint && f) hint.textContent = `Attached: ${f.name}`;
    });
    const status = $('.status', form), btn = $('button[type=submit]', form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (form.elements._honey && form.elements._honey.value) return;
      if (fields.map(check).includes(false)) {
        status.className = 'status bad'; status.textContent = 'Please fix the highlighted fields and try again.';
        const first = $('.f.bad input, .f.bad textarea, .f.bad select', form); if (first) first.focus();
        return;
      }
      const fd = new FormData(form); fd.delete('_honey');
      fd.append('_subject', `${form.dataset.send} from ${fd.get('name')} – website`); fd.append('_template', 'table'); fd.append('_captcha', 'false');
      const lines = []; fd.forEach((v, k) => { if (!k.startsWith('_') && typeof v === 'string' && v) lines.push(`${k.replace(/_/g, ' ')}: ${v}`); });
      const text = `${form.dataset.send}\n\n${lines.join('\n')}`;
      const mailto = `mailto:${S.email}?subject=${encodeURIComponent(form.dataset.send)}&body=${encodeURIComponent(text)}`;
      const wa = S.whatsapp ? `https://wa.me/${S.whatsapp}?text=${encodeURIComponent(text)}` : '';
      const first = String(fd.get('name')).trim().split(' ')[0].replace(/[<>&"]/g, '');
      btn.disabled = true; form.classList.add('loading');
      try {
        const res = await fetch(`https://formsubmit.co/ajax/${S.email}`, { method: 'POST', headers: { Accept: 'application/json' }, body: fd });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || String(j.success) === 'false') throw new Error(j.message || 'send failed');
        form.reset(); $$('.f.bad', form).forEach((b) => b.classList.remove('bad'));
        status.className = 'status ok';
        status.innerHTML = `<strong>Thank you, ${first}! 🎉</strong><br>Your ${form.dataset.send.toLowerCase()} has been sent. We’ll be in touch soon. Need us sooner? Call <a href="${S.phoneHref}">${S.phone}</a>.`;
        status.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      } catch (err) {
        status.className = 'status bad';
        status.innerHTML = `Sorry, we couldn’t send that automatically. Please ${wa ? `<a href="${wa}" target="_blank" rel="noopener">send it on WhatsApp</a> or ` : ''}<a href="${mailto}">send it by email</a> (it’s filled in for you), or call <a href="${S.phoneHref}">${S.phone}</a>.`;
      } finally { btn.disabled = false; form.classList.remove('loading'); }
    });
  });

  /* Quantity steppers */
  $$('.qty').forEach((q) => {
    const inp = $('input', q);
    $$('button', q).forEach((b) => b.addEventListener('click', () => {
      const n = Math.max(1, Math.min(99, (parseInt(inp.value, 10) || 1) + (b.dataset.d === '+' ? 1 : -1))); inp.value = n;
    }));
  });

  /* Highlight today in opening hours (data-days="1-5", Mon=1 … Sun=7) */
  const today = new Date().getDay() || 7;
  $$('.hours li[data-days]').forEach((li) => { const [a, b] = li.dataset.days.split('-').map(Number); if (today >= a && today <= (b || a)) li.classList.add('today'); });

  /* Cookie notice – no tracking cookies; remembers dismissal locally where allowed */
  const ck = $('.cookie');
  if (ck) {
    let seen = false; try { seen = localStorage.getItem('sf-cookie-ok') === '1'; } catch (e) {}
    if (!seen) ck.hidden = false;
    $('button', ck).addEventListener('click', () => { ck.hidden = true; try { localStorage.setItem('sf-cookie-ok', '1'); } catch (e) {} });
  }

  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
