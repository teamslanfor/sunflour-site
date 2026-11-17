/* Sunflour Bakery – scripted chat assistant (no AI service, no dependencies).
   Answers common questions and takes order enquiries, which are emailed to the bakery. */
(function () {
  'use strict';
  const S = window.SITE;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const css = `
  .gb-btn{position:fixed;right:18px;bottom:18px;z-index:70;display:flex;align-items:center;gap:10px;padding:9px 18px 9px 9px;border:0;border-radius:999px;background:#30251f;color:#f8f3ea;font:700 .95rem 'DM Sans',system-ui,sans-serif;cursor:pointer;box-shadow:0 18px 40px -14px rgba(58,35,24,.6);transition:transform .35s cubic-bezier(.22,.7,.2,1)}
  .gb-btn:hover{transform:translateY(-3px) rotate(-1deg)}
  .gb-btn i{width:40px;height:40px;border-radius:50%;background:#d9ad65;color:#30251f;display:grid;place-items:center;font-style:normal;font-size:1.3rem}
  .gb-panel{position:fixed;right:18px;bottom:88px;z-index:71;width:min(370px,calc(100vw - 36px));height:min(540px,calc(100vh - 120px));background:#ffffff;border-radius:24px;box-shadow:0 30px 70px -20px rgba(58,35,24,.5);display:flex;flex-direction:column;overflow:hidden;transform:translateY(16px) scale(.97);opacity:0;pointer-events:none;transition:all .35s cubic-bezier(.22,.7,.2,1);border:1px solid #e3d6c2}
  .gb-panel.open{transform:none;opacity:1;pointer-events:auto}
  .gb-head{background:#30251f;color:#f8f3ea;padding:15px 18px;display:flex;align-items:center;gap:12px}
  .gb-head b{display:block;font:700 1.15rem 'Playfair Display',Georgia,serif}
  .gb-head small{color:#e9d7c6;font-size:.78rem}
  .gb-head .x{margin-left:auto;background:rgba(255,255,255,.12);border:0;color:#fff;width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:1rem}
  .gb-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:#f8f3ea}
  .gb-m{max-width:86%;padding:10px 14px;border-radius:18px;font-size:.94rem;line-height:1.5;white-space:pre-line;animation:gbIn .35s ease both}
  .gb-m a{color:#7f5432;font-weight:700;text-decoration:underline}
  .gb-bot{background:#fff;border:1px solid #e3d6c2;border-bottom-left-radius:5px;color:#3a2f28}
  .gb-me{align-self:flex-end;background:#9b6b43;color:#fff;border-bottom-right-radius:5px}
  .gb-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 10px;background:#f8f3ea}
  .gb-chips button{border:2px solid #30251f;background:#fff;color:#30251f;border-radius:999px;padding:5px 12px;font:600 .82rem 'DM Sans',system-ui,sans-serif;cursor:pointer;transition:all .25s}
  .gb-chips button:hover{background:#30251f;color:#f8f3ea}
  .gb-form{display:flex;gap:8px;padding:12px;border-top:1px solid #e3d6c2;background:#ffffff}
  .gb-form input{flex:1;min-width:0;border:2px solid #e3d6c2;border-radius:999px;padding:10px 14px;font:inherit;font-size:.94rem;background:#fff}
  .gb-form input:focus{outline:none;border-color:#9b6b43}
  .gb-form button{width:42px;height:42px;border-radius:50%;border:0;background:#9b6b43;color:#fff;cursor:pointer;display:grid;place-items:center}
  .gb-form svg{width:18px;height:18px}
  .gb-typing{display:inline-flex;gap:4px}.gb-typing span{width:6px;height:6px;border-radius:50%;background:#c9b3a1;animation:gbDot 1s infinite}.gb-typing span:nth-child(2){animation-delay:.15s}.gb-typing span:nth-child(3){animation-delay:.3s}
  @keyframes gbIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  @keyframes gbDot{0%,80%,100%{opacity:.3}40%{opacity:1}}
  @media (max-width:600px){.gb-btn span{display:none}.gb-btn{padding:8px}}
  @media (prefers-reduced-motion:reduce){.gb-m,.gb-panel{animation:none;transition:none}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const send = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>';
  const root = document.createElement('div');
  root.innerHTML = `
  <button class="gb-btn" aria-expanded="false" aria-controls="gb-panel"><i aria-hidden="true">🥖</i><span>Ask Sunflour</span></button>
  <section class="gb-panel" id="gb-panel" role="dialog" aria-label="Chat with Sunflour Bakery">
    <div class="gb-head"><div><b>Sunflour Bakery</b><small>Automated assistant · set answers</small></div><button class="x" aria-label="Close chat">✕</button></div>
    <div class="gb-body" aria-live="polite"></div>
    <div class="gb-chips"></div>
    <form class="gb-form"><label class="sr-only" for="gb-in">Type your message</label><input id="gb-in" autocomplete="off" placeholder="Ask about bread, catering, cakes…" maxlength="400"><button aria-label="Send">${send}</button></form>
  </section>`;
  document.body.appendChild(root);
  const btn = root.querySelector('.gb-btn'), panel = root.querySelector('.gb-panel'), body = root.querySelector('.gb-body'),
    chipBox = root.querySelector('.gb-chips'), form = root.querySelector('.gb-form'), input = root.querySelector('#gb-in');
  let started = false, busy = false, lead = null;
  const add = (html, who = 'bot') => { const m = document.createElement('div'); m.className = 'gb-m gb-' + who; m.innerHTML = html; body.appendChild(m); body.scrollTop = body.scrollHeight; return m; };
  const say = (html, wait = 450) => new Promise((res) => { const t = add('<span class="gb-typing"><span></span><span></span><span></span></span>'); setTimeout(() => { t.innerHTML = html; body.scrollTop = body.scrollHeight; res(); }, wait); });
  const chips = (list) => { chipBox.innerHTML = ''; list.forEach((c) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = c; b.onclick = () => handle(c); chipBox.appendChild(b); }); };
  const MAIN = ['Our bread', 'Catering', 'Order a cake', 'Opening hours'];
  const contact = () => `📞 <a href="${S.phoneHref}">${S.phone}</a>\n💬 <a href="https://wa.me/${S.whatsapp}" target="_blank" rel="noopener">WhatsApp</a>\n✉️ <a href="mailto:${S.email}">${S.email}</a>\n📍 ${S.address}`;
  const go = (href, label) => `<a href="${href}">${label}</a>`;
  const intents = [
    { re: /^(start my cake order|order a cake|i want to order a cake|place a cake order)$/i, run: startLead },
    { re: /christmas|xmas|festive|mince pie|gift box|hamper|seasonal/i, run: () => say(`Our Christmas collection opens for pre-orders soon: festive bakes, gift boxes and Christmas catering. ${go('christmas.html', 'See Christmas at Sunflour')}`).then(() => chips(['Catering', 'Contact'])) },
    { re: /cater|buffet|event|corporate|office|canap|platter|party food|funeral|christening|wedding (food|catering)/i, run: () => say(`We cater for groups of up to <strong>200 people</strong>: breakfasts, finger buffets, lunches, hot food and canapés, for corporate and private events. All dietary requirements are catered for. ${go('catering.html#quote', 'Request a catering quote')}`).then(() => chips(['Order a cake', 'Contact'])) },
    { re: /birthday|wedding|anniversar|celebrat|custom cake|cake for|occasion|bespoke/i, run: () => say(`Yes! We bake bespoke birthday, wedding and celebration cakes to order. Would you like to start a cake enquiry?`).then(() => chips(['Start my cake order', 'Contact'])) },
    { re: /\b(order online|buy online|square|delivery|deliver|click and collect)\b/i, run: () => say(`You can order online from our shop: <a href="${S.orderUrl}" target="_blank" rel="noopener">Order Online ↗</a>. For catering or cakes, use our enquiry forms.`).then(() => chips(MAIN)) },
    { re: /hour|open|close|closing|time|today|sunday|saturday|holiday/i, run: () => say(`Our opening hours:\nMon–Fri <strong>7:30 – 16:30</strong>\nSaturday <strong>8:00 – 16:30</strong>\nSunday <strong>closed</strong>`).then(() => chips(['Find us', 'Our bread'])) },
    { re: /where|address|location|direction|find you|find us|caledonian|islington|king'?s cross|tube|station/i, run: () => say(`We’re at <strong>${S.address}</strong>, about a 5-minute walk from Caledonian Road station.\n<a href="${S.mapLink}" target="_blank" rel="noopener">Get directions ↗</a>`).then(() => chips(MAIN)) },
    { re: /allerg|gluten|wheat|vegan|vegetarian|dairy|\bnuts?\b|egg|dietary/i, run: () => say(`Our <strong>100% German Rye</strong> is wheat free, but please note rye still contains <strong>gluten</strong>, so it isn’t suitable for coeliacs. We have vegetarian and vegan options (like our vegan sausage rolls). Please ask our team about allergens before ordering, as our kitchen handles wheat, gluten, nuts, eggs and dairy.`).then(() => chips(MAIN)) },
    { re: /sourdough|rye|soda|challa|challah|barmbrack|bloomer|baguette|multiseed|chia|wholemeal|white tin|malted|bread|loaf|loaves/i, run: () => say(`We bake fresh every day: Sourdough, Irish Soda Bread, White Bloomer, Multiseed, Chia, Malted Grain, Wholemeal, White Tin, 100% German Rye, Barmbrack, French Baguette, and Challa (Fridays &amp; Saturdays). ${go('bakery.html', 'See all our breads')}`).then(() => chips(['Order online', 'Opening hours'])) },
    { re: /coffee|tea|latte|cappuccino|drink|juice/i, run: () => say(`We serve takeaway coffee made with Kimbo beans, teas and freshly squeezed orange juice. ${go('bakery.html?cat=cafe', 'See the café menu')}`).then(() => chips(MAIN)) },
    { re: /breakfast|lunch|soup|sandwich|sausage roll|pasty|pie|quiche|omelette|salt beef|stew|lasagna|jacket|croissant|pastr|cake|cookie|doughnut/i, run: () => say(`From croissants and Danish pastries to homemade soups, salt beef, quiches and our famous sausage rolls, everything is made fresh on site. ${go('bakery.html', 'See our bakery &amp; café menu')}`).then(() => chips(MAIN)) },
    { re: /story|founder|owner|paul|gabriela|history|since|2013/i, run: () => say(`Sunflour was founded in 2013 by Paul O’Brien and Gabriela Cristea, who met at Borough Market. Paul has over 30 years of baking experience. ${go('story.html', 'Read our story')}`).then(() => chips(MAIN)) },
    { re: /review|rating|recommend/i, run: () => say(`Our customers say lovely things! ${go('gallery.html#reviews', 'Read our reviews')}`).then(() => chips(MAIN)) },
    { re: /contact|phone|call|number|email|whatsapp|reach|talk|human|person/i, run: () => say(`You can reach us here:\n${contact()}`).then(() => chips(MAIN)) },
    { re: /^(hi|hello|hey|hiya|good (morning|afternoon|evening))\b/i, run: () => say('Hello! What can we bake for you today?').then(() => chips(MAIN)) },
    { re: /thank|cheers|great|lovely/i, run: () => say('You’re welcome. Hope to see you on Caledonian Road soon! 🥖').then(() => chips(MAIN)) },
  ];
  function startLead() { lead = { step: 'name' }; chips([]); return say('Lovely! Let’s get your order started. What’s your <strong>name</strong>?'); }
  async function leadStep(v) {
    v = v.trim();
    if (/^(cancel|stop|exit)$/i.test(v)) { lead = null; await say('No problem, cancelled.'); return chips(MAIN); }
    if (/\?\s*$/.test(v) && lead.step !== 'details') { lead = null; const hit = intents.find((i) => i.re.test(v)); if (hit) return hit.run(); await say(`I don’t have a set answer for that one, but the bakery can help:\n${contact()}`); return chips(MAIN); }
    if (lead.step === 'name') { if (v.length < 2) return say('Could you tell me your name?'); lead.name = v.slice(0, 80); lead.step = 'contact'; return say(`Thanks, ${esc(lead.name.split(' ')[0])}! What’s the best <strong>phone number or email</strong> to reach you?`); }
    if (lead.step === 'contact') {
      const mail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), phone = v.replace(/\D/g, '').length >= 10;
      if (!mail && !phone) return say('That doesn’t look like a valid phone number or email. Could you check it?');
      lead.contact = v; lead.step = 'date'; chips(['This weekend', 'Next week', 'Not sure yet']);
      return say('When do you need it? (date or “not sure yet”)');
    }
    if (lead.step === 'date') { lead.date = v.slice(0, 80); lead.step = 'details'; chips(['Birthday cake', 'Wedding cake', 'Celebration cake', 'Something else']); return say('And what would you like? Size, flavour, number of people and any message on the cake.'); }
    if (lead.step === 'details') {
      if (v.length < 3) return say('Could you add a few more details?');
      chips([]);
      const payload = { _subject: `New order enquiry (chat) from ${lead.name}`, _template: 'table', name: lead.name, contact: lead.contact, date_needed: lead.date, order: v.slice(0, 1500), source: 'Website chat assistant' };
      const t = add('<span class="gb-typing"><span></span><span></span><span></span></span>');
      const done = lead; lead = null;
      try {
        const r = await fetch(`https://formsubmit.co/ajax/${S.email}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || String(j.success) === 'false') throw new Error('fail');
        t.innerHTML = `✅ <strong>Sent!</strong> Thanks ${esc(done.name.split(' ')[0])}, the bakery has your enquiry and will be in touch soon.`;
      } catch (e) {
        const mail = `mailto:${S.email}?subject=${encodeURIComponent('Order enquiry')}&body=${encodeURIComponent(`Name: ${done.name}\nContact: ${done.contact}\nDate: ${done.date}\n\n${v}`)}`;
        t.innerHTML = `Sorry, I couldn’t send that automatically. Please <a href="${mail}">email it to us</a> (it’s filled in) or call <a href="${S.phoneHref}">${S.phone}</a>.`;
      }
      return chips(MAIN);
    }
  }
  async function handle(text) {
    if (busy || !text.trim()) return;
    busy = true; add(esc(text), 'me');
    try {
      if (lead) { await leadStep(text); return; }
      const map = { 'Our bread': 'bread', 'Catering': 'catering', 'Order a cake': 'birthday', 'Start my cake order': 'start my cake order', 'Opening hours': 'hours', 'Contact': 'contact', 'Find us': 'where', 'Order online': 'order online' };
      const q = map[text] || text;
      const hit = intents.find((i) => i.re.test(q));
      if (hit) { await hit.run(); return; }
      await say(`I don’t have a set answer for that one, but the bakery can help:\n${contact()}`);
      chips(MAIN);
    } finally { busy = false; }
  }
  const open = async (state) => {
    panel.classList.toggle('open', state); btn.setAttribute('aria-expanded', String(state));
    if (state) {
      input.focus();
      if (!started) { started = true; await say('Hello and welcome to <strong>Sunflour Bakery</strong> on Caledonian Road! 🥖 Ask me about our bread, catering, cakes or opening hours.', 300); add(`<small>Automated assistant with set answers. For anything else, call <a href="${S.phoneHref}">${S.phone}</a>.</small>`); chips(MAIN); }
    }
  };
  btn.addEventListener('click', () => open(!panel.classList.contains('open')));
  root.querySelector('.x').addEventListener('click', () => open(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('open')) open(false); });
  form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; handle(v); });
})();
