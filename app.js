/* AutoLog: fuel & maintenance tracker. All data stays in this browser (localStorage). */
'use strict';
(() => {
const KEY = 'autolog:data:v1';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => iso(new Date());
const parseD = s => { if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null; const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const addMonths = (s, n) => { const d = parseD(s); if (!d) return null; const day = d.getDate(); d.setMonth(d.getMonth() + Number(n)); if (d.getDate() < day) d.setDate(0); return iso(d); };
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + Math.round(n)); return iso(d); };
const daysBetween = (a, b) => Math.round((parseD(b) - parseD(a)) / 864e5);
const num = v => { if (v === '' || v == null) return null; const n = Number(v); return isFinite(n) ? n : null; };
const fmt = (n, d = 0) => n == null || !isFinite(n) ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const money = (n, d = 2) => n == null || !isFinite(n) ? '—' : (n < 0 ? '-$' : '$') + fmt(Math.abs(n), d);
const c3 = n => money(n, 3);
const fdate = s => { const d = parseD(s); return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; };
const fdateS = s => { const d = parseD(s); return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''; };
const sum = (a, k) => a.reduce((t, x) => t + (typeof k === 'function' ? k(x) : (num(x[k]) || 0)), 0);
const plural = (n, w, p) => `${fmt(n)} ${n === 1 ? w : (p || w + 's')}`;

/* ---------- icons ---------- */
const svg = p => `<svg viewBox="0 0 24 24" class="ic">${p}</svg>`;
const I = {
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  close: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  back: svg('<path d="m15 18-6-6 6-6"/>'),
  gauge: svg('<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>'),
  fuel: svg('<path d="M3 22h12M4 9h10M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0V9.83a2 2 0 0 0-.59-1.42L18 5"/>'),
  oil: svg('<path d="M12 2.7 17.7 8.4a8 8 0 1 1-11.3 0z"/><path d="M8.5 14a3.5 3.5 0 0 0 3.5 3.5"/>'),
  coolant: svg('<path d="M14 4v10.5a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z"/><path d="M12 9v7"/>'),
  brakes: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M5.5 7.5A8 8 0 0 1 9 4.6"/>'),
  tires: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v5M12 16v5M3 12h5M16 12h5"/>'),
  plugs: svg('<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>'),
  battery: svg('<rect x="2" y="7" width="17" height="11" rx="2"/><path d="M22 11v3M6 12.5h4M8 10.5v4M13 12.5h3"/>'),
  wrench: svg('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'),
  spark: svg('<path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/>'),
  car: svg('<path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/><circle cx="7.5" cy="13" r="1"/><circle cx="16.5" cy="13" r="1"/>'),
  chart: svg('<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>'),
  download: svg('<path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16"/>'),
  upload: svg('<path d="M12 21V9m0 0-4 4m4-4 4 4M4 3h16"/>'),
  reset: svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
  trash: svg('<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>'),
  edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>'),
  gift: svg('<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v9H5v-9"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>'),
  link: svg('<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
  air: svg('<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h16a3 3 0 1 1-3 3"/><path d="M3 16h8"/>'),
  cabin: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M11 5v14M15 5v14M19 5v14"/>'),
  box: svg('<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>'),
  list: svg('<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>'),
  layers: svg('<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>'),
  coil: svg('<path d="M9 3h6v4H9zM10 7v3M14 7v3"/><path d="M8 10h8l-1 8h-6z"/><path d="M12 18v3"/>'),
};
const LIB = (window.AUTOLOG_REWARDS && window.AUTOLOG_REWARDS.programs) || [];
const LIB_CHECKED = (window.AUTOLOG_REWARDS && window.AUTOLOG_REWARDS.checked) || 'Oct 2026';
const libById = id => LIB.find(x => x.id === id) || null;

/* ---------- maintenance sections (schema-driven) ---------- */
const H = l => ({ t: 'h', l });
const F = {
  date: { k: 'date', l: 'Date', t: 'date', req: 1, half: 1, def: () => todayISO() },
  odo: { k: 'odo', l: 'Odometer', t: 'num', unit: 'mi', req: 1, half: 1, step: 1, def: (v) => curOdo(v) || '' },
  cost: { k: 'cost', l: 'Price paid', t: 'num', pre: '$', step: 0.01, reqCost: 1, lblFn: v => v.doneBy === 'Shop' ? 'Total shop price (parts + labor + fees + tax, out the door)' : 'Price paid (parts & supplies)' },
  noCharge: { k: 'noCharge', l: 'Free / warranty / no charge', t: 'check', sub: 'Tick this to save $0' },
  doneBy: { k: 'doneBy', l: 'Done by', t: 'seg', opts: ['DIY', 'Shop'], half: 1 },
  shop: { k: 'shop', l: 'Shop name', t: 'text', showIf: v => v.doneBy === 'Shop' },
  notes: { k: 'notes', l: 'Notes', t: 'textarea' },
  intMi: (d, l = 'Next due in') => ({ k: 'intMiles', l, t: 'num', unit: 'mi', half: 1, step: 1, def: d, remember: 1 }),
  intMo: (d) => ({ k: 'intMonths', l: 'or after', t: 'num', unit: 'months', half: 1, step: 1, def: d, remember: 1 }),
};
const has = (arr, x) => Array.isArray(arr) && arr.includes(x);
const TIRE_POS = [['fl', 'FL'], ['fr', 'FR'], ['rl', 'RL'], ['rr', 'RR']];

const SECTIONS = [
  {
    id: 'oil', title: 'Engine oil', icon: I.oil, noun: 'oil change',
    fields: [F.date, F.odo, { k: 'fitOil', t: 'fit', cat: 'oil' },
      H('Oil'), { k: 'oilPick', t: 'pick', cat: 'oil', l: 'Oil bought' }, { k: 'brand', l: 'Oil brand', t: 'text', half: 1, list: 1 }, { k: 'viscosity', l: 'Viscosity', t: 'text', half: 1, list: ['0W-16', '0W-20', '5W-20', '5W-30', '10W-30', '0W-40', '5W-40', '15W-40'] },
      { k: 'oilType', l: 'Type', t: 'seg', opts: ['Synthetic', 'Blend', 'Conventional', 'High mileage'] },
      { k: 'qty', l: 'Quantity', t: 'num', unit: 'qts', half: 1, step: 0.1 },
      H('Filter'), { k: 'filterPick', t: 'pick', cat: 'oilFilter', l: 'Oil filter' }, { k: 'filterBrand', l: 'Filter brand', t: 'text', half: 1, list: 1 }, { k: 'filterPart', l: 'Filter part #', t: 'text', half: 1 },
      H('Service'), F.doneBy, F.shop, F.cost, F.noCharge,
      H('Next change'), F.intMi(5000), F.intMo(6), F.notes],
    summary: e => [e.brand, e.viscosity].filter(Boolean).join(' ') || 'Oil change',
    chips: e => [e.oilType, e.qty && `${e.qty} qt`, (e.filterBrand || e.filterPart) && `Filter ${[e.filterBrand, e.filterPart].filter(Boolean).join(' ')}`, e.doneBy === 'Shop' ? (e.shop || 'Shop') : e.doneBy],
  },
  {
    id: 'coolant', title: 'Engine coolant', icon: I.coolant, noun: 'coolant service',
    fields: [F.date, F.odo,
      { k: 'service', l: 'Service', t: 'seg', opts: ['Flush', 'Drain & fill', 'Top-off', 'Inspection'], def: 'Flush' },
      H('Coolant'), { k: 'ctype', l: 'Type', t: 'select', opts: ['', 'OAT', 'HOAT', 'P-HOAT', 'Si-OAT', 'IAT', 'Universal', 'Other'], half: 1 }, { k: 'color', l: 'Color', t: 'text', half: 1, list: ['Green', 'Orange', 'Pink', 'Blue', 'Yellow', 'Purple', 'Red'] },
      { k: 'brand', l: 'Brand', t: 'text', half: 1, list: 1 }, { k: 'mix', l: 'Mix ratio', t: 'select', opts: ['', '50/50', '60/40', '70/30', 'Premixed 50/50', 'Concentrate'], half: 1 },
      { k: 'qty', l: 'Quantity', t: 'num', unit: 'gal', half: 1, step: 0.1 },
      F.doneBy, F.shop, F.cost, F.noCharge,
      H('Next flush'), { ...F.intMi(50000), hint: 'Top-offs and inspections don’t restart the interval.' }, F.intMo(60), F.notes],
    anchor: list => list.find(e => e.service === 'Flush' || e.service === 'Drain & fill') || null,
    summary: e => `${e.service || 'Coolant'}${e.ctype ? ' · ' + e.ctype : ''}`,
    chips: e => [e.brand, e.color, e.mix, e.qty && `${e.qty} gal`],
  },
  {
    id: 'brakes', title: 'Brake pads & rotors', icon: I.brakes, noun: 'brake service',
    fields: [F.date, F.odo,
      { k: 'axle', l: 'Axle', t: 'seg', opts: ['Front', 'Rear', 'Both'], req: 1, def: 'Front' },
      H('Pads'), { k: 'padsReplaced', l: 'Pads replaced', t: 'check' },
      { k: 'padBrand', l: 'Pad brand', t: 'text', half: 1, list: 1, showIf: v => v.padsReplaced }, { k: 'padPart', l: 'Pad part #', t: 'text', half: 1, showIf: v => v.padsReplaced },
      { k: 'padMaterial', l: 'Pad material', t: 'seg', opts: ['Ceramic', 'Semi-metallic', 'Organic'], showIf: v => v.padsReplaced },
      { k: 'thickness', l: 'Pad thickness measured', t: 'num', unit: 'mm', half: 1, step: 0.5, hint: 'New pads are about 10–12 mm. Replace them around 3 mm.' },
      H('Rotors'), { k: 'rotors', l: 'Rotors', t: 'seg', opts: ['Not serviced', 'Replaced', 'Resurfaced'], def: 'Not serviced' },
      { k: 'rotorBrand', l: 'Rotor brand / part', t: 'text', showIf: v => v.rotors === 'Replaced' },
      H('Brake fluid'), { k: 'fluid', l: 'Fluid service', t: 'seg', opts: ['None', 'Flush', 'Top-off'], def: 'None' },
      { k: 'fluidType', l: 'Fluid type', t: 'select', opts: ['', 'DOT 3', 'DOT 4', 'DOT 5.1', 'DOT 5'], showIf: v => v.fluid && v.fluid !== 'None' },
      F.doneBy, F.shop, F.cost, F.noCharge,
      H('Next inspection'), F.intMi(12000), F.intMo(12), F.notes],
    summary: e => `${e.axle || ''} · ${e.padsReplaced ? 'New pads' : (e.rotors && e.rotors !== 'Not serviced' ? 'Rotor service' : 'Inspection')}`,
    chips: e => [e.padsReplaced && [e.padBrand, e.padMaterial].filter(Boolean).join(' '), e.rotors && e.rotors !== 'Not serviced' && `Rotors ${e.rotors.toLowerCase()}`, e.thickness != null && e.thickness !== '' && `${e.thickness} mm pads`, e.fluid && e.fluid !== 'None' && `Fluid ${e.fluid.toLowerCase()}`],
  },
  {
    id: 'tires', title: 'Tires', icon: I.tires, noun: 'tire service',
    fields: [F.date, F.odo,
      { k: 'services', l: 'What was done', t: 'multi', opts: ['New tires', 'Rotation', 'Balance', 'Alignment', 'Pressure check', 'Tread check', 'Repair'], def: ['Rotation'] },
      H('Tire details'), { k: 'fitTires', t: 'fit', cat: 'tires' },
      { k: 'tirePick', t: 'pick', cat: 'tires', l: 'Tires bought', showIf: v => has(v.services, 'New tires') },
      { k: 'brand', l: 'Brand', t: 'text', half: 1, list: 1, showIf: v => has(v.services, 'New tires') }, { k: 'model', l: 'Model', t: 'text', half: 1, showIf: v => has(v.services, 'New tires') },
      { k: 'size', l: 'Size', t: 'text', half: 1, ph: '225/45R17', showIf: v => has(v.services, 'New tires') }, { k: 'loadSpeed', l: 'Load/speed rating', t: 'text', half: 1, ph: '94V', showIf: v => has(v.services, 'New tires') },
      { k: 'dot', l: 'DOT date code', t: 'text', half: 1, ph: 'WWYY e.g. 3225', showIf: v => has(v.services, 'New tires') }, { k: 'count', l: 'Tires replaced', t: 'num', half: 1, step: 1, def: 4, showIf: v => has(v.services, 'New tires') },
      { k: 'positions', l: 'Positions replaced', t: 'multi', opts: ['FL', 'FR', 'RL', 'RR', 'Spare'], def: ['FL', 'FR', 'RL', 'RR'], showIf: v => has(v.services, 'New tires'), hint: 'Used to track each tire’s life by position.' },
      { k: 'psi', l: 'Pressure (PSI)', t: 'quad', step: 0.5, showIf: v => has(v.services, 'Pressure check') },
      { k: 'tread', l: 'Tread depth (32nds)', t: 'quad', step: 1, showIf: v => has(v.services, 'Tread check') || has(v.services, 'Rotation') || has(v.services, 'New tires') },
      { k: 'repair', l: 'Repair details', t: 'text', ph: 'e.g. Plug, RR tire', showIf: v => has(v.services, 'Repair') },
      F.doneBy, F.shop, F.cost, F.noCharge,
      H('Next rotation'), { ...F.intMi(5000, 'Rotate again in'), hint: 'The rotation reminder counts from your last rotation or new set.' }, F.intMo(6), F.notes],
    anchor: list => list.find(e => has(e.services, 'Rotation') || has(e.services, 'New tires')) || null,
    summary: e => (e.services || []).join(', ') || 'Tire service',
    chips: e => [has(e.services, 'New tires') && [e.brand, e.model, e.size].filter(Boolean).join(' '), quadText(e.psi, ' psi'), quadText(e.tread, '/32'), e.repair],
  },
  {
    id: 'plugs', title: 'Spark plugs & wires', icon: I.plugs, noun: 'ignition service',
    fields: [F.date, F.odo,
      { k: 'fitPlugs', t: 'fit', cat: 'plugs' }, H('Spark plugs'), { k: 'plugPick', t: 'pick', cat: 'plugs', l: 'Plugs bought' }, { k: 'brand', l: 'Plug brand', t: 'text', half: 1, list: 1 }, { k: 'part', l: 'Plug part #', t: 'text', half: 1 },
      { k: 'ptype', l: 'Type', t: 'seg', opts: ['Copper', 'Platinum', 'Double platinum', 'Iridium'] },
      { k: 'gap', l: 'Gap', t: 'num', unit: 'in', half: 1, step: 0.001, ph: '0.044' }, { k: 'qty', l: 'Quantity', t: 'num', half: 1, step: 1 },
      H('Wires / coils'), { k: 'wires', l: 'Also replaced', t: 'seg', opts: ['None', 'Wires', 'Coils', 'Boots'], def: 'None' },
      { k: 'coilPick', t: 'pick', cat: 'coils', l: 'Wires / coils bought', showIf: v => v.wires === 'Wires' || v.wires === 'Coils' }, { k: 'wireQty', l: 'How many', t: 'num', half: 1, step: 1, showIf: v => v.wires === 'Coils' || v.wires === 'Boots' },
      { k: 'wireBrand', l: 'Brand', t: 'text', half: 1, showIf: v => v.wires && v.wires !== 'None' }, { k: 'wirePart', l: 'Part #', t: 'text', half: 1, showIf: v => v.wires && v.wires !== 'None' },
      F.doneBy, F.shop, F.cost, F.noCharge,
      H('Next replacement'), { ...F.intMi(60000), hint: 'Typical intervals: copper 30k, platinum 60k, iridium 100k miles.' }, F.intMo(72), F.notes],
    summary: e => [e.brand, e.ptype].filter(Boolean).join(' ') || 'Spark plugs',
    chips: e => [e.part, e.gap && `Gap ${e.gap}"`, e.qty && `×${e.qty}`, e.wires && e.wires !== 'None' && `${e.wires} ${[e.wireBrand, e.wirePart].filter(Boolean).join(' ')}`.trim()],
  },
  {
    id: 'battery', title: 'Battery', icon: I.battery, noun: 'battery entry',
    fields: [F.date, F.odo,
      { k: 'events', l: 'What was done', t: 'multi', opts: ['New battery', 'Voltage test', 'Terminals cleaned', 'Charged / jumped'], def: ['Voltage test'] },
      H('Battery'), { k: 'fitBattery', t: 'fit', cat: 'battery' },
      { k: 'batPick', t: 'pick', cat: 'battery', l: 'Battery bought', showIf: v => has(v.events, 'New battery') },
      { k: 'brand', l: 'Brand', t: 'text', half: 1, list: 1, showIf: v => has(v.events, 'New battery') }, { k: 'model', l: 'Model', t: 'text', half: 1, showIf: v => has(v.events, 'New battery') },
      { k: 'group', l: 'Group size', t: 'text', half: 1, ph: '24F, H6, 51R', showIf: v => has(v.events, 'New battery') }, { k: 'cca', l: 'CCA', t: 'num', half: 1, step: 1, showIf: v => has(v.events, 'New battery') },
      { k: 'warranty', l: 'Warranty', t: 'num', unit: 'months', half: 1, step: 1, def: 36, showIf: v => has(v.events, 'New battery') },
      { k: 'resting', l: 'Resting voltage', t: 'num', unit: 'V', half: 1, step: 0.01, showIf: v => has(v.events, 'Voltage test') || has(v.events, 'New battery') },
      { k: 'cranking', l: 'Cranking voltage', t: 'num', unit: 'V', half: 1, step: 0.01, showIf: v => has(v.events, 'Voltage test') || has(v.events, 'New battery') },
      { k: 'hint1', t: 'hint', l: 'Healthy readings: about 12.6 V resting and above about 9.6 V while cranking.' },
      F.doneBy, F.shop, F.cost, F.noCharge, F.notes],
    summary: e => (e.events || []).join(', ') || 'Battery',
    chips: e => [has(e.events, 'New battery') && [e.brand, e.model, e.group && `Grp ${e.group}`, e.cca && `${e.cca} CCA`].filter(Boolean).join(' '), e.resting && `${e.resting} V rest`, e.cranking && `${e.cranking} V crank`],
  },
  {
    id: 'airFilter', title: 'Engine air filter', icon: I.air, noun: 'air filter service',
    fields: [F.date, F.odo, { k: 'fit', t: 'fit', cat: 'airFilter' },
      { k: 'action', l: 'What was done', t: 'seg', opts: ['Replaced', 'Inspected', 'Cleaned'], def: 'Replaced' },
      { k: 'condition', l: 'Condition found (old filter)', t: 'seg', opts: ['Clean', 'Dirty', 'Clogged'] },
      H('Filter'), { k: 'pick', t: 'pick', cat: 'airFilter', l: 'Filter bought', showIf: v => v.action === 'Replaced' },
      { k: 'brand', l: 'Brand', t: 'text', half: 1, list: 1, showIf: v => v.action === 'Replaced' }, { k: 'part', l: 'Part #', t: 'text', half: 1, showIf: v => v.action === 'Replaced' },
      F.doneBy, F.shop, F.cost, F.noCharge,
      H('Next replacement'), { ...F.intMi(15000), hint: 'Inspections don’t restart the interval. Dusty roads call for shorter intervals.' }, F.intMo(12), F.notes],
    anchor: list => list.find(e => e.action === 'Replaced' || e.action === 'Cleaned') || null,
    summary: e => `${e.action || 'Service'}${e.condition ? ' · was ' + e.condition.toLowerCase() : ''}`,
    chips: e => [[e.brand, e.part].filter(Boolean).join(' '), e.doneBy === 'Shop' ? (e.shop || 'Shop') : e.doneBy],
  },
  {
    id: 'cabinFilter', title: 'Cabin air filter', icon: I.cabin, noun: 'cabin filter service',
    fields: [F.date, F.odo, { k: 'fit', t: 'fit', cat: 'cabinFilter' },
      { k: 'action', l: 'What was done', t: 'seg', opts: ['Replaced', 'Inspected', 'Cleaned'], def: 'Replaced' },
      { k: 'condition', l: 'Condition found (old filter)', t: 'seg', opts: ['Clean', 'Dirty', 'Clogged'] },
      H('Filter'), { k: 'pick', t: 'pick', cat: 'cabinFilter', l: 'Filter bought', showIf: v => v.action === 'Replaced' },
      { k: 'brand', l: 'Brand', t: 'text', half: 1, list: 1, showIf: v => v.action === 'Replaced' }, { k: 'part', l: 'Part #', t: 'text', half: 1, showIf: v => v.action === 'Replaced' },
      F.doneBy, F.shop, F.cost, F.noCharge,
      H('Next replacement'), { ...F.intMi(15000), hint: 'Inspections don’t restart the interval. Dusty roads call for shorter intervals.' }, F.intMo(12), F.notes],
    anchor: list => list.find(e => e.action === 'Replaced' || e.action === 'Cleaned') || null,
    summary: e => `${e.action || 'Service'}${e.condition ? ' · was ' + e.condition.toLowerCase() : ''}`,
    chips: e => [[e.brand, e.part].filter(Boolean).join(' '), e.doneBy === 'Shop' ? (e.shop || 'Shop') : e.doneBy],
  },
];
const SEC = Object.fromEntries(SECTIONS.map(s => [s.id, s]));
function quadText(q, u) { if (!q) return ''; const parts = TIRE_POS.map(([k, l]) => q[k] != null && q[k] !== '' ? `${l} ${q[k]}` : null).filter(Boolean); return parts.length ? parts.join(' ') + u : ''; }

/* ---------- fuel + vehicle schema ---------- */
const FUEL_FIELDS = [
  F.date, F.odo,
  { k: 'gallons', l: 'Gallons', t: 'num', unit: 'gal', step: 0.001, req: 1, half: 1 },
  { k: 'price', l: 'Price / gallon', t: 'num', pre: '$', step: 0.001, req: 1, half: 1 },
  { k: 'total', l: 'Total paid', t: 'num', pre: '$', step: 0.01, reqCost: 1, hint: 'Calculated as gallons × price. Type over it to change it.' },
  { k: 'noCharge', l: 'Free / no charge', t: 'check', sub: 'e.g. a free fill; tick this to save $0' },
  { k: 'full', l: 'Filled the tank', t: 'check', sub: 'Turn this off for a partial fill', def: true },
  H('Fuel'),
  { k: 'octane', l: 'Octane', t: 'seg', opts: ['87', '89', '91', '93', 'Other'], def: '87' },
  { k: 'octaneOther', l: 'Octane (other)', t: 'num', step: 1, half: 1, showIf: v => v.octane === 'Other' },
  { k: 'eth', l: 'Ethanol', t: 'seg', opts: ['E0', 'E10', 'E15', 'E85', 'Custom'], def: 'E10' },
  { k: 'ethPct', l: 'Ethanol %', t: 'num', unit: '%', step: 1, half: 1, showIf: v => v.eth === 'Custom' },
  { k: 'station', l: 'Station / brand', t: 'text', list: 1 },
  H('Rewards programs used'),
  { k: 'rewards', l: 'Programs used', t: 'progs' },
  H('Other discounts'),
  { k: 'centsOff', l: 'Other discount', t: 'num', unit: '¢/gal', step: 1, half: 1 },
  { k: 'saved', l: 'Other $ saved', t: 'num', pre: '$', step: 0.01, half: 1 },
  { k: 'points', l: 'Other points', t: 'num', step: 1, half: 1 },
  H('More'),
  { k: 'missed', l: 'I missed logging a fill before this one', t: 'check', sub: 'Restarts MPG tracking so your stats stay accurate' },
  F.notes,
];
const VEHICLE_FIELDS = [
  { k: 'vin', l: 'VIN', t: 'vin' },
  { k: 'name', l: 'Nickname', t: 'text', ph: 'e.g. Daily driver' },
  { k: 'year', l: 'Year', t: 'num', step: 1, half: 1, req: 1 }, { k: 'make', l: 'Make', t: 'text', half: 1, req: 1 },
  { k: 'model', l: 'Model', t: 'text', half: 1, req: 1 }, { k: 'trim', l: 'Trim / engine', t: 'text', half: 1 },
  { k: 'odometer', l: 'Current odometer', t: 'num', unit: 'mi', step: 1, half: 1 }, { k: 'tank', l: 'Tank size', t: 'num', unit: 'gal', step: 0.1, half: 1, hint: 'Used for estimated range. Leave it blank to use your largest fill.' },
  H('Details'),
  { k: 'engine', l: 'Engine', t: 'text', ph: 'e.g. 1.5 L · 4 cyl · In-Line' },
  { k: 'fuelType', l: 'Fuel type', t: 'text', half: 1 }, { k: 'drive', l: 'Drive type', t: 'text', half: 1 },
  { k: 'body', l: 'Body', t: 'text', half: 1 }, { k: 'transmission', l: 'Transmission', t: 'text', half: 1 },
  F.notes,
];

/* ---------- storage ---------- */
function blank() { return { version: 1, vehicles: [], programs: [], parts: [], plans: [], inventory: [], settings: { theme: 'auto', current: null } }; }
function normalize(j) {
  j.version = 2; j.settings = Object.assign({ theme: 'auto', current: null }, j.settings || {});
  j.vehicles = (j.vehicles || []).filter(v => v && v.id);
  j.programs = (Array.isArray(j.programs) ? j.programs : []).filter(x => x && x.id);
  ['parts', 'plans', 'inventory'].forEach(k => { j[k] = (Array.isArray(j[k]) ? j[k] : []).filter(x => x && x.id); });
  j.vehicles.forEach(v => { v.fuel = Array.isArray(v.fuel) ? v.fuel : []; v.maint = v.maint || {}; v.specs = (v.specs && typeof v.specs === 'object') ? v.specs : {}; SECTIONS.forEach(s => { v.maint[s.id] = Array.isArray(v.maint[s.id]) ? v.maint[s.id] : []; }); });
  if (!j.vehicles.find(v => v.id === j.settings.current)) j.settings.current = j.vehicles[0]?.id || null;
  return j;
}
function load() {
  try {
    const raw = localStorage.getItem(KEY); const j = JSON.parse(raw);
    if (j && Array.isArray(j.vehicles)) {
      // Non-destructive migration: keep an untouched copy of pre-v2 data before upgrading it in place.
      if ((j.version || 1) < 2 && !localStorage.getItem('autolog:backup:v1')) { try { localStorage.setItem('autolog:backup:v1', raw); } catch (e) { /* quota: skip backup, still migrate in memory */ } }
      const wasOld = (j.version || 1) < 2, n = normalize(j);
      // Write the upgraded copy only once the untouched backup is safely stored.
      if (wasOld && localStorage.getItem('autolog:backup:v1')) { try { localStorage.setItem(KEY, JSON.stringify(n)); } catch (e) { /* keep in memory */ } }
      return n;
    }
  } catch (e) { console.warn('load failed', e); }
  return blank();
}
let db = load();
function save() { DBV++; try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Couldn’t save. Your browser storage may be full.'); } try { afterSave(); } catch (e) { console.warn(e); } try { window.AutoLogSync && window.AutoLogSync.changed(); } catch (e) { console.warn(e); } }
const cur = () => { const v = db.vehicles.find(x => x.id === db.settings.current) || null; if (v && (!v.specs || typeof v.specs !== 'object')) v.specs = {}; return v; };
const vname = v => v ? (v.name || [v.year, v.make, v.model].filter(Boolean).join(' ') || 'Vehicle') : 'No vehicle';
const vdesc = v => [v.year, v.make, v.model, v.trim].filter(Boolean).join(' ');
function curOdo(v) {
  if (!v) return 0;
  let m = num(v.odometer) || 0;
  v.fuel.forEach(e => { m = Math.max(m, num(e.odo) || 0); });
  SECTIONS.forEach(s => v.maint[s.id].forEach(e => { m = Math.max(m, num(e.odo) || 0); }));
  return m;
}
const byNewest = (a, b) => (b.date || '').localeCompare(a.date || '') || (num(b.odo) || 0) - (num(a.odo) || 0);
const entries = (v, id) => [...v.maint[id]].sort(byNewest);

/* ---------- fuel math (full-to-full) ---------- */
const octVal = e => e.octane === 'Other' ? num(e.octaneOther) : num(e.octane);
const ethPct = e => e.eth === 'Custom' ? num(e.ethPct) : num(String(e.eth || '').replace('E', ''));
const ethLabel = e => e.eth === 'Custom' ? (ethPct(e) != null ? `E${ethPct(e)}` : 'Custom') : (e.eth || '—');
const octLabel = e => octVal(e) != null ? `${octVal(e)}` : '—';
const fillTotal = e => num(e.total) ?? ((num(e.gallons) || 0) * (num(e.price) || 0));
const rws = e => Array.isArray(e.rewards) ? e.rewards : [];
const rwSaved = (r, e) => ((num(r.cpg) || 0) * (num(e.gallons) || 0) / 100) + (num(r.saved) || 0);
const fillCpg = e => (num(e.centsOff) || 0) + rws(e).reduce((t, r) => t + (num(r.cpg) || 0), 0);
const fillSaved = e => ((num(e.centsOff) || 0) * (num(e.gallons) || 0) / 100) + (num(e.saved) || 0) + rws(e).reduce((t, r) => t + rwSaved(r, e), 0);
const fillPoints = e => (num(e.points) || 0) + rws(e).reduce((t, r) => t + (num(r.points) || 0), 0);
/* rewards programs */
const progById = id => db.programs.find(x => x.id === id) || null;
const progLib = pr => pr && pr.libId ? libById(pr.libId) : null;
const progName = pr => pr ? (pr.name || progLib(pr)?.name || 'Program') : 'Removed program';
const rwName = r => progById(r.pid) ? progName(progById(r.pid)) : (r.name || 'Removed program');
function progStats(pid) {
  let saved = 0, points = 0, fills = 0, gal = 0;
  db.vehicles.forEach(v => v.fuel.forEach(e => rws(e).forEach(r => { if (r.pid === pid) { saved += rwSaved(r, e); points += num(r.points) || 0; fills++; gal += num(e.gallons) || 0; } })));
  return { saved, points, fills, gal };
}

function fuelStats(v) {
  const from = v.fuelStatsFrom;
  const all = [...v.fuel].sort((a, b) => (num(a.odo) - num(b.odo)) || (a.date || '').localeCompare(b.date || ''));
  const fills = from != null ? all.filter(e => num(e.odo) > from) : all;
  const segs = []; let base = null, gal = 0, cost = 0, partialsUsed = 0, pend = 0, restarts = 0;
  const mpgById = {};
  for (const e of fills) {
    const g = num(e.gallons) || 0;
    if (e.missed && base) restarts++;
    if (e.missed || !base) { base = e.full ? e : null; gal = 0; cost = 0; pend = 0; continue; }
    gal += g; cost += fillTotal(e) - fillSaved(e);
    if (!e.full) { pend++; continue; }
    const miles = num(e.odo) - num(base.odo);
    if (miles > 0 && gal > 0) {
      const s = { from: base, to: e, miles, gal, cost, mpg: miles / gal };
      segs.push(s); mpgById[e.id] = s.mpg; partialsUsed += pend;
    }
    base = e; gal = 0; cost = 0; pend = 0;
  }
  const r = { fills, all, segs, mpgById, partialsUsed, restarts };
  r.totalSpent = sum(fills, fillTotal); r.totalGal = sum(fills, 'gallons');
  r.totalSaved = sum(fills, fillSaved); r.points = sum(fills, fillPoints);
  const bp = new Map();
  fills.forEach(e => rws(e).forEach(r => { const g = bp.get(r.pid) || { pid: r.pid, label: rwName(r), saved: 0, points: 0, fills: 0 }; g.saved += rwSaved(r, e); g.points += num(r.points) || 0; g.fills++; bp.set(r.pid, g); }));
  r.byProgram = [...bp.values()].sort((a, b) => b.saved - a.saved || b.points - a.points);
  r.avgPrice = r.totalGal ? sum(fills, e => (num(e.price) || 0) * (num(e.gallons) || 0)) / r.totalGal : null;
  r.effPrice = r.totalGal ? (r.totalSpent - r.totalSaved) / r.totalGal : null;
  const sm = sum(segs, 'miles'), sg = sum(segs, 'gal');
  r.segMiles = sm; r.avgMpg = sg ? sm / sg : null;
  r.best = segs.reduce((b, s) => !b || s.mpg > b.mpg ? s : b, null);
  r.worst = segs.reduce((b, s) => !b || s.mpg < b.mpg ? s : b, null);
  r.lastMpg = segs.length ? segs[segs.length - 1].mpg : null;
  r.cpm = sm ? sum(segs, 'cost') / sm : null;
  r.tank = num(v.tank) || (fills.length ? Math.max(...fills.map(e => num(e.gallons) || 0)) : null);
  r.range = r.avgMpg && r.tank ? r.avgMpg * r.tank : null;
  if (fills.length >= 2) {
    const f0 = fills[0], f1 = fills[fills.length - 1];
    r.milesTracked = num(f1.odo) - num(f0.odo);
    r.spanDays = daysBetween(f0.date, f1.date);
    r.milesPerDay = r.spanDays > 0 ? r.milesTracked / r.spanDays : null;
  }
  // MPG of each tank is credited to the fuel that was burned: the grade of the fill that started the segment.
  const group = keyFn => {
    const m = new Map();
    segs.forEach(s => { const k = keyFn(s.from); if (k == null) return; const g = m.get(k) || { label: k, segs: 0, miles: 0, gal: 0, cost: 0 }; g.segs++; g.miles += s.miles; g.gal += s.gal; g.cost += s.gal * ((num(s.from.price) || 0) - fillCpg(s.from) / 100); m.set(k, g); });
    return [...m.values()].map(g => ({ ...g, mpg: g.miles / g.gal, cpm: g.cost / g.miles })).sort((a, b) => b.mpg - a.mpg);
  };
  r.byEth = group(e => ethLabel(e) === '—' ? null : ethLabel(e));
  r.byOct = group(e => octVal(e) != null ? `${octVal(e)} octane` : null);
  return r;
}

function insights(v, s) {
  const out = [];
  if (!s.fills.length) return [{ t: 'Log your first fill-up to get started. Filling the tank all the way each time gives the most accurate MPG.' }];
  if (!s.segs.length) return [{ t: 'Log one more full fill-up and your MPG will show up. MPG is measured between two full fills (the full-to-full method), and any partial fills in between get added to the next full one.' }];
  const cmp = (groups, what) => {
    if (groups.length < 2) return;
    // Compare the best-performing fuel against the one you use most (falls back to the lowest).
    const hi = groups[0], common = [...groups].sort((a, b) => b.segs - a.segs || a.mpg - b.mpg)[0];
    const lo = common !== hi ? common : groups[groups.length - 1], d = hi.mpg - lo.mpg;
    if (d < 0.3) { out.push({ t: `MPG is about the same across ${what}. ${hi.label} and ${lo.label} are within ${fmt(d, 1)} MPG of each other.` }); return; }
    let t = `${hi.label} fills average ${fmt(d, 1)} MPG (${fmt(d / lo.mpg * 100, 0)}%) better than ${lo.label}: ${fmt(hi.mpg, 1)} vs ${fmt(lo.mpg, 1)} MPG over ${plural(hi.segs, 'tank')} and ${plural(lo.segs, 'tank')}.`;
    if (hi.cpm && lo.cpm) t += hi.cpm > lo.cpm ? ` ${lo.label} still costs less per mile, though (${c3(lo.cpm)} vs ${c3(hi.cpm)}).` : ` It also costs less per mile (${c3(hi.cpm)} vs ${c3(lo.cpm)}).`;
    if (hi.segs < 2 || lo.segs < 2) t += ' Early read: log a few more tanks of each to confirm.';
    const others = groups.filter(g => g !== hi && g !== lo);
    if (others.length) t += ` Also tracked: ${others.map(g => `${g.label} ${fmt(g.mpg, 1)}`).join(', ')} MPG.`;
    out.push({ t, kind: 'good' });
  };
  cmp(s.byEth, 'ethanol blends');
  cmp(s.byOct, 'octane grades');
  if (s.segs.length >= 5) {
    const last = s.segs.slice(-3), rest = s.segs.slice(0, -3);
    const lm = sum(last, 'miles') / sum(last, 'gal'), rm = sum(rest, 'miles') / sum(rest, 'gal'), d = lm - rm;
    if (Math.abs(d / rm) >= 0.04) out.push(d < 0
      ? { t: `Your last 3 tanks averaged ${fmt(lm, 1)} MPG, ${fmt(-d, 1)} below your earlier ${fmt(rm, 1)}. Check your tire pressure. Weather, idling, and city driving can also pull MPG down.`, kind: 'warn' }
      : { t: `Your last 3 tanks averaged ${fmt(lm, 1)} MPG, up ${fmt(d, 1)} from your earlier ${fmt(rm, 1)}. Nice work.`, kind: 'good' });
    else out.push({ t: `Your MPG is holding steady. Your last 3 tanks (${fmt(lm, 1)} MPG) match your earlier average.` });
  }
  if (s.best && s.segs.length >= 3) out.push({ t: `Your best tank was ${fmt(s.best.mpg, 1)} MPG on ${ethLabel(s.best.from)} ${octLabel(s.best.from)} octane${s.best.from.station ? ' from ' + s.best.from.station : ''}, ending ${fdate(s.best.to.date)}. Your worst was ${fmt(s.worst.mpg, 1)} MPG.` });
  const octCount = {}; s.fills.forEach(e => { const o = octVal(e); if (o != null) octCount[o] = (octCount[o] || 0) + 1; });
  const mainOct = Object.entries(octCount).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (mainOct) {
    const st = new Map();
    s.fills.filter(e => String(octVal(e)) === mainOct && e.station).forEach(e => { const k = e.station.trim(); const g = st.get(k) || { k, gal: 0, cost: 0, n: 0 }; g.gal += num(e.gallons) || 0; g.cost += (num(e.gallons) || 0) * (num(e.price) || 0); g.n++; st.set(k, g); });
    const arr = [...st.values()].filter(g => g.gal > 0).map(g => ({ ...g, p: g.cost / g.gal })).sort((a, b) => a.p - b.p);
    if (arr.length >= 2 && arr[arr.length - 1].p - arr[0].p >= 0.02) {
      const lo = arr[0], hi = arr[arr.length - 1];
      out.push({ t: `For ${mainOct} octane, ${lo.k} has been your cheapest station at ${c3(lo.p)}/gal on average. That’s ${fmt((hi.p - lo.p) * 100, 0)}¢ less than ${hi.k} (${c3(hi.p)}).`, kind: 'good' });
    }
  }
  if (s.totalSaved > 0) out.push({ t: `Rewards and discounts have saved you ${money(s.totalSaved)}, bringing your effective price down to ${c3(s.effPrice)}/gal from ${c3(s.avgPrice)} at the pump.${s.points ? ` You’ve also earned ${fmt(s.points)} points.` : ''}`, kind: 'good' });
  else if (s.points) out.push({ t: `You’ve earned ${fmt(s.points)} rewards points so far.` });
  if (s.byProgram.length) {
    const top = s.byProgram[0];
    if (top.saved > 0) out.push({ t: `${top.label} is your most valuable program: ${money(top.saved)} saved over ${plural(top.fills, 'fill-up')}${top.points ? ` plus ${fmt(top.points)} points` : ''}.${s.byProgram.length > 1 ? ` Next is ${s.byProgram[1].label} (${money(s.byProgram[1].saved)}).` : ''}`, kind: 'good' });
  }
  if (s.milesPerDay && s.segs.length) {
    const perTank = (s.segMiles / s.segs.length) / s.milesPerDay;
    const next = addDays(s.fills[s.fills.length - 1].date, perTank);
    const monthly = s.spanDays > 0 ? (s.totalSpent - fillTotal(s.fills[s.fills.length - 1])) / s.spanDays * 30.44 : null;
    const when = next >= todayISO() ? `so your next fill-up will probably be around ${fdate(next)}` : `so at your usual pace you’re probably due for a fill-up now (or one went unlogged)`;
    out.push({ t: `You drive about ${fmt(s.milesPerDay)} miles a day and fill up about every ${fmt(perTank)} days, ${when}.${monthly ? ` That’s roughly ${money(monthly, 0)} a month on fuel.` : ''}` });
  }
  if (v.epa && num(v.epa.comb) && s.avgMpg) {
    const c = num(v.epa.comb), ci = num(v.epa.city), hw = num(v.epa.hwy), d = s.avgMpg - c, pct = d / c * 100;
    let where = '';
    if (hw && s.avgMpg >= hw) where = ' That’s at or above even the highway rating, so it looks like mostly steady highway driving.';
    else if (ci && s.avgMpg < ci) where = ' That’s below the city rating. Short trips, idling, cold weather, or heavy loads can cause this, and so can low tire pressure.';
    else if (ci && hw) where = ` That falls between the city (${ci}) and highway (${hw}) ratings, so you’re doing a mix of both.`;
    out.splice(Math.min(1, out.length), 0, { t: `Your ${fmt(s.avgMpg, 1)} MPG average is ${Math.abs(pct) < 1 ? 'right on' : `${fmt(Math.abs(pct), 0)}% ${d > 0 ? 'above' : 'below'}`} the EPA combined rating of ${c} MPG.${where}`, kind: Math.abs(pct) < 5 || d > 0 ? 'good' : 'warn' });
  }
  const minO = num(v.specs?.minOctane);
  if (minO) { const lowFills = s.fills.filter(e => octVal(e) != null && octVal(e) < minO); if (lowFills.length) out.push({ t: `${plural(lowFills.length, 'fill-up')} used fuel below the ${minO} octane in your specs${/required/i.test(v.specs.fuelGrade || '') ? ', which your manual lists as required' : ''}. Using a lower grade than recommended can reduce power and MPG.`, kind: 'warn' }); }
  if (s.partialsUsed) out.push({ t: `${plural(s.partialsUsed, 'partial fill')} ${s.partialsUsed === 1 ? 'was' : 'were'} added into the full-to-full MPG math, so no fuel goes uncounted.` });
  if (s.restarts) out.push({ t: `${plural(s.restarts, 'fill')} marked “missed a fill” restarted MPG tracking, so one gap won’t throw off your averages.`, kind: 'warn' });
  return out;
}

/* ---------- maintenance status ---------- */
const RANK = { none: 0, ok: 1, soon: 2, over: 3 };
const LBL = { none: 'No records', ok: 'OK', soon: 'Due soon', over: 'Overdue' };
const worse = (a, b) => RANK[b] > RANK[a] ? b : a;
function intervalStatus(a, v) {
  const odo = curOdo(v), im = num(a.intMiles), imo = num(a.intMonths);
  const dueOdo = im && num(a.odo) != null ? num(a.odo) + im : null;
  const dueDate = imo && a.date ? addMonths(a.date, imo) : null;
  if (!dueOdo && !dueDate) return { level: 'ok', label: 'Logged', text: `Last done ${fdate(a.date)} at ${fmt(num(a.odo))} mi` };
  let level = 'ok'; const left = [];
  if (dueOdo != null) { const m = dueOdo - odo; if (m <= 0) level = 'over'; else if (m <= Math.max(500, im * 0.1)) level = worse(level, 'soon'); left.push(m <= 0 ? `${fmt(-m)} mi overdue` : `${fmt(m)} mi left`); }
  if (dueDate) { const d = daysBetween(todayISO(), dueDate); if (d <= 0) level = 'over'; else if (d <= 30) level = worse(level, 'soon'); left.push(d <= 0 ? `${plural(-d, 'day')} overdue` : d < 60 ? `${plural(d, 'day')} left` : `${fmt(d / 30.44)} mo left`); }
  const due = [dueOdo != null && `${fmt(dueOdo)} mi`, dueDate && fdate(dueDate)].filter(Boolean).join(' or ');
  return { level, label: LBL[level], text: `Due at ${due} · ${left.join(', ')}`, dueOdo, dueDate };
}
const tireSet = v => entries(v, 'tires').find(e => has(e.services, 'New tires')) || null;
const batteryCur = v => entries(v, 'battery').find(e => has(e.events, 'New battery')) || null;
const wExp = b => b && num(b.warranty) ? addMonths(b.date, num(b.warranty)) : null;
function sectionStatus(sec, v) {
  const list = entries(v, sec.id);
  if (!list.length) return { level: 'none', label: LBL.none, text: `No ${sec.noun} logged yet` };
  if (sec.id === 'brakes') {
    let level = 'ok'; const parts = [];
    for (const ax of ['Front', 'Rear']) {
      const a = list.find(e => e.axle === ax || e.axle === 'Both'); if (!a) continue;
      const st = intervalStatus(a, v); level = worse(level, st.level);
      const t = list.find(e => (e.axle === ax || e.axle === 'Both') && num(e.thickness) != null);
      let thick = '';
      if (t) { const th = num(t.thickness); thick = ` · pads ${th} mm`; if (th <= 3) level = worse(level, 'over'); else if (th <= 4) level = worse(level, 'soon'); }
      parts.push(`${ax}: ${st.text.replace(/^Due at /, 'inspect by ')}${thick}`);
    }
    return { level, label: LBL[level], text: parts.join(' — ') };
  }
  if (sec.id === 'battery') return batteryStatus(v, list);
  const a = sec.anchor ? sec.anchor(list) : list[0];
  let st = a ? intervalStatus(a, v) : { level: 'ok', label: 'Logged', text: `Last entry ${fdate(list[0].date)}` };
  if (sec.id === 'tires') {
    const t = list.find(e => e.tread && TIRE_POS.some(([k]) => num(e.tread[k]) != null));
    if (t) {
      const mn = Math.min(...TIRE_POS.map(([k]) => num(t.tread[k])).filter(x => x != null));
      const lvl = mn <= 2 ? 'over' : mn <= 4 ? 'soon' : 'ok';
      st = { ...st, level: worse(st.level, lvl), text: `${st.text} · min tread ${mn}/32${mn <= 2 ? ' (replace)' : mn <= 4 ? ' (getting low)' : ''}` };
      st.label = LBL[st.level];
    }
    const pe = list.find(e => e.psi && TIRE_POS.some(([k]) => num(e.psi[k]) != null)), tg = psiTargets(v);
    if (pe && (tg.fl || tg.rl)) { const low = TIRE_POS.filter(([k]) => num(pe.psi[k]) != null && tg[k] && num(pe.psi[k]) < tg[k] - 1).map(([, l]) => l);
      if (low.length) { st = { ...st, level: worse(st.level, 'soon'), text: `${st.text} · ${low.join(', ')} below spec PSI (${fdateS(pe.date)})` }; st.label = LBL[st.level]; } }
    const set = tireSet(v);
    if (set && /^\d{4}$/.test((set.dot || '').trim())) { const yy = 2000 + Number(set.dot.trim().slice(2)); const age = new Date().getFullYear() - yy; if (age >= 6) { st.level = worse(st.level, 'soon'); st.label = LBL[st.level]; st.text += ` · tires ${age} yrs old`; } }
  }
  return st;
}
function batteryStatus(v, list) {
  const b = batteryCur(v); let level = 'ok', label = 'OK'; const parts = [];
  if (b) {
    const ageY = daysBetween(b.date, todayISO()) / 365.25; parts.push(`${fmt(ageY, 1)} yrs old`);
    const exp = wExp(b);
    if (exp) { const d = daysBetween(todayISO(), exp);
      if (d < 0) { level = 'soon'; label = 'Out of warranty'; parts.push(`warranty expired ${fdate(exp)}`); }
      else { if (d <= 60) { level = 'soon'; label = 'Warranty ending'; } parts.push(`warranty until ${fdate(exp)}`); } }
    if (ageY >= 5) { level = worse(level, 'soon'); if (label === 'OK') label = 'Aging'; }
  } else parts.push('Install not logged');
  const t = list.find(e => num(e.resting) != null);
  if (t) { const r = num(t.resting); parts.push(`${r} V resting (${fdateS(t.date)})`);
    if (r < 12.2) { level = 'over'; label = 'Weak battery'; } else if (r < 12.4) { level = worse(level, 'soon'); if (label === 'OK') label = 'Low voltage'; } }
  return { level, label, text: parts.join(' · ') };
}

/* ---------- UI helpers ---------- */
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
const stat = (k, v, u = '') => `<div class="stat"><div class="k">${esc(k)}</div><div class="v">${v}${u ? `<small>${u}</small>` : ''}</div></div>`;
const pill = st => `<span class="pill ${st.level}">${esc(st.label)}</span>`;

function ask({ title, msg = '', buttons, typeToConfirm }) {
  return new Promise(res => {
    const d = $('#confirm'), box = $('#confirmInner');
    box.innerHTML = `<h3>${esc(title)}</h3><p>${msg}</p>${typeToConfirm ? `<label class="field"><span class="lbl">Type <b>${esc(typeToConfirm)}</b> to confirm</span><input id="typeConfirm" autocomplete="off" autocapitalize="characters"></label>` : ''}
      <div class="btns">${buttons.map((b, i) => `<button type="button" class="btn ${b.cls || ''}" data-i="${i}" ${typeToConfirm && b.needsType ? 'disabled' : ''}>${esc(b.label)}</button>`).join('')}</div>`;
    const done = val => { d.close(); res(val); };
    box.onclick = e => { const b = e.target.closest('button[data-i]'); if (b) done(buttons[b.dataset.i].value); };
    d.oncancel = e => { e.preventDefault(); done(null); };
    if (typeToConfirm) { const inp = $('#typeConfirm'); inp.oninput = () => $$('button[data-i]', box).forEach((b, i) => { if (buttons[i].needsType) b.disabled = inp.value.trim().toLowerCase() !== typeToConfirm.toLowerCase(); }); }
    d.showModal();
  });
}
const confirmDanger = (title, msg, label = 'Delete') => ask({ title, msg, buttons: [{ label, value: true, cls: 'danger' }, { label: 'Cancel', value: false }] });

/* ---------- forms ---------- */
function datalistFor(f, pool) {
  if (!f.list) return '';
  const opts = new Set(Array.isArray(f.list) ? f.list : []);
  if (f.list === 1 && pool) db.vehicles.forEach(x => pool(x).forEach(e => { if (e[f.k]) opts.add(String(e[f.k]).trim()); }));
  return `<datalist id="dl_${f.k}">${[...opts].slice(0, 40).map(o => `<option value="${esc(o)}">`).join('')}</datalist>`;
}
function fieldHTML(f, vals, pool) {
  if (f.t === 'h') return `<div class="fhead">${esc(f.l)}</div>`;
  if (f.t === 'hint') return `<div class="field hint" data-k="${f.k}">${esc(f.l)}</div>`;
  if (f.t === 'fit') return `<div class="field fitbox" data-k="${f.k}" data-fit="${f.cat}"></div>`;
  if (f.t === 'pick') return `<div class="field pick" data-k="${f.k}" data-cat="${f.cat}"><span class="lbl">${esc(f.l)}</span><input type="hidden" name="${f.k}" value="${esc(vals[f.k] ? (typeof vals[f.k] === 'string' ? vals[f.k] : JSON.stringify(vals[f.k])) : '')}"><div class="pick-ui"></div></div>`;
  const val = vals[f.k], name = `name="${f.k}"`, cls = `field${f.half ? ' half' : ''}`;
  const lbl = `<span class="lbl">${esc(f.l)}${f.req ? ' *' : ''}</span>`;
  const hint = f.hint ? `<small class="muted">${esc(f.hint)}</small>` : '';
  const ph = f.ph ? `placeholder="${esc(f.ph)}"` : '';
  let inner = '';
  switch (f.t) {
    case 'text': inner = `<input type="text" ${name} value="${esc(val)}" ${ph} ${f.list ? `list="dl_${f.k}"` : ''} autocomplete="off">${datalistFor(f, pool)}`; break;
    case 'num': {
      const inp = `<input type="number" inputmode="decimal" ${name} value="${esc(val)}" step="${f.step || 'any'}" ${ph}>`;
      inner = f.unit ? `<div class="unit">${inp}<em>${esc(f.unit)}</em></div>` : f.pre ? `<div class="unit pre">${inp}<em>${esc(f.pre)}</em></div>` : inp; break;
    }
    case 'date': inner = `<input type="date" ${name} value="${esc(val)}">`; break;
    case 'textarea': inner = `<textarea ${name} ${ph}>${esc(val)}</textarea>`; break;
    case 'select': inner = `<select ${name}>${f.opts.map(o => `<option value="${esc(o)}" ${String(val ?? '') === o ? 'selected' : ''}>${esc(o || '—')}</option>`).join('')}</select>`; break;
    case 'seg': return `<div class="${cls}" data-k="${f.k}" role="radiogroup" aria-label="${esc(f.l)}">${lbl}<div class="seg">${f.opts.map(o => `<label><input type="radio" ${name} value="${esc(o)}" ${String(val) === o ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div>${hint}</div>`;
    case 'multi': return `<div class="${cls}" data-k="${f.k}" role="group" aria-label="${esc(f.l)}">${lbl}<div class="seg">${f.opts.map(o => `<label><input type="checkbox" ${name} value="${esc(o)}" ${has(val, o) ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div>${hint}</div>`;
    case 'check': return `<div class="${cls}" data-k="${f.k}"><label class="toggle"><span>${esc(f.l)}${f.sub ? `<small>${esc(f.sub)}</small>` : ''}</span><input type="checkbox" role="switch" ${name} ${val ? 'checked' : ''}></label></div>`;
    case 'vin': return `<div class="${cls}" data-k="vin">${lbl}<div class="vinrow"><input type="text" name="vin" value="${esc(val)}" maxlength="17" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="17 characters" aria-describedby="vinMsg"><button type="button" class="btn small primary" data-vinlookup>Look up</button></div><small class="muted vinmsg" id="vinMsg">Enter the 17-character VIN (windshield corner or driver’s door jamb) to auto-fill details from NHTSA.</small></div>`;
    case 'progs': {
      if (!db.programs.length) return `<div class="field hint" data-k="${f.k}">You haven’t added any rewards programs yet. <a href="#/rewards" data-close-sheet>Add your programs in Rewards</a> and they’ll show up here so savings roll into your stats.</div>`;
      const arr = Array.isArray(val) ? val : [];
      return `<div class="${cls}" data-k="${f.k}"><span class="lbl">Tap the programs you used on this fill-up</span><div class="rw-list">${db.programs.map(pr => { const r = arr.find(x => x.pid === pr.id); const lib = progLib(pr);
        return `<div class="rw${r ? ' on' : ''}" data-pid="${pr.id}"><label class="rw-head"><input type="checkbox" name="rw.${pr.id}.on" data-rwon="${pr.id}" ${r ? 'checked' : ''}><span class="rw-check">${I.check}</span><span class="rw-name">${esc(progName(pr))}</span>${lib?.cpg ? `<small>${lib.cpg}¢ base</small>` : lib?.ppg ? `<small>${lib.ppg} pts/gal</small>` : ''}</label>
          <div class="rw-fields"><label><span>¢/gal off</span><input type="number" inputmode="decimal" step="any" name="rw.${pr.id}.cpg" value="${esc(r?.cpg)}"></label><label><span>$ saved</span><input type="number" inputmode="decimal" step="any" name="rw.${pr.id}.saved" value="${esc(r?.saved)}"></label><label><span>Points</span><input type="number" inputmode="decimal" step="any" name="rw.${pr.id}.points" value="${esc(r?.points)}"></label></div></div>`; }).join('')}</div></div>`;
    }
    case 'quad': return `<div class="${cls}" data-k="${f.k}">${lbl}<div class="quad">${TIRE_POS.map(([k, l]) => `<label><b>${l}</b><input type="number" inputmode="decimal" name="${f.k}.${k}" step="${f.step || 'any'}" value="${esc(val?.[k])}" aria-label="${esc(f.l)} ${l}"></label>`).join('')}</div>${hint}</div>`;
  }
  return `<label class="${cls}" data-k="${f.k}">${lbl}${inner}${hint}</label>`;
}
function readForm(form, fields) {
  const o = {};
  for (const f of fields) {
    if (f.t === 'h' || f.t === 'hint' || f.t === 'fit') continue;
    const el = form.elements[f.k];
    switch (f.t) {
      case 'num': o[f.k] = num(el.value); break;
      case 'seg': o[f.k] = ($(`input[name="${f.k}"]:checked`, form) || {}).value || ''; break;
      case 'multi': o[f.k] = $$(`input[name="${f.k}"]:checked`, form).map(x => x.value); break;
      case 'check': o[f.k] = el.checked; break;
      case 'pick': { let x = null; try { x = el.value ? JSON.parse(el.value) : null; } catch (e) { x = null; } o[f.k] = x; break; }
      case 'progs': o[f.k] = db.programs.filter(pr => form.elements[`rw.${pr.id}.on`]?.checked).map(pr => ({ pid: pr.id, name: progName(pr), cpg: num(form.elements[`rw.${pr.id}.cpg`].value), saved: num(form.elements[`rw.${pr.id}.saved`].value), points: num(form.elements[`rw.${pr.id}.points`].value) })); break;
      case 'quad': { const q = {}; TIRE_POS.forEach(([k]) => { q[k] = num(form.elements[`${f.k}.${k}`].value); }); o[f.k] = TIRE_POS.some(([k]) => q[k] != null) ? q : null; break; }
      default: o[f.k] = (el.value || '').trim();
    }
  }
  return o;
}
function openForm({ title, fields, values = {}, pool, onSave, onDelete, saveLabel = 'Save', onInput, onClick, warn, isNew, onReady }) {
  const d = $('#sheet'), form = $('#sheetForm');
  form.innerHTML = `<div class="sheet-head"><h3>${esc(title)}</h3><button type="button" class="icon-btn" data-close aria-label="Close">${I.close}</button></div>
    <div class="sheet-body">${fields.map(f => fieldHTML(f, values, pool)).join('')}
    ${warn ? '<div class="warnbox" id="formWarn" role="status" aria-live="polite" hidden></div>' : ''}
    ${onDelete ? `<button type="button" class="btn ghost-danger block" data-del style="margin-top:6px">${I.trash} Delete entry</button>` : ''}</div>
    <div class="sheet-foot"><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn primary">${I.check} ${esc(saveLabel)}</button></div>`;
  const applyShow = () => { const vals = readForm(form, fields); fields.forEach(f => { if (f.showIf) { const el = $(`[data-k="${f.k}"]`, form); if (el) el.hidden = !f.showIf(vals); } }); $$('.rw', form).forEach(b => b.classList.toggle('on', !!$('input[data-rwon]', b)?.checked));
    fields.forEach(f => { if (f.lblFn) { const el = $(`[data-k="${f.k}"] .lbl`, form); if (el) el.textContent = f.lblFn(vals) + (f.req || (isNew && f.reqCost) ? ' *' : ''); } });
    if (warn) { const w = warn(vals) || [], box = $('#formWarn', form); box.hidden = !w.length; box.innerHTML = w.map(x => `<div>⚠ ${esc(x)}</div>`).join(''); } };
  if (isNew) fields.forEach(f => { if (f.reqCost) { const el = $(`[data-k="${f.k}"] .lbl`, form); if (el && !/\*$/.test(el.textContent)) el.textContent += ' *'; } });
  if (onReady) onReady(form, applyShow);
  applyShow();
  form.oninput = e => { applyShow(); onInput && onInput(e, form); };
  form.onchange = () => applyShow();
  form.onclick = async e => {
    if (onClick) onClick(e, form);
    if (e.target.closest('[data-close]')) { e.preventDefault(); d.close(); }
    if (e.target.closest('[data-close-sheet]')) d.close();
    if (e.target.closest('[data-del]')) { e.preventDefault(); if (await confirmDanger('Delete this entry?', 'This can’t be undone.')) { onDelete(); d.close(); render(); toast('Entry deleted'); } }
  };
  form.onsubmit = e => {
    e.preventDefault();
    const vals = readForm(form, fields);
    fields.forEach(f => { if (f.showIf && !f.showIf(vals)) delete vals[f.k]; });
    const miss = fields.find(f => f.req && (vals[f.k] == null || vals[f.k] === '') && (!f.showIf || f.showIf(vals)));
    if (miss) { toast(`${miss.l} is required`); const el = form.elements[miss.k]; if (el && el.focus) el.focus(); return; }
    // Price paid is required on new entries; $0 only with the explicit no-charge box.
    const cf = isNew && fields.find(f => f.reqCost && (!f.showIf || f.showIf(vals)));
    if (cf) {
      if (vals.noCharge) vals[cf.k] = 0;
      else if (!(vals[cf.k] > 0)) {
        toast(vals[cf.k] === 0 ? 'For $0, tick “Free / warranty / no charge”' : `Enter the price you paid${vals.doneBy === 'Shop' ? ' (out-the-door total)' : ''}, or tick “Free / warranty / no charge”`);
        const el = form.elements[cf.k]; if (el && el.focus) el.focus(); return;
      }
    }
    if (onSave(vals) === false) return;
    save(); d.close(); render();
  };
  d.onclick = e => { if (e.target === d) d.close(); };
  d.showModal();
  $('.sheet-body', form).scrollTop = 0;
}
function defaults(fields, v, last) {
  const o = {};
  fields.forEach(f => { if (f.def !== undefined) o[f.k] = typeof f.def === 'function' ? f.def(v) : f.def; if (f.remember && last && last[f.k] != null) o[f.k] = last[f.k]; });
  return o;
}

/* ---------- actions ---------- */
function addVehicle(existing, opts = {}) {
  let pending = null;
  const lookup = async form => {
    const msg = $('#vinMsg', form), btn = $('[data-vinlookup]', form);
    const vin = form.elements.vin.value.trim().toUpperCase(); form.elements.vin.value = vin;
    const chk = vinCheck(vin);
    if (!chk.valid) { msg.className = 'vinmsg bad'; msg.textContent = chk.msg; return; }
    msg.className = 'vinmsg muted'; msg.textContent = 'Looking up VIN with NHTSA…'; btn.disabled = true;
    try {
      const r = await decodeVin(vin);
      const filled = [];
      Object.entries(r.fields).forEach(([k, val]) => { const el = form.elements[k]; if (el && val) { el.value = val; filled.push(k); $(`[data-k="${k}"]`, form)?.classList.add('autofill'); } });
      pending = r.raw;
      msg.className = 'vinmsg good';
      msg.textContent = `Filled ${filled.length} fields from NHTSA vPIC. Review and edit them, then tap Save.${chk.msg ? ' ' + chk.msg : ''}${r.note ? ' NHTSA note: ' + r.note : ''}`;
    } catch (e) { msg.className = 'vinmsg bad'; msg.textContent = netMsg(e); }
    finally { btn.disabled = false; }
  };
  openForm({
    title: existing ? 'Edit vehicle' : 'Add vehicle', fields: VEHICLE_FIELDS, values: existing || {}, saveLabel: existing ? 'Save' : 'Add vehicle',
    onInput: (e, form) => { if (e.target.name === 'vin') { const v = e.target.value.trim().toUpperCase(); const msg = $('#vinMsg', form); if (v.length === 17) { const c = vinCheck(v); msg.className = 'vinmsg ' + (c.valid && !c.msg ? 'good' : 'bad'); msg.textContent = c.valid ? (c.msg || 'VIN looks valid (check digit OK). Tap Look up.') : c.msg; } else { msg.className = 'vinmsg muted'; msg.textContent = `${v.length}/17 characters`; } } },
    onClick: (e, form) => { if (e.target.closest('[data-vinlookup]')) { e.preventDefault(); lookup(form); } },
    onSave: vals => {
      vals.vin = (vals.vin || '').toUpperCase();
      if (vals.vin && !vinCheck(vals.vin).valid) { toast('That VIN doesn’t look right. Fix it or clear it to save.'); return false; }
      if (pending) vals.vpic = pending;
      if (existing) Object.assign(existing, vals);
      else { const v = { id: uid(), created: todayISO(), ...vals, fuel: [], maint: {}, specs: {} }; SECTIONS.forEach(s => { v.maint[s.id] = []; }); db.vehicles.push(v); db.settings.current = v.id; toast('Vehicle added'); }
    },
  });
  if (opts.autoLookup && existing?.vin) lookup($('#sheetForm'));
  else if (opts.autoLookup) setTimeout(() => $('#sheetForm input[name="vin"]')?.focus(), 50);
}
function fuelForm(v, entry) {
  const last = [...v.fuel].sort(byNewest)[0];
  const values = entry ? { ...entry } : { ...defaults(FUEL_FIELDS, v), ...(last ? { octane: last.octane, octaneOther: last.octaneOther, eth: last.eth, ethPct: last.ethPct, station: last.station } : {}) };
  const sp = v.specs || {};
  if (!entry && !last && num(sp.minOctane)) { const o = String(num(sp.minOctane)); if (['87', '89', '91', '93'].includes(o)) values.octane = o; else { values.octane = 'Other'; values.octaneOther = num(sp.minOctane); } }
  let manual = entry ? Math.abs((num(entry.total) ?? 0) - (num(entry.gallons) || 0) * (num(entry.price) || 0)) > 0.011 : false;
  openForm({
    title: entry ? 'Edit fill-up' : 'Log fill-up', fields: FUEL_FIELDS, values, pool: x => x.fuel, saveLabel: entry ? 'Save' : 'Add fill-up', isNew: !entry,
    warn: vals => specWarnings('fuel', vals, v),
    onInput: (e, form) => {
      const n = e.target.name;
      if (n === 'total') manual = e.target.value !== '';
      if (e.target.dataset.rwon && e.target.checked) {
        const pr = progById(e.target.dataset.rwon), lib = progLib(pr), g = num(form.elements.gallons.value);
        const cpg = num(pr?.cpg) ?? lib?.cpg ?? null, ppg = lib?.ppg ?? null;
        const ci = form.elements[`rw.${pr.id}.cpg`], pi = form.elements[`rw.${pr.id}.points`];
        if (cpg != null && ci.value === '') ci.value = cpg;
        if (ppg && g && pi.value === '') pi.value = Math.round(ppg * g);
      }
      if ((n === 'gallons' || n === 'price') && !manual) {
        const g = num(form.elements.gallons.value), p = num(form.elements.price.value);
        form.elements.total.value = g != null && p != null ? (Math.round(g * p * 100) / 100).toFixed(2) : '';
      }
    },
    onSave: vals => {
      if (!(vals.gallons > 0)) { toast('Gallons must be more than 0'); return false; }
      if (vals.total == null) vals.total = Math.round(vals.gallons * (vals.price || 0) * 100) / 100;
      if (v.fuel.some(x => x !== entry && num(x.odo) === vals.odo)) { toast('There’s already a fill-up at that odometer reading'); return false; }
      if (entry) Object.assign(entry, vals); else { v.fuel.push({ id: uid(), ...vals }); toast('Fill-up logged'); }
    },
    onDelete: entry ? () => { v.fuel = v.fuel.filter(x => x !== entry); save(); } : null,
  });
}
function maintForm(v, sec, entry, preset) {
  const last = entries(v, sec.id)[0];
  const values = entry ? { ...entry } : defaults(sec.fields, v, last);
  delete values.noCharge; if (!entry) { delete values.cost; }
  if (!entry && sec.id === 'tires') { const set = tireSet(v); if (set) Object.assign(values, { brand: set.brand, model: set.model, size: set.size, loadSpeed: set.loadSpeed }); }
  if (!entry) Object.assign(values, specDefaults(sec.id, v, values));
  if (entry && entry.noCharge) values.noCharge = true;
  if (preset) Object.assign(values, preset.values || {});
  const ctx = { v, sec, entry, preset };
  openForm({
    title: `${entry ? 'Edit' : 'Log'} ${sec.noun}`, fields: sec.fields, values, pool: x => x.maint[sec.id], saveLabel: entry ? 'Save' : 'Add entry', isNew: !entry,
    warn: vals => specWarnings(sec.id, vals, v),
    onReady: (form, refresh) => partsFormInit(form, ctx, refresh),
    onSave: vals => {
      if (partsBeforeSave(vals, ctx) === false) return false;
      let saved = entry;
      if (entry) Object.assign(entry, vals); else { saved = { id: uid(), created: new Date().toISOString(), ...vals }; v.maint[sec.id].push(saved); toast(`${sec.title} entry added`); }
      partsAfterSave(saved, ctx);
    },
    onDelete: entry ? () => { v.maint[sec.id] = v.maint[sec.id].filter(x => x !== entry); save(); } : null,
  });
  if (sec.id === 'tires') { const t = psiTargets(v); TIRE_POS.forEach(([k]) => { const el = $(`#sheetForm [name="psi.${k}"]`); if (el && t[k]) el.placeholder = `spec ${t[k]}`; }); }
}
function pickSheet(title, items) {
  const d = $('#sheet'), form = $('#sheetForm');
  form.innerHTML = `<div class="sheet-head"><h3>${esc(title)}</h3><button type="button" class="icon-btn" data-close aria-label="Close">${I.close}</button></div>
    <div class="sheet-body" style="display:block"><div class="status-list">${items.map((it, i) => `<a href="#" class="srow" data-pick="${i}">${it.icon ? `<span class="sicon ${it.cls || ''}">${it.icon}</span>` : ''}<span class="sbody"><b>${esc(it.title)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span>${it.right || ''}</a>`).join('')}</div></div>`;
  form.onclick = e => { const p = e.target.closest('[data-pick]'); if (e.target.closest('[data-close]') || p) { e.preventDefault(); d.close(); } if (p) items[p.dataset.pick].run(); };
  form.oninput = form.onchange = form.onsubmit = null;
  d.onclick = e => { if (e.target === d) d.close(); };
  d.showModal();
}
function pickService(v) { pickSheet('Log service', SECTIONS.map(s => ({ title: s.title, icon: s.icon, cls: 'c-' + s.id, run: () => maintForm(v, s) }))); }

async function resetFuel(v) {
  const ch = await ask({
    title: `Reset fuel for ${vname(v)}?`,
    msg: 'Choose how to start over. <b>Restart stats</b> keeps your fill-up history but calculates everything fresh from your next fill. <b>Erase fuel log</b> permanently deletes every fill-up for this vehicle.',
    buttons: [{ label: 'Restart stats (keep history)', value: 'stats', cls: 'primary' }, { label: 'Erase fuel log', value: 'erase', cls: 'danger' }, { label: 'Cancel', value: null }],
  });
  if (ch === 'stats') { v.fuelStatsFrom = Math.max(0, ...v.fuel.map(e => num(e.odo) || 0)); v.fuelResetDate = todayISO(); save(); render(); toast('Fuel stats restarted'); }
  if (ch === 'erase' && await confirmDanger('Erase all fill-ups?', `This permanently deletes ${plural(v.fuel.length, 'fill-up')}. You may want to export a backup first.`, 'Erase fuel log')) {
    v.fuel = []; delete v.fuelStatsFrom; delete v.fuelResetDate; save(); render(); toast('Fuel log erased');
  }
}
async function eraseVehicle(v) {
  const n = v.fuel.length + SECTIONS.reduce((t, s) => t + v.maint[s.id].length, 0);
  const ok = await ask({ title: `Erase ${vname(v)}?`, msg: `This permanently deletes the vehicle and all ${plural(n, 'record')} (fuel and maintenance). This can’t be undone.`, typeToConfirm: 'ERASE',
    buttons: [{ label: 'Erase vehicle', value: true, cls: 'danger', needsType: 1 }, { label: 'Cancel', value: false }] });
  if (!ok) return;
  db.vehicles = db.vehicles.filter(x => x !== v);
  if (db.settings.current === v.id) db.settings.current = db.vehicles[0]?.id || null;
  save(); render(); toast('Vehicle erased');
}
function download(name, text, type = 'application/json') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function exportJSON() { download(`autolog-backup-${todayISO()}.json`, JSON.stringify({ app: 'AutoLog', exported: new Date().toISOString(), ...db }, null, 2)); toast('Backup downloaded'); }
function exportCSV(v) {
  const s = fuelStats(v);
  const cols = ['date', 'odometer', 'gallons', 'price_per_gal', 'total', 'full_fill', 'octane', 'ethanol', 'station', 'rewards_programs', 'total_cents_off_per_gal', 'total_dollars_saved', 'total_points', 'mpg', 'notes'];
  const q = x => { const t = String(x ?? ''); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  const rows = [...v.fuel].sort((a, b) => num(a.odo) - num(b.odo)).map(e => [e.date, e.odo, e.gallons, e.price, e.total, e.full ? 'yes' : 'no', octLabel(e), ethLabel(e), e.station, rws(e).map(rwName).join('; ') || e.program, fillCpg(e) || '', fillSaved(e) ? fillSaved(e).toFixed(2) : '', fillPoints(e) || '', s.mpgById[e.id] ? s.mpgById[e.id].toFixed(2) : '', e.notes].map(q).join(','));
  download(`autolog-fuel-${vname(v).replace(/\W+/g, '-')}-${todayISO()}.csv`, [cols.join(','), ...rows].join('\n'), 'text/csv');
}
async function importJSON(file) {
  let j; try { j = JSON.parse(await file.text()); } catch { toast('That file isn’t valid JSON'); return; }
  if (!j || !Array.isArray(j.vehicles)) { toast('That isn’t an AutoLog backup'); return; }
  const ch = await ask({ title: 'Import backup', msg: `This backup has ${plural(j.vehicles.length, 'vehicle')}. You can merge it in, which adds any vehicles that aren’t already here, or replace everything here with it.`,
    buttons: [{ label: 'Merge', value: 'merge', cls: 'primary' }, { label: 'Replace all data', value: 'replace', cls: 'danger' }, { label: 'Cancel', value: null }] });
  if (!ch) return;
  const inc = normalize(JSON.parse(JSON.stringify(j)));
  if (ch === 'replace') db = inc;
  else { inc.vehicles.forEach(v => { if (!db.vehicles.find(x => x.id === v.id)) db.vehicles.push(v); }); inc.programs.forEach(pr => { if (!progById(pr.id)) db.programs.push(pr); }); ['parts', 'plans', 'inventory'].forEach(k => inc[k].forEach(x => { if (!db[k].some(y => y.id === x.id)) db[k].push(x); })); }
  db = normalize(db);
  save(); applyTheme(); render(); toast('Backup imported');
}

/* ---------- sample data (only added when the user taps “Load sample data”) ---------- */
function sampleVehicle() {
  const d = n => addDays(todayISO(), -n);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const m = o => ({ id: uid(), sample: true, ...o });
  // ~13 months of fill-ups. MPG responds a little to season, air-filter age and ethanol so the deep dive has something to find.
  const fuel = [], stations = [['Costco', '87', 'E10', 3.29], ['Shell', '91', 'E0', 3.99], ['Kwik Trip', '88', 'E15', 3.15], ['Costco', '87', 'E10', 3.31], ['Kwik Trip', '87', 'E0', 3.69]];
  const airAt = [33300, 43300];
  let odo = 33000, ago = 400, i = 0, carry = 0;
  while (ago > 3) {
    const [st, oct, eth, base] = stations[i % stations.length], date = d(ago), mo = parseD(date).getMonth(), burned = stations[(i + stations.length - 1) % stations.length][2];
    const airAge = odo - Math.max(...airAt.filter(a => a <= odo)), winter = [11, 0, 1].includes(mo) ? 1 : 0;
    const mpg = 32.4 - 2.6 * winter - 0.32 * airAge / 1000 + (burned === 'E0' ? 0.7 : burned === 'E15' ? -0.5 : 0) + (rnd() - 0.5) * 1.6;
    const miles = Math.round(320 + rnd() * 60), gal = Math.round(miles / mpg * 1000) / 1000, price = Math.round((base + (rnd() - 0.5) * 0.3) * 1000) / 1000;
    odo += miles; ago -= Math.round(9 + rnd() * 4);
    const partial = i === 17, owe = carry; carry = partial ? gal * 0.5 : 0; const g2 = partial ? Math.round(gal * 0.5 * 1000) / 1000 : Math.round((gal + owe) * 1000) / 1000;
    const e = { id: uid(), date: d(Math.max(ago, 2)), odo, gallons: g2, price, total: Math.round(g2 * price * 100) / 100, octane: oct, eth, station: st, full: !partial, program: st === 'Shell' ? 'Fuel Rewards' : st === 'Costco' ? 'Costco' : 'Kwik Rewards' };
    if (st === 'Shell') e.centsOff = 10 + Math.round(rnd() * 3) * 5; if (st === 'Kwik Trip') e.points = Math.round(g2 * 5);
    if (partial) e.notes = 'Partial fill, was in a hurry';
    fuel.push(e); i++;
  }
  const last = fuel[fuel.length - 1].odo;
  const oilC = (ago, o, brand, cost, shop, pick) => m({ date: d(ago), odo: o, brand, viscosity: '0W-20', oilType: 'Synthetic', qty: 3.7, filterBrand: 'Honda', filterPart: '15400-PLM-A02', cost, doneBy: shop ? 'Shop' : 'DIY', shop: shop || undefined, intMiles: 5000, intMonths: 6, ...(pick || {}) });
  return { id: uid(), name: 'Daily Driver', year: 2019, make: 'Honda', model: 'Accord', trim: '1.5T EX', engine: '1.5 L · 4 cyl · Turbo', vin: '1HGCV1F43KA000000', odometer: last + 40, tank: 14.8, created: d(420), sample: true,
    specs: { oilCapacity: 3.7, oilViscosity: '0W-20', oilType: 'Synthetic', oilFilter: '15400-PLM-A02', tireSize: '225/50R17', tireLoadSpeed: '98V', psiFront: 35, psiRear: 35, plugCount: 4, plugPart: 'DILKAR7G11GS', plugGap: 0.031, plugType: 'Iridium', batteryGroup: '51R', batteryCca: 500, airFilterPart: '17220-6A0-A00', cabinFilterPart: '80292-TBA-A11' },
    fuel,
    maint: {
      oil: [oilC(395, 33200, 'Mobil 1', 69.99, 'Valvoline Instant'), oilC(262, 37450, 'Castrol', 38.4), oilC(128, 41700, 'Mobil 1', 41.5), oilC(9, 45000, 'Pennzoil', 36.9)],
      coolant: [m({ date: d(410), odo: 32700, service: 'Drain & fill', ctype: 'OAT', color: 'Blue', brand: 'Honda Type 2', mix: 'Premixed 50/50', qty: 1.5, cost: 129, doneBy: 'Shop', shop: 'Honda dealer', intMiles: 60000, intMonths: 60 })],
      brakes: [
        m({ date: d(405), odo: 32900, axle: 'Front', padsReplaced: true, padBrand: 'Akebono', padPart: 'ACT1089', padMaterial: 'Ceramic', thickness: 11, rotors: 'Resurfaced', fluid: 'Flush', fluidType: 'DOT 3', cost: 289, doneBy: 'Shop', shop: 'Midas', intMiles: 12000, intMonths: 12 }),
        m({ date: d(262), odo: 37450, axle: 'Both', padsReplaced: false, thickness: 8, rotors: 'Not serviced', fluid: 'None', cost: 0, noCharge: true, doneBy: 'DIY', intMiles: 12000, intMonths: 12 }),
        m({ date: d(66), odo: 43400, axle: 'Both', padsReplaced: false, thickness: 6, rotors: 'Not serviced', fluid: 'None', cost: 0, noCharge: true, doneBy: 'DIY', intMiles: 12000, intMonths: 12, notes: 'Front 6 mm, rear 5 mm. Rotors smooth.' }),
      ],
      tires: [
        m({ date: d(415), odo: 32600, services: ['New tires', 'Balance', 'Alignment'], brand: 'Michelin', model: 'CrossClimate2', size: '225/50R17', loadSpeed: '98V', dot: '0825', count: 4, positions: ['FL', 'FR', 'RL', 'RR'], tread: { fl: 10, fr: 10, rl: 10, rr: 10 }, cost: 912, doneBy: 'Shop', shop: 'Discount Tire', intMiles: 5000, intMonths: 6 }),
        m({ date: d(262), odo: 37450, services: ['Rotation', 'Tread check'], tread: { fl: 8, fr: 8, rl: 9, rr: 9 }, cost: 0, noCharge: true, doneBy: 'Shop', shop: 'Discount Tire', intMiles: 5000, intMonths: 6 }),
        m({ date: d(128), odo: 41700, services: ['Rotation', 'Tread check', 'Pressure check'], psi: { fl: 34, fr: 34, rl: 33, rr: 34 }, tread: { fl: 7, fr: 7, rl: 7, rr: 8 }, cost: 0, noCharge: true, doneBy: 'Shop', shop: 'Discount Tire', intMiles: 5000, intMonths: 6 }),
        m({ date: d(35), odo: 44400, services: ['Pressure check', 'Tread check'], psi: { fl: 35, fr: 35, rl: 34, rr: 33 }, tread: { fl: 6, fr: 6, rl: 7, rr: 6 }, cost: 0, noCharge: true, doneBy: 'DIY', intMiles: 5000, intMonths: 6, notes: 'RR a little low, set all to 35' }),
      ],
      plugs: [m({ date: d(170), odo: 40350, brand: 'NGK', part: 'DILKAR7G11GS', ptype: 'Iridium', gap: 0.031, qty: 4, wires: 'None', cost: 58.36, doneBy: 'DIY', intMiles: 100000, intMonths: 120 })],
      battery: [
        m({ date: d(418), odo: 32500, events: ['New battery'], brand: 'Interstate', model: 'MTX-51R', group: '51R', cca: 500, warranty: 36, resting: 12.71, cranking: 10.6, cost: 189.99, doneBy: 'Shop', shop: 'Costco Tire Center' }),
        m({ date: d(400), odo: 33000, events: ['Voltage test'], resting: 12.6, cranking: 10.3, cost: 0, noCharge: true, doneBy: 'DIY' }),
        m({ date: d(35), odo: 44400, events: ['Voltage test', 'Terminals cleaned'], resting: 12.48, cranking: 10.1, cost: 0, noCharge: true, doneBy: 'DIY' }),
      ],
      airFilter: [
        m({ date: d(392), odo: 33300, action: 'Replaced', condition: 'Dirty', brand: 'FRAM', part: 'CA12360', cost: 18.97, doneBy: 'DIY', intMiles: 15000, intMonths: 12 }),
        m({ date: d(70), odo: 43300, action: 'Replaced', condition: 'Clogged', brand: 'K&N', part: '33-5079', cost: 54.99, doneBy: 'DIY', intMiles: 50000, intMonths: 60, notes: 'Washable filter' }),
      ],
      cabinFilter: [
        m({ date: d(380), odo: 33600, action: 'Replaced', condition: 'Dirty', brand: 'FRAM', part: 'CF11182', cost: 15.47, doneBy: 'DIY', intMiles: 15000, intMonths: 12 }),
        m({ date: d(25), odo: 44700, action: 'Replaced', condition: 'Dirty', brand: 'Bosch', part: '6055C', cost: 21.99, doneBy: 'DIY', intMiles: 15000, intMonths: 12 }),
      ],
    } };
}
function sampleShelf(v) {
  db.inventory.push(
    { id: uid(), sample: true, cat: 'oil', itemId: 'oil-mobil-1-advanced-fs-0w-20-5qt', brand: 'Mobil 1', part: 'Advanced FS 0W-20 5qt', name: 'Mobil 1 Advanced Full Synthetic 0W-20, 5 qt', qty: 6.3, unit: 'qt', size: 5, location: 'Garage shelf', low: 4, price: 6.99, qtyBought: 10, date: addDays(todayISO(), -140), retailer: 'Walmart', fits: [v.id], log: [] },
    { id: uid(), sample: true, cat: 'oilFilter', itemId: null, brand: 'Honda', part: '15400-PLM-A02', name: 'Honda OEM oil filter', qty: 1, unit: 'each', location: 'Garage shelf', low: 1, price: 8.5, qtyBought: 3, date: addDays(todayISO(), -260), retailer: 'Honda dealer', fits: [v.id], log: [] },
    { id: uid(), sample: true, cat: 'cabinFilter', itemId: null, brand: 'Bosch', part: '6055C', name: 'Bosch HEPA cabin filter', qty: 1, unit: 'each', location: 'Trunk', low: 0, price: 21.99, qtyBought: 2, date: addDays(todayISO(), -25), retailer: 'Amazon', fits: [v.id], log: [] },
    { id: uid(), sample: true, cat: 'other', itemId: null, brand: 'Rain-X', part: '5079281-2 26"', name: 'Wiper blade 26 in', qty: 2, unit: 'each', location: 'Garage shelf', price: 17.49, qtyBought: 2, date: addDays(todayISO(), -45), fits: [], log: [] });
  db.plans.push(
    { id: uid(), sample: true, created: addDays(todayISO(), -30), vid: v.id, cat: 'brakes', brand: 'Akebono', part: 'ACT1089', name: 'Akebono ProACT ceramic front pads', qty: 1, unit: 'set', status: 'planned', targetOdo: 49000, priceAtAdd: 64.99, priceAtAddDate: addDays(todayISO(), -30), notes: 'Front pads at 6 mm' },
    { id: uid(), sample: true, created: addDays(todayISO(), -12), vid: v.id, cat: 'tires', brand: 'Michelin', part: 'CrossClimate2 225/50R17', name: 'Michelin CrossClimate2 225/50R17 98V', qty: 4, unit: 'each', status: 'planned', targetDate: addDays(todayISO(), 200), priceAtAdd: 228, priceAtAddDate: addDays(todayISO(), -12), notes: 'Tread at 6/32' },
    { id: uid(), sample: true, created: addDays(todayISO(), -5), vid: v.id, cat: 'oil', itemId: 'oil-mobil-1-advanced-fs-0w-20-5qt', brand: 'Mobil 1', part: 'Advanced FS 0W-20 5qt', name: 'Mobil 1 Advanced Full Synthetic 0W-20, 5 qt', qty: 1, unit: 'jugs', status: 'bought', paid: 29.97, paidDate: addDays(todayISO(), -5), retailer: 'Walmart' });
}
function sampleProgram(libId, extra = {}) {
  let pr = db.programs.find(x => x.libId === libId);
  if (!pr) { pr = { id: uid(), libId, added: todayISO(), cpg: libById(libId)?.cpg ?? null, ...extra }; db.programs.push(pr); }
  return pr;
}
function loadSample() {
  const P = { shell: sampleProgram('shell', { memberId: '••• 4821', notes: 'Gold status (sample)' }), costco: sampleProgram('costco', { notes: 'Pay with Costco Anywhere Visa (sample)' }), kwik: sampleProgram('kwik') };
  const v = sampleVehicle(); v.specs = v.specs || {};
  const RW = { 'Fuel Rewards': P.shell.id, 'Costco': P.costco.id, 'Kwik Rewards': P.kwik.id };
  v.fuel.forEach(e => { if (e.program && RW[e.program]) { const pid = RW[e.program]; const r = { pid, name: progName(progById(pid)), cpg: e.centsOff ?? null, saved: e.saved ?? null, points: e.points ?? null }; if (r.cpg != null || r.saved != null || r.points != null || e.program === 'Costco') e.rewards = [r]; delete e.centsOff; delete e.saved; delete e.points; } delete e.program; }); db.vehicles.push(v); db.settings.current = v.id; sampleShelf(v); save(); location.hash = '#/dash'; render(); toast('Sample vehicle and programs loaded. Erase them anytime.');
}

/* ---------- chart + tables ---------- */
function trendChart(s) {
  const mp = s.segs.map(x => ({ t: parseD(x.to.date).getTime(), y: x.mpg }));
  const pr = s.fills.filter(e => num(e.price)).map(e => ({ t: parseD(e.date).getTime(), y: num(e.price) }));
  if (mp.length < 2 && pr.length < 2) return '<p class="muted" style="margin:0">Log a few more fill-ups to see trends.</p>';
  const W = 340, Ht = 180, L = 30, R = 42, T = 12, B = 24;
  const ts = [...mp, ...pr].map(p => p.t), t0 = Math.min(...ts), t1 = Math.max(...ts);
  const ext = a => { if (!a.length) return [0, 1]; const lo = Math.min(...a.map(p => p.y)), hi = Math.max(...a.map(p => p.y)); const p = (hi - lo) * 0.15 || 1; return [lo - p, hi + p]; };
  const [m0, m1] = ext(mp), [p0, p1] = ext(pr);
  const X = t => L + (t1 === t0 ? 0.5 : (t - t0) / (t1 - t0)) * (W - L - R);
  const Y = (y, a, b) => T + (1 - (y - a) / (b - a)) * (Ht - T - B);
  const path = (a, lo, hi) => a.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)},${Y(p.y, lo, hi).toFixed(1)}`).join('');
  let g = '';
  for (let i = 0; i <= 3; i++) {
    const y = T + i * (Ht - T - B) / 3; g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/>`;
    if (mp.length) g += `<text x="${L - 5}" y="${y + 3}" text-anchor="end">${fmt(m1 - i * (m1 - m0) / 3, 0)}</text>`;
    if (pr.length) g += `<text x="${W - R + 5}" y="${y + 3}">$${(p1 - i * (p1 - p0) / 3).toFixed(2)}</text>`;
  }
  [t0, (t0 + t1) / 2, t1].forEach((t, i) => { g += `<text x="${X(t)}" y="${Ht - 6}" text-anchor="${['start', 'middle', 'end'][i]}">${fdateS(iso(new Date(t)))}</text>`; });
  const dots = (a, lo, hi, c) => a.map(p => `<circle cx="${X(p.t).toFixed(1)}" cy="${Y(p.y, lo, hi).toFixed(1)}" r="3.2" fill="${c}" stroke="var(--surface)" stroke-width="1.5"/>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${Ht}" role="img" aria-label="MPG and price per gallon over time">${g}
    ${pr.length > 1 ? `<path d="${path(pr, p0, p1)}" fill="none" stroke="var(--soon)" stroke-width="2" stroke-dasharray="4 3" opacity=".9"/>${dots(pr, p0, p1, 'var(--soon)')}` : ''}
    ${mp.length > 1 ? `<path d="${path(mp, m0, m1)}" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linejoin="round"/>${dots(mp, m0, m1, 'var(--accent)')}` : ''}</svg>
    <div class="legend"><span><i style="background:var(--accent)"></i>MPG (left)</span><span><i style="background:var(--soon)"></i>Price/gal (right)</span></div>`;
}
function cmpTable(title, groups) {
  if (!groups.length) return '';
  const max = Math.max(...groups.map(g => g.mpg));
  return `<div class="cmp-wrap"><div class="cmp-title">${esc(title)}</div><table class="cmp"><thead><tr><th>Fuel</th><th></th><th>MPG</th><th>$/mi</th><th>Tanks</th></tr></thead><tbody>
    ${groups.map(g => `<tr><td><b>${esc(g.label)}</b></td><td class="barcell"><div class="bar"><i style="width:${(g.mpg / max * 100).toFixed(0)}%"></i></div></td><td><b>${fmt(g.mpg, 1)}</b></td><td>${c3(g.cpm)}</td><td>${g.segs}</td></tr>`).join('')}</tbody></table></div>`;
}
const insightsHTML = list => `<ul class="insights">${list.map(i => `<li class="${i.kind || ''}">${esc(i.t)}</li>`).join('')}</ul>`;

/* ---------- views ---------- */
function emptyGarage() {
  return `<div class="card empty"><div class="hero-empty" role="img" aria-label="AutoLog"></div><div class="big">Welcome to AutoLog</div>
    <div>Track fill-ups, MPG, and all your maintenance. Everything stays on this device and works offline.</div>
    <div class="btn-row"><button class="btn primary" data-act="addVehicle">${I.plus} Add your vehicle</button><button class="btn" data-act="loadSample">Load sample data</button></div></div>`;
}
function fuelRow(e, s, dim) {
  const mpg = s.mpgById[e.id], sv = fillSaved(e);
  return `<button class="entry${dim ? ' dim' : ''}" data-act="editFuel" data-id="${e.id}">
    <div class="e-main"><b>${fdate(e.date)}</b>${e.station ? ` <span class="muted">· ${esc(e.station)}</span>` : ''}
      <div class="e-sub">${fmt(num(e.gallons), 3)} gal @ ${c3(num(e.price))} · ${esc(octLabel(e))} · ${esc(ethLabel(e))}</div>
      <div class="tags">${!e.full ? '<span class="tag warn">Partial</span>' : ''}${e.missed ? '<span class="tag warn">After missed fill</span>' : ''}${rws(e).map(r => `<span class="tag accent">${esc(rwName(r))}</span>`).join('')}${!rws(e).length && e.program ? `<span class="tag accent">${esc(e.program)}</span>` : ''}${sv > 0 ? `<span class="tag good">Saved ${money(sv)}</span>` : ''}${fillPoints(e) ? `<span class="tag accent">+${fmt(fillPoints(e))} pts</span>` : ''}${dim ? '<span class="tag">Before reset</span>' : ''}${e.notes ? `<span class="tag">${esc(e.notes.slice(0, 28))}${e.notes.length > 28 ? '…' : ''}</span>` : ''}</div></div>
    <div class="e-side"><b>${money(fillTotal(e))}</b><span class="mpg">${mpg ? fmt(mpg, 1) + ' mpg' : '—'}</span><small>${fmt(num(e.odo))} mi</small></div></button>`;
}
function viewFuel(v) {
  const s = fuelStats(v), ins = [...insights(v, s), ...statInsights(v)];
  const list = [...v.fuel].sort((a, b) => num(b.odo) - num(a.odo));
  const reset = v.fuelStatsFrom != null;
  return `<div class="page-title"><h2>Fuel</h2><div class="btn-row"><button class="btn small" data-act="csv" ${v.fuel.length ? '' : 'disabled'}>${I.download} CSV</button><button class="btn small" data-act="resetFuel" ${v.fuel.length ? '' : 'disabled'}>${I.reset} Reset</button></div></div>
    ${reset ? `<div class="banner"><span>Stats restarted ${fdate(v.fuelResetDate)}. Earlier fill-ups are kept but not counted.</span><button class="btn small" data-act="undoReset">Undo</button></div>` : ''}
    <section class="card"><h3>${I.gauge} Fuel economy</h3>
      <div class="stats">${stat('Average', fmt(s.avgMpg, 1), s.avgMpg ? 'mpg' : '')}${stat('Best', fmt(s.best?.mpg, 1), s.best ? 'mpg' : '')}${stat('Worst', fmt(s.worst?.mpg, 1), s.worst ? 'mpg' : '')}
      ${stat('Cost / mile', s.cpm ? c3(s.cpm) : '—')}${stat('Est. range', fmt(s.range), s.range ? 'mi' : '')}${stat('Miles', fmt(s.milesTracked))}
      ${stat('Total spent', money(s.totalSpent))}${stat('Gallons', fmt(s.totalGal, 1))}${stat('Fill-ups', fmt(s.fills.length))}
      ${stat('Pump avg', s.avgPrice ? c3(s.avgPrice) : '—')}${stat('Effective', s.effPrice ? c3(s.effPrice) : '—')}${stat('Saved', money(s.totalSaved))}</div>
      ${s.points ? `<p class="muted" style="margin:10px 0 0;font-size:.85rem">Rewards points earned: <b>${fmt(s.points)}</b></p>` : ''}
    </section>
    <section class="card"><h3><span class="spark">${I.spark}</span> Insights</h3>${insightsHTML(ins)}<div class="insights-note">Calculated on your device from your log. Each tank’s MPG is credited to the fuel you actually burned (the fill before it).</div></section>
    <section class="card"><h3>${I.chart} Trends</h3>${trendChart(s)}</section>
    ${s.byProgram.length ? `<section class="card"><div class="card-head"><h3>${I.gift} Rewards by program</h3><a href="#/rewards" class="link" style="margin:0">Programs</a></div><table class="cmp"><thead><tr><th>Program</th><th>Fills</th><th>Points</th><th>Saved</th></tr></thead><tbody>${s.byProgram.map(g => `<tr><td><b>${esc(g.label)}</b></td><td>${g.fills}</td><td>${g.points ? fmt(g.points) : '—'}</td><td><b>${money(g.saved)}</b></td></tr>`).join('')}</tbody></table></section>` : ''}
    ${s.byEth.length || s.byOct.length ? `<section class="card"><h3>Compare fuels</h3>${cmpTable('By ethanol content', s.byEth)}${cmpTable('By octane', s.byOct)}</section>` : ''}
    <section class="card"><div class="card-head"><h3>${I.fuel} Fill-up log</h3><span class="muted">${plural(v.fuel.length, 'entry', 'entries')}</span></div>
      ${list.length ? `<div class="list">${list.map(e => fuelRow(e, s, reset && num(e.odo) <= v.fuelStatsFrom)).join('')}</div>` : `<div class="empty">No fill-ups yet.<div class="btn-row"><button class="btn primary" data-act="addFuel">${I.plus} Log your first fill-up</button></div></div>`}
    </section>`;
}
function viewService(v) {
  const ip = (db.plans || []).filter(p => p.status !== 'installed' && (!p.vid || p.vid === v.id)).length, lo = lowStock().length;
  return `<div class="page-title"><h2>Service</h2></div>
    <div class="quick-links"><a href="#/plan" class="ql">${I.list}<b>Planned parts</b><small>${ip ? plural(ip, 'open item') : 'Plan ahead'}</small></a><a href="#/inventory" class="ql">${I.box}<b>Inventory</b><small>${(db.inventory || []).length ? `${money(invTotals().value, 0)}${lo ? ` · ${lo} low` : ''}` : 'Spare parts'}</small></a>
      <a href="#/stats" class="ql">${I.chart}<b>Parts life</b><small>Life &amp; cost stats</small></a><a href="#/deep" class="ql">${I.layers}<b>Deep dive</b><small>What affects MPG</small></a></div><div class="tiles">${SECTIONS.map(sec => { const st = sectionStatus(sec, v); const n = v.maint[sec.id].length;
    return `<a class="tile" href="#/service/${sec.id}"><span class="sicon c-${sec.id}">${sec.icon}</span><b>${esc(sec.title)}</b><small>${n ? plural(n, 'entry', 'entries') : 'Nothing logged'}</small>${pill(st)}</a>`; }).join('')}</div>`;
}
function specCard(sec, v) {
  const list = entries(v, sec.id);
  if (sec.id === 'tires') {
    const t = tireSet(v); if (!t) return '';
    const latest = list.find(e => e.tread), lp = list.find(e => e.psi), rot = list.find(e => has(e.services, 'Rotation'));
    const q = (o, vals) => `<div class="tire4">${TIRE_POS.map(([k, l]) => `<span>${l} <b>${vals[k] ?? '—'}</b></span>`).join('')}</div>`;
    return `<section class="card"><h3>Current tires</h3><div class="spec">
      <div><span>Tire</span>${esc([t.brand, t.model].filter(Boolean).join(' ') || '—')}</div><div><span>Size</span>${esc(t.size || '—')} ${esc(t.loadSpeed || '')}</div>
      <div><span>DOT code</span>${esc(t.dot || '—')}</div><div><span>Installed</span>${fdate(t.date)} · ${fmt(num(t.odo))} mi</div>
      <div><span>Miles on set</span>${fmt(curOdo(v) - num(t.odo))}</div><div><span>Last rotation</span>${rot ? fdate(rot.date) : '—'}</div>
      ${latest ? `<div class="wide"><span>Tread /32 · ${fdateS(latest.date)}</span>${q(0, latest.tread)}</div>` : ''}
      ${lp ? `<div class="wide"><span>PSI · ${fdateS(lp.date)}</span>${q(0, lp.psi)}</div>` : ''}
      </div></section>`;
  }
  if (sec.id === 'battery') {
    const b = batteryCur(v); if (!b) return '';
    const exp = wExp(b), t = list.find(e => num(e.resting) != null), dl = exp ? daysBetween(todayISO(), exp) : null;
    return `<section class="card"><h3>Current battery</h3><div class="spec">
      <div><span>Battery</span>${esc([b.brand, b.model].filter(Boolean).join(' ') || '—')}</div><div><span>Group / CCA</span>${esc(b.group || '—')} · ${b.cca ? fmt(num(b.cca)) + ' CCA' : '—'}</div>
      <div><span>Installed</span>${fdate(b.date)}</div><div><span>Age</span>${fmt(daysBetween(b.date, todayISO()) / 365.25, 1)} yrs</div>
      <div><span>Warranty</span>${exp ? `${dl < 0 ? 'Expired' : 'Until'} ${fdate(exp)}` : '—'}</div><div><span>Warranty left</span>${dl == null ? '—' : dl < 0 ? '<b style="color:var(--soon)">None</b>' : plural(dl, 'day')}</div>
      ${t ? `<div class="wide"><span>Last test · ${fdateS(t.date)}</span>${t.resting} V resting${t.cranking ? ` · ${t.cranking} V cranking` : ''}</div>` : ''}
      </div></section>`;
  }
  return '';
}
function viewSection(v, sec) {
  const st = sectionStatus(sec, v), list = entries(v, sec.id);
  return `<a href="#/service" class="back">${I.back} Service</a>
    <section class="card"><div class="card-head"><h3><span class="sicon c-${sec.id}">${sec.icon}</span> ${esc(sec.title)}</h3>${pill(st)}</div>
      <p style="margin:0 0 12px">${esc(st.text)}</p>
      <div class="stats">${stat('Entries', fmt(list.length))}${stat('Last done', list[0] ? fdateS(list[0].date) : '—')}${stat('Total cost', money(sum(list, 'cost'), 0))}</div>
      <div class="row-actions"><button class="btn primary" data-act="addMaint" data-sec="${sec.id}">${I.plus} Log ${esc(sec.noun)}</button></div></section>
    ${FIT[sec.id] ? `<section class="card"><div class="card-head"><h3>${sec.id === 'oil' ? 'Capacity' : 'Fitment'}</h3><a class="link" style="margin:0" href="#/specs">Specs</a></div>${fitStatic(sec.id, v)}</section>` : ''}
    ${specCard(sec, v)}
    <section class="card"><div class="card-head"><h3>History</h3></div>
      ${list.length ? `<div class="list">${list.map(e => `<button class="entry" data-act="editMaint" data-sec="${sec.id}" data-id="${e.id}"><div class="e-main"><b>${esc(sec.summary(e))}</b>
        <div class="e-sub">${fdate(e.date)} · ${fmt(num(e.odo))} mi</div><div class="tags">${sec.chips(e).filter(Boolean).map(c => `<span class="tag">${esc(c)}</span>`).join('')}${e.notes ? `<span class="tag">${esc(e.notes.slice(0, 32))}${e.notes.length > 32 ? '…' : ''}</span>` : ''}</div></div>
        <div class="e-side">${num(e.cost) ? `<b>${money(num(e.cost))}</b>` : '<small>—</small>'}</div></button>`).join('')}</div>`
        : `<div class="empty">No ${esc(sec.noun)} logged yet.</div>`}</section>`;
}
function viewGarage() {
  const v = cur();
  return `<div class="page-title"><h2>Garage</h2><button class="btn small primary" data-act="addVehicle">${I.plus} Vehicle</button></div>
    ${db.vehicles.length ? db.vehicles.map(x => `<section class="card"><div class="vcard"><span class="sicon c-fuel">${I.car}</span><div class="vinfo"><b>${esc(vname(x))}</b><small>${esc(vdesc(x))} · ${fmt(curOdo(x))} mi · ${plural(x.fuel.length, 'fill-up')}</small></div>${x === v ? '<span class="current-badge">Current</span>' : ''}</div>
      <div class="vactions">${x !== v ? `<button class="btn small primary" data-act="select" data-id="${x.id}">Select</button>` : ''}<button class="btn small" data-act="editVehicle" data-id="${x.id}">${I.edit} Edit</button><button class="btn small" data-act="specsFor" data-id="${x.id}">${I.car} Specs</button><button class="btn small" data-act="resetFuelV" data-id="${x.id}" ${x.fuel.length ? '' : 'disabled'}>${I.reset} Reset fuel</button><button class="btn small ghost-danger" data-act="eraseVehicle" data-id="${x.id}">${I.trash} Erase</button></div></section>`).join('') : emptyGarage()}
    <div id="syncCard">${window.AutoLogSync ? window.AutoLogSync.cardHTML() : ''}</div>
    <section class="card"><h3>Settings &amp; backup</h3>
      <div class="setting"><b>Appearance</b><div class="seg" role="radiogroup">${['auto', 'light', 'dark'].map(t => `<label><input type="radio" name="theme" value="${t}" ${db.settings.theme === t ? 'checked' : ''} data-act="theme"><span>${t[0].toUpperCase() + t.slice(1)}</span></label>`).join('')}</div></div>
      <div class="setting"><b>Backup</b><small>Your data lives in this browser (and in your account if you turn on sync above). Export a backup now and then; you can import it on any device.</small>
        <div class="btn-row"><button class="btn small" data-act="export">${I.download} Export JSON</button><button class="btn small" data-act="import">${I.upload} Import JSON</button></div></div>
      <div class="setting"><b>Sample data</b><small>Adds a demo vehicle with fill-ups and maintenance so you can look around. You can erase it anytime.</small><div><button class="btn small" data-act="loadSample">Load sample data</button></div></div>
      ${installPrompt ? `<div class="setting"><b>Install</b><small>Add AutoLog to your home screen for one-tap access.</small><div><button class="btn small primary" data-act="install">Install app</button></div></div>`
        : `<div class="setting"><b>Install on your phone</b><small>iPhone: tap Share, then Add to Home Screen. Android: open the browser menu and tap Install app.</small></div>`}
      <div class="setting"><b>Danger zone</b><div><button class="btn small ghost-danger" data-act="eraseAll" ${db.vehicles.length ? '' : 'disabled'}>${I.trash} Erase all data</button></div></div>
    </section><p class="muted" style="text-align:center;font-size:.78rem">AutoLog v1 · works offline · no account, no tracking</p>`;
}


/* ---------- rewards programs ---------- */
const PROG_FIELDS_CUSTOM = [
  { k: 'name', l: 'Program name', t: 'text', req: 1, ph: 'e.g. Local Co-op Rewards' },
  { k: 'brands', l: 'Stations / brands', t: 'text', half: 1 }, { k: 'type', l: 'Type', t: 'select', opts: ['Gas station', 'Grocery', 'Warehouse club', 'Membership / app', 'Cash-back app', 'Credit card', 'Other'], half: 1 },
  { k: 'url', l: 'Program website', t: 'text', ph: 'https://' },
  { k: 'benefitsText', l: 'Benefits (your notes)', t: 'textarea', ph: 'e.g. 5¢/gal every fill, 2× points on Tuesdays' },
];
const PROG_FIELDS = [
  { k: 'memberId', l: 'Member ID / phone / card #', t: 'text', hint: 'Optional. Stored only on this device.' },
  { k: 'cpg', l: 'Your usual discount', t: 'num', unit: '¢/gal', step: 0.1, half: 1, hint: 'Pre-fills the fill-up form when you pick this program.' },
  { k: 'notes', l: 'Notes', t: 'textarea', ph: 'Tier/status, linked cards, expiring rewards…' },
];
function programForm(libId, existing) {
  const lib = libId ? libById(libId) : progLib(existing);
  const custom = existing ? !existing.libId : !lib;
  const fields = custom ? [...PROG_FIELDS_CUSTOM, ...PROG_FIELDS] : PROG_FIELDS;
  const values = existing ? { ...existing } : { cpg: lib?.cpg ?? '' };
  openForm({ title: existing ? `Edit ${progName(existing)}` : `Add ${lib ? lib.name : 'custom program'}`, fields, values, saveLabel: existing ? 'Save' : 'Add program',
    onSave: vals => {
      if (vals.url && !/^https?:\/\//i.test(vals.url)) vals.url = 'https://' + vals.url;
      if (existing) Object.assign(existing, vals);
      else { const pr = { id: uid(), libId: lib ? lib.id : null, added: todayISO(), ...vals }; db.programs.push(pr); toast(`${progName(pr)} added`); setTimeout(() => { location.hash = `#/rewards/${pr.id}`; }, 0); }
    },
    onDelete: existing ? () => { db.programs = db.programs.filter(x => x !== existing); save(); setTimeout(() => { location.hash = '#/rewards'; }, 0); } : null });
  if (existing) { const del = $('#sheetForm [data-del]'); if (del) del.innerHTML = `${I.trash} Remove program`; }
}
function pickLibrary() {
  pickSheet('Add a rewards program', [{ title: 'Custom program', sub: 'Add a program that isn’t in the library', icon: I.plus, cls: 'c-fuel', run: () => programForm(null) },
    ...LIB.map(l => ({ title: l.name, sub: l.brands, icon: I.gift, cls: 'c-battery', right: db.programs.some(pr => pr.libId === l.id) ? '<span class="current-badge">Added</span>' : '', run: () => programForm(l.id) }))]);
}
const libSearchText = l => [l.name, l.brands, l.type, l.summary, ...(l.benefits || [])].join(' ').toLowerCase();
function viewRewards() {
  const mine = db.programs;
  return `<div class="page-title"><h2>Rewards</h2><button class="btn small primary" data-act="addProgram">${I.plus} Program</button></div>
    <section class="card"><div class="card-head"><h3>${I.gift} My programs</h3><span class="muted">${plural(mine.length, 'program')}</span></div>
      ${mine.length ? `<div class="status-list">${mine.map(pr => { const st = progStats(pr.id), lib = progLib(pr);
        return `<a class="srow" href="#/rewards/${pr.id}"><span class="sicon c-battery">${I.gift}</span><span class="sbody"><b>${esc(progName(pr))}</b><small>${esc([pr.memberId ? 'ID ' + pr.memberId : '', lib ? lib.brands : pr.brands].filter(Boolean).join(' · ') || 'Custom program')}</small></span><span class="e-side"><b>${money(st.saved)}</b><small>${plural(st.fills, 'fill')}</small></span></a>`; }).join('')}</div>`
        : `<div class="empty" style="padding:14px 6px">Add the programs you belong to. When you log a fill-up, pick the ones you used and your savings roll into your fuel stats.</div>`}
    </section>
    <section class="card"><div class="card-head"><h3>Program library</h3><span class="muted">${LIB.length} programs</span></div>
      <label class="search">${I.search}<input type="search" id="libSearch" placeholder="Search programs, brands, benefits…" autocomplete="off" aria-label="Search rewards programs"></label>
      <div class="list" id="libList">${LIB.map(l => { const added = db.programs.some(pr => pr.libId === l.id);
        return `<a class="entry" href="#/rewards/lib-${l.id}" data-search="${esc(libSearchText(l))}"><div class="e-main"><b>${esc(l.name)}</b><div class="e-sub">${esc(l.summary)}</div><div class="tags"><span class="tag">${esc(l.type)}</span>${l.cpg ? `<span class="tag good">${l.cpg}¢/gal base</span>` : ''}${l.ppg ? `<span class="tag accent">${l.ppg} pts/gal</span>` : ''}${added ? '<span class="tag accent">✓ Added</span>' : ''}</div></div></a>`; }).join('')}
        <div class="empty" id="libEmpty" hidden>No programs match. <a href="#" data-act="customProgram">Add a custom program</a></div></div>
      <div class="insights-note">Benefits summarized from official program pages, last checked ${esc(LIB_CHECKED)}. Programs change often, so confirm on the program’s site.</div>
    </section>`;
}
function viewProgram(key) {
  const lib0 = key.startsWith('lib-') ? libById(key.slice(4)) : null;
  const pr = lib0 ? null : progById(key);
  const lib = lib0 || progLib(pr);
  if (!lib && !pr) return `<a href="#/rewards" class="back">${I.back} Rewards</a><div class="card empty">Program not found.</div>`;
  const member = pr || db.programs.find(x => x.libId === lib?.id) || null;
  const st = member ? progStats(member.id) : null;
  const url = lib?.url || member?.url;
  return `<a href="#/rewards" class="back">${I.back} Rewards</a>
    <section class="card hero"><div class="hero-top"><div><div class="eyebrow">${esc(lib?.type || member?.type || 'Custom program')}</div><h2>${esc(lib?.name || progName(member))}</h2></div>${member ? '<span class="current-badge">Member</span>' : ''}</div>
      <p style="margin:0 0 12px">${esc(lib?.summary || member?.benefitsText || 'Custom program')}</p>
      ${(lib?.brands || member?.brands) ? `<div class="muted" style="font-size:.88rem">Where: ${esc(lib?.brands || member.brands)}</div>` : ''}
      <div class="row-actions">${member ? `<button class="btn" data-act="editProgram" data-id="${member.id}">${I.edit} Edit membership</button>` : `<button class="btn primary" data-act="addLib" data-id="${lib.id}">${I.plus} Add program</button>`}${url ? `<a class="btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${I.link} Program page</a>` : ''}</div></section>
    ${member ? `<section class="card"><h3>Your membership</h3><div class="stats">${stat('Saved', money(st.saved))}${stat('Fill-ups', fmt(st.fills))}${stat('Points', st.points ? fmt(st.points) : '—')}</div>
      <div class="spec" style="margin-top:12px"><div><span>Member ID</span>${esc(member.memberId || '—')}</div><div><span>Usual discount</span>${num(member.cpg) != null ? `${fmt(num(member.cpg), 1)}¢/gal` : '—'}</div>${member.notes ? `<div class="wide"><span>Notes</span>${esc(member.notes)}</div>` : ''}</div></section>` : ''}
    ${lib ? `<section class="card"><h3>Benefits</h3><ul class="insights">${lib.benefits.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
      ${lib.stacking ? `<p style="margin:12px 0 0"><b>Stacking:</b> ${esc(lib.stacking)}</p>` : ''}
      <div class="insights-note">Last checked ${esc(LIB_CHECKED)} from the official program page${url ? ` (${esc(url.replace(/^https?:\/\//, '').replace(/\/$/, ''))})` : ''}. Offers, limits, and participating locations change, so verify before relying on them.</div></section>` : ''}`;
}


/* ======================= v2: VIN lookup, specs, EPA, reminders ======================= */
const VIN_VAL = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9 };
const VIN_W = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
function vinCheck(vin) {
  vin = String(vin || '').trim().toUpperCase();
  if (vin.length !== 17) return { valid: false, msg: `A VIN has 17 characters. This one has ${vin.length}.` };
  if (/[IOQ]/.test(vin)) return { valid: false, msg: 'VINs never contain the letters I, O, or Q. Check for 1 and 0 instead.' };
  if (!/^[A-Z0-9]{17}$/.test(vin)) return { valid: false, msg: 'A VIN can only contain letters and numbers.' };
  const sumv = [...vin].reduce((t, c, i) => t + (/\d/.test(c) ? Number(c) : VIN_VAL[c]) * VIN_W[i], 0);
  const r = sumv % 11, cd = r === 10 ? 'X' : String(r);
  if (vin[8] !== cd) return { valid: true, checkOk: false, msg: `Heads up: the check digit (9th character) should be ${cd}. That usually means a typo, though some non-North-American VINs don’t use a check digit.` };
  return { valid: true, checkOk: true, msg: '' };
}
async function fetchJSON(url, ms = 15000) {
  if (navigator.onLine === false) throw new Error('offline');
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal: c.signal, headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const txt = await r.text(); return txt && txt.trim() !== 'null' ? JSON.parse(txt) : null;
  } catch (e) { if (e.name === 'AbortError') throw new Error('timeout'); if (e instanceof TypeError) throw new Error(navigator.onLine === false ? 'offline' : 'network'); throw e; }
  finally { clearTimeout(t); }
}
const netMsg = e => e.message === 'offline' ? 'You’re offline. Connect to the internet to look this up, or type the details in yourself.'
  : e.message === 'timeout' ? 'The lookup timed out. Try again in a moment, or type the details in yourself.'
  : e.message === 'network' ? 'Couldn’t reach the lookup service. Check your connection, or type the details in yourself.'
  : `Lookup didn’t work (${e.message}). You can still type the details in yourself.`;
const UPPER_MAKES = ['BMW', 'GMC', 'MINI', 'FIAT', 'RAM', 'KIA', 'BYD', 'VPG', 'AM'];
const titleCase = s => !s ? '' : String(s).toLowerCase().replace(/(^|[\s-])([a-z])/g, (m, a, b) => a + b.toUpperCase()).split(' ').map(w => UPPER_MAKES.includes(w.toUpperCase()) && w.length <= 4 ? w.toUpperCase() : w).join(' ');
async function decodeVin(vin) {
  const j = await fetchJSON(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(vin)}?format=json`);
  const d = j?.Results?.[0];
  if (!d || !d.Make) throw new Error(d?.ErrorText ? d.ErrorText.split(';')[0] : 'no match');
  const g = k => (d[k] && String(d[k]).trim() && d[k] !== 'Not Applicable') ? String(d[k]).trim() : '';
  const displ = num(g('DisplacementL'));
  const engine = [displ ? `${displ.toFixed(1)} L` : '', g('EngineCylinders') ? `${g('EngineCylinders')} cyl` : '', g('EngineConfiguration'), /yes/i.test(g('Turbo')) ? 'Turbo' : '', g('EngineModel')].filter(Boolean).join(' · ');
  const trans = [g('TransmissionStyle'), g('TransmissionSpeeds') ? `${g('TransmissionSpeeds')}-speed` : ''].filter(Boolean).join(', ');
  const fuel = [g('FuelTypePrimary'), g('FuelTypeSecondary') ? `/ ${g('FuelTypeSecondary')}` : '', g('ElectrificationLevel')].filter(Boolean).join(' ');
  const fields = { year: g('ModelYear'), make: titleCase(g('Make')), model: g('Model'), trim: [g('Trim'), g('Series')].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).join(' '), engine, fuelType: fuel, drive: g('DriveType'), body: g('BodyClass'), transmission: trans };
  const raw = { checked: todayISO(), displ, cylinders: num(g('EngineCylinders')), engineModel: g('EngineModel'), turbo: /yes/i.test(g('Turbo')), fuelPrimary: g('FuelTypePrimary'), plant: [g('PlantCity'), g('PlantCountry')].filter(Boolean).join(', '), gvwr: g('GVWR'), doors: g('Doors'), errorCode: g('ErrorCode') };
  const code = String(d.ErrorCode || '0');
  const note = code !== '0' && d.ErrorText ? d.ErrorText.replace(/^\d+ - /, '').split(';')[0] : '';
  return { fields, raw, note };
}

/* ---- fueleconomy.gov (EPA) ---- */
const FE = 'https://www.fueleconomy.gov/ws/rest/vehicle';
const menu = j => { const m = j?.menuItem; return !m ? [] : Array.isArray(m) ? m : [m]; };
const normS = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
function bestModel(models, model) {
  const t = normS(model); let best = null, bs = -1;
  models.forEach(m => { const c = normS(m.value); let sc = c === t ? 1000 : c.startsWith(t) ? 500 - (c.length - t.length) : t.startsWith(c) ? 300 - (t.length - c.length) : c.includes(t) ? 100 : 0; if (/hybrid|plug|fcv|electric|awd|4wd/.test(c) && !/hybrid|plug|fcv|electric|awd|4wd/.test(t)) sc -= 40; if (sc > bs) { bs = sc; best = m; } });
  return bs > 0 ? best : null;
}
function bestOption(opts, v) {
  const r = v.vpic || {}, tr = String(v.transmission || '').toLowerCase();
  let best = opts[0] || null, bs = -1;
  opts.forEach(o => { const t = o.text.toLowerCase(); let sc = 0;
    if (r.displ && t.includes(`${r.displ.toFixed(1)} l`)) sc += 5;
    if (r.cylinders && t.includes(`${r.cylinders} cyl`)) sc += 3;
    if (r.turbo === !!/turbo/.test(t)) sc += 1;
    if (/cvt|continuously/.test(tr) && /variable|av/.test(t)) sc += 2;
    if (/manual/.test(tr) === /man /.test(t)) sc += 1;
    if (sc > bs) { bs = sc; best = o; } });
  return best;
}
const gradeFromEpa = f => /premium/i.test(f || '') ? 'Premium recommended' : /midgrade/i.test(f || '') ? 'Midgrade (89)' : /regular/i.test(f || '') ? 'Regular (87)' : /diesel/i.test(f || '') ? 'Diesel' : /e85/i.test(f || '') ? 'E85 capable' : '';
function epaLookup(v) {
  const d = $('#sheet'), form = $('#sheetForm');
  form.innerHTML = `<div class="sheet-head"><h3>EPA fuel economy</h3><button type="button" class="icon-btn" data-close aria-label="Close">${I.close}</button></div>
    <div class="sheet-body"><div class="hint">Matches your vehicle in fueleconomy.gov (U.S. EPA / DOE). Pick the version that matches your engine and transmission.</div>
    <label class="field half"><span class="lbl">Year</span><input type="number" inputmode="numeric" name="year" value="${esc(v.year)}"></label>
    <label class="field half"><span class="lbl">Make</span><select name="make" disabled><option>Loading…</option></select></label>
    <label class="field"><span class="lbl">Model</span><select name="model" disabled><option>—</option></select></label>
    <label class="field"><span class="lbl">Engine / transmission</span><select name="opt" disabled><option>—</option></select></label>
    <div class="field hint" id="epaMsg" role="status" aria-live="polite"></div></div>
    <div class="sheet-foot"><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn primary" id="epaSave" disabled>${I.check} Use this rating</button></div>`;
  const msg = t => { $('#epaMsg', form).textContent = t; };
  const fill = (sel, items, pick) => { sel.innerHTML = items.map(i => `<option value="${esc(i.value)}">${esc(i.text)}</option>`).join(''); sel.disabled = !items.length; if (pick) sel.value = pick.value; };
  const E = form.elements;
  const loadOpts = async () => { $('#epaSave').disabled = true; fill(E.opt, []); if (!E.model.value) return; msg('Loading versions…');
    try { const o = menu(await fetchJSON(`${FE}/menu/options?year=${E.year.value}&make=${encodeURIComponent(E.make.value)}&model=${encodeURIComponent(E.model.value)}`)); fill(E.opt, o, bestOption(o, v)); $('#epaSave').disabled = !o.length; msg(o.length ? 'Check the highlighted version, then tap “Use this rating”.' : 'No versions listed for this model.'); } catch (e) { msg(netMsg(e)); } };
  const loadModels = async () => { fill(E.model, []); fill(E.opt, []); if (!E.make.value) return; msg('Loading models…');
    try { const m = menu(await fetchJSON(`${FE}/menu/model?year=${E.year.value}&make=${encodeURIComponent(E.make.value)}`)); fill(E.model, m, bestModel(m, v.model)); await loadOpts(); } catch (e) { msg(netMsg(e)); } };
  const loadMakes = async () => { msg('Loading makes…'); fill(E.make, []); fill(E.model, []); fill(E.opt, []);
    try { const m = menu(await fetchJSON(`${FE}/menu/make?year=${E.year.value}`)); if (!m.length) { msg('No EPA data for that year.'); return; } fill(E.make, m, m.find(x => normS(x.value) === normS(v.make))); await loadModels(); } catch (e) { msg(netMsg(e)); } };
  form.onchange = e => { if (e.target.name === 'year') loadMakes(); if (e.target.name === 'make') loadModels(); if (e.target.name === 'model') loadOpts(); };
  form.oninput = null;
  form.onclick = e => { if (e.target.closest('[data-close]')) { e.preventDefault(); d.close(); } };
  form.onsubmit = async e => { e.preventDefault(); const id = E.opt.value; if (!id) return; $('#epaSave').disabled = true; msg('Saving…');
    try { const x = await fetchJSON(`${FE}/${encodeURIComponent(id)}`);
      v.epa = { id, checked: todayISO(), year: x.year, make: x.make, model: x.model, option: E.opt.selectedOptions[0]?.text || '', city: num(x.city08), hwy: num(x.highway08), comb: num(x.comb08), fuelType: x.fuelType || '', fuelType1: x.fuelType1 || '', drive: x.drive || '', trany: x.trany || '', vclass: x.VClass || '' };
      if (!v.specs.fuelGrade && gradeFromEpa(v.epa.fuelType1 || v.epa.fuelType)) { v.specs.fuelGrade = gradeFromEpa(v.epa.fuelType1 || v.epa.fuelType); v.specs.fuelGradeSrc = 'EPA'; }
      save(); d.close(); render(); toast('EPA rating saved');
    } catch (err) { msg(netMsg(err)); $('#epaSave').disabled = false; } };
  d.onclick = e => { if (e.target === d) d.close(); };
  d.showModal(); loadMakes();
}

/* ---- owner's-manual specs (user entered; nothing guessed) ---- */
const SPEC_GROUPS = [
  { id: 'fuel', title: 'Fuel', q: 'recommended fuel octane', where: 'Owner’s manual “Fuel” section, or the label inside the fuel door. EPA data says Regular or Premium but not whether premium is required.',
    fields: [{ k: 'fuelGrade', l: 'Recommended fuel', t: 'select', opts: ['', 'Regular (87)', 'Midgrade (89)', 'Premium recommended', 'Premium required', 'E85 capable', 'Diesel'], half: 1 }, { k: 'minOctane', l: 'Minimum octane', t: 'num', step: 1, half: 1 }] },
  { id: 'oil', title: 'Engine oil', q: 'oil capacity with filter and oil viscosity', where: 'Owner’s manual “Specifications / Capacities” and the maintenance schedule. Viscosity is often printed on the oil filler cap.',
    fields: [{ k: 'oilViscosity', l: 'Viscosity', t: 'text', half: 1, ph: 'e.g. 0W-20' }, { k: 'oilCapacity', l: 'Capacity with filter', t: 'num', unit: 'qts', step: 0.1, half: 1 }, { k: 'oilType', l: 'Oil type', t: 'select', opts: ['', 'Synthetic', 'Blend', 'Conventional', 'High mileage'], half: 1 }, { k: 'oilFilter', l: 'Filter part #', t: 'text', half: 1 }, { k: 'oilIntMiles', l: 'Change every', t: 'num', unit: 'mi', step: 1, half: 1 }, { k: 'oilIntMonths', l: 'or every', t: 'num', unit: 'months', step: 1, half: 1 }] },
  { id: 'tires', title: 'Tires', q: 'tire size and recommended tire pressure', where: 'The tire placard on the driver’s door jamb has the recommended cold PSI and original size. Don’t use the “max PSI” on the tire sidewall.',
    fields: [{ k: 'tireSize', l: 'Size (front)', t: 'text', half: 1, ph: '225/50R17' }, { k: 'tireLoadSpeed', l: 'Load / speed rating', t: 'text', half: 1, ph: '98V' }, { k: 'tireSizeRear', l: 'Size (rear, if different)', t: 'text', half: 1 }, { k: 'psiFront', l: 'Front pressure', t: 'num', unit: 'PSI', step: 1, half: 1 }, { k: 'psiRear', l: 'Rear pressure', t: 'num', unit: 'PSI', step: 1, half: 1 }, { k: 'rotateMiles', l: 'Rotate every', t: 'num', unit: 'mi', step: 1, half: 1 }] },
  { id: 'plugs', title: 'Spark plugs', q: 'spark plug part number and gap', where: 'Owner’s manual specifications or maintenance schedule. A parts-store lookup by vehicle also works.',
    fields: [{ k: 'plugCount', l: 'Number of plugs', t: 'num', step: 1, half: 1 }, { k: 'plugPart', l: 'Plug part #', t: 'text', half: 1 }, { k: 'plugType', l: 'Plug type', t: 'select', opts: ['', 'Copper', 'Platinum', 'Double platinum', 'Iridium'], half: 1 }, { k: 'plugGap', l: 'Gap', t: 'num', unit: 'in', step: 0.001, half: 1 }, { k: 'plugIntMiles', l: 'Replace every', t: 'num', unit: 'mi', step: 1, half: 1 }] },
  { id: 'coolant', title: 'Coolant', q: 'coolant type and change interval', where: 'Owner’s manual “Capacities / Fluids”. The required type is often printed on the coolant reservoir or radiator cap.',
    fields: [{ k: 'coolantType', l: 'Type', t: 'select', opts: ['', 'OAT', 'HOAT', 'P-HOAT', 'Si-OAT', 'IAT', 'Universal', 'Other'], half: 1 }, { k: 'coolantSpec', l: 'Spec / brand', t: 'text', half: 1, ph: 'e.g. Honda Type 2' }, { k: 'coolantIntMiles', l: 'Flush every', t: 'num', unit: 'mi', step: 1, half: 1 }, { k: 'coolantIntMonths', l: 'or every', t: 'num', unit: 'months', step: 1, half: 1 }] },
  { id: 'filters', title: 'Air & cabin filters', q: 'engine air filter and cabin air filter part number', where: 'Owner’s manual “Maintenance Replacement Parts” table, or a parts-store lookup by vehicle.',
    fields: [{ k: 'airFilterPart', l: 'Engine air filter part #', t: 'text', half: 1 }, { k: 'airIntMiles', l: 'Replace every', t: 'num', unit: 'mi', step: 1, half: 1 }, { k: 'cabinFilterPart', l: 'Cabin filter part #', t: 'text', half: 1 }, { k: 'cabinIntMiles', l: 'Replace every', t: 'num', unit: 'mi', step: 1, half: 1 }] },
  { id: 'battery', title: 'Battery', q: 'battery group size and CCA', where: 'The label on top of your current battery, or the owner’s manual.',
    fields: [{ k: 'batteryGroup', l: 'Group size', t: 'text', half: 1, ph: 'e.g. 51R' }, { k: 'batteryCca', l: 'Minimum CCA', t: 'num', step: 1, half: 1 }] },
  { id: 'brakes', title: 'Brakes', q: 'brake fluid type and brake pad minimum thickness', where: 'Brake fluid type is on the master-cylinder reservoir cap. Pad and rotor minimums are in the service manual, and the rotor minimum is often stamped on the rotor.',
    fields: [{ k: 'brakeFluid', l: 'Brake fluid', t: 'select', opts: ['', 'DOT 3', 'DOT 4', 'DOT 5.1', 'DOT 5'], half: 1 }, { k: 'padMinMm', l: 'Pad minimum', t: 'num', unit: 'mm', step: 0.5, half: 1 }, { k: 'rotorMinFront', l: 'Front rotor minimum', t: 'num', unit: 'mm', step: 0.1, half: 1 }, { k: 'brakeIntMiles', l: 'Inspect every', t: 'num', unit: 'mi', step: 1, half: 1 }] },
];
const specFieldsAll = SPEC_GROUPS.flatMap(g => g.fields);
const searchUrl = (v, q) => `https://www.google.com/search?q=${encodeURIComponent(`${[v.year, v.make, v.model].filter(Boolean).join(' ')} owner's manual ${q}`)}`;
const psiTargets = v => { const f = num(v.specs?.psiFront), r = num(v.specs?.psiRear) || f; return { fl: f, fr: f, rl: r, rr: r }; };
function specDefaults(secId, v, values) {
  const sp = v.specs || {}, o = {};
  if (secId === 'oil') { if (sp.oilViscosity) o.viscosity = sp.oilViscosity; if (num(sp.oilCapacity)) o.qty = num(sp.oilCapacity); if (sp.oilType && !values.oilType) o.oilType = sp.oilType; if (sp.oilFilter && !values.filterPart) o.filterPart = sp.oilFilter; if (num(sp.oilIntMiles)) o.intMiles = num(sp.oilIntMiles); if (num(sp.oilIntMonths)) o.intMonths = num(sp.oilIntMonths); }
  if (secId === 'coolant') { if (sp.coolantType) o.ctype = sp.coolantType; if (sp.coolantSpec && !values.brand) o.brand = sp.coolantSpec; if (num(sp.coolantIntMiles)) o.intMiles = num(sp.coolantIntMiles); if (num(sp.coolantIntMonths)) o.intMonths = num(sp.coolantIntMonths); }
  if (secId === 'plugs') { if (sp.plugPart) o.part = sp.plugPart; if (sp.plugType) o.ptype = sp.plugType; if (num(sp.plugGap)) o.gap = num(sp.plugGap); if (num(sp.plugIntMiles)) o.intMiles = num(sp.plugIntMiles); if (num(v.vpic?.cylinders)) o.qty = num(v.vpic.cylinders); }
  if (secId === 'tires') { if (sp.tireSize && !values.size) o.size = sp.tireSize; if (num(sp.rotateMiles)) o.intMiles = num(sp.rotateMiles); }
  if (secId === 'battery') { if (sp.batteryGroup) o.group = sp.batteryGroup; if (num(sp.batteryCca)) o.cca = num(sp.batteryCca); }
  if (secId === 'airFilter') { if (sp.airFilterPart && !values.part) o.part = sp.airFilterPart; if (num(sp.airIntMiles)) o.intMiles = num(sp.airIntMiles); }
  if (secId === 'cabinFilter') { if (sp.cabinFilterPart && !values.part) o.part = sp.cabinFilterPart; if (num(sp.cabinIntMiles)) o.intMiles = num(sp.cabinIntMiles); }
  if (secId === 'plugs' && num(sp.plugCount)) o.qty = num(sp.plugCount);
  if (secId === 'brakes') { if (sp.brakeFluid) o.fluidType = sp.brakeFluid; if (num(sp.brakeIntMiles)) o.intMiles = num(sp.brakeIntMiles); }
  return o;
}
const normVisc = s => String(s || '').toUpperCase().replace(/\s|-/g, '');
function specWarnings(secId, vals, v) {
  const sp = v.specs || {}, w = [];
  if (secId === 'fuel') { const o = vals.octane === 'Other' ? num(vals.octaneOther) : num(vals.octane); if (num(sp.minOctane) && o != null && o < num(sp.minOctane)) w.push(`${o} octane is below the ${num(sp.minOctane)} in your specs${sp.fuelGrade ? ` (${sp.fuelGrade})` : ''}.`); }
  if (secId === 'oil') { if (sp.oilViscosity && vals.viscosity && normVisc(vals.viscosity) !== normVisc(sp.oilViscosity)) w.push(`${vals.viscosity} differs from the ${sp.oilViscosity} in your specs.`); if (num(sp.oilCapacity) && vals.qty != null && Math.abs(vals.qty - num(sp.oilCapacity)) > 0.5) w.push(`${vals.qty} qt differs from the ${num(sp.oilCapacity)} qt capacity in your specs.`); }
  if (secId === 'tires') { const t = psiTargets(v); if (vals.psi) TIRE_POS.forEach(([k, l]) => { const p = num(vals.psi[k]); if (p != null && t[k]) { if (p < t[k] - 1) w.push(`${l} ${p} PSI is below the ${t[k]} PSI spec.`); else if (p > t[k] + 4) w.push(`${l} ${p} PSI is well above the ${t[k]} PSI spec.`); } });
    if (sp.tireSize && vals.size && has(vals.services, 'New tires') && normS(vals.size) !== normS(sp.tireSize) && normS(vals.size) !== normS(sp.tireSizeRear)) w.push(`Size ${vals.size} differs from the ${sp.tireSize} in your specs.`);
    if (vals.tread) { const mn = Math.min(...TIRE_POS.map(([k]) => num(vals.tread[k])).filter(x => x != null)); if (isFinite(mn) && mn <= 2) w.push(`Tread at ${mn}/32 is at the legal minimum in most states. Replace these tires.`); } }
  if (secId === 'plugs') { if (num(sp.plugGap) && vals.gap != null && Math.abs(vals.gap - num(sp.plugGap)) > 0.0025) w.push(`Gap ${vals.gap}" differs from the ${num(sp.plugGap)}" spec.`); if (sp.plugType && vals.ptype && vals.ptype !== sp.plugType) w.push(`${vals.ptype} plugs differ from the ${sp.plugType} type in your specs.`); }
  if (secId === 'coolant') { if (sp.coolantType && vals.ctype && vals.ctype !== sp.coolantType && vals.ctype !== 'Universal') w.push(`${vals.ctype} differs from the ${sp.coolantType} coolant in your specs. Mixing coolant types can cause problems.`); }
  if (secId === 'battery') { if (sp.batteryGroup && vals.group && normS(vals.group) !== normS(sp.batteryGroup)) w.push(`Group ${vals.group} differs from the ${sp.batteryGroup} in your specs.`); if (num(sp.batteryCca) && vals.cca != null && vals.cca < num(sp.batteryCca)) w.push(`${vals.cca} CCA is below the ${num(sp.batteryCca)} CCA spec.`); if (vals.resting != null && vals.resting < 12.4) w.push(`${vals.resting} V resting is low (a healthy battery reads about 12.6 V).`); }
  if ((secId === 'airFilter' || secId === 'cabinFilter') && vals.part) { const want = sp[secId === 'airFilter' ? 'airFilterPart' : 'cabinFilterPart']; if (want && normS(vals.part) !== normS(want) && !itemsFor(secId).some(it => normS(it.part) === normS(vals.part) && fitsV(it, v))) w.push(`Part ${vals.part} isn’t the ${want} in your specs. Check that it fits.`); }
  if (secId === 'brakes') { if (num(sp.padMinMm) && vals.thickness != null && vals.thickness <= num(sp.padMinMm)) w.push(`${vals.thickness} mm is at or below the ${num(sp.padMinMm)} mm pad minimum.`); if (sp.brakeFluid && vals.fluidType && vals.fluidType !== sp.brakeFluid) w.push(`${vals.fluidType} differs from the ${sp.brakeFluid} in your specs.`); }
  return w;
}
function specForm(v, gid) {
  if (!v.specs) v.specs = {};
  const g = SPEC_GROUPS.find(x => x.id === gid);
  openForm({ title: `${g.title} specs`, fields: [{ k: 'h0', t: 'hint', l: `Where to find this: ${g.where}` }, ...g.fields], values: { ...v.specs }, saveLabel: 'Save specs',
    onSave: vals => { delete vals.h0; Object.assign(v.specs, vals); if (gid === 'fuel') v.specs.fuelGradeSrc = 'you'; toast(`${g.title} specs saved`); } });
}
const specVal = (f, val) => val == null || val === '' ? '<span class="muted">Not set</span>' : esc(`${val}${f.unit ? ' ' + f.unit : ''}`);
function viewSpecs(v) {
  if (!v.specs) v.specs = {};
  const vp = v.vpic, e = v.epa, s = fuelStats(v);
  const row = (l, val) => `<div><span>${esc(l)}</span>${val ? esc(val) : '<span class="muted">—</span>'}</div>`;
  return `<a href="#/dash" class="back">${I.back} Dashboard</a>
    <div class="page-title"><h2>Specs</h2><span class="muted">${esc(vname(v))}</span></div>
    <section class="card"><div class="card-head"><h3>${I.oil} Capacities &amp; fitment</h3>${vehProfile(v) ? '<span class="tag">Owner’s manual on file</span>' : ''}</div>
      <div class="fit-cards">${['oil', 'plugs', 'battery', 'tires', 'airFilter', 'cabinFilter'].map(c => `<div><div class="fc-t">${CAT[c].icon} ${esc(CAT[c].label)}</div>${fitStatic(c, v, { short: 1 })}</div>`).join('')}</div>
      ${vehProfile(v) && vehProfile(v).specs ? `<details class="where"><summary>Source</summary><p>${esc(vehProfile(v).specs.note || '')}</p>${vehProfile(v).specs.src ? `<a href="${esc(vehProfile(v).specs.src)}" target="_blank" rel="noopener noreferrer">${I.link} Owner’s manual PDF</a>` : ''}</details>` : ''}</section>
    <section class="card"><div class="card-head"><h3>${I.car} Vehicle details</h3><span class="tag">${vp ? 'NHTSA vPIC' : 'Manual'}</span></div>
      <div class="spec">${row('VIN', v.vin)}${row('Year / make / model', [v.year, v.make, v.model].filter(Boolean).join(' '))}${row('Trim', v.trim)}${row('Engine', v.engine)}${row('Fuel type', v.fuelType)}${row('Drive', v.drive)}${row('Body', v.body)}${row('Transmission', v.transmission)}</div>
      <div class="row-actions"><button class="btn" data-act="vinLookup" data-id="${v.id}">${I.search} ${v.vin ? 'Re-run VIN lookup' : 'Look up by VIN'}</button>${v.vin && vinCheck(v.vin).valid ? `<a class="btn" href="https://www.nhtsa.gov/recalls?vin=${encodeURIComponent(v.vin)}" target="_blank" rel="noopener noreferrer">${I.link} Recalls</a>` : ''}</div>
      ${vp?.checked ? `<div class="insights-note">Decoded from NHTSA vPIC on ${fdate(vp.checked)}. NHTSA only fills fields the manufacturer reported.</div>` : ''}</section>
    <section class="card"><div class="card-head"><h3>${I.gauge} EPA fuel economy</h3><span class="tag">fueleconomy.gov</span></div>
      ${e ? `<div class="stats">${stat('City', fmt(e.city), 'mpg')}${stat('Highway', fmt(e.hwy), 'mpg')}${stat('Combined', fmt(e.comb), 'mpg')}</div>
        <div class="spec" style="margin-top:12px">${row('EPA fuel', e.fuelType1 || e.fuelType)}${row('Your average', s.avgMpg ? `${fmt(s.avgMpg, 1)} mpg (${s.avgMpg >= e.comb ? '+' : ''}${fmt((s.avgMpg - e.comb) / e.comb * 100, 0)}% vs combined)` : 'Log 2 full fills')}<div class="wide"><span>Matched version</span>${esc(`${e.year} ${e.make} ${e.model} · ${e.option}`)}</div></div>
        <div class="row-actions"><button class="btn" data-act="epa" data-id="${v.id}">Change match</button><a class="btn" href="https://www.fueleconomy.gov/feg/noframes/${encodeURIComponent(e.id)}.shtml" target="_blank" rel="noopener noreferrer">${I.link} EPA page</a></div>`
      : `<p class="muted" style="margin:0 0 12px">Get the official city, highway, and combined MPG and the recommended fuel, then compare them with your real-world MPG.</p><button class="btn primary block" data-act="epa" data-id="${v.id}">${I.search} Find EPA rating</button>`}</section>
    <section class="card"><div class="card-head"><h3>${I.wrench} Owner’s manual specs</h3><a class="link" style="margin:0" href="${searchUrl(v, 'pdf')}" target="_blank" rel="noopener noreferrer">Find manual</a></div>
      <p class="muted" style="margin:0 0 6px;font-size:.88rem">No free database reliably provides these, so AutoLog doesn’t guess. Enter them from your owner’s manual or door jamb, and they’ll pre-fill your service forms and flag mismatches.</p>
      ${SPEC_GROUPS.map(g => `<div class="specgrp"><div class="card-head" style="margin:0 0 8px"><b>${esc(g.title)}${g.id === 'fuel' && v.specs.fuelGradeSrc === 'EPA' ? ' <span class="tag">from EPA</span>' : ''}</b><button class="btn small" data-act="specEdit" data-id="${g.id}">${I.edit} Edit</button></div>
        <div class="spec">${g.fields.map(f => `<div><span>${esc(f.l)}</span>${specVal(f, v.specs[f.k])}</div>`).join('')}</div>
        <details class="where"><summary>Where to find this</summary><p>${esc(g.where)}</p><a href="${searchUrl(v, g.q)}" target="_blank" rel="noopener noreferrer">${I.search} Search “${esc([v.year, v.make, v.model].filter(Boolean).join(' '))} ${esc(g.q)}”</a></details></div>`).join('')}
    </section>`;
}

/* ---- reminders ---- */
function reminderItems(v) {
  const out = [], s = fuelStats(v), mpd = s.milesPerDay, odo = curOdo(v), today = todayISO();
  const push = (secId, title, a) => {
    if (!a) return; const st = intervalStatus(a, v); if (st.dueOdo == null && !st.dueDate) return;
    const est = st.dueOdo != null && mpd ? addDays(today, Math.max(0, (st.dueOdo - odo) / mpd)) : null;
    const eff = [est, st.dueDate].filter(Boolean).sort()[0] || null;
    let level = st.level; if (level === 'ok' && eff && daysBetween(today, eff) <= 14) level = 'soon';
    out.push({ key: `${v.id}:${secId}:${title}`, vid: v.id, vname: vname(v), sec: secId, title, level, dueOdo: st.dueOdo, milesLeft: st.dueOdo != null ? st.dueOdo - odo : null, dueDate: st.dueDate, estDate: est, effDate: eff });
  };
  const L = id => entries(v, id);
  push('oil', 'Oil change', L('oil')[0]);
  push('coolant', 'Coolant flush', SEC.coolant.anchor(L('coolant')));
  ['Front', 'Rear'].forEach(ax => push('brakes', `${ax} brake inspection`, L('brakes').find(e => e.axle === ax || e.axle === 'Both')));
  push('tires', 'Tire rotation', SEC.tires.anchor(L('tires')));
  push('plugs', 'Spark plugs', L('plugs')[0]);
  push('airFilter', 'Engine air filter', SEC.airFilter.anchor(L('airFilter')));
  push('cabinFilter', 'Cabin air filter', SEC.cabinFilter.anchor(L('cabinFilter')));
  const b = batteryCur(v), exp = wExp(b);
  if (exp && exp >= today) { const dl = daysBetween(today, exp); out.push({ key: `${v.id}:battery:warranty`, vid: v.id, vname: vname(v), sec: 'battery', title: 'Battery warranty ends', level: dl <= 60 ? 'soon' : 'ok', dueDate: exp, effDate: exp, info: true }); }
  return out;
}
const lowStockItems = () => lowStock().map(x => ({ key: `inv:${x.id}:low`, vid: null, vname: 'Inventory', sec: 'inventory', title: `Low stock: ${x.brand} ${x.part}`, level: num(x.qty) <= 0 ? 'over' : 'soon', stock: true, qtyText: invQtyText(x), low: x.low, effDate: todayISO() }));
const allReminders = () => [...db.vehicles.flatMap(reminderItems), ...lowStockItems()].sort((a, b) => RANK[b.level] - RANK[a.level] || (a.effDate || '9').localeCompare(b.effDate || '9'));
const dueNow = () => allReminders().filter(i => i.level === 'over' || i.level === 'soon');
function reminderText(i) {
  if (i.info) return `Warranty ends ${fdate(i.dueDate)}`;
  if (i.stock) return `${i.qtyText} left (alert at ${fmt2(num(i.low))})`;
  const parts = [];
  if (i.dueOdo != null) parts.push(`at ${fmt(i.dueOdo)} mi${i.milesLeft != null ? ` (${i.milesLeft <= 0 ? fmt(-i.milesLeft) + ' mi overdue' : fmt(i.milesLeft) + ' mi left'}${i.estDate && i.milesLeft > 0 ? `, about ${fdate(i.estDate)}` : ''})` : ''}`);
  if (i.dueDate) parts.push(`by ${fdate(i.dueDate)}`);
  return 'Due ' + parts.join(' or ');
}
function viewReminders() {
  const items = allReminders(), groups = [['over', 'Overdue'], ['soon', 'Due soon'], ['ok', 'Upcoming']];
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  return `<div class="page-title"><h2>Reminders</h2>${items.length ? `<button class="btn small" data-act="icsAll">${I.download} Add all to calendar</button>` : ''}</div>
    <section class="card"><h3>🔔 Notifications</h3>
      ${perm === 'granted' ? `<p style="margin:0">On. AutoLog notifies you when you open the app and something is due${typeof ServiceWorkerRegistration !== 'undefined' && 'periodicSync' in ServiceWorkerRegistration.prototype ? ', and your browser may also check in the background now and then' : ''}.</p><div class="row-actions"><button class="btn small" data-act="testNotify">Send a test notification</button></div>`
        : perm === 'denied' ? '<p style="margin:0" class="muted">Notifications are blocked for this site. Turn them on in your browser or phone settings. Calendar alerts below work either way.</p>'
        : perm === 'unsupported' ? '<p style="margin:0" class="muted">This browser doesn’t support web notifications. On iPhone, add AutoLog to your Home Screen first (Share → Add to Home Screen) and open it from there. Calendar alerts work everywhere.</p>'
        : `<p style="margin:0 0 12px">Get a heads-up when service is due. AutoLog checks when you open it. For alerts that fire even if the app is closed, use <b>Add to calendar</b>.</p><button class="btn primary block" data-act="enableNotify">Turn on notifications</button>`}
    </section>
    ${items.length ? groups.map(([lv, label]) => { const g = items.filter(i => i.level === lv); return g.length ? `<section class="card"><div class="card-head"><h3>${esc(label)}</h3><span class="pill ${lv}">${g.length}</span></div><div class="list">${g.map(i => `
      <div class="entry rem"><span class="sicon c-${i.sec}">${(SEC[i.sec] || { icon: I.box }).icon}</span><div class="e-main"><b>${esc(i.title)}</b><div class="e-sub">${esc(i.vname)}</div><div class="e-sub">${esc(reminderText(i))}</div>
        <div class="btn-row" style="margin-top:8px"><button class="btn small" data-act="icsOne" data-key="${esc(i.key)}">${I.download} Add to calendar</button>${i.info ? '' : i.stock ? `<a class="btn small" href="#/inventory">${I.box} Inventory</a><button class="btn small" data-act="addPlan">${I.list} Plan to buy</button>` : `<button class="btn small" data-act="logRem" data-key="${esc(i.key)}">${I.plus} Log it</button>`}</div></div></div>`).join('')}</div></section>` : ''; }).join('')
      : `<div class="card empty">Nothing scheduled yet. Log oil changes, rotations, and other services with a “next due” interval, and reminders show up here.</div>`}
    <p class="muted" style="font-size:.8rem;text-align:center">Mileage-based due dates are estimated from your average ${'miles per day'} in the fuel log.</p>`;
}
/* .ics with alarms (RFC 5545) */
function icsFold(line) { const out = []; let cur = ''; for (const ch of line) { if (new TextEncoder().encode(cur + ch).length > 74) { out.push(cur); cur = ' ' + ch; } else cur += ch; } out.push(cur); return out.join('\r\n'); }
function icsFor(items) {
  const e = t => String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const dt = d => d.replace(/-/g, ''), today = todayISO();
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AutoLog//Reminders//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:AutoLog'];
  items.forEach(i => {
    const day = i.effDate && i.effDate > today ? i.effDate : today;
    L.push('BEGIN:VEVENT', `UID:${i.key.replace(/[^\w-]/g, '-')}@autolog.app`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${dt(day)}`, `DTEND;VALUE=DATE:${dt(addDays(day, 1))}`,
      `SUMMARY:${e(`${i.title}: ${i.vname}`)}`, `DESCRIPTION:${e(`${reminderText(i)}.\nFrom AutoLog.`)}`, 'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${e(i.title)}`, 'TRIGGER:-PT15H', 'END:VALARM',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${e(i.title)}`, 'TRIGGER:PT9H', 'END:VALARM', 'END:VEVENT');
  });
  L.push('END:VCALENDAR');
  return L.map(icsFold).join('\r\n') + '\r\n';
}
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
async function deliverIcs(name, text) {
  const file = typeof File === 'function' ? new File([text], name, { type: 'text/calendar' }) : null;
  if (isIOS()) {
    // iOS Safari opens text/calendar data URLs in its “Add to Calendar” sheet; in a Home Screen app, the share sheet is more reliable.
    if (navigator.standalone && file && navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: 'AutoLog reminder' }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(text); return;
  }
  download(name, text, 'text/calendar;charset=utf-8'); toast('Calendar file downloaded. Open it to add the event and alarm.');
}
/* badge, banner, notifications */
const NKEY = 'autolog:notified';
function updateBadge() {
  const n = dueNow().length, c = $('#bellCount');
  if (c) { c.hidden = !n; c.textContent = n > 9 ? '9+' : String(n); }
  try { if ('setAppBadge' in navigator) { n ? navigator.setAppBadge(n).catch(() => {}) : navigator.clearAppBadge().catch(() => {}); } } catch (e) { /* unsupported */ }
}
function syncSnapshot() {
  if (!('caches' in window) || !/^https?:$/.test(location.protocol)) return;
  const items = allReminders().filter(i => !i.info).map(i => ({ key: i.key, title: i.title, vname: i.vname, effDate: i.effDate, text: reminderText(i) }));
  caches.open('autolog-data').then(c => c.put('./__reminders.json', new Response(JSON.stringify({ at: Date.now(), items }), { headers: { 'Content-Type': 'application/json' } }))).catch(() => {});
}
function afterSave() { updateBadge(); syncSnapshot(); }
async function swRegistration() { try { return 'serviceWorker' in navigator && /^https?:$/.test(location.protocol) ? await navigator.serviceWorker.getRegistration() : null; } catch (e) { return null; } }
async function notify(title, opts) {
  const reg = await swRegistration();
  if (reg && reg.showNotification) return reg.showNotification(title, opts);
  if ('Notification' in window) return new Notification(title, opts);
}
async function checkNotify(force) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return 0;
  let sent = {}; try { sent = JSON.parse(localStorage.getItem(NKEY) || '{}'); } catch (e) { sent = {}; }
  const now = Date.now(), due = dueNow().filter(i => force || !sent[i.key] || now - sent[i.key] > 20 * 3600e3);
  for (const i of due.slice(0, 4)) {
    try { await notify(`${i.title} ${i.level === 'over' ? 'overdue' : i.info ? 'soon' : 'due soon'}`, { body: `${i.vname}: ${reminderText(i)}`, tag: i.key, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url: './#/reminders' } }); sent[i.key] = now; } catch (e) { console.warn('notify failed', e); }
  }
  try { localStorage.setItem(NKEY, JSON.stringify(sent)); } catch (e) { /* ignore */ }
  return due.length;
}
async function registerPeriodic() {
  try { const reg = await swRegistration(); if (!reg || !('periodicSync' in reg)) return false;
    const st = await navigator.permissions.query({ name: 'periodic-background-sync' }); if (st.state !== 'granted') return false;
    await reg.periodicSync.register('autolog-reminders', { minInterval: 12 * 3600e3 }); return true; } catch (e) { return false; }
}
async function enableNotifications() {
  if (!('Notification' in window)) { toast('Notifications aren’t supported here'); return; }
  const p = await Notification.requestPermission();
  if (p !== 'granted') { toast('Notifications not enabled'); render(); return; }
  await registerPeriodic(); render();
  const n = await checkNotify(true); toast(n ? 'Notifications on. You have items due now.' : 'Notifications on. Nothing is due right now.');
}
/* service worker + “update available” prompt */
let swUpdating = false;
function setupSW() {
  if (window.AUTOLOG_STANDALONE || !('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    const show = () => { const b = $('#updateBar'); b.hidden = false; b.onclick = () => { swUpdating = true; b.textContent = 'Updating…'; (reg.waiting || reg.installing)?.postMessage({ type: 'SKIP_WAITING' }); setTimeout(() => location.reload(), 4000); }; };
    if (reg.waiting && navigator.serviceWorker.controller) show();
    reg.addEventListener('updatefound', () => { const w = reg.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) show(); }); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    setInterval(() => reg.update().catch(() => {}), 3600e3);
    registerPeriodic();
  }).catch(err => console.warn('Service worker registration failed', err));
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (swUpdating) location.reload(); });
  navigator.serviceWorker.addEventListener('message', e => { if (e.data?.type === 'NAV' && e.data.hash) location.hash = e.data.hash; });
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { updateBadge(); checkNotify(); } });

/* ---------- parts catalog (sourced part numbers; prices only from real sources) ---------- */
const CAT = {
  oil: { label: 'Motor oil', sec: 'oil', unit: 'qt', icon: I.oil },
  oilFilter: { label: 'Oil filter', sec: 'oil', unit: 'each', icon: I.oil },
  plugs: { label: 'Spark plugs', sec: 'plugs', unit: 'each', icon: I.plugs },
  coils: { label: 'Ignition coils / wires', sec: 'plugs', unit: 'each', icon: I.coil },
  battery: { label: 'Battery', sec: 'battery', unit: 'each', icon: I.battery },
  tires: { label: 'Tires', sec: 'tires', unit: 'each', icon: I.tires },
  airFilter: { label: 'Engine air filter', sec: 'airFilter', unit: 'each', icon: I.air },
  cabinFilter: { label: 'Cabin air filter', sec: 'cabinFilter', unit: 'each', icon: I.cabin },
  coolant: { label: 'Coolant', sec: 'coolant', unit: 'gal', icon: I.coolant },
  brakes: { label: 'Brake pads / rotors', sec: 'brakes', unit: 'set', icon: I.brakes },
  other: { label: 'Other part', sec: null, unit: 'each', icon: I.box },
};
let CATALOG = { items: [], vehicles: {}, sources: {}, generatedAt: null };
let DBV = 0; // bumped on every save; memo caches key on it
const memo = fn => { let k = -1, val; return () => { if (k !== DBV) { val = fn(); k = DBV; } return val; }; };
async function loadCatalog() {
  const apply = j => { if (j && Array.isArray(j.items)) { CATALOG = j; DBV++; } };
  if (window.AUTOLOG_CATALOG) apply(window.AUTOLOG_CATALOG);
  try { const c = localStorage.getItem('autolog:catalog'); if (c) apply(JSON.parse(c)); } catch (e) { /* ignore */ }
  if (!/^https?:$/.test(location.protocol)) return;
  try { const r = await fetch('parts-catalog.json', { cache: 'no-cache' }); if (r.ok) { const j = await r.json(); apply(j); try { localStorage.setItem('autolog:catalog', JSON.stringify(j)); } catch (e) { /* quota */ } if (!$('#sheet').open) render(); } } catch (e) { /* offline: cached copy */ }
}
const engDisp = v => { if (num(v.vpic?.displ)) return num(v.vpic.displ); const m = `${v.engine || ''} ${v.trim || ''}`.match(/(\d+(?:\.\d)?)\s*(?:l|t|liter|litre)\b/i); return m ? Number(m[1]) : null; };
function vehKeys(v) {
  const mk = normS(v.make), md = normS(v.model), y = num(v.year), dp = engDisp(v);
  return Object.entries(CATALOG.vehicles || {}).filter(([, d]) => d.makes.includes(mk) && d.models.some(m => md.includes(m)) && (!y || (y >= d.years[0] && y <= d.years[1])) && (dp == null || Math.abs(dp - d.disp) < 0.06)).map(([k]) => k);
}
const vehProfile = v => { const k = vehKeys(v)[0]; return k ? { key: k, ...CATALOG.vehicles[k] } : null; };
const allItems = memo(() => {
  const m = new Map();
  (CATALOG.items || []).forEach(it => m.set(it.id, it));
  (db.parts || []).forEach(p => { if (!p.ref) m.set(p.id, { ...p, user: true, offers: [], best: null }); });
  return [...m.values()];
});
const itemById = id => allItems().find(x => x.id === id) || null;
const itemsFor = cat => allItems().filter(x => x.cat === cat);
// user's own specs win; owner's-manual profile fills only what they haven't set
const SWP = new Map();
const specsWithProfile = v => { const c = SWP.get(v); if (c && c.k === DBV) return c.val; const ps = vehProfile(v)?.specs || {}, val = { ...ps }; Object.entries(v.specs || {}).forEach(([k, x]) => { if (x != null && x !== '') val[k] = x; }); SWP.set(v, { k: DBV, val }); if (SWP.size > 50) SWP.clear(); return val; };
function specMatch(it, v) {
  const n = normS, sp = specsWithProfile(v);
  switch (it.cat) {
    case 'oil': return !!sp.oilViscosity && normVisc(it.viscosity) === normVisc(sp.oilViscosity);
    case 'oilFilter': return !!sp.oilFilter && n(it.part) === n(sp.oilFilter);
    case 'plugs': return !!sp.plugPart && n(it.part) === n(sp.plugPart);
    case 'battery': return !!sp.batteryGroup && n(it.group) === n(sp.batteryGroup);
    case 'tires': return !!sp.tireSize && (n(it.size) === n(sp.tireSize) || n(it.size) === n(sp.tireSizeRear));
    case 'airFilter': return !!sp.airFilterPart && n(it.part) === n(sp.airFilterPart);
    case 'cabinFilter': return !!sp.cabinFilterPart && n(it.part) === n(sp.cabinFilterPart);
  }
  return false;
}
const fitsV = (it, v) => specMatch(it, v) || (it.fits || []).some(k => vehKeys(v).includes(k)) || (it.user && it.fitsVid === v.id);
const hasFitData = (cat, v) => itemsFor(cat).some(it => fitsV(it, v));
/* every price the user has actually paid, newest first, keyed by catalog id and by brand+part */
const PICK_KEYS = ['oilPick', 'filterPick', 'plugPick', 'coilPick', 'batPick', 'tirePick', 'pick'];
const pk = (brand, part) => normS(brand) + '|' + normS(part);
const paidIndex = memo(() => {
  const m = new Map(), add = (k, r) => { if (!k || !(r.unit > 0)) return; const a = m.get(k) || []; a.push(r); m.set(k, a); };
  db.vehicles.forEach(v => SECTIONS.forEach(s => v.maint[s.id].forEach(e => PICK_KEYS.forEach(k => { const p = e[k]; if (p && p.unitPrice > 0 && !p.inv) { const r = { unit: p.unitPrice, date: e.date, retailer: p.retailer, url: p.url, where: 'entry' }; add(p.id, r); add(pk(p.brand, p.part), r); } }))));
  (db.inventory || []).forEach(x => { if (num(x.price) > 0) { const r = { unit: num(x.price), date: x.date, retailer: x.retailer, url: x.url, where: 'inventory' }; add(x.itemId, r); add(pk(x.brand, x.part), r); } });
  (db.plans || []).forEach(x => { if (num(x.paid) > 0 && num(x.qty) > 0) { const r = { unit: num(x.paid) / num(x.qty), date: x.paidDate, retailer: x.retailer, url: x.url, where: 'plan' }; add(x.itemId, r); add(pk(x.brand, x.part), r); } });
  m.forEach(a => a.sort((x, y) => String(y.date || '').localeCompare(String(x.date || ''))));
  return m;
});
const noteFor = it => (db.parts || []).find(p => p.ref === it.id) || (it.user ? it : null);
function priceInfo(it) {
  if (!it) return { unit: null, offers: [] };
  const offers = (it.offers || []).slice().sort((a, b) => a.unitPrice - b.unitPrice);
  if (it.best) return { unit: it.best.unitPrice, src: 'retail', date: (it.best.checked || '').slice(0, 10), retailer: it.best.retailer, url: it.best.url, stale: it.best.stale, offers };
  const n = noteFor(it);
  if (n && num(n.price) > 0) return { unit: num(n.price), src: 'noted', date: n.priceDate, retailer: n.retailer, url: n.url, offers };
  const paid = (paidIndex().get(it.id) || paidIndex().get(pk(it.brand, it.part)) || [])[0];
  if (paid) return { ...paid, src: 'paid', offers };
  return { unit: null, offers };
}
const priceSrcLabel = p => p.src === 'retail' ? `${p.retailer}${p.stale ? ' (stale)' : ''}` : p.src === 'noted' ? `you noted${p.retailer ? ' at ' + p.retailer : ''}` : p.src === 'paid' ? 'your last price paid' : '';
/* oil: buy enough for the capacity using the cheapest jug combination of the same oil */
function oilPlan(it, cap) {
  const size = num(it.size) || 5, unit = priceInfo(it).unit;
  if (!cap) return { text: '', cost: unit, units: 1 };
  const qt = itemsFor('oil').find(x => x !== it && x.brand === it.brand && normVisc(x.viscosity) === normVisc(it.viscosity) && num(x.size) === 1);
  const qtUnit = qt ? priceInfo(qt).unit : null;
  if (size >= cap) return { text: `1 × ${fmt(size, size % 1 ? 1 : 0)}-qt covers ${fmt(cap, 1)} qt`, cost: unit, units: 1 };
  const jugs = Math.floor(cap / size), rest = Math.ceil((cap - jugs * size) * 10) / 10, extraQts = Math.ceil(rest - 1e-9);
  if (size === 1) return { text: `${extraQts + jugs} × 1-qt for ${fmt(cap, 1)} qt`, cost: unit != null ? unit * Math.ceil(cap) : null, units: Math.ceil(cap) };
  if (!rest) return { text: `${jugs} × ${size}-qt covers ${fmt(cap, 1)} qt`, cost: unit != null ? unit * jugs : null, units: jugs };
  if (qtUnit != null && unit != null && qtUnit * extraQts < unit) return { text: `${jugs} × ${size}-qt + ${extraQts} × 1-qt for ${fmt(cap, 1)} qt`, cost: unit * jugs + qtUnit * extraQts, units: jugs, qts: extraQts };
  return { text: `${jugs + 1} × ${size}-qt for ${fmt(cap, 1)} qt (${fmt((jugs + 1) * size - cap, 1)} qt left over)`, cost: unit != null ? unit * (jugs + 1) : (unit != null ? unit * (jugs + 1) : null), units: jugs + 1, leftover: (jugs + 1) * size - cap, partial: qtUnit == null && unit != null };
}
/* ---------- fitment panels on forms ---------- */
const FIT = {
  oil: [{ k: 'oilCapacity', l: 'Oil capacity with filter', unit: 'qt', big: 1, t: 'num' }, { k: 'oilViscosity', l: 'Viscosity' }, { k: 'oilFilter', l: 'Filter part #' }],
  tires: [{ k: 'tireSize', l: 'Tire size', big: 1 }, { k: 'tireLoadSpeed', l: 'Load / speed' }, { k: 'psiFront', l: 'Front PSI', t: 'num' }, { k: 'psiRear', l: 'Rear PSI', t: 'num' }],
  plugs: [{ k: 'plugCount', l: 'Number of plugs', big: 1, t: 'num' }, { k: 'plugGap', l: 'Gap', unit: 'in', t: 'num' }, { k: 'plugPart', l: 'Plug part #' }, { k: 'plugType', l: 'Type' }],
  battery: [{ k: 'batteryGroup', l: 'Group size', big: 1 }, { k: 'batteryCca', l: 'Minimum CCA', t: 'num' }],
  airFilter: [{ k: 'airFilterPart', l: 'Air filter part #', big: 1 }],
  cabinFilter: [{ k: 'cabinFilterPart', l: 'Cabin filter part #', big: 1 }],
};
const specOf = (v, k) => { const x = v.specs?.[k]; if (k === 'plugCount' && (x == null || x === '')) return num(v.vpic?.cylinders); return x === '' ? null : x; };
function fitHTML(cat, v) {
  const defs = FIT[cat]; if (!defs) return '';
  const prof = vehProfile(v), ps = prof?.specs || {};
  const miss = defs.filter(d => specOf(v, d.k) == null && ps[d.k] != null);
  const cells = defs.map(d => { const val = specOf(v, d.k);
    return `<div class="fitcell${d.big ? ' big' : ''}"><span>${esc(d.l)}</span>${val != null ? `<b>${esc(fmt2(val))}${d.unit ? ` <small>${d.unit}</small>` : ''}</b>` : `<b class="muted">Not set</b>`}</div>`; }).join('');
  const big = defs[0], bigMissing = specOf(v, big.k) == null;
  return `<div class="fit-head">${CAT[cat]?.icon || ''}<b>${esc(vname(v))} fitment</b><button type="button" class="linkbtn" data-fitedit="${cat}">${bigMissing ? 'Set' : 'Edit'}</button></div><div class="fitgrid">${cells}</div>
    ${miss.length ? `<div class="fit-suggest">Owner’s manual: ${miss.map(d => `${esc(d.l.toLowerCase().replace(/\bcca\b/g, 'CCA').replace(/\bpsi\b/g, 'PSI'))} <b>${esc(fmt2(ps[d.k]))}${d.unit ? ' ' + d.unit : ''}</b>`).join(', ')}. <button type="button" class="btn small" data-fituse="${cat}">Use these</button>${ps.src ? ` <a href="${esc(ps.src)}" target="_blank" rel="noopener noreferrer">source</a>` : ''}${ps.note ? `<small>${esc(ps.note)}</small>` : ''}</div>`
      : bigMissing ? `<div class="fit-suggest warn">${esc(big.l)} isn’t set for this vehicle. Tap <b>Set</b> to add it from your owner’s manual so AutoLog can work out quantities and costs.</div>` : ''}
    <div class="fit-edit" hidden>${defs.map(d => `<label class="fe"><span>${esc(d.l)}</span><input ${d.t === 'num' ? 'type="number" inputmode="decimal" step="any"' : 'type="text"'} data-fk="${d.k}" value="${esc(specOf(v, d.k) ?? '')}"></label>`).join('')}<button type="button" class="btn small primary" data-fitsave="${cat}">Save to specs</button></div>`;
}
const FIT_GROUP = { oil: 'oil', tires: 'tires', plugs: 'plugs', battery: 'battery', airFilter: 'filters', cabinFilter: 'filters' };
function fitStatic(cat, v, opts = {}) {
  const defs = FIT[cat]; if (!defs) return '';
  const ps = vehProfile(v)?.specs || {}, big = defs[0], bv = specOf(v, big.k), miss = defs.some(d => specOf(v, d.k) == null && ps[d.k] != null);
  return `<div class="fit-static${bv == null ? ' missing' : ''}"><div class="fs-big"><span>${esc(big.l)}</span>${bv != null ? `<b>${esc(fmt2(bv))}${big.unit ? `<small> ${big.unit}</small>` : ''}</b>` : '<b class="muted">Not set</b>'}${cat === 'oil' && bv != null ? '<small>includes the filter. A filter change alone takes about 0.5 qt of it.</small>' : ''}</div>
    <div class="fs-rest">${defs.slice(1).map(d => `<div><span>${esc(d.l)}</span><b>${specOf(v, d.k) != null ? esc(fmt2(specOf(v, d.k))) + (d.unit ? ' ' + d.unit : '') : '—'}</b></div>`).join('')}</div>
    ${bv == null || miss ? `<div class="btn-row" style="margin-top:8px">${miss ? `<button class="btn small primary" data-act="specUseProfile">Use owner’s manual values</button>` : ''}<button class="btn small" data-act="specEdit" data-id="${FIT_GROUP[cat]}">${I.edit} ${bv == null ? 'Set it' : 'Edit'}</button></div>${miss && ps.note && !opts.short ? `<small class="muted">${esc(ps.note)}</small>` : ''}` : ''}</div>`;
}
const fmt2 = x => typeof x === 'number' ? (Number.isInteger(x) ? String(x) : String(+x.toFixed(3))) : String(x);
/* ---------- product pickers on forms ---------- */
const itemChips = it => [it.viscosity, it.synth, it.size && it.cat === 'oil' ? `${fmt2(num(it.size))} qt` : it.size, it.type, it.gap && `gap ${fmt2(it.gap)}"`, it.group && `group ${it.group}`, it.cca && `${it.cca} CCA`, it.agm && 'AGM', it.kind].filter(Boolean);
const shortName = it => it.name ? it.name.replace(new RegExp('^' + it.brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*', 'i'), '') : it.part;
function qtyFor(cat, form, v) {
  const E = form.elements, g = k => E[k] ? num(E[k].value) : null;
  if (cat === 'oil') return g('qty') || num(specsWithProfile(v).oilCapacity) || null;
  if (cat === 'plugs') return g('qty') || num(specOf(v, 'plugCount')) || num(specsWithProfile(v).plugCount) || 1;
  if (cat === 'tires') return g('count') || 4;
  if (cat === 'coils') { const w = ($('input[name="wires"]:checked', form) || {}).value; return w === 'Wires' ? 1 : (g('wireQty') || 1); }
  return 1;
}
function setField(form, k, val) {
  if (val == null || val === '') return;
  const el = form.elements[k]; if (!el) return;
  if (el instanceof RadioNodeList || (el.type === 'radio')) { const r = $$(`input[name="${k}"]`, form).find(x => x.value === String(val)); if (r) r.checked = true; return; }
  el.value = val;
}
const SYNTH = { Synthetic: 'Synthetic', Blend: 'Blend', Conventional: 'Conventional', 'High mileage': 'High mileage' };
function fillFromItem(form, it) {
  const S = (k, x) => setField(form, k, x);
  switch (it.cat) {
    case 'oil': S('brand', it.brand); S('viscosity', it.viscosity); S('oilType', SYNTH[it.synth]); break;
    case 'oilFilter': S('filterBrand', it.brand); S('filterPart', it.part); break;
    case 'plugs': S('brand', it.brand); S('part', it.part); S('ptype', it.type === 'Iridium' ? 'Iridium' : it.type); if (it.gap && !num(form.elements.gap?.value)) S('gap', it.gap); break;
    case 'coils': S('wireBrand', it.brand); S('wirePart', it.part); break;
    case 'battery': S('brand', it.brand); S('model', it.part); S('group', it.group); S('cca', it.cca); break;
    case 'tires': S('brand', it.brand); S('model', String(it.part).replace(it.size || '', '').trim()); S('size', it.size); break;
    default: S('brand', it.brand); S('part', it.part);
  }
  if (form.dataset.generic) { S('brand', it.brand); S('part', it.part); if (form.elements.name && !form.elements.name.value) S('name', it.name); if (it.cat === 'oil' && it.size && form.elements.size) S('size', it.size); }
}
function snapFor(it, form, v, inv) {
  const q = qtyFor(it.cat, form, v), p = priceInfo(it);
  const s = { id: it.id, cat: it.cat, brand: it.brand, part: it.part, name: it.name || '', spec: itemChips(it).join(' · ') };
  if (inv) {
    const use = it.cat === 'oil' ? Math.min(num(inv.qty) || 0, q || num(inv.qty) || 0) : Math.min(num(inv.qty) || 0, q || 1);
    return { ...s, qty: use, unit: inv.unit, unitPrice: num(inv.price), cost: num(inv.price) != null ? Math.round(num(inv.price) * use * 100) / 100 : null, priceSrc: 'inventory', inv: { id: inv.id, use } };
  }
  if (it.cat === 'oil') { const pl = oilPlan(it, q); return { ...s, qty: q, plan: pl.text, unitPrice: p.unit, cost: pl.cost != null ? Math.round(pl.cost * 100) / 100 : null, priceSrc: p.src || null, retailer: p.retailer || '', url: p.url || '', priceDate: p.date || '', leftover: pl.leftover || 0, size: num(it.size) }; }
  return { ...s, qty: q, unitPrice: p.unit, cost: p.unit != null ? Math.round(p.unit * q * 100) / 100 : null, priceSrc: p.src || null, retailer: p.retailer || '', url: p.url || '', priceDate: p.date || '' };
}
const pickVal = el => { try { const x = $('input[type=hidden]', el).value; return x ? JSON.parse(x) : null; } catch (e) { return null; } };
const setPick = (el, snap) => { $('input[type=hidden]', el).value = snap ? JSON.stringify(snap) : ''; };
const invFor = (cat, it, v) => (db.inventory || []).filter(x => x.cat === cat && num(x.qty) > 0 && (!v || !v.id || !(x.fits || []).length || x.fits.includes(v.id) || (it && (x.itemId === it.id || pk(x.brand, x.part) === pk(it.brand, it.part))))).sort((a, b) => (it ? (b.itemId === it.id || pk(b.brand, b.part) === pk(it.brand, it.part)) - (a.itemId === it.id || pk(a.brand, a.part) === pk(it.brand, it.part)) : 0));
const invQtyText = x => x.cat === 'oil' || x.unit === 'qt' ? `${fmt2(num(x.qty))} qt` : `${fmt2(num(x.qty))} ${x.unit && x.unit !== 'each' ? x.unit : ''}`.trim();
function pickRender(el, ctx) {
  const { v } = ctx, cat = el.dataset.cat, form = el.closest('form');
  const items = itemsFor(cat), fit = items.filter(it => fitsV(it, v)), showAll = el.dataset.all === '1' || !fit.length;
  const list = (showAll ? items : fit).slice().sort((a, b) => fitsV(b, v) - fitsV(a, v) || a.brand.localeCompare(b.brand) || String(a.part).localeCompare(String(b.part)));
  const snap = pickVal(el), sel = snap && snap.id ? (itemById(snap.id) || null) : null;
  const brand = el.dataset.brand ?? (sel ? sel.brand : snap && snap.custom ? '__custom' : '');
  const brands = [...new Set(list.map(x => x.brand))];
  if (sel && !brands.includes(sel.brand)) brands.unshift(sel.brand);
  const bItems = list.filter(x => x.brand === brand); if (sel && sel.brand === brand && !bItems.includes(sel)) bItems.unshift(sel);
  const priceTag = it => { const p = priceInfo(it); return p.unit != null ? ` · ${money(p.unit)}${it.cat === 'oil' && num(it.size) ? '' : ''}` : ''; };
  const stock = invFor(cat, sel, v);
  let info = '';
  if (sel) {
    const p = priceInfo(sel), fits = fitsV(sel, v);
    const offers = p.offers.length ? `<div class="offers">${p.offers.map(o => `<a href="${esc(o.url)}" target="_blank" rel="noopener noreferrer">${esc(o.retailer)} <b>${money(o.unitPrice)}</b>${o.packQty > 1 ? ` <small>(${money(o.price)} / ${o.packQty})</small>` : ''} <small>${fdateS((o.checked || '').slice(0, 10))}${o.stale ? ' · stale' : ''}</small></a>`).join('')}</div>` : '';
    info = `<div class="pi-name"><b>${esc(sel.name || sel.brand + ' ' + sel.part)}</b>${sel.user ? ' <span class="tag accent">My list</span>' : ''}</div>
      <div class="tags">${itemChips(sel).map(c => `<span class="tag">${esc(c)}</span>`).join('')}</div>
      <div class="pi-fit ${fits ? 'good' : 'warn'}">${fits ? `✓ Listed for this vehicle${(sel.src || []).length ? ` · <a href="${esc(sel.src[0])}" target="_blank" rel="noopener noreferrer">source</a>` : ''}` : '⚠ Not listed for this vehicle. Double-check fitment.'}</div>
      ${sel.note ? `<small class="muted">${esc(sel.note)}</small>` : ''}
      <div class="pi-price">${p.unit != null ? `<b>${money(p.unit)}</b>${sel.cat === 'oil' ? ` per ${fmt2(num(sel.size) || 1)}-qt` : ' each'} · <span class="muted">${esc(priceSrcLabel(p))}${p.date ? ', ' + fdate(p.date) : ''}</span>${p.url && p.src !== 'retail' ? ` · <a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">link</a>` : ''}` : '<span class="muted">No price yet. Retailers block automated price checks, so AutoLog uses prices you’ve paid or noted.</span>'}
        <button type="button" class="linkbtn" data-pnote>Note a price</button></div>${offers}
      ${snap && snap.plan ? `<div class="pi-plan">🛢 ${esc(snap.plan)}${snap.cost != null ? ` · about <b>${money(snap.cost)}</b>` : ''}</div>` : snap && snap.cost != null && !snap.inv ? `<div class="pi-plan">${fmt2(snap.qty)} × ${money(snap.unitPrice)} = <b>${money(snap.cost)}</b></div>` : ''}
      ${snap && snap.inv ? `<div class="pi-plan good">📦 Using ${fmt2(snap.qty)} ${esc(snap.unit || '')} from inventory${snap.cost != null ? ` · ${money(snap.cost)} at your purchase price` : ''} <button type="button" class="linkbtn" data-pinvx>Undo</button></div>` : ''}
      <div class="pnote" hidden><label class="fe"><span>Price</span><input type="number" inputmode="decimal" step="0.01" data-pn="price"></label><label class="fe"><span>Retailer</span><input type="text" data-pn="retailer" placeholder="e.g. Walmart"></label><label class="fe wide"><span>Link</span><input type="url" data-pn="url" placeholder="https://"></label><button type="button" class="btn small primary" data-pnsave>Save price</button></div>`;
  } else if (snap && snap.custom || brand === '__custom') info = '<small class="muted">Type the brand and part # below. Tap “＋ Add a part # to my list” to save it for next time.</small>';
  else if (snap && snap.brand) info = `<div class="pi-name"><b>${esc(snap.name || snap.brand + ' ' + snap.part)}</b> <span class="tag">saved earlier</span></div>`;
  el.querySelector('.pick-ui').innerHTML = `
    <input type="search" class="pick-q" data-pq placeholder="Search ${esc(CAT[cat]?.label.toLowerCase() || 'parts')}: brand, part #, ${cat === 'oil' ? 'viscosity' : cat === 'tires' ? 'size' : 'type'}…" autocomplete="off"><div class="pick-results" hidden></div>
    <div class="pick-row"><select data-pb aria-label="Brand"><option value="">Brand…</option>${brands.map(b => `<option value="${esc(b)}" ${b === brand ? 'selected' : ''}>${esc(b)} (${list.filter(x => x.brand === b).length})</option>`).join('')}<option value="__custom" ${brand === '__custom' ? 'selected' : ''}>Other / custom</option></select>
      <select data-pp aria-label="Part" ${!brand ? 'disabled' : ''}><option value="">${brand === '__custom' ? 'Custom part' : 'Part # / product…'}</option>${brand !== '__custom' ? bItems.map(it => `<option value="${esc(it.id)}" ${sel && sel.id === it.id ? 'selected' : ''}>${esc(it.part)}${it.cat !== 'oil' ? ' · ' + esc(shortName(it).slice(0, 34)) : ''}${fitsV(it, v) ? ' ✓' : ''}${priceTag(it)}</option>`).join('') : ''}<option value="__custom">Other / custom part #</option><option value="__add">＋ Add a part # to my list…</option></select></div>
    <label class="pick-all"><input type="checkbox" data-pall ${showAll ? 'checked' : ''} ${!fit.length ? 'disabled' : ''}> ${fit.length ? `Show all ${esc(CAT[cat]?.label.toLowerCase())} (${fit.length} of ${items.length} fit this vehicle)` : `Showing all ${items.length}. No fitment data for this vehicle yet`}</label>
    <div class="pick-info">${info}</div>
    ${stock.length && !(snap && snap.inv) ? `<div class="pick-inv">📦 In stock: ${stock.slice(0, 3).map(x => `<button type="button" class="chip-btn" data-pinv="${x.id}">${esc(x.brand)} ${esc(x.part)} · ${esc(invQtyText(x))}${x.location ? ' · ' + esc(x.location) : ''}</button>`).join(' ')}<small>Tap to use from inventory</small></div>` : ''}
    <div class="padd" hidden><div class="fhead" style="margin-top:4px">Add to my parts list</div>
      <label class="fe"><span>Brand</span><input type="text" data-pa="brand" value="${esc(brand && brand !== '__custom' ? brand : '')}"></label><label class="fe"><span>Part #</span><input type="text" data-pa="part"></label>
      <label class="fe wide"><span>Description</span><input type="text" data-pa="name" placeholder="optional"></label>
      ${cat === 'oil' ? '<label class="fe"><span>Viscosity</span><input type="text" data-pa="viscosity" placeholder="0W-20"></label><label class="fe"><span>Jug size (qt)</span><input type="number" step="any" data-pa="size" value="5"></label>' : cat === 'tires' ? '<label class="fe"><span>Size</span><input type="text" data-pa="size" placeholder="225/50R17"></label>' : cat === 'battery' ? '<label class="fe"><span>Group</span><input type="text" data-pa="group"></label><label class="fe"><span>CCA</span><input type="number" data-pa="cca"></label>' : ''}
      <label class="fe"><span>Price (optional)</span><input type="number" step="0.01" data-pa="price"></label><label class="fe"><span>Retailer</span><input type="text" data-pa="retailer"></label>
      <label class="pick-all wide"><input type="checkbox" data-pa="fits" checked> Fits ${esc(vname(v))}</label>
      <button type="button" class="btn small primary" data-paddsave>Save part</button> <small class="muted">Synced with your account. The next daily catalog update adds the brand and part # (nothing else) to the shared list.</small></div>`;
}
function pickTotal(form, ctx) {
  const vals = {}; $$('.pick', form).forEach(el => { if (!el.closest('[hidden]')) { const s = pickVal(el); if (s && s.cost != null) vals[el.dataset.k] = s.cost; } });
  const tot = Object.values(vals).reduce((a, b) => a + b, 0);
  const c = form.elements.cost; if (!c || !Object.keys(vals).length) return;
  const shop = ($('input[name="doneBy"]:checked', form) || {}).value === 'Shop';
  if (shop) { const l = $('[data-k="cost"] small.autohint', form) || Object.assign(document.createElement('small'), { className: 'muted autohint' }); l.textContent = `Parts estimate ${money(tot)}. Enter the shop’s out-the-door total.`; $('[data-k="cost"]', form).appendChild(l); return; }
  if (c.value === '' || c.value === form.dataset.autoCost) { c.value = tot.toFixed(2); form.dataset.autoCost = c.value; }
}
function partsFormInit(form, ctx, refresh) {
  const { v } = ctx; delete form.dataset.autoCost; if (!ctx.sec) form.dataset.generic = '1'; else delete form.dataset.generic;
  const paint = () => { $$('[data-fit]', form).forEach(el => { el.innerHTML = fitHTML(el.dataset.fit, v); el.hidden = !el.innerHTML; }); };
  paint(); $$('.pick', form).forEach(el => pickRender(el, ctx));
  if (ctx.preset && ctx.preset.pick) { const el = $(`.pick[data-cat="${ctx.preset.pick.cat}"]`, form); if (el) { const it = itemById(ctx.preset.pick.id); setPick(el, it ? { ...snapFor(it, form, v), ...ctx.preset.pick.over } : ctx.preset.pick); if (it) fillFromItem(form, it); pickRender(el, ctx); pickTotal(form, ctx); } }
  if (form._ph) { form.removeEventListener('click', form._ph.click); form.removeEventListener('change', form._ph.change); form.removeEventListener('input', form._ph.input); }
  const choose = (el, it, inv) => { const snap = snapFor(it, form, v, inv); setPick(el, snap); fillFromItem(form, it); delete el.dataset.brand; pickRender(el, ctx); pickTotal(form, ctx); refresh(); };
  const H = {
    click: e => {
      const t = e.target, el = t.closest('.pick');
      const fe = t.closest('[data-fitedit]'); if (fe) { const box = fe.closest('[data-fit]'); $('.fit-edit', box).hidden = !$('.fit-edit', box).hidden; return; }
      const fs = t.closest('[data-fitsave]'), fu = t.closest('[data-fituse]');
      if (fs || fu) { const box = (fs || fu).closest('[data-fit]'), cat = box.dataset.fit;
        if (fs) $$('[data-fk]', box).forEach(i => { const d = FIT[cat].find(x => x.k === i.dataset.fk); v.specs[i.dataset.fk] = d.t === 'num' ? num(i.value) : i.value.trim(); });
        else { const ps = vehProfile(v)?.specs || {}; FIT[cat].forEach(d => { if (specOf(v, d.k) == null && ps[d.k] != null) v.specs[d.k] = ps[d.k]; }); }
        save(); toast('Specs saved'); Object.assign(form.elements, {}); const vals = specDefaults(CAT[cat].sec, v, {}); ['qty'].forEach(k => { if (cat === 'oil' && vals.qty && form.elements.qty && !form.elements.qty.value) form.elements.qty.value = vals.qty; });
        paint(); $$('.pick', form).forEach(p => { const s = pickVal(p); if (s && s.id && itemById(s.id) && !s.inv) setPick(p, snapFor(itemById(s.id), form, v)); pickRender(p, ctx); }); pickTotal(form, ctx); refresh(); return; }
      if (!el) return;
      const r = t.closest('[data-pres]'); if (r) { const it = itemById(r.dataset.pres); if (it) choose(el, it); return; }
      if (t.closest('[data-pnote]')) { $('.pnote', el).hidden = !$('.pnote', el).hidden; return; }
      if (t.closest('[data-pnsave]')) { const s = pickVal(el), it = s && itemById(s.id); const g = k => $(`[data-pn="${k}"]`, el).value.trim(); const pr = num(g('price')); if (!it || !(pr > 0)) { toast('Enter a price'); return; }
        db.parts = db.parts || []; let n = db.parts.find(p => p.ref === it.id || p.id === it.id); if (!n) { n = { id: 'n' + uid(), ref: it.id, cat: it.cat, brand: it.brand, part: it.part }; db.parts.push(n); }
        Object.assign(n, { price: pr, priceDate: todayISO(), retailer: g('retailer'), url: g('url') }); save(); choose(el, it); toast('Price noted'); return; }
      const iv = t.closest('[data-pinv]'); if (iv) { const inv = db.inventory.find(x => x.id === iv.dataset.pinv); const it = itemById(inv.itemId) || { id: inv.itemId || 'inv:' + inv.id, cat: inv.cat, brand: inv.brand, part: inv.part, name: inv.name, size: inv.size }; choose(el, it, inv); return; }
      if (t.closest('[data-pinvx]')) { const s = pickVal(el); const it = s && itemById(s.id); if (it) choose(el, it); else { setPick(el, null); pickRender(el, ctx); } return; }
      if (t.closest('[data-paddsave]')) { const g = k => { const i = $(`[data-pa="${k}"]`, el); return i ? (i.type === 'checkbox' ? i.checked : i.value.trim()) : ''; };
        if (!g('brand') || !g('part')) { toast('Brand and part # are required'); return; }
        const cat = el.dataset.cat, p = { id: 'u' + uid(), cat, brand: g('brand'), part: g('part'), name: g('name') || `${g('brand')} ${g('part')}`, created: todayISO() };
        ['viscosity', 'size', 'group'].forEach(k => { if (g(k)) p[k] = k === 'size' && cat === 'oil' ? num(g(k)) : g(k); }); if (g('cca')) p.cca = num(g('cca'));
        if (num(g('price')) > 0) Object.assign(p, { price: num(g('price')), priceDate: todayISO(), retailer: g('retailer') });
        if (g('fits')) p.fitsVid = v.id;
        db.parts = db.parts || []; db.parts.push(p); save(); choose(el, itemById(p.id)); toast('Added to your parts list'); return; }
    },
    change: e => {
      const t = e.target, el = t.closest('.pick');
      if (el && t.matches('[data-pall]')) { el.dataset.all = t.checked ? '1' : '0'; pickRender(el, ctx); return; }
      if (el && t.matches('[data-pb]')) { el.dataset.brand = t.value; if (t.value === '__custom') setPick(el, { custom: true }); pickRender(el, ctx); refresh(); return; }
      if (el && t.matches('[data-pp]')) {
        if (t.value === '__add') { $('.padd', el).hidden = false; t.value = ''; return; }
        if (t.value === '__custom') { setPick(el, { custom: true }); el.dataset.brand = '__custom'; pickRender(el, ctx); return; }
        const it = itemById(t.value); if (it) choose(el, it); return;
      }
      if (['qty', 'count', 'wireQty', 'wires', 'doneBy'].includes(t.name)) { $$('.pick', form).forEach(p => { const s = pickVal(p); if (s && s.id && !s.inv && itemById(s.id)) { setPick(p, snapFor(itemById(s.id), form, v)); pickRender(p, ctx); } }); pickTotal(form, ctx); }
    },
    input: e => {
      const t = e.target; if (!t.matches('[data-pq]')) return;
      const el = t.closest('.pick'), box = $('.pick-results', el), q = t.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      if (!q.length) { box.hidden = true; return; }
      const res = itemsFor(el.dataset.cat).filter(it => { const h = `${it.brand} ${it.part} ${it.name} ${itemChips(it).join(' ')}`.toLowerCase(); return q.every(w => h.includes(w) || normS(h).includes(normS(w))); })
        .sort((a, b) => fitsV(b, v) - fitsV(a, v)).slice(0, 8);
      box.hidden = false; box.innerHTML = res.length ? res.map(it => { const p = priceInfo(it); return `<button type="button" data-pres="${esc(it.id)}"><b>${esc(it.brand)} ${esc(it.part)}</b>${fitsV(it, v) ? ' <span class="good">✓ fits</span>' : ''}<small>${esc(itemChips(it).join(' · '))}${p.unit != null ? ' · ' + money(p.unit) : ''}</small></button>`; }).join('') : '<small class="muted">No matches. Choose Other / custom, or add it to your list.</small>';
    },
  };
  form._ph = H; form.addEventListener('click', H.click); form.addEventListener('change', H.change); form.addEventListener('input', H.input);
}
function partsBeforeSave(vals, ctx) {
  for (const k of PICK_KEYS) { const s = vals[k]; if (!s) continue; if (s.custom && !s.id) { vals[k] = null; continue; }
    if (s.inv && !s.inv.applied) { const inv = (db.inventory || []).find(x => x.id === s.inv.id); if (!inv) { toast('That inventory item no longer exists'); return false; } if (num(inv.qty) + 1e-9 < s.inv.use) { toast(`Only ${invQtyText(inv)} of ${inv.brand} ${inv.part} in stock`); return false; } } }
}
function partsAfterSave(saved, ctx) {
  for (const k of PICK_KEYS) { const s = saved[k]; if (!s || !s.inv || s.inv.applied) continue;
    const inv = db.inventory.find(x => x.id === s.inv.id); if (!inv) continue;
    inv.qty = Math.round((num(inv.qty) - s.inv.use) * 100) / 100; inv.log = inv.log || []; inv.log.push({ date: saved.date, delta: -s.inv.use, vid: ctx.v.id, entry: saved.id }); inv.updated = new Date().toISOString();
    s.inv.applied = true; }
  const dir = ctx.preset && ctx.preset.invDirect;
  if (dir && !dir.applied) { const inv = (db.inventory || []).find(x => x.id === dir.id); if (inv) { const use = Math.min(num(inv.qty), dir.use); inv.qty = Math.round((num(inv.qty) - use) * 100) / 100; inv.log = inv.log || []; inv.log.push({ date: saved.date, delta: -use, vid: ctx.v.id, entry: saved.id }); inv.updated = new Date().toISOString(); saved.invUsed = { id: inv.id, use, unitPrice: num(inv.price) }; } dir.applied = true; }
  const pid = ctx.preset && ctx.preset.planId; if (pid) { const pl = db.plans.find(x => x.id === pid); if (pl) Object.assign(pl, { status: 'installed', entryId: saved.id, installedDate: saved.date, vid: pl.vid || ctx.v.id }); }
}
/* ---------- inventory (spare parts on hand, account-wide) ---------- */
const INV_UNITS = ['each', 'qt', 'jugs', 'set', 'gal'];
const invUnitPrice = x => num(x.price);
function invMarket(x) { const it = itemById(x.itemId); if (!it) return null; const p = priceInfo(it); if (p.unit == null || p.src === 'paid') return null; return (x.unit === 'qt' && it.cat === 'oil' && num(it.size)) ? { unit: p.unit / num(it.size), src: p } : { unit: p.unit, src: p }; }
function invStats(x) {
  const m = invMarket(x), q = num(x.qty) || 0, pp = invUnitPrice(x);
  return { q, pp, market: m ? m.unit : null, value: q * (m ? m.unit : (pp || 0)), cost: q * (pp || 0), change: m && pp ? (m.unit - pp) / pp : null, shelfDays: x.date ? daysBetween(x.date, todayISO()) : null, low: num(x.low) != null && q <= num(x.low) };
}
const lowStock = () => (db.inventory || []).filter(x => invStats(x).low);
const invTotals = () => (db.inventory || []).reduce((t, x) => { const s = invStats(x); t.value += s.value; t.cost += s.cost; t.n++; if (s.low) t.low++; return t; }, { value: 0, cost: 0, n: 0, low: 0 });
function pickCategory(title, run, cats = ['oil', 'oilFilter', 'plugs', 'coils', 'battery', 'tires', 'airFilter', 'cabinFilter', 'coolant', 'brakes', 'other']) {
  pickSheet(title, cats.map(c => ({ title: CAT[c].label, icon: CAT[c].icon, cls: 'c-' + (CAT[c].sec || 'fuel'), sub: itemsFor(c).length ? `${itemsFor(c).length} in catalog` : 'Custom entry', run: () => run(c) })));
}
function invForm(x, cat) {
  cat = x ? x.cat : cat; const v = cur() || db.vehicles[0] || { id: '', specs: {}, maint: {}, fuel: [] };
  const names = db.vehicles.map(vname);
  const fields = [
    { k: 'pick', t: 'pick', cat, l: `${CAT[cat].label} from catalog` },
    { k: 'brand', l: 'Brand', t: 'text', half: 1, req: 1 }, { k: 'part', l: 'Part # / product', t: 'text', half: 1, req: 1 },
    { k: 'name', l: 'Description', t: 'text' },
    { k: 'qty', l: 'Quantity on hand', t: 'num', step: 'any', half: 1, req: 1 }, { k: 'unit', l: 'Unit', t: 'select', opts: INV_UNITS, half: 1, def: cat === 'oil' ? 'qt' : 'each' },
    ...(cat === 'oil' ? [{ k: 'size', l: 'Jug size', t: 'num', unit: 'qt', step: 'any', half: 1, def: 5, hint: 'If you enter jugs, AutoLog stores quarts so partial jugs can be tracked.' }] : []),
    { k: 'location', l: 'Storage location', t: 'text', half: 1, list: ['Garage shelf', 'Basement', 'Trunk', 'Shed'] }, { k: 'low', l: 'Low-stock alert at', t: 'num', step: 'any', half: 1, hint: 'Shows in Reminders when quantity drops to this.' },
    H('Purchase'), { k: 'cost', l: 'Total price paid', t: 'num', pre: '$', step: 0.01, half: 1, reqCost: 1 }, { k: 'date', l: 'Purchase date', t: 'date', half: 1, def: todayISO() },
    F.noCharge, { k: 'retailer', l: 'Bought from', t: 'text', half: 1 }, { k: 'url', l: 'Product link', t: 'text', half: 1, ph: 'https://' },
    H('Fits'), { k: 'fitsN', l: 'Fits which vehicles (optional)', t: 'multi', opts: names },
    F.notes,
  ];
  const values = x ? { ...x, cost: x.price != null && num(x.qty) ? Math.round(num(x.price) * (num(x.qtyBought) || num(x.qty)) * 100) / 100 : null, fitsN: (x.fits || []).map(id => vname(db.vehicles.find(y => y.id === id))).filter(Boolean) } : { ...defaults(fields), fitsN: v.id ? [vname(v)] : [] };
  if (x && x.price === 0) values.noCharge = true;
  openForm({ title: x ? 'Edit inventory item' : `Add ${CAT[cat].label.toLowerCase()} to inventory`, fields, values, isNew: !x, saveLabel: x ? 'Save' : 'Add to inventory',
    onReady: (form, refresh) => partsFormInit(form, { v, sec: null }, refresh),
    onInput: (e, form) => { if (['qty', 'unit', 'size'].includes(e.target.name)) { const s = pickVal($('.pick', form)); const E = form.elements; if (s && s.unitPrice != null && (E.cost.value === '' || E.cost.value === form.dataset.autoCost)) { const q = num(E.qty.value) || 0, u = E.unit.value, sz = num(E.size?.value) || num(s.size) || 5; const c = cat === 'oil' ? (u === 'qt' ? s.unitPrice / sz * q : s.unitPrice * q) : s.unitPrice * q; E.cost.value = c ? c.toFixed(2) : ''; form.dataset.autoCost = E.cost.value; } } },
    onSave: vals => {
      const s = vals.pick; delete vals.pick;
      let q = vals.qty, unit = vals.unit;
      if (!(q > 0) && !x) { toast('Quantity must be more than 0'); return false; }
      if (cat === 'oil' && unit === 'jugs') { q = q * (vals.size || 5); unit = 'qt'; }
      const o = { cat, itemId: s && s.id && !String(s.id).startsWith('inv:') ? s.id : (x ? x.itemId : null), brand: vals.brand, part: vals.part, name: vals.name || (s && s.name) || '', qty: q, unit, size: vals.size, location: vals.location, low: vals.low,
        price: vals.noCharge ? 0 : (vals.cost != null && q ? Math.round(vals.cost / q * 1000) / 1000 : (x ? x.price : null)), qtyBought: x ? x.qtyBought || q : q, date: vals.date, retailer: vals.retailer, url: vals.url,
        fits: (vals.fitsN || []).map(n => db.vehicles.find(y => vname(y) === n)?.id).filter(Boolean), notes: vals.notes, updated: new Date().toISOString() };
      db.inventory = db.inventory || [];
      if (x) { if (num(x.qty) !== q) { x.log = x.log || []; x.log.push({ date: todayISO(), delta: q - num(x.qty), note: 'adjusted' }); } Object.assign(x, o); }
      else db.inventory.push({ id: uid(), created: todayISO(), log: [{ date: vals.date || todayISO(), delta: q, note: 'bought' }], ...o });
      toast(x ? 'Inventory updated' : 'Added to inventory');
    },
    onDelete: x ? () => { db.inventory = db.inventory.filter(y => y !== x); save(); } : null,
  });
}
function viewInventory() {
  const inv = db.inventory || [], t = invTotals();
  const cats = Object.keys(CAT).filter(c => inv.some(x => x.cat === c));
  const row = x => { const s = invStats(x), fits = (x.fits || []).map(id => db.vehicles.find(y => y.id === id)).filter(Boolean);
    return `<button class="entry" data-act="editInv" data-id="${x.id}"><span class="sicon c-${CAT[x.cat]?.sec || 'fuel'}">${CAT[x.cat]?.icon || I.box}</span><div class="e-main"><b>${esc(x.brand)} ${esc(x.part)}</b>${s.low ? ' <span class="pill soon">Low stock</span>' : ''}
      <div class="e-sub">${esc(invQtyText(x))}${x.cat === 'oil' && num(x.size) ? ` (${fmt(Math.floor(s.q / num(x.size)))} full ${num(x.size)}-qt jug${Math.floor(s.q / num(x.size)) === 1 ? '' : 's'}${s.q % num(x.size) ? ` + ${fmt2(+(s.q % num(x.size)).toFixed(1))} qt` : ''})` : ''}${x.location ? ' · ' + esc(x.location) : ''}</div>
      <div class="tags">${fits.map(f => `<span class="tag accent">${esc(vname(f))}</span>`).join('')}${s.pp != null ? `<span class="tag">Paid ${money(s.pp)}/${esc(x.unit === 'qt' ? 'qt' : 'ea')}${x.date ? ' · ' + fdateS(x.date) : ''}</span>` : ''}${s.shelfDays != null ? `<span class="tag">On shelf ${plural(s.shelfDays, 'day')}</span>` : ''}${s.change != null ? `<span class="tag ${s.change > 0 ? 'good' : 'warn'}">Market ${s.change > 0 ? '▲' : '▼'} ${fmt(Math.abs(s.change * 100), 0)}%</span>` : ''}</div></div>
      <div class="e-side"><b>${money(s.value)}</b><small>${s.market != null ? 'market' : 'at cost'}</small></div></button>`; };
  return `<a href="#/service" class="back">${I.back} Service</a><div class="page-title"><h2>Inventory</h2><button class="btn small primary" data-act="addInv">${I.plus} Item</button></div>
    <section class="card"><div class="stats">${stat('Items', fmt(t.n))}${stat('Value', money(t.value, 0))}${stat('Low stock', fmt(t.low))}</div>
      <p class="insights-note" style="margin-top:10px">Value uses current catalog prices when available, otherwise what you paid. Spare parts aren’t tied to one vehicle; tag which ones they fit.</p></section>
    ${inv.length ? cats.map(c => `<section class="card"><div class="card-head"><h3>${CAT[c].icon} ${esc(CAT[c].label)}</h3><span class="muted">${inv.filter(x => x.cat === c).length}</span></div><div class="list">${inv.filter(x => x.cat === c).map(row).join('')}</div></section>`).join('')
      : `<div class="card empty">No spare parts yet. Add the oil, filters, plugs, or anything else you keep on the shelf, and AutoLog will offer them when you log a service.<div class="btn-row"><button class="btn primary" data-act="addInv">${I.plus} Add first item</button></div></div>`}`;
}
/* ---------- planned parts (maintenance planner) ---------- */
const PLAN_LBL = { planned: 'Planned', bought: 'Bought', installed: 'Installed' };
const planLvl = p => p.status === 'installed' ? 'ok' : p.status === 'bought' ? 'soon' : 'none';
function planStock(p) { const k = pk(p.brand, p.part); return (db.inventory || []).filter(x => x.cat === p.cat && (x.itemId && x.itemId === p.itemId || pk(x.brand, x.part) === k)).reduce((t, x) => t + (num(x.qty) || 0), 0); }
function planPrice(p) { const it = itemById(p.itemId); const pi = it ? priceInfo(it) : (num(p.priceAtAdd) ? { unit: num(p.priceAtAdd), src: 'noted', date: p.priceAtAddDate, offers: [] } : { unit: null, offers: [] }); return { ...pi, total: pi.unit != null ? pi.unit * (num(p.qty) || 1) : null, change: pi.unit != null && num(p.priceAtAdd) ? (pi.unit - num(p.priceAtAdd)) / num(p.priceAtAdd) : null }; }
function planForm(p, cat) {
  cat = p ? p.cat : cat; const v = (p && db.vehicles.find(x => x.id === p.vid)) || cur();
  const rems = v ? reminderItems(v) : [];
  const fields = [
    { k: 'pick', t: 'pick', cat, l: `${CAT[cat].label} from catalog` },
    { k: 'brand', l: 'Brand', t: 'text', half: 1, req: 1 }, { k: 'part', l: 'Part # / product', t: 'text', half: 1, req: 1 },
    { k: 'qty', l: 'Quantity', t: 'num', step: 'any', half: 1, def: cat === 'plugs' ? (num(specOf(v || {}, 'plugCount')) || 4) : cat === 'tires' ? 4 : 1 }, { k: 'unit', l: 'Unit', t: 'select', opts: INV_UNITS, half: 1, def: 'each' },
    H('When'), { k: 'targetDate', l: 'Target date', t: 'date', half: 1 }, { k: 'targetOdo', l: 'or odometer', t: 'num', unit: 'mi', step: 1, half: 1 },
    { k: 'remKey', l: 'Link to reminder', t: 'select', opts: ['', ...rems.map(r => r.title)] },
    { k: 'notes', l: 'Notes', t: 'textarea' },
  ];
  const values = p ? { ...p, remKey: (rems.find(r => r.key === p.remKey) || {}).title || '' } : { ...defaults(fields), remKey: (rems.find(r => r.sec === CAT[cat].sec) || {}).title || '' };
  openForm({ title: p ? 'Edit planned part' : `Plan ${CAT[cat].label.toLowerCase()}`, fields, values, saveLabel: p ? 'Save' : 'Add to plan',
    onReady: (form, refresh) => partsFormInit(form, { v: v || { specs: {}, maint: {}, fuel: [] }, sec: null }, refresh),
    onSave: vals => {
      const s = vals.pick; delete vals.pick; const it = s && s.id ? itemById(s.id) : null; const pi = it ? priceInfo(it) : null;
      const o = { ...vals, cat, vid: v ? v.id : null, itemId: it ? it.id : (p ? p.itemId : null), name: (it && it.name) || vals.name || (p && p.name) || '', remKey: (rems.find(r => r.title === vals.remKey) || {}).key || '' };
      db.plans = db.plans || [];
      if (p) Object.assign(p, o); else db.plans.push({ id: uid(), created: todayISO(), status: 'planned', priceAtAdd: pi ? pi.unit : null, priceAtAddDate: todayISO(), priceAtAddSrc: pi ? pi.src : null, ...o });
      toast(p ? 'Plan updated' : 'Added to your plan');
    },
    onDelete: p ? () => { db.plans = db.plans.filter(x => x !== p); save(); } : null });
}
function planBought(p) {
  const pp = planPrice(p);
  openForm({ title: `Bought ${p.brand} ${p.part}`, isNew: true, saveLabel: 'Mark bought',
    fields: [{ k: 'cost', l: 'Total price paid', t: 'num', pre: '$', step: 0.01, half: 1, reqCost: 1 }, { k: 'date', l: 'Date', t: 'date', half: 1, def: todayISO() }, F.noCharge,
      { k: 'retailer', l: 'Bought from', t: 'text', half: 1 }, { k: 'url', l: 'Product link', t: 'text', half: 1 },
      { k: 'toInv', l: 'Put it in inventory', t: 'check', sub: 'Keep it on the shelf until you install it', def: true }, { k: 'location', l: 'Storage location', t: 'text', showIf: x => x.toInv }],
    values: { date: todayISO(), toInv: true, cost: pp.total != null ? +pp.total.toFixed(2) : null, retailer: pp.src === 'retail' || pp.src === 'noted' ? pp.retailer : '' },
    onSave: vals => {
      Object.assign(p, { status: 'bought', paid: vals.cost, paidDate: vals.date, retailer: vals.retailer, url: vals.url });
      if (vals.toInv) { db.inventory = db.inventory || []; const q = num(p.qty) || 1; const x = { id: uid(), created: todayISO(), cat: p.cat, itemId: p.itemId, brand: p.brand, part: p.part, name: p.name, qty: q, unit: p.unit || 'each', price: Math.round(vals.cost / q * 1000) / 1000, qtyBought: q, date: vals.date, retailer: vals.retailer, url: vals.url, location: vals.location, fits: p.vid ? [p.vid] : [], fromPlan: p.id, log: [{ date: vals.date, delta: q, note: 'bought (plan)' }] };
        db.inventory.push(x); p.invId = x.id; }
      toast(vals.toInv ? 'Marked bought and added to inventory' : 'Marked bought');
    } });
}
function planInstall(p) {
  const v = db.vehicles.find(x => x.id === p.vid) || cur(); if (!v) { toast('Add a vehicle first'); return; }
  const sec = SEC[CAT[p.cat]?.sec]; if (!sec) { p.status = 'installed'; p.installedDate = todayISO(); save(); render(); toast('Marked installed'); return; }
  if (db.settings.current !== v.id) { db.settings.current = v.id; save(); }
  const inv = p.invId && (db.inventory || []).find(x => x.id === p.invId && num(x.qty) > 0);
  const base = { id: p.itemId || 'plan:' + p.id, cat: p.cat, brand: p.brand, part: p.part, name: p.name };
  let pick;
  if (inv) pick = { ...base, qty: Math.min(num(inv.qty), num(p.qty) || 1), unit: inv.unit, unitPrice: num(inv.price), cost: Math.round(num(inv.price) * Math.min(num(inv.qty), num(p.qty) || 1) * 100) / 100, priceSrc: 'inventory', inv: { id: inv.id, use: Math.min(num(inv.qty), num(p.qty) || 1) }, over: {} };
  else if (num(p.paid) != null && p.status === 'bought') pick = { ...base, qty: num(p.qty) || 1, unitPrice: num(p.paid) / (num(p.qty) || 1), cost: num(p.paid), priceSrc: 'paid', retailer: p.retailer, url: p.url, over: { cost: num(p.paid), unitPrice: num(p.paid) / (num(p.qty) || 1), priceSrc: 'paid' } };
  else pick = { ...base, qty: num(p.qty) || 1, over: {} };
  if (inv) pick.over = { inv: pick.inv, priceSrc: 'inventory', unitPrice: pick.unitPrice, cost: pick.cost, qty: pick.qty, unit: pick.unit };
  const values = p.cat === 'battery' ? { events: ['New battery'] } : p.cat === 'tires' ? { services: ['New tires'], count: num(p.qty) || 4 } : (p.cat === 'airFilter' || p.cat === 'cabinFilter') ? { action: 'Replaced' } : p.cat === 'coils' ? { wires: 'Coils', wireQty: num(p.qty) || 1 } : p.cat === 'plugs' ? { qty: num(p.qty) || undefined } : {};
  // sections without a catalog picker (brakes, coolant): fill their own fields and carry the inventory use directly
  let invDirect = null;
  if (p.cat === 'brakes' || p.cat === 'coolant') {
    Object.assign(values, p.cat === 'brakes' ? { padsReplaced: true, padBrand: p.brand, padPart: p.part } : { brand: p.brand });
    if (pick.cost != null) values.cost = pick.cost;
    if (inv) invDirect = { id: inv.id, use: pick.qty };
  }
  maintForm(v, sec, null, { planId: p.id, pick, values, invDirect });
}
function viewPlan(all) {
  const v = cur(), list = (db.plans || []).filter(p => all || !v || p.vid === v.id || !p.vid);
  const open = list.filter(p => p.status !== 'installed'), done = list.filter(p => p.status === 'installed');
  const est = open.filter(p => p.status === 'planned').reduce((t, p) => t + (planPrice(p).total || 0), 0);
  const rems = new Map(allReminders().map(r => [r.key, r]));
  const row = p => { const pp = planPrice(p), st = planStock(p), r = rems.get(p.remKey), pv = db.vehicles.find(x => x.id === p.vid);
    return `<div class="entry plan"><span class="sicon c-${CAT[p.cat]?.sec || 'fuel'}">${CAT[p.cat]?.icon || I.box}</span><div class="e-main"><b>${esc(p.brand)} ${esc(p.part)}</b> <span class="pill ${planLvl(p)}">${PLAN_LBL[p.status]}</span>
      <div class="e-sub">${fmt2(num(p.qty) || 1)} ${esc(p.unit || 'each')}${all && pv ? ' · ' + esc(vname(pv)) : ''}${p.targetDate ? ' · by ' + fdate(p.targetDate) : ''}${num(p.targetOdo) ? ' · at ' + fmt(num(p.targetOdo)) + ' mi' : ''}${r ? ' · ' + esc(r.title) + ': ' + esc(reminderText(r)) : ''}</div>
      <div class="tags">${p.status === 'planned' ? (pp.unit != null ? `<span class="tag accent">Now ${money(pp.unit)} ea · ${money(pp.total)} total (${esc(priceSrcLabel(pp))})</span>` : '<span class="tag">No current price</span>') : ''}${p.status === 'planned' && pp.change != null && Math.abs(pp.change) >= 0.005 ? `<span class="tag ${pp.change < 0 ? 'good' : 'warn'}">${pp.change < 0 ? '▼' : '▲'} ${fmt(Math.abs(pp.change * 100), 0)}% since added</span>` : ''}${p.paid != null ? `<span class="tag">Paid ${money(p.paid)}${p.paidDate ? ' · ' + fdateS(p.paidDate) : ''}</span>` : ''}${st > 0 ? `<span class="tag good">In stock: ${fmt2(st)}</span>` : ''}${p.notes ? `<span class="tag">${esc(p.notes.slice(0, 30))}</span>` : ''}</div>
      ${pp.offers && pp.offers.length && p.status === 'planned' ? `<div class="offers">${pp.offers.map(o => `<a href="${esc(o.url)}" target="_blank" rel="noopener noreferrer">${esc(o.retailer)} ${money(o.unitPrice)}</a>`).join('')}</div>` : ''}
      <div class="btn-row" style="margin-top:8px">${p.status === 'planned' ? `<button class="btn small" data-act="planBuy" data-id="${p.id}">${I.check} Bought</button>` : ''}${p.status !== 'installed' ? `<button class="btn small primary" data-act="planInstall" data-id="${p.id}">${I.wrench} Install</button>` : ''}<button class="btn small" data-act="planEdit" data-id="${p.id}">${I.edit} Edit</button></div></div></div>`; };
  return `<a href="#/service" class="back">${I.back} Service</a><div class="page-title"><h2>Planned parts</h2><button class="btn small primary" data-act="addPlan">${I.plus} Part</button></div>
    <div class="seg scope" role="radiogroup"><label><input type="radio" name="pscope" data-act="planScope" value="one" ${!all ? 'checked' : ''}><span>${esc(v ? vname(v) : 'Vehicle')}</span></label><label><input type="radio" name="pscope" data-act="planScope" value="all" ${all ? 'checked' : ''}><span>All vehicles</span></label></div>
    <section class="card"><div class="stats">${stat('Open', fmt(open.length))}${stat('Est. to buy', money(est, 0))}${stat('Installed', fmt(done.length))}</div></section>
    ${open.length ? `<section class="card"><h3>To do</h3><div class="list">${open.sort((a, b) => (a.targetDate || '9').localeCompare(b.targetDate || '9')).map(row).join('')}</div></section>` : `<div class="card empty">Nothing planned. Add parts you’ll need soon, like the oil and filter for your next change. AutoLog tracks their price and stock for you.<div class="btn-row"><button class="btn primary" data-act="addPlan">${I.plus} Plan a part</button></div></div>`}
    ${done.length ? `<section class="card"><h3>Installed</h3><div class="list">${done.slice(-10).reverse().map(row).join('')}</div></section>` : ''}`;
}
/* ---------- statistics (on-device; nothing leaves the phone) ---------- */
const St = (() => {
  const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
  const sd = a => { if (a.length < 2) return null; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
  const q = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
  const median = a => q(a, 0.5);
  function lgamma(x) { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (const k of c) s += k / ++y; return -t + Math.log(2.5066282746310005 * s / x); }
  function betacf(a, b, x) { let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d; let h = d;
    for (let m = 1; m <= 200; m++) { const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-12) break; } return h; }
  function ibeta(x, a, b) { if (x <= 0) return 0; if (x >= 1) return 1; const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x)); return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b; }
  const tp2 = (t, df) => ibeta(df / (df + t * t), df / 2, 0.5); // two-sided p
  const tinv = (p, df) => { let lo = 0, hi = 100; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (tp2(m, df) > p) lo = m; else hi = m; } return (lo + hi) / 2; }; // two-sided critical value
  const ncdf = z => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
  function welch(a, b) { if (a.length < 2 || b.length < 2) return null; const ma = mean(a), mb = mean(b), va = sd(a) ** 2 / a.length, vb = sd(b) ** 2 / b.length; if (va + vb === 0) return { t: 0, df: a.length + b.length - 2, p: 1, diff: mb - ma }; const t = (mb - ma) / Math.sqrt(va + vb), df = (va + vb) ** 2 / (va ** 2 / (a.length - 1) + vb ** 2 / (b.length - 1)); return { t, df, p: tp2(t, df), diff: mb - ma, ci: tinv(0.05, df) * Math.sqrt(va + vb) }; }
  function rank(a) { const s = a.map((x, i) => [x, i]).sort((x, y) => x[0] - y[0]), r = new Array(a.length); for (let i = 0; i < s.length;) { let j = i; while (j + 1 < s.length && s[j + 1][0] === s[i][0]) j++; for (let k = i; k <= j; k++) r[s[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; }
  function mannWhitney(a, b) { if (a.length < 2 || b.length < 2) return null; const r = rank([...a, ...b]), n1 = a.length, n2 = b.length, R1 = r.slice(0, n1).reduce((s, x) => s + x, 0), U = R1 - n1 * (n1 + 1) / 2, mu = n1 * n2 / 2, sg = Math.sqrt(n1 * n2 * (n1 + n2 + 1) / 12); const z = sg ? (U - mu) / sg : 0; return { U, z, p: 2 * (1 - ncdf(Math.abs(z))) }; }
  function pearson(x, y) { const n = x.length; if (n < 3) return null; const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } if (!sxx || !syy) return null; const r = sxy / Math.sqrt(sxx * syy), t = r * Math.sqrt((n - 2) / Math.max(1e-12, 1 - r * r)); return { r, p: tp2(t, n - 2), n }; }
  const spearman = (x, y) => { const p = pearson(rank(x), rank(y)); return p ? { rho: p.r, p: p.p, n: p.n } : null; };
  function linreg(x, y) { const n = x.length; if (n < 3) return null; const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; } if (!sxx) return null; const b = sxy / sxx, a = my - b * mx; let sse = 0; for (let i = 0; i < n; i++) sse += (y[i] - a - b * x[i]) ** 2; const s = Math.sqrt(sse / (n - 2)), se = s / Math.sqrt(sxx), tc = tinv(0.05, n - 2); const sst = y.reduce((t, v) => t + (v - my) ** 2, 0);
    return { a, b, se, ci: [b - tc * se, b + tc * se], p: tp2(b / se, n - 2), r2: sst ? 1 - sse / sst : 0, n, s, mx, sxx, tc, band: x0 => tc * s * Math.sqrt(1 / n + (x0 - mx) ** 2 / sxx) }; }
  function ols(X, y) { // X: rows of predictors (no intercept). Returns coefficients with SE and p.
    const n = y.length, k = X[0].length + 1; if (n <= k + 2) return null;
    const A = X.map(r => [1, ...r]), XtX = Array.from({ length: k }, () => new Array(k).fill(0)), Xty = new Array(k).fill(0);
    for (let i = 0; i < n; i++) for (let a = 0; a < k; a++) { Xty[a] += A[i][a] * y[i]; for (let b = 0; b < k; b++) XtX[a][b] += A[i][a] * A[i][b]; }
    const inv = invert(XtX); if (!inv) return null;
    const beta = inv.map(r => r.reduce((s, v, j) => s + v * Xty[j], 0));
    let sse = 0; const my = mean(y); let sst = 0; for (let i = 0; i < n; i++) { const f = A[i].reduce((s, v, j) => s + v * beta[j], 0); sse += (y[i] - f) ** 2; sst += (y[i] - my) ** 2; }
    const s2 = sse / (n - k), se = inv.map((r, i) => Math.sqrt(Math.max(0, r[i] * s2)));
    return { beta, se, p: beta.map((b, i) => se[i] ? tp2(b / se[i], n - k) : 1), r2: sst ? 1 - sse / sst : 0, adjR2: sst ? 1 - (sse / (n - k)) / (sst / (n - 1)) : 0, n, k };
  }
  function invert(M) { const n = M.length, A = M.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => +(i === j))]);
    for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; if (Math.abs(A[p][c]) < 1e-10) return null; [A[c], A[p]] = [A[p], A[c]]; const d = A[c][c]; for (let j = 0; j < 2 * n; j++) A[c][j] /= d;
      for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; } }
    return A.map(r => r.slice(n)); }
  const describe = a => ({ n: a.length, mean: mean(a), median: median(a), sd: sd(a), min: a.length ? Math.min(...a) : null, max: a.length ? Math.max(...a) : null });
  const ci95 = a => a.length >= 2 ? tinv(0.05, a.length - 1) * sd(a) / Math.sqrt(a.length) : null;
  return { mean, sd, q, median, welch, mannWhitney, pearson, spearman, linreg, ols, describe, ci95, tp2, tinv };
})();
const pTxt = p => p == null ? '' : p < 0.001 ? 'p < 0.001' : `p = ${p.toFixed(p < 0.01 ? 3 : 2)}`;
const conf = (n, min, p) => n < min ? { lvl: 'none', t: `Not enough data yet (n = ${n}; need about ${min}).` } : p == null ? { lvl: 'low', t: `n = ${n}.` } : p < 0.01 ? { lvl: 'high', t: `Strong evidence (${pTxt(p)}, n = ${n}).` } : p < 0.05 ? { lvl: 'med', t: `Moderate evidence (${pTxt(p)}, n = ${n}). Could still be chance.` } : { lvl: 'low', t: `Not statistically significant (${pTxt(p)}, n = ${n}). Likely noise so far.` };

/* ---------- installed components (derived from entries; nothing extra stored) ---------- */
const SYS = [
  ['engine', 'Engine oil & filter', I.oil, ['oil']], ['coolant', 'Coolant', I.coolant, ['coolant']], ['ignition', 'Spark plugs, wires & coils', I.plugs, ['plugs', 'wires', 'coils']],
  ['battery', 'Battery', I.battery, ['battery']], ['tires', 'Tires', I.tires, ['tire:FL', 'tire:FR', 'tire:RL', 'tire:RR', 'tire:Spare']],
  ['brakes', 'Brakes', I.brakes, ['pads:Front', 'rotors:Front', 'pads:Rear', 'rotors:Rear']], ['air', 'Filters', I.air, ['airFilter', 'cabinFilter']],
];
const SLOT = { oil: 'Engine oil & filter', coolant: 'Coolant', plugs: 'Spark plugs', wires: 'Plug wires', coils: 'Ignition coils', battery: 'Battery', airFilter: 'Engine air filter', cabinFilter: 'Cabin air filter',
  'tire:FL': 'Tire, front left', 'tire:FR': 'Tire, front right', 'tire:RL': 'Tire, rear left', 'tire:RR': 'Tire, rear right', 'tire:Spare': 'Spare tire', 'pads:Front': 'Front brake pads', 'pads:Rear': 'Rear brake pads', 'rotors:Front': 'Front rotors', 'rotors:Rear': 'Rear rotors' };
const slotFamily = s => s.split(':')[0];
const FAMILY = { oil: 'Engine oil', coolant: 'Coolant', plugs: 'Spark plugs', wires: 'Plug wires', coils: 'Ignition coils', battery: 'Batteries', tire: 'Tires', pads: 'Brake pads', rotors: 'Rotors', airFilter: 'Engine air filters', cabinFilter: 'Cabin air filters' };
const famSec = { oil: 'oil', coolant: 'coolant', plugs: 'plugs', wires: 'plugs', coils: 'plugs', battery: 'battery', tire: 'tires', pads: 'brakes', rotors: 'brakes', airFilter: 'airFilter', cabinFilter: 'cabinFilter' };
const ecost = e => num(e.cost) || 0;
function componentsOf(v) {
  const out = [], add = (slot, e, o) => out.push({ key: `${e.id}:${slot}`, vid: v.id, slot, fam: slotFamily(slot), label: SLOT[slot] || slot, entry: e, inst: { date: e.date, odo: num(e.odo) }, intMiles: num(e.intMiles), intMonths: num(e.intMonths), ...o });
  const pc = (e, k) => e[k] && num(e[k].cost) != null ? num(e[k].cost) : null;
  const invInfo = (e, k) => { const s = e[k]; if (!s || !s.inv) return null; const x = (db.inventory || []).find(y => y.id === s.inv.id); const bought = x && x.date; return { invId: s.inv.id, shelfDays: bought ? daysBetween(bought, e.date) : null, bought, unitPaid: s.unitPrice, nowUnit: x ? (invMarket(x) || {}).unit ?? null : null }; };
  for (const e of v.maint.oil) add('oil', e, { brand: e.brand, part: [e.viscosity, e.oilType].filter(Boolean).join(' '), detail: [e.filterBrand, e.filterPart].filter(Boolean).join(' ') && `Filter ${[e.filterBrand, e.filterPart].filter(Boolean).join(' ')}`, cost: ecost(e), inv: invInfo(e, 'oilPick') });
  for (const e of v.maint.coolant) if (e.service === 'Flush' || e.service === 'Drain & fill') add('coolant', e, { brand: e.brand, part: [e.ctype, e.mix].filter(Boolean).join(' '), cost: ecost(e) });
  for (const e of v.maint.plugs) {
    const w = e.wires && e.wires !== 'None' && e.wires !== 'Boots' ? e.wires.toLowerCase() : null; const wc = w ? pc(e, 'coilPick') : null, pcost = pc(e, 'plugPick');
    const split = w && wc == null && pcost == null;
    if (e.brand || e.part || !w) add('plugs', e, { brand: e.brand, part: e.part, detail: [e.ptype, e.gap && `gap ${e.gap}"`, e.qty && `×${e.qty}`].filter(Boolean).join(' · '), cost: pcost ?? (w ? (wc != null ? ecost(e) - wc : ecost(e) / 2) : ecost(e)), est: split, inv: invInfo(e, 'plugPick') });
    if (w) add(w, e, { brand: e.wireBrand, part: e.wirePart, cost: wc ?? (pcost != null ? ecost(e) - pcost : ecost(e) / 2), est: split, inv: invInfo(e, 'coilPick') });
  }
  for (const e of v.maint.battery) if (has(e.events, 'New battery')) add('battery', e, { brand: e.brand, part: e.model, detail: [e.group && `group ${e.group}`, e.cca && `${e.cca} CCA`].filter(Boolean).join(' · '), cost: ecost(e), warranty: num(e.warranty), inv: invInfo(e, 'batPick') });
  for (const e of v.maint.tires) if (has(e.services, 'New tires')) {
    const pos = Array.isArray(e.positions) && e.positions.length ? e.positions : (num(e.count) && num(e.count) < 4 ? ['FL', 'FR', 'RL', 'RR'].slice(0, num(e.count)) : ['FL', 'FR', 'RL', 'RR']);
    pos.forEach(p => add('tire:' + p, e, { brand: e.brand, part: [e.model, e.size].filter(Boolean).join(' '), detail: [e.loadSpeed, e.dot && `DOT ${e.dot}`].filter(Boolean).join(' · '), cost: ecost(e) / pos.length, est: pos.length > 1, inv: invInfo(e, 'tirePick') }));
  }
  for (const e of v.maint.brakes) {
    const axes = e.axle === 'Both' ? ['Front', 'Rear'] : [e.axle || 'Front'], jobs = (e.padsReplaced ? 1 : 0) + (e.rotors === 'Replaced' ? 1 : 0); if (!jobs) continue;
    axes.forEach(ax => { if (e.padsReplaced) add('pads:' + ax, e, { brand: e.padBrand, part: [e.padPart, e.padMaterial].filter(Boolean).join(' '), cost: ecost(e) / axes.length / jobs, est: axes.length * jobs > 1 }); if (e.rotors === 'Replaced') add('rotors:' + ax, e, { brand: e.rotorBrand, part: '', cost: ecost(e) / axes.length / jobs, est: axes.length * jobs > 1 }); });
  }
  for (const id of ['airFilter', 'cabinFilter']) for (const e of (v.maint[id] || [])) if (e.action === 'Replaced') add(id, e, { brand: e.brand, part: e.part, cost: ecost(e), inv: invInfo(e, 'pick') });
  // close each component when the next one in the same slot goes in
  const odoNow = curOdo(v), today = todayISO(), bySlot = new Map();
  out.forEach(c => { const a = bySlot.get(c.slot) || []; a.push(c); bySlot.set(c.slot, a); });
  bySlot.forEach(a => { a.sort((x, y) => (x.inst.odo ?? 0) - (y.inst.odo ?? 0) || String(x.inst.date).localeCompare(String(y.inst.date)));
    a.forEach((c, i) => { const nx = a[i + 1]; c.rem = nx ? { date: nx.inst.date, odo: nx.inst.odo, by: nx.entry } : null; c.current = !nx;
      const endO = nx ? nx.inst.odo : odoNow, endD = nx ? nx.inst.date : today;
      c.miles = endO != null && c.inst.odo != null ? Math.max(0, endO - c.inst.odo) : null; c.days = c.inst.date ? Math.max(0, daysBetween(c.inst.date, endD)) : null;
      c.cpm = c.miles > 0 && c.cost ? c.cost / c.miles : null; c.cpmo = c.days > 0 && c.cost ? c.cost / (c.days / 30.44) : null;
      if (!nx && c.cost && ['oil', 'coolant', 'plugs', 'wires', 'coils', 'battery', 'airFilter', 'cabinFilter'].includes(c.fam)) { // still on the car: spread the cost over its expected life so a fresh part doesn't look expensive
        const im = num(c.entry?.intMiles), imo = num(c.entry?.intMonths) || (c.fam === 'battery' ? 48 : null);
        if (im && c.miles != null && c.miles < im) { c.cpm = c.cost / im; c.proj = true; }
        if (imo && c.days != null && c.days / 30.44 < imo) { c.cpmo = c.cost / imo; c.proj = true; } }
      if (nx && (c.slot === 'airFilter' || c.slot === 'cabinFilter')) c.removedCond = nx.entry.condition || null; }); });
  out.forEach(c => wearOf(v, c));
  return out;
}
function wearOf(v, c) {
  const inRange = e => num(e.odo) != null && c.inst.odo != null && num(e.odo) >= c.inst.odo && (!c.rem || num(e.odo) <= c.rem.odo);
  if (c.fam === 'tire') { const pos = c.slot.split(':')[1].toLowerCase(); const pts = v.maint.tires.filter(e => inRange(e) && e.tread && num(e.tread[pos]) != null).map(e => [num(e.odo) - c.inst.odo, num(e.tread[pos])]);
    if (pts.length) { c.lastTread = pts.sort((a, b) => a[0] - b[0])[pts.length - 1][1]; c.newTread = pts[0][0] === 0 ? pts[0][1] : 10; }
    if (pts.length >= 2) { const r = St.linreg(pts.map(p => p[0] / 1000), pts.map(p => p[1])); if (r) c.wear = { rate: -r.b, unit: '/32 per 1,000 mi', n: pts.length }; } }
  if (c.fam === 'pads') { const ax = c.slot.split(':')[1]; const pts = v.maint.brakes.filter(e => inRange(e) && num(e.thickness) != null && (e.axle === ax || e.axle === 'Both')).map(e => [num(e.odo) - c.inst.odo, num(e.thickness)]);
    if (!pts.some(p => p[0] === 0)) pts.unshift([0, 11]);
    pts.sort((a, b) => a[0] - b[0]); c.lastPad = pts[pts.length - 1][1];
    if (pts.length >= 2) { const r = St.linreg(pts.map(p => p[0] / 1000), pts.map(p => p[1])); if (r) c.wear = { rate: -r.b, unit: 'mm per 1,000 mi', n: pts.length, assumedNew: true }; } }
  if (c.fam === 'battery') { const pts = v.maint.battery.filter(e => inRange(e) && num(e.resting) != null).map(e => [daysBetween(c.inst.date, e.date) / 365.25, num(e.resting)]);
    if (pts.length) c.lastVolt = pts.sort((a, b) => a[0] - b[0])[pts.length - 1][1];
    if (pts.length >= 2) { const r = St.linreg(pts.map(p => p[0]), pts.map(p => p[1])); if (r) c.wear = { rate: r.b, unit: 'V per year', n: pts.length }; } }
}
const compsAll = memo(() => db.vehicles.flatMap(componentsOf));
const compsV = v => compsAll().filter(c => c.vid === v.id);
/* remaining life + status for a current component */
function health(c, v) {
  const sp = v.specs || {}; let frac = null, basis = '', nextTxt = '';
  if (c.fam === 'tire' && c.lastTread != null) { frac = (c.lastTread - 2) / Math.max(1, (c.newTread || 10) - 2); basis = `${c.lastTread}/32 tread`;
    if (c.wear && c.wear.rate > 0.05) nextTxt = `~${fmt(Math.max(0, (c.lastTread - 2) / c.wear.rate * 1000), 0)} mi left at your wear rate`; }
  else if (c.fam === 'pads' && c.lastPad != null) { const mn = num(sp.padMinMm) || 3; frac = (c.lastPad - mn) / (11 - mn); basis = `${c.lastPad} mm pads`; if (c.wear && c.wear.rate > 0.01) nextTxt = `~${fmt(Math.max(0, (c.lastPad - mn) / c.wear.rate * 1000), 0)} mi to ${mn} mm`; }
  else if (c.fam === 'battery') { const age = (c.days || 0) / 365.25; frac = 1 - age / 5; basis = `${fmt(age, 1)} yrs old (typical life 3–5 yrs)`; if (c.lastVolt != null && c.lastVolt < 12.4) frac = Math.min(frac, c.lastVolt < 12.2 ? 0 : 0.15); }
  if (frac == null && (c.intMiles || c.intMonths)) { const fm = c.intMiles ? (c.miles || 0) / c.intMiles : 0, fd = c.intMonths ? (c.days || 0) / (c.intMonths * 30.44) : 0; frac = 1 - Math.max(fm, fd);
    basis = [c.intMiles && `${fmt(c.miles)} of ${fmt(c.intMiles)} mi`, c.intMonths && `${fmt((c.days || 0) / 30.44, 0)} of ${c.intMonths} mo`].filter(Boolean).join(' · ');
    const dueO = c.intMiles ? c.inst.odo + c.intMiles : null, dueD = c.intMonths ? addMonths(c.inst.date, c.intMonths) : null; nextTxt = [dueO && `${fmt(dueO)} mi`, dueD && fdate(dueD)].filter(Boolean).join(' or '); if (nextTxt) nextTxt = 'Next due ' + nextTxt; }
  if (frac == null) return { level: 'ok', label: 'Installed', frac: null, basis: 'No interval or measurements to estimate life', next: nextTxt };
  frac = Math.max(0, Math.min(1, frac)); const level = frac <= 0 ? 'over' : frac <= 0.15 ? 'soon' : 'ok';
  return { level, label: level === 'over' ? 'Replace' : level === 'soon' ? 'Soon' : `${fmt(frac * 100, 0)}% left`, frac, basis, next: nextTxt };
}
/* ---- “alone” stats: each component family and each brand/part on its own ---- */
function aloneStats(comps) {
  const closed = comps.filter(c => !c.current && c.miles != null);
  const fam = new Map(); comps.forEach(c => { const g = fam.get(c.fam) || []; g.push(c); fam.set(c.fam, g); });
  return [...fam.entries()].map(([f, all]) => {
    const cl = all.filter(c => !c.current && c.miles != null), mi = cl.map(c => c.miles), dy = cl.map(c => c.days).filter(x => x != null);
    const cost = sum(cl, c => c.cost || 0), miles = sum(cl, c => c.miles || 0);
    const byPart = new Map(); all.forEach(c => { const k = [c.brand || 'Unknown', c.part || ''].join(' ').trim(); const g = byPart.get(k) || []; g.push(c); byPart.set(k, g); });
    const parts = [...byPart.entries()].map(([k, a]) => { const cc = a.filter(c => !c.current && c.miles); const m = sum(cc, c => c.miles), co = sum(cc, c => c.cost || 0);
      const run = a.filter(c => c.current); const rm = sum(run, c => c.miles || 0), rc = sum(run, c => c.cost || 0);
      return { k, n: a.length, closed: cc.length, miles: St.describe(cc.map(c => c.miles)), days: St.describe(cc.map(c => c.days).filter(x => x != null)), cp1k: m > 0 ? co / m * 1000 : (rm > 0 ? rc / rm * 1000 : null), provisional: !m && rm > 0, wear: St.mean(a.filter(c => c.wear).map(c => c.wear.rate)), vehicles: [...new Set(a.map(c => c.vid))] }; })
      .sort((a, b) => (a.cp1k ?? 1e9) - (b.cp1k ?? 1e9));
    return { fam: f, label: FAMILY[f] || f, n: all.length, closed: cl.length, miles: St.describe(mi), days: St.describe(dy), cp1k: miles > 0 ? cost / miles * 1000 : null, parts, wear: St.describe(all.filter(c => c.wear).map(c => c.wear.rate)), wearUnit: (all.find(c => c.wear) || {}).wear?.unit };
  });
}
/* ---- deep dive: fuel segments joined with what was on the car at the time ---- */
function segFactors(v) {
  const s = fuelStats(v), comps = compsV(v);
  const at = (slot, odo) => comps.filter(c => c.slot === slot && c.inst.odo != null && c.inst.odo <= odo && (!c.rem || c.rem.odo > odo)).pop() || null;
  const psiAt = (odo, date) => { const e = entries(v, 'tires').find(x => x.psi && num(x.odo) <= odo && daysBetween(x.date, date) <= 75); if (!e) return null; const a = TIRE_POS.map(([k]) => num(e.psi[k])).filter(x => x != null); return a.length ? St.mean(a) : null; };
  return s.segs.map(g => { const mid = (num(g.from.odo) + num(g.to.odo)) / 2, oil = at('oil', mid), tire = at('tire:FL', mid), air = at('airFilter', mid), plug = at('plugs', mid);
    const m = parseD(g.to.date).getMonth();
    return { date: g.to.date, odo: num(g.to.odo), mpg: g.mpg, miles: g.miles, cpm: g.miles ? g.cost / g.miles : null, octane: octVal(g.from), eth: ethPct(g.from), station: (g.from.station || '').trim() || null,
      oil: oil ? [oil.brand, oil.part.split(' ')[0]].filter(Boolean).join(' ') || null : null, visc: oil ? (oil.entry.viscosity || null) : null, oilAge: oil ? mid - oil.inst.odo : null,
      tire: tire ? [tire.brand, (tire.entry.model || '')].filter(Boolean).join(' ') || null : null, psi: psiAt(num(g.to.odo), g.to.date),
      airAge: air ? mid - air.inst.odo : null, plugAge: plug ? mid - plug.inst.odo : null, month: m, winter: [11, 0, 1].includes(m) ? 1 : 0 }; });
}
const FACT_CAT = [['oil', 'Oil brand'], ['visc', 'Oil viscosity'], ['tire', 'Tires'], ['octane', 'Octane'], ['eth', 'Ethanol %'], ['station', 'Station']];
const FACT_NUM = [['airAge', 'Air filter age', 'mi', 1000], ['plugAge', 'Spark plug age', 'mi', 1000], ['oilAge', 'Miles on oil', 'mi', 1000], ['psi', 'Avg tire pressure', 'PSI', 1], ['octane', 'Octane', '', 1], ['eth', 'Ethanol', '%', 1]];
const MIN = { group: 3, corr: 8, ba: 3, ols: 12 };
function deepDive(v) {
  const rows = segFactors(v), y = rows.map(r => r.mpg), out = { n: rows.length, rows, groups: [], corr: [], ba: [], season: [], outliers: [], ols: null };
  for (const [k, l] of FACT_CAT) {
    const m = new Map(); rows.forEach(r => { if (r[k] == null) return; const key = k === 'octane' ? `${r[k]} octane` : k === 'eth' ? `E${r[k]}` : String(r[k]); const g = m.get(key) || []; g.push(r); m.set(key, g); });
    if (m.size < 2) continue;
    const gs = [...m.entries()].map(([key, a]) => { const mp = a.map(r => r.mpg), mi = sum(a, 'miles'); return { key, n: a.length, mpg: mi ? sum(a, r => r.mpg * r.miles) / mi : St.mean(mp), sd: St.sd(mp), ci: St.ci95(mp), cpm: St.mean(a.map(r => r.cpm).filter(x => x != null)), vals: mp }; }).sort((a, b) => b.mpg - a.mpg);
    const big = gs.filter(g => g.n >= 2); const t = big.length >= 2 ? St.welch(big[big.length - 1].vals, big[0].vals) : null, mw = big.length >= 2 ? St.mannWhitney(big[big.length - 1].vals, big[0].vals) : null;
    out.groups.push({ k, l, gs, test: t, mw, conf: conf(Math.min(...(big.length >= 2 ? [big[0].n, big[big.length - 1].n] : [0])), MIN.group, t && t.p) });
  }
  for (const [k, l, u, sc] of FACT_NUM) {
    const pts = rows.filter(r => r[k] != null); if (pts.length < 3 || new Set(pts.map(r => r[k])).size < 3) continue;
    const x = pts.map(r => r[k] / sc), yy = pts.map(r => r.mpg), pr = St.pearson(x, yy), sr = St.spearman(x, yy), lr = St.linreg(x, yy);
    out.corr.push({ k, l, u, sc, n: pts.length, pr, sr, lr, pts: pts.map(r => [r[k], r.mpg]), conf: conf(pts.length, MIN.corr, pr && pr.p) });
  }
  // before/after each install event that could change MPG
  const evs = compsV(v).filter(c => ['plugs', 'airFilter', 'oil', 'tire:FL', 'coils', 'wires'].includes(c.slot) && c.inst.odo != null);
  for (const c of evs) {
    const b = rows.filter(r => r.odo <= c.inst.odo && r.odo > c.inst.odo - 2500 && daysBetween(r.date, c.inst.date) <= 120).slice(-6), a = rows.filter(r => r.odo - r.miles >= c.inst.odo && r.odo < c.inst.odo + 2500).slice(0, 6);
    if (!b.length || !a.length) continue;
    const t = St.welch(b.map(r => r.mpg), a.map(r => r.mpg)), mw = St.mannWhitney(b.map(r => r.mpg), a.map(r => r.mpg)), mb = St.mean(b.map(r => r.mpg)), ma = St.mean(a.map(r => r.mpg));
    out.ba.push({ label: `${SLOT[c.slot] === 'Tire, front left' ? 'New tires' : SLOT[c.slot]}${c.brand ? ' · ' + c.brand : ''}`, date: c.inst.date, odo: c.inst.odo, nb: b.length, na: a.length, mb, ma, d: ma - mb, pct: (ma - mb) / mb, t, mw, conf: conf(Math.min(b.length, a.length), MIN.ba, t && t.p) });
  }
  const mo = new Map(); rows.forEach(r => { const a = mo.get(r.month) || []; a.push(r.mpg); mo.set(r.month, a); });
  out.season = [...Array(12).keys()].map(m => ({ m, n: (mo.get(m) || []).length, mpg: St.mean(mo.get(m) || []) }));
  if (rows.length >= 6) { const q1 = St.q(y, 0.25), q3 = St.q(y, 0.75), iqr = q3 - q1, med = St.median(y), mad = St.median(y.map(x => Math.abs(x - med))) || 0.0001;
    out.outliers = rows.filter(r => r.mpg < q1 - 1.5 * iqr || r.mpg > q3 + 1.5 * iqr || Math.abs(0.6745 * (r.mpg - med) / mad) > 3.5).map(r => ({ ...r, z: 0.6745 * (r.mpg - med) / mad })); }
  // multi-factor regression on MPG with whatever predictors have data and variance
  const cand = [['octane', 'Octane (+1)', 1], ['eth', 'Ethanol (+1 %)', 1], ['airAge', 'Air filter age (+1,000 mi)', 1000], ['plugAge', 'Plug age (+1,000 mi)', 1000], ['oilAge', 'Miles on oil (+1,000 mi)', 1000], ['psi', 'Tire pressure (+1 PSI)', 1], ['winter', 'Winter month (Dec–Feb)', 1]];
  const use = cand.filter(([k]) => { const vals = rows.map(r => r[k]); return vals.every(x => x != null) && new Set(vals).size > 1; });
  if (use.length && rows.length >= Math.max(MIN.ols, 5 * (use.length + 1))) { const X = rows.map(r => use.map(([k, , sc]) => r[k] / sc)); const m = St.ols(X, y); if (m) out.ols = { ...m, names: ['Baseline', ...use.map(u => u[1])] }; }
  else out.olsNeed = Math.max(MIN.ols, 5 * (use.length + 1));
  return out;
}
const deepCache = new Map();
const deepFor = v => { const k = v.id + ':' + DBV; if (!deepCache.has(k)) { deepCache.clear(); deepCache.set(k, deepDive(v)); } return deepCache.get(k); };
/* ---- total cost of ownership ---- */
const TCO_CATS = [['fuel', 'Fuel', 'var(--c-fuel)'], ['oil', 'Oil', 'var(--c-oil)'], ['tires', 'Tires', 'var(--c-tires)'], ['brakes', 'Brakes', 'var(--c-brakes)'], ['battery', 'Battery', 'var(--c-battery)'], ['plugs', 'Plugs / wires', 'var(--c-plugs)'], ['coolant', 'Coolant', 'var(--c-coolant)'], ['filters', 'Filters', 'var(--c-air)'], ['other', 'Other parts', 'var(--muted)']];
const secCat = id => id === 'airFilter' || id === 'cabinFilter' ? 'filters' : id;
function tcoOf(vs) {
  const by = Object.fromEntries(TCO_CATS.map(([k]) => [k, 0])), months = new Map(); let first = null, odoMin = null, odoMax = 0;
  const addM = (d, k, x) => { if (!d || !x) return; const m = d.slice(0, 7), o = months.get(m) || { fuel: 0, maint: 0 }; o[k === 'fuel' ? 'fuel' : 'maint'] += x; months.set(m, o); };
  const seen = (d, o) => { if (d && (!first || d < first)) first = d; if (o != null) { odoMin = odoMin == null ? o : Math.min(odoMin, o); odoMax = Math.max(odoMax, o); } };
  vs.forEach(v => { v.fuel.forEach(e => { const c = fillTotal(e) - fillSaved(e); by.fuel += c; addM(e.date, 'fuel', c); seen(e.date, num(e.odo)); });
    SECTIONS.forEach(s => v.maint[s.id].forEach(e => { const c = ecost(e); by[secCat(s.id)] += c; addM(e.date, s.id, c); seen(e.date, num(e.odo)); }));
    (db.plans || []).filter(p => p.vid === v.id && p.status === 'bought' && !p.invId && num(p.paid)).forEach(p => { by.other += num(p.paid); addM(p.paidDate, 'other', num(p.paid)); });
    odoMax = Math.max(odoMax, curOdo(v)); });
  const total = Object.values(by).reduce((a, b) => a + b, 0), days = first ? Math.max(1, daysBetween(first, todayISO())) : 0, miles = odoMin != null ? odoMax - odoMin : 0;
  const trend = []; const d0 = new Date(); for (let i = 11; i >= 0; i--) { const d = new Date(d0.getFullYear(), d0.getMonth() - i, 1), k = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; trend.push({ k, ...(months.get(k) || { fuel: 0, maint: 0 }) }); }
  return { by, total, days, miles, first, perMile: miles > 0 ? total / miles : null, perMonth: days >= 28 ? total / (days / 30.44) : null, perYear: days >= 28 ? total / (days / 365.25) : null, trend };
}
function projection(vs) {
  const today = todayISO(), horizon = addDays(today, 365), items = []; let fuel = 0;
  vs.forEach(v => {
    const s = fuelStats(v), recent = v.fuel.filter(e => daysBetween(e.date, today) <= 180), span = recent.length >= 2 ? daysBetween([...recent].sort(byNewest).pop().date, today) : 0;
    if (span >= 30) fuel += sum(recent, e => fillTotal(e) - fillSaved(e)) / span * 365; else if (s.spanDays > 30) fuel += (s.totalSpent - s.totalSaved) / s.spanDays * 365;
    const mpd = s.milesPerDay || 0;
    reminderItems(v).filter(r => !r.info).forEach(r => {
      const sec = SEC[r.sec], es = entries(v, r.sec), a0 = sec && (sec.anchor ? sec.anchor(es) : es[0]), last = a0 && (ecost(a0) > 0 || a0.noCharge) ? a0 : es.find(e => ecost(e) > 0), unit = last ? ecost(last) : null;
      const a = sec && (sec.anchor ? sec.anchor(entries(v, r.sec)) : entries(v, r.sec)[0]); const im = num(a?.intMiles), imo = num(a?.intMonths);
      let when = r.effDate || today; if (when < today) when = today; let n = 0, d = when;
      const stepDays = Math.min(imo ? imo * 30.44 : 1e9, im && mpd ? im / mpd : 1e9);
      while (d <= horizon && n < 12) { n++; if (!isFinite(stepDays) || stepDays >= 1e9) break; d = addDays(d, stepDays); }
      if (n && unit === 0) items.push({ t: `${r.title}${vs.length > 1 ? ' · ' + vname(v) : ''}`, n, unit: 0, cost: 0, when, free: true });
      else if (n && unit) items.push({ t: `${r.title}${vs.length > 1 ? ' · ' + vname(v) : ''}`, n, unit, cost: n * unit, when });
      else if (n) items.push({ t: `${r.title}${vs.length > 1 ? ' · ' + vname(v) : ''}`, n, unit: null, cost: 0, when, noPrice: true });
    });
  });
  (db.plans || []).filter(p => p.status === 'planned' && (vs.length > 1 ? true : p.vid === vs[0]?.id) && (!p.targetDate || p.targetDate <= horizon)).forEach(p => { const pp = planPrice(p); items.push({ t: `Planned: ${p.brand} ${p.part}`, n: 1, unit: pp.total, cost: pp.total || 0, when: p.targetDate || today, plan: true, noPrice: pp.total == null }); });
  const maint = sum(items, 'cost');
  return { fuel, maint, total: fuel + maint, items: items.sort((a, b) => b.cost - a.cost) };
}
/* ---- plain-language findings for the Insights card ---- */
function statInsights(v) {
  const out = [], dd = deepFor(v), al = aloneStats(compsV(v));
  dd.groups.forEach(g => { if (g.conf.lvl === 'med' || g.conf.lvl === 'high') { const hi = g.gs[0], lo = g.gs[g.gs.length - 1]; out.push({ t: `${g.l}: ${hi.key} tanks average ${fmt(hi.mpg - lo.mpg, 1)} MPG more than ${lo.key} (${fmt(hi.mpg, 1)} vs ${fmt(lo.mpg, 1)}). ${g.conf.t}`, kind: 'good' }); } });
  dd.corr.forEach(c => { if (c.conf.lvl === 'med' || c.conf.lvl === 'high') out.push({ t: `${c.l} and MPG: each +${c.sc === 1000 ? '1,000 mi' : '1 ' + c.u} goes with ${c.lr.b >= 0 ? '+' : ''}${fmt(c.lr.b, 2)} MPG (95% CI ${fmt(c.lr.ci[0], 2)} to ${fmt(c.lr.ci[1], 2)}). ${c.conf.t}`, kind: c.lr.b < 0 ? 'warn' : 'good' }); });
  dd.ba.forEach(b => { if (b.conf.lvl === 'med' || b.conf.lvl === 'high') out.push({ t: `After the ${b.label.split(' · ')[0].toLowerCase()} change${b.label.includes(' · ') ? ' (' + b.label.split(' · ').slice(1).join(' · ') + ')' : ''} on ${fdate(b.date)}, MPG went ${b.d >= 0 ? 'up' : 'down'} ${fmt(Math.abs(b.d), 1)} (${fmt(Math.abs(b.pct * 100), 0)}%). ${b.conf.t}`, kind: b.d >= 0 ? 'good' : 'warn' }); });
  const t = al.find(f => f.fam === 'tire'); if (t && t.parts.length >= 2 && t.parts[0].cp1k != null) out.push({ t: `Best-value tires so far: ${t.parts[0].k} at ${money(t.parts[0].cp1k)} per 1,000 mi${t.parts[0].provisional ? ' (still on the car, provisional)' : ''}.` });
  compsV(v).filter(c => c.current).forEach(c => { const h = health(c, v); if (h.level === 'over') out.push({ t: `${c.label} looks due for replacement (${h.basis}).`, kind: 'warn' }); });
  return out;
}
/* ---- CSV export of all stats ---- */
function exportStatsCSV(v) {
  const q = x => { const t = String(x ?? ''); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; }, L = [], row = a => L.push(a.map(q).join(','));
  const f = (x, d = 2) => x == null || !isFinite(x) ? '' : Number(x).toFixed(d);
  row(['AutoLog stats export', vname(v), new Date().toISOString()]); L.push('');
  row(['section', 'component', 'slot', 'brand', 'part', 'install_date', 'install_odo', 'removal_date', 'removal_odo', 'current', 'miles', 'days', 'cost', 'cost_per_mile', 'cost_per_month', 'wear_rate', 'wear_unit', 'shelf_days', 'inventory_unit_paid', 'inventory_unit_now', 'removed_condition', 'cost_estimated_split']);
  compsV(v).forEach(c => row(['component', c.label, c.slot, c.brand, c.part, c.inst.date, c.inst.odo, c.rem?.date, c.rem?.odo, c.current ? 'yes' : 'no', c.miles, c.days, f(c.cost), f(c.cpm, 4), f(c.cpmo), f(c.wear?.rate, 3), c.wear?.unit, c.inv?.shelfDays, f(c.inv?.unitPaid), f(c.inv?.nowUnit), c.removedCond, c.est ? 'yes' : '']));
  L.push(''); row(['section', 'family', 'brand_part', 'installs', 'closed', 'mean_miles', 'median_miles', 'sd_miles', 'min_miles', 'max_miles', 'mean_days', 'cost_per_1000mi', 'mean_wear']);
  aloneStats(compsV(v)).forEach(g => g.parts.forEach(p => row(['alone', g.label, p.k, p.n, p.closed, f(p.miles.mean, 0), f(p.miles.median, 0), f(p.miles.sd, 0), f(p.miles.min, 0), f(p.miles.max, 0), f(p.days.mean, 0), f(p.cp1k), f(p.wear, 3)])));
  const dd = deepFor(v);
  L.push(''); row(['section', 'date', 'odometer', 'mpg', 'miles', 'cost_per_mile', 'octane', 'ethanol_pct', 'station', 'oil', 'viscosity', 'miles_on_oil', 'tires', 'avg_psi', 'air_filter_age_mi', 'plug_age_mi', 'month']);
  dd.rows.forEach(r => row(['segment', r.date, r.odo, f(r.mpg), r.miles, f(r.cpm, 4), r.octane, r.eth, r.station, r.oil, r.visc, f(r.oilAge, 0), r.tire, f(r.psi, 1), f(r.airAge, 0), f(r.plugAge, 0), r.month + 1]));
  L.push(''); row(['section', 'factor', 'group', 'n', 'mpg', 'sd', 'ci95', 'welch_p', 'mann_whitney_p']);
  dd.groups.forEach(g => g.gs.forEach((x, i) => row(['group', g.l, x.key, x.n, f(x.mpg), f(x.sd), f(x.ci), i === 0 ? f(g.test?.p, 4) : '', i === 0 ? f(g.mw?.p, 4) : ''])));
  L.push(''); row(['section', 'factor', 'n', 'pearson_r', 'pearson_p', 'spearman_rho', 'spearman_p', 'slope', 'slope_ci_low', 'slope_ci_high', 'r2']);
  dd.corr.forEach(c => row(['correlation', c.l, c.n, f(c.pr?.r, 3), f(c.pr?.p, 4), f(c.sr?.rho, 3), f(c.sr?.p, 4), f(c.lr?.b, 4), f(c.lr?.ci[0], 4), f(c.lr?.ci[1], 4), f(c.lr?.r2, 3)]));
  L.push(''); row(['section', 'event', 'date', 'n_before', 'n_after', 'mpg_before', 'mpg_after', 'diff', 'welch_p', 'mann_whitney_p']);
  dd.ba.forEach(b => row(['before_after', b.label, b.date, b.nb, b.na, f(b.mb), f(b.ma), f(b.d), f(b.t?.p, 4), f(b.mw?.p, 4)]));
  if (dd.ols) { L.push(''); row(['section', 'term', 'coef', 'se', 'p', 'n', 'r2', 'adj_r2']); dd.ols.names.forEach((n, i) => row(['regression', n, f(dd.ols.beta[i], 4), f(dd.ols.se[i], 4), f(dd.ols.p[i], 4), dd.ols.n, f(dd.ols.r2, 3), f(dd.ols.adjR2, 3)])); }
  const t = tcoOf([v]); L.push(''); row(['section', 'category', 'amount']); TCO_CATS.forEach(([k, l]) => row(['tco', l, f(t.by[k])])); row(['tco', 'Total', f(t.total)]); row(['tco', 'Per mile', f(t.perMile, 4)]); row(['tco', 'Per month', f(t.perMonth)]); row(['tco', 'Per year', f(t.perYear)]);
  download(`autolog-stats-${vname(v).replace(/\W+/g, '-')}-${todayISO()}.csv`, L.join('\n'), 'text/csv'); toast('Stats CSV downloaded');
}
/* ---------- charts (tiny SVG, no libraries) ---------- */
function donut(parts, size = 132) {
  const tot = parts.reduce((t, p) => t + p.v, 0); if (!tot) return `<svg viewBox="0 0 ${size} ${size}" class="donut"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 12}" fill="none" stroke="var(--line)" stroke-width="18"/></svg>`;
  const r = size / 2 - 12, C = 2 * Math.PI * r; let off = 0;
  return `<svg viewBox="0 0 ${size} ${size}" class="donut" role="img" aria-label="Cost breakdown"><g transform="rotate(-90 ${size / 2} ${size / 2})">${parts.filter(p => p.v > 0).map(p => { const L = p.v / tot * C, s = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${p.c}" stroke-width="18" stroke-dasharray="${Math.max(0, L - 1.5).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"/>`; off += L; return s; }).join('')}</g></svg>`;
}
function barsTrend(trend) {
  const W = 340, H = 120, B = 18, max = Math.max(1, ...trend.map(t => t.fuel + t.maint)), bw = (W - 8) / trend.length;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly cost, last 12 months">${trend.map((t, i) => { const x = 4 + i * bw, hf = (t.fuel / max) * (H - B - 8), hm = (t.maint / max) * (H - B - 8);
    return `<rect x="${(x + 3).toFixed(1)}" y="${(H - B - hf).toFixed(1)}" width="${(bw - 6).toFixed(1)}" height="${hf.toFixed(1)}" rx="3" fill="var(--c-fuel)"/><rect x="${(x + 3).toFixed(1)}" y="${(H - B - hf - hm).toFixed(1)}" width="${(bw - 6).toFixed(1)}" height="${hm.toFixed(1)}" rx="3" fill="var(--accent-2)"/>${i % 2 === 0 ? `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle">${new Date(t.k + '-02').toLocaleDateString('en-US', { month: 'short' })}</text>` : ''}`; }).join('')}</svg>
    <div class="legend"><span><i style="background:var(--c-fuel)"></i>Fuel</span><span><i style="background:var(--accent-2)"></i>Maintenance &amp; parts</span></div>`;
}
function scatter(pts, lr, xl, yl = 'MPG') {
  if (pts.length < 2) return '';
  const W = 340, H = 180, L = 34, R = 10, T = 10, B = 26, xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys) - 1, y1 = Math.max(...ys) + 1;
  const X = x => L + (x1 === x0 ? 0.5 : (x - x0) / (x1 - x0)) * (W - L - R), Y = y => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
  let band = '';
  if (lr) { const sc = lr.scale || 1, steps = 16, up = [], dn = []; for (let i = 0; i <= steps; i++) { const xv = x0 + (x1 - x0) * i / steps, f = lr.a + lr.b * xv / sc, w = lr.band(xv / sc); up.push(`${X(xv).toFixed(1)},${Y(f + w).toFixed(1)}`); dn.unshift(`${X(xv).toFixed(1)},${Y(f - w).toFixed(1)}`); }
    band = `<polygon points="${[...up, ...dn].join(' ')}" fill="var(--accent)" opacity=".12"/><line x1="${X(x0)}" y1="${Y(lr.a + lr.b * x0 / sc)}" x2="${X(x1)}" y2="${Y(lr.a + lr.b * x1 / sc)}" stroke="var(--accent)" stroke-width="2.4"/>`; }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(xl)} vs ${esc(yl)}">${[0, 1, 2].map(i => { const y = T + i * (H - T - B) / 2; return `<line class="grid" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text x="${L - 4}" y="${y + 3}" text-anchor="end">${fmt(y1 - i * (y1 - y0) / 2, 0)}</text>`; }).join('')}
    ${band}${pts.map(p => `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="3.4" fill="var(--accent-2)" stroke="var(--surface)" stroke-width="1.2"/>`).join('')}
    <text x="${L}" y="${H - 6}">${fmt(x0, 0)}</text><text x="${W - R}" y="${H - 6}" text-anchor="end">${fmt(x1, 0)} ${esc(xl)}</text></svg>`;
}
function hbars(rows, unit = '', fmtv = x => fmt(x, 1)) { const max = Math.max(...rows.map(r => r.v || 0)) || 1; return `<table class="cmp"><tbody>${rows.map(r => `<tr><td><b>${esc(r.l)}</b>${r.sub ? `<br><small class="muted">${esc(r.sub)}</small>` : ''}</td><td class="barcell"><div class="bar"><i style="width:${((r.v || 0) / max * 100).toFixed(0)}%"></i></div></td><td><b>${r.v == null ? '—' : fmtv(r.v)}</b>${unit ? `<small> ${unit}</small>` : ''}</td><td class="muted">${r.n != null ? 'n=' + r.n : ''}</td></tr>`).join('')}</tbody></table>`; }
function timeline(v) {
  const rows = segFactors(v); if (rows.length < 2) return '<p class="muted">Log a few full fill-ups to see the MPG timeline.</p>';
  const W = 340, H = 170, L = 30, R = 8, T = 18, B = 22, t = rows.map(r => parseD(r.date).getTime()), y = rows.map(r => r.mpg), t0 = Math.min(...t), t1 = Math.max(...t), y0 = Math.min(...y) - 1, y1 = Math.max(...y) + 1;
  const X = s => L + (t1 === t0 ? .5 : (s - t0) / (t1 - t0)) * (W - L - R), Y = m => T + (1 - (m - y0) / (y1 - y0)) * (H - T - B);
  const ev = compsV(v).filter(c => c.inst.date && ['oil', 'plugs', 'airFilter', 'tire:FL', 'cabinFilter', 'battery'].includes(c.slot)).map(c => ({ t: parseD(c.inst.date).getTime(), c })).filter(e => e.t >= t0 && e.t <= t1);
  const col = { oil: 'var(--c-oil)', plugs: 'var(--c-plugs)', airFilter: 'var(--c-air)', 'tire:FL': 'var(--c-tires)', cabinFilter: 'var(--c-air)', battery: 'var(--c-battery)' };
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="MPG timeline with component installs">${[0, 1, 2].map(i => { const yy = T + i * (H - T - B) / 2; return `<line class="grid" x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/><text x="${L - 4}" y="${yy + 3}" text-anchor="end">${fmt(y1 - i * (y1 - y0) / 2, 0)}</text>`; }).join('')}
    ${ev.map(e => `<line x1="${X(e.t).toFixed(1)}" x2="${X(e.t).toFixed(1)}" y1="${T - 6}" y2="${H - B}" stroke="${col[e.c.slot]}" stroke-width="1.6" stroke-dasharray="3 3"/><circle cx="${X(e.t).toFixed(1)}" cy="${T - 8}" r="4" fill="${col[e.c.slot]}"><title>${esc(SLOT[e.c.slot])} ${fdate(e.c.inst.date)}</title></circle>`).join('')}
    <path d="${rows.map((r, i) => `${i ? 'L' : 'M'}${X(t[i]).toFixed(1)},${Y(r.mpg).toFixed(1)}`).join('')}" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linejoin="round"/>
    ${rows.map((r, i) => `<circle cx="${X(t[i]).toFixed(1)}" cy="${Y(r.mpg).toFixed(1)}" r="2.6" fill="var(--accent)"/>`).join('')}
    <text x="${L}" y="${H - 5}">${fdate(rows[0].date)}</text><text x="${W - R}" y="${H - 5}" text-anchor="end">${fdate(rows[rows.length - 1].date)}</text></svg>
    <div class="legend">${[['var(--c-oil)', 'Oil'], ['var(--c-plugs)', 'Plugs'], ['var(--c-air)', 'Filters'], ['var(--c-tires)', 'Tires'], ['var(--c-battery)', 'Battery']].map(([c, l]) => `<span><i style="background:${c}"></i>${l}</span>`).join('')}</div>`;
}
/* ---------- dashboard ---------- */
const dashAll = () => db.settings.dashAll === true && db.vehicles.length > 1;
function viewDash(v) {
  const all = dashAll(), vs = all ? db.vehicles : [v], t = tcoOf(vs), pj = projection(vs);
  const s = fuelStats(v), ins = [...(all ? [] : statInsights(v)), ...insights(v, s)];
  const dn = dueNow(), dOver = dn.filter(i => i.level === 'over').length, inv = invTotals();
  const banner = dn.length && !sessionStorage.getItem('autolog:bannerDismissed') ? `<div class="banner ${dOver ? 'over' : 'soon'}" role="status"><a href="#/reminders" style="color:inherit;flex:1">🔔 <b>${dOver ? `${dOver} overdue` : ''}${dOver && dn.length - dOver ? ', ' : ''}${dn.length - dOver ? `${dn.length - dOver} due soon` : ''}</b> across your vehicles. View reminders →</a><button class="icon-btn" data-act="dismissBanner" aria-label="Dismiss">${I.close}</button></div>` : '';
  const parts = TCO_CATS.map(([k, l, c]) => ({ k, l, c, v: t.by[k] })), shown = parts.filter(p => p.v > 0).sort((a, b) => b.v - a.v);
  const mpgAll = all ? (() => { let mi = 0, g = 0; vs.forEach(x => { const f = fuelStats(x); mi += f.segMiles || 0; g += sum(f.segs, 'gal'); }); return g ? mi / g : null; })() : s.avgMpg;
  const saved = all ? sum(vs, x => fuelStats(x).totalSaved) : s.totalSaved;
  const sts = SECTIONS.map(sec => ({ sec, st: sectionStatus(sec, v) })), over = sts.filter(x => x.st.level === 'over').length, soon = sts.filter(x => x.st.level === 'soon').length;
  return `${banner}<section class="tco-hero">
      <div class="tco-top"><div><div class="eyebrow">${all ? `All ${db.vehicles.length} vehicles` : esc(vdesc(v) || 'Vehicle')}</div><h2>${all ? 'Your fleet' : esc(vname(v))}</h2></div>
        ${db.vehicles.length > 1 ? `<div class="seg tiny" role="radiogroup" aria-label="Scope"><label><input type="radio" name="dscope" value="one" data-act="dashScope" ${!all ? 'checked' : ''}><span>This</span></label><label><input type="radio" name="dscope" value="all" data-act="dashScope" ${all ? 'checked' : ''}><span>All</span></label></div>` : `<button class="chip-btn" data-act="odo" aria-label="Update odometer">${I.gauge} ${fmt(curOdo(v))} mi</button>`}</div>
      <div class="tco-label">Total cost of ownership${t.first ? ` since ${fdate(t.first)}` : ''}</div>
      <div class="tco-big">${money(t.total, 0)}</div>
      <div class="tco-rates"><div><b>${t.perMile != null ? c3(t.perMile) : '—'}</b><span>per mile</span></div><div><b>${t.perMonth != null ? money(t.perMonth, 0) : '—'}</b><span>per month</span></div><div><b>${t.perYear != null ? money(t.perYear, 0) : '—'}</b><span>per year</span></div></div>
      <div class="tco-break">${donut(parts)}<ul class="tco-legend">${shown.slice(0, 6).map(p => `<li><i style="background:${p.c}"></i><span>${esc(p.l)}</span><b>${money(p.v, 0)}</b><small>${fmt(p.v / (t.total || 1) * 100, 0)}%</small></li>`).join('') || '<li class="muted">Log fill-ups and services with prices to see where the money goes.</li>'}</ul></div>
      <div class="qa"><button class="btn primary" data-act="addFuel">${I.fuel} Log fuel</button><button class="btn" data-act="pickService">${I.wrench} Log service</button><button class="btn" data-act="addPlan">${I.list} Plan part</button></div>
    </section>
    <div class="kpis">
      <a class="kpi" href="#/fuel"><span>Avg MPG</span><b>${fmt(mpgAll, 1)}</b></a><a class="kpi" href="#/stats"><span>Cost / mile</span><b>${t.perMile != null ? c3(t.perMile) : '—'}</b></a>
      <a class="kpi" href="#/rewards"><span>Rewards saved</span><b>${money(saved, 0)}</b></a><a class="kpi" href="#/inventory"><span>Inventory</span><b>${money(inv.value, 0)}</b></a>
      <a class="kpi ${dOver ? 'over' : dn.length ? 'soon' : ''}" href="#/reminders"><span>Items due</span><b>${fmt(dn.length)}</b></a><a class="kpi" href="#/overview"><span>Parts on car</span><b>${fmt(compsV(v).filter(c => c.current).length)}</b></a>
    </div>
    <section class="card"><div class="card-head"><h3>${I.chart} Cost trend</h3><span class="muted">last 12 months</span></div>${barsTrend(t.trend)}</section>
    <section class="card proj"><div class="card-head"><h3>Next 12 months</h3><b class="proj-total">≈ ${money(pj.total, 0)}</b></div>
      <div class="proj-split"><div><span>Fuel at your pace</span><b>${money(pj.fuel, 0)}</b></div><div><span>Upcoming service &amp; planned parts</span><b>${money(pj.maint, 0)}</b></div></div>
      ${pj.items.length ? `<ul class="proj-list">${pj.items.slice(0, 5).map(i => `<li><span>${esc(i.t)}${i.n > 1 ? ` ×${i.n}` : ''}</span><b>${i.noPrice ? '<small class="muted">no price yet</small>' : i.free ? '<small class="muted">free last time</small>' : money(i.cost, 0)}</b></li>`).join('')}</ul>` : ''}
      <div class="insights-note">Estimated from your recent fuel spending, service intervals with the last price you paid, and open planned parts.</div></section>
    <section class="card"><h3><span class="spark">${I.spark}</span> Top insights</h3>${insightsHTML(ins.slice(0, 3))}<div class="btn-row"><a href="#/deep" class="btn small">${I.layers} Deep dive</a><a href="#/stats" class="btn small">${I.chart} Parts life</a></div></section>
    ${all ? '' : `<section class="card"><div class="card-head"><h3>Maintenance</h3><a href="#/overview" class="link" style="margin:0">What’s on the car →</a></div>
      <div class="status-summary">${over ? `<span class="pill over">${over} overdue</span>` : ''}${soon ? `<span class="pill soon">${soon} need attention</span>` : ''}${!over && !soon ? `<span class="pill ok">All good</span>` : ''}</div>
      <div class="status-list">${sts.map(({ sec, st }) => `<a class="srow" href="#/service/${sec.id}"><span class="sicon c-${sec.id}">${sec.icon}</span><span class="sbody"><b>${esc(sec.title)}</b><small>${esc(st.text)}</small></span>${pill(st)}</a>`).join('')}</div></section>`}`;
}
/* ---------- vehicle overview: what’s on the car right now ---------- */
function carDiagram(v, cur) {
  const lv = slot => { const c = cur.find(x => x.slot === slot); return c ? health(c, v).level : 'none'; };
  const worst = slots => slots.map(lv).reduce((a, b) => RANK[b] > RANK[a] ? b : a, 'none');
  const z = (id, lvl, shape, label) => `<a href="#/overview/${id}" class="zone ${lvl}" aria-label="${esc(label)}">${shape}</a>`;
  const tire = (x, y, slot) => z('tires', lv(slot), `<rect x="${x}" y="${y}" width="26" height="54" rx="9"/>`, SLOT[slot]);
  return `<svg viewBox="0 0 220 330" class="cardiag" role="img" aria-label="Top-down view of the vehicle">
    <path d="M60 30 Q110 0 160 30 L172 120 Q178 165 172 210 L166 300 Q110 330 54 300 L48 210 Q42 165 48 120 Z" class="body"/>
    <path d="M70 118 Q110 100 150 118 L146 150 Q110 140 74 150 Z" class="glass"/><path d="M76 232 Q110 242 144 232 L148 262 Q110 276 72 262 Z" class="glass"/>
    ${z('engine', worst(['oil', 'coolant', 'plugs', 'coils', 'wires', 'battery', 'airFilter']), '<rect x="74" y="30" width="72" height="66" rx="16"/>', 'Engine bay')}
    ${z('cabin', worst(['cabinFilter']), '<rect x="80" y="160" width="60" height="58" rx="12"/>', 'Cabin')}
    ${z('brakes', worst(['pads:Front', 'rotors:Front']), '<rect x="62" y="86" width="96" height="12" rx="6"/>', 'Front brakes')}
    ${z('brakes', worst(['pads:Rear', 'rotors:Rear']), '<rect x="62" y="270" width="96" height="12" rx="6"/>', 'Rear brakes')}
    ${tire(18, 64, 'tire:FL')}${tire(176, 64, 'tire:FR')}${tire(18, 246, 'tire:RL')}${tire(176, 246, 'tire:RR')}
    <text x="31" y="58" text-anchor="middle">FL</text><text x="189" y="58" text-anchor="middle">FR</text><text x="31" y="316" text-anchor="middle">RL</text><text x="189" y="316" text-anchor="middle">RR</text>
    <text x="110" y="68" text-anchor="middle" class="zl">ENGINE</text><text x="110" y="194" text-anchor="middle" class="zl">CABIN</text></svg>`;
}
const SYS_ZONE = { engine: ['engine', 'coolant', 'ignition', 'battery', 'air'], tires: ['tires'], brakes: ['brakes'], cabin: ['air'] };
function compRow(c, v) {
  const h = health(c, v);
  return `<a class="comp" href="#/comp/${encodeURIComponent(c.slot)}"><div class="comp-main"><b>${esc(c.label)}</b><small>${esc([c.brand, c.part].filter(Boolean).join(' ') || 'Brand not recorded')}${c.detail ? ' · ' + esc(c.detail) : ''}</small>
    <small>Installed ${fdate(c.inst.date)}${c.inst.odo != null ? ` at ${fmt(c.inst.odo)} mi` : ''} · ${fmt(c.miles)} mi · ${plural(c.days || 0, 'day')} · ${c.cost ? money(c.cost) + (c.est ? '*' : '') : 'no cost'}</small>
    ${h.frac != null ? `<div class="life"><i class="${h.level}" style="width:${(h.frac * 100).toFixed(0)}%"></i></div>` : ''}<small class="muted">${esc(h.basis)}${h.next ? ' · ' + esc(h.next) : ''}</small></div>${pill(h)}</a>`;
}
function viewOverview(v, focus) {
  const comps = compsV(v), cur = comps.filter(c => c.current), sp = v.specs || {};
  const sys = SYS.filter(([id]) => !focus || (SYS_ZONE[focus] || []).includes(id));
  const missing = SYS.flatMap(([, , , slots]) => slots).filter(s => !s.startsWith('tire:Spare') && !s.startsWith('rotors') && s !== 'wires' && s !== 'coils' && !cur.some(c => c.slot === s));
  return `<div class="page-title"><h2>Vehicle overview</h2><a class="btn small" href="#/specs">${I.car} Specs</a></div>
    <section class="card ov-head"><div class="vcard"><span class="sicon c-fuel">${I.car}</span><div class="vinfo"><b>${esc(vname(v))}</b><small>${esc(vdesc(v))}${v.engine ? ' · ' + esc(v.engine) : ''}</small></div></div>
      <div class="spec" style="margin-top:10px"><div><span>VIN</span>${v.vin ? `<code>${esc(v.vin)}</code>` : '<span class="muted">Not set</span>'}</div><div><span>Odometer</span>${fmt(curOdo(v))} mi</div>
        <div><span>Oil</span>${[sp.oilCapacity && sp.oilCapacity + ' qt', sp.oilViscosity].filter(Boolean).join(' · ') || '<span class="muted">—</span>'}</div><div><span>Tires</span>${esc(sp.tireSize || '—')}${sp.psiFront ? ` · ${sp.psiFront}/${sp.psiRear || sp.psiFront} PSI` : ''}</div>
        <div><span>Battery</span>${esc([sp.batteryGroup && 'Group ' + sp.batteryGroup, sp.batteryCca && sp.batteryCca + ' CCA'].filter(Boolean).join(' · ') || '—')}</div><div><span>Plugs</span>${esc([specOf(v, 'plugCount') && specOf(v, 'plugCount') + '×', sp.plugPart, sp.plugGap && sp.plugGap + '"'].filter(Boolean).join(' ') || '—')}</div></div></section>
    <section class="card diag-card">${carDiagram(v, cur)}<div class="diag-side"><p class="muted" style="margin:0 0 8px;font-size:.84rem">Tap a zone to filter. Colors show health from intervals and your measurements.</p>
      <div class="legend col"><span><i style="background:var(--ok)"></i>OK</span><span><i style="background:var(--soon)"></i>Soon</span><span><i style="background:var(--over)"></i>Replace</span><span><i style="background:var(--line)"></i>Not logged</span></div>${focus ? `<a href="#/overview" class="btn small" style="margin-top:10px">Show all</a>` : ''}</div></section>
    ${sys.map(([id, title, icon, slots]) => { const cs = slots.map(s => cur.find(c => c.slot === s)).filter(Boolean);
      return `<section class="card"><div class="card-head"><h3>${icon} ${esc(title)}</h3><span class="muted">${cs.length ? plural(cs.length, 'part') : ''}</span></div>${cs.length ? `<div class="comps">${cs.map(c => compRow(c, v)).join('')}</div>` : `<p class="muted" style="margin:0">Nothing logged yet. <a href="#/service/${famSec[slotFamily(slots[0])]}">Log it</a> to track its life.</p>`}</section>`; }).join('')}
    ${missing.length && !focus ? `<p class="muted" style="font-size:.8rem;text-align:center">Not yet tracked: ${esc(missing.map(s => SLOT[s]).join(', '))}.</p>` : ''}
    <p class="muted" style="font-size:.78rem;text-align:center">* cost split evenly across parts done in the same entry.</p>`;
}
function viewComp(v, slot) {
  const fam = slotFamily(slot), list = compsV(v).filter(c => c.slot === slot).reverse(), famAll = compsAll().filter(c => c.fam === fam), al = aloneStats(famAll)[0];
  const c0 = list[0], h = c0 ? health(c0, v) : null;
  return `<a href="#/overview" class="back">${I.back} Overview</a><div class="page-title"><h2>${esc(SLOT[slot] || slot)}</h2>${h ? pill(h) : ''}</div>
    ${c0 ? `<section class="card"><div class="stats">${stat('Miles', fmt(c0.miles))}${stat('Days', fmt(c0.days))}${stat('Paid', c0.cost ? money(c0.cost) : '—')}${stat(c0.proj ? 'Per mile (exp.)' : 'Per mile', c0.cpm ? c3(c0.cpm) : '—')}${stat(c0.proj ? 'Per month (exp.)' : 'Per month', c0.cpmo ? money(c0.cpmo) : '—')}${stat('Wear', c0.wear ? fmt(c0.wear.rate, 2) : '—', c0.wear ? c0.wear.unit.replace(' per ', '/') : '')}</div>
      <p class="muted" style="margin:10px 0 0;font-size:.85rem">${esc(h.basis)}${h.next ? ' · ' + esc(h.next) : ''}${c0.inv ? ` · From inventory: on shelf ${plural(c0.inv.shelfDays || 0, 'day')}${c0.inv.nowUnit != null && c0.inv.unitPaid ? `, market price now ${money(c0.inv.nowUnit)} vs ${money(c0.inv.unitPaid)} paid` : ''}` : ''}</p></section>` : ''}
    <section class="card"><h3>History in this position</h3><div class="list">${list.map(c => `<button class="entry" data-act="editMaint" data-sec="${famSec[c.fam]}" data-id="${c.entry.id}"><div class="e-main"><b>${esc([c.brand, c.part].filter(Boolean).join(' ') || 'Unknown brand')}</b>${c.current ? ' <span class="tag accent">On car</span>' : ''}
      <div class="e-sub">${fdate(c.inst.date)} → ${c.rem ? fdate(c.rem.date) : 'now'} · ${fmt(c.miles)} mi · ${plural(c.days || 0, 'day')}</div><div class="tags">${c.cpm ? `<span class="tag">${money(c.cpm * 1000)}/1k mi${c.proj ? ' (expected)' : ''}</span>` : ''}${c.wear ? `<span class="tag">${fmt(c.wear.rate, 2)} ${esc(c.wear.unit)}</span>` : ''}${c.removedCond ? `<span class="tag ${c.removedCond === 'Clean' ? 'good' : 'warn'}">Removed ${esc(c.removedCond.toLowerCase())}</span>` : ''}</div></div><div class="e-side"><b>${c.cost ? money(c.cost) : '—'}</b></div></button>`).join('') || '<div class="empty">Nothing logged yet.</div>'}</div></section>
    ${al ? `<section class="card"><h3>${esc(al.label)} across all vehicles</h3><div class="stats">${stat('Installs', fmt(al.n))}${stat('Replaced', fmt(al.closed))}${stat('Avg life', al.miles.mean != null ? fmt(al.miles.mean) : '—', al.miles.mean != null ? 'mi' : '')}${stat('Median', al.miles.median != null ? fmt(al.miles.median) : '—', 'mi')}${stat('Std dev', al.miles.sd != null ? fmt(al.miles.sd) : '—', 'mi')}${stat('Per 1k mi', al.cp1k != null ? money(al.cp1k) : '—')}</div>
      ${al.parts.length > 1 ? `<div class="cmp-title" style="margin-top:12px">Best value (cost per 1,000 mi)</div>${hbars(al.parts.filter(p => p.cp1k != null).map(p => ({ l: p.k, v: p.cp1k, n: p.n, sub: p.provisional ? 'still installed (provisional)' : `${p.closed} replaced` })), '', x => money(x))}` : ''}
      ${al.closed < 3 ? '<p class="insights-note">Not enough replacements yet for reliable averages. Stats firm up after about 3.</p>' : ''}</section>` : ''}`;
}
/* ---------- parts life (“alone”) and deep dive (“together”) ---------- */
function viewStats(v) {
  const comps = compsV(v), al = aloneStats(comps), cross = aloneStats(compsAll());
  const famRows = al.map(g => `<tr><td><b>${esc(g.label)}</b><br><small class="muted">${g.n} installed · ${g.closed} replaced</small></td><td>${g.miles.mean != null ? fmt(g.miles.mean) : '—'}</td><td>${g.miles.median != null ? fmt(g.miles.median) : '—'}</td><td>${g.miles.n >= 2 ? `${fmt(g.miles.min)}–${fmt(g.miles.max)}` : '—'}</td><td>${g.cp1k != null ? money(g.cp1k) : '—'}</td></tr>`).join('');
  const boards = cross.filter(g => g.parts.filter(p => p.cp1k != null).length >= 1);
  const vehCmp = db.vehicles.length > 1 ? cross.map(g => { const by = db.vehicles.map(x => { const cs = compsAll().filter(c => c.vid === x.id && c.fam === g.fam && c.miles > 0); const m = sum(cs, 'miles'); return { l: vname(x), v: m ? sum(cs, c => c.cost || 0) / m * 1000 : null, n: cs.length }; }).filter(r => r.v != null); return by.length >= 2 ? `<div class="cmp-title">${esc(g.label)}: cost per 1,000 mi by vehicle</div>${hbars(by, '', x => money(x))}` : ''; }).join('') : '';
  return `<a href="#/overview" class="back">${I.back} Overview</a><div class="page-title"><h2>Parts life</h2><button class="btn small" data-act="statsCsv">${I.download} CSV</button></div>
    <section class="card"><h3>${I.layers} Each component on its own</h3>${al.length ? `<div class="tbl-scroll"><table class="cmp stats-t"><thead><tr><th>Component</th><th>Avg mi</th><th>Median</th><th>Range</th><th>$/1k mi</th></tr></thead><tbody>${famRows}</tbody></table></div>
      <p class="insights-note">Life is measured from install to the next replacement in the same position. Parts still on the car count toward cost per mile (marked provisional) but not toward life averages. Std dev, min/max and sample sizes are in the CSV.</p>` : '<p class="muted">Log services with brands and parts to start tracking each component’s life.</p>'}</section>
    ${al.filter(g => g.wear.n).map(g => `<section class="card"><h3>${esc(g.label)} wear rate</h3><div class="stats">${stat('Mean', fmt(g.wear.mean, 2), esc(g.wearUnit || ''))}${stat('Min', fmt(g.wear.min, 2))}${stat('Max', fmt(g.wear.max, 2))}</div><p class="insights-note">Linear fit through your measurements (n = ${g.wear.n} parts).${g.fam === 'pads' ? ' Assumes new pads start at 11 mm when the install entry has no reading.' : ''}</p></section>`).join('')}
    ${boards.map(g => `<section class="card"><h3>🏆 ${esc(g.label)}: best value</h3>${hbars(g.parts.filter(p => p.cp1k != null).slice(0, 6).map(p => ({ l: p.k, v: p.cp1k, n: p.n, sub: p.provisional ? 'still installed · provisional' : `${p.closed} replaced · avg ${fmt(p.miles.mean)} mi` })), '', x => money(x) + '/1k')}${g.parts.every(p => p.closed < 3) ? '<p class="insights-note">Early read: fewer than 3 replacements per brand, so rankings can change.</p>' : ''}</section>`).join('')}
    ${vehCmp ? `<section class="card"><h3>Compare vehicles</h3>${vehCmp}</section>` : ''}
    ${(() => { const iv = comps.filter(c => c.inv); return iv.length ? `<section class="card"><h3>📦 From inventory</h3><div class="list">${iv.map(c => `<div class="entry"><div class="e-main"><b>${esc(c.label)}: ${esc([c.brand, c.part].filter(Boolean).join(' '))}</b><div class="e-sub">On shelf ${plural(c.inv.shelfDays || 0, 'day')} before install${c.inv.nowUnit != null && c.inv.unitPaid ? ` · price since: ${c.inv.nowUnit >= c.inv.unitPaid ? '▲' : '▼'} ${fmt(Math.abs((c.inv.nowUnit - c.inv.unitPaid) / c.inv.unitPaid * 100), 0)}%` : ''}</div></div></div>`).join('')}</div></section>` : ''; })()}`;
}
const confPill = c => `<span class="conf ${c.lvl}">${c.lvl === 'high' ? 'Strong' : c.lvl === 'med' ? 'Moderate' : c.lvl === 'low' ? 'Weak' : 'Too little data'}</span>`;
function viewDeep(v) {
  const d = deepFor(v);
  if (d.n < 3) return `<a href="#/dash" class="back">${I.back} Dashboard</a><div class="page-title"><h2>Deep dive</h2></div><div class="card empty">The deep dive compares your MPG and costs against what was on the car at the time. It needs at least 3 full-to-full tanks (you have ${d.n}). Keep logging full fill-ups along with your services.</div>`;
  const grp = d.groups.map(g => `<div class="dd-block"><div class="card-head"><b>${esc(g.l)}</b>${confPill(g.conf)}</div>${hbars(g.gs.map(x => ({ l: x.key, v: x.mpg, n: x.n, sub: x.ci != null ? `±${fmt(x.ci, 1)} (95% CI)${x.cpm ? ' · ' + c3(x.cpm) + '/mi' : ''}` : 'single tank' })), 'mpg')}
    <p class="insights-note">${esc(g.conf.t)}${g.mw ? ` Mann-Whitney ${pTxt(g.mw.p)}.` : ''}</p></div>`).join('');
  const cor = d.corr.map(c => `<div class="dd-block"><div class="card-head"><b>${esc(c.l)} vs MPG</b>${confPill(c.conf)}</div>${scatter(c.pts, c.lr && { ...c.lr, scale: c.sc }, c.u)}
    <div class="dd-nums"><span>Pearson r <b>${fmt(c.pr?.r, 2)}</b></span><span>Spearman ρ <b>${fmt(c.sr?.rho, 2)}</b></span><span>Slope <b>${c.lr ? `${c.lr.b >= 0 ? '+' : ''}${fmt(c.lr.b, 2)}` : '—'}</b> MPG per ${c.sc === 1000 ? '1,000 ' + c.u : (c.u || 'unit')}</span>${c.lr ? `<span>95% CI <b>${fmt(c.lr.ci[0], 2)} to ${fmt(c.lr.ci[1], 2)}</b></span><span>R² <b>${fmt(c.lr.r2, 2)}</b></span>` : ''}</div>
    <p class="insights-note">${esc(c.conf.t)} Correlation isn’t causation: season and driving mix change at the same time.</p></div>`).join('');
  const ba = d.ba.map(b => `<tr><td><b>${esc(b.label)}</b><br><small class="muted">${fdate(b.date)}</small></td><td>${fmt(b.mb, 1)} <small class="muted">n=${b.nb}</small></td><td>${fmt(b.ma, 1)} <small class="muted">n=${b.na}</small></td><td class="${b.d >= 0 ? 'good' : 'warn'}"><b>${b.d >= 0 ? '+' : ''}${fmt(b.d, 1)}</b></td><td>${confPill(b.conf)}<br><small class="muted">${b.t ? pTxt(b.t.p) : 'n/a'}</small></td></tr>`).join('');
  const sea = d.season.filter(m => m.n), smax = Math.max(...sea.map(m => m.mpg));
  return `<a href="#/dash" class="back">${I.back} Dashboard</a><div class="page-title"><h2>Deep dive</h2><button class="btn small" data-act="statsCsv">${I.download} CSV</button></div>
    <p class="muted" style="margin:-4px 0 12px;font-size:.86rem">${plural(d.n, 'tank')} of full-to-full MPG, each matched with the oil, tires, filters, plugs, and fuel in use. Every result shows its sample size and how sure it is.</p>
    <section class="card"><h3>${I.chart} MPG timeline</h3>${timeline(v)}</section>
    ${grp ? `<section class="card"><h3>Compare what was installed</h3>${grp}</section>` : ''}
    ${cor ? `<section class="card"><h3>Does age or pressure matter?</h3>${cor}</section>` : ''}
    ${ba ? `<section class="card"><h3>Before vs after a change</h3><div class="tbl-scroll"><table class="cmp"><thead><tr><th>Change</th><th>Before</th><th>After</th><th>Δ MPG</th><th>Evidence</th></tr></thead><tbody>${ba}</tbody></table></div><p class="insights-note">Up to 6 tanks within 2,500 mi on each side. Welch t-test, with a Mann-Whitney check in the CSV.</p></section>` : ''}
    <section class="card"><h3>Seasonality</h3>${sea.length >= 2 ? `<div class="months">${d.season.map(m => `<div class="mo"><div class="mo-bar"><i style="height:${m.n ? (m.mpg / smax * 100).toFixed(0) : 0}%"></i></div><small>${'JFMAMJJASOND'[m.m]}</small></div>`).join('')}</div><p class="insights-note">Average MPG by month. Winter fuel blends, cold starts, and idling usually lower MPG. Months: ${sea.map(m => `${new Date(2020, m.m, 1).toLocaleDateString('en-US', { month: 'short' })} ${fmt(m.mpg, 1)} (n=${m.n})`).join(', ')}.</p>` : '<p class="muted">Needs tanks from at least two different months.</p>'}</section>
    <section class="card"><h3>Outliers</h3>${d.outliers.length ? `<div class="list">${d.outliers.map(o => `<div class="entry"><div class="e-main"><b>${fmt(o.mpg, 1)} MPG</b> <span class="tag ${o.z < 0 ? 'warn' : 'good'}">${o.z < 0 ? 'unusually low' : 'unusually high'}</span><div class="e-sub">Tank ending ${fdate(o.date)} at ${fmt(o.odo)} mi · ${fmt(o.miles)} mi</div></div></div>`).join('')}</div><p class="insights-note">Flagged by IQR fences or a robust z-score above 3.5. Often a missed or partial fill, a road trip, or towing.</p>` : `<p class="muted">${d.n >= 6 ? 'No unusual tanks. Your MPG is consistent.' : 'Needs at least 6 tanks.'}</p>`}</section>
    <section class="card"><h3>Multi-factor model</h3>${d.ols ? `<div class="tbl-scroll"><table class="cmp"><thead><tr><th>Factor</th><th>Effect on MPG</th><th>±SE</th><th>p</th></tr></thead><tbody>${d.ols.names.map((n, i) => `<tr><td>${esc(n)}</td><td><b>${i ? (d.ols.beta[i] >= 0 ? '+' : '') : ''}${fmt(d.ols.beta[i], 2)}</b></td><td>${fmt(d.ols.se[i], 2)}</td><td>${i ? pTxt(d.ols.p[i]).replace('p ', '') : ''}</td></tr>`).join('')}</tbody></table></div>
      <p class="insights-note">Linear regression of MPG on all factors at once (n = ${d.ols.n}, R² = ${fmt(d.ols.r2, 2)}, adjusted ${fmt(d.ols.adjR2, 2)}). Each effect holds the other factors constant. With this little data, treat it as a hint, not proof.</p>` : `<p class="muted">Not enough data yet. A fair multi-factor model needs about ${d.olsNeed || MIN.ols} tanks with complete data (you have ${d.n}).</p>`}</section>`;
}

/* ---------- render + routing ---------- */
let installPrompt = null;
function render() {
  const [page = 'dash', sub] = (location.hash.replace(/^#\/?/, '') || 'dash').split('/');
  const v = cur(), app = $('#app');
  $('#vname').textContent = vname(v);
  $$('#tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === page || (page === 'comp' && a.dataset.tab === 'overview') || (['inventory', 'plan', 'stats'].includes(page) && a.dataset.tab === 'service')));
  const fab = $('#fab'); fab.hidden = true; fab.onclick = null;
  let html;
  if (page === 'garage') html = viewGarage();
  else if (page === 'rewards') { html = sub ? viewProgram(sub) : viewRewards(); if (!sub) { fab.hidden = false; fab.setAttribute('aria-label', 'Add rewards program'); fab.onclick = pickLibrary; } }
  else if (page === 'reminders') html = viewReminders();
  else if (page === 'inventory') { html = viewInventory(); fab.hidden = false; fab.setAttribute('aria-label', 'Add inventory item'); fab.onclick = () => pickCategory('Add to inventory', c => invForm(null, c)); }
  else if (page === 'plan') { html = viewPlan(sub === 'all' || !v); fab.hidden = false; fab.setAttribute('aria-label', 'Plan a part'); fab.onclick = () => pickCategory('Plan a part', c => planForm(null, c)); }
  else if (!v) html = emptyGarage();
  else if (page === 'overview') html = viewOverview(v, sub);
  else if (page === 'comp' && sub) html = viewComp(v, decodeURIComponent(sub));
  else if (page === 'stats') html = viewStats(v);
  else if (page === 'deep') html = viewDeep(v);
  else if (page === 'specs') html = viewSpecs(v);
  else if (page === 'fuel') { html = viewFuel(v); fab.hidden = false; fab.setAttribute('aria-label', 'Log fill-up'); fab.onclick = () => fuelForm(v); }
  else if (page === 'service' && sub && SEC[sub]) { html = viewSection(v, SEC[sub]); fab.hidden = false; fab.setAttribute('aria-label', `Log ${SEC[sub].noun}`); fab.onclick = () => maintForm(v, SEC[sub]); }
  else if (page === 'service') { html = viewService(v); fab.hidden = false; fab.setAttribute('aria-label', 'Log service'); fab.onclick = () => pickService(v); }
  else html = viewDash(v);
  app.innerHTML = html;
  updateBadge();
}
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act, v = cur(), byId = id => db.vehicles.find(x => x.id === id);
  const run = {
    addVehicle: () => addVehicle(), loadSample, addFuel: () => fuelForm(v), pickService: () => pickService(v),
    editFuel: () => fuelForm(v, v.fuel.find(x => x.id === el.dataset.id)),
    addMaint: () => maintForm(v, SEC[el.dataset.sec]),
    editMaint: () => maintForm(v, SEC[el.dataset.sec], v.maint[el.dataset.sec].find(x => x.id === el.dataset.id)),
    select: () => { db.settings.current = el.dataset.id; save(); render(); toast(`Switched to ${vname(cur())}`); },
    editVehicle: () => addVehicle(byId(el.dataset.id)),
    eraseVehicle: () => eraseVehicle(byId(el.dataset.id)),
    resetFuel: () => resetFuel(v), resetFuelV: () => resetFuel(byId(el.dataset.id)),
    undoReset: () => { delete v.fuelStatsFrom; delete v.fuelResetDate; save(); render(); toast('Reset undone'); },
    vinLookup: () => addVehicle(byId(el.dataset.id), { autoLookup: true }),
    epa: () => epaLookup(byId(el.dataset.id)),
    specEdit: () => specForm(v, el.dataset.id),
    specsFor: () => { db.settings.current = el.dataset.id; save(); location.hash = '#/specs'; },
    dismissBanner: () => { sessionStorage.setItem('autolog:bannerDismissed', '1'); render(); },
    enableNotify: enableNotifications,
    testNotify: () => notify('AutoLog notifications are working', { body: 'You’ll get a heads-up here when service is due.', tag: 'autolog-test', icon: 'icons/icon-192.png' }).catch(err => toast('Couldn’t show a notification: ' + err.message)),
    icsAll: () => { const it = allReminders(); if (it.length) deliverIcs(`autolog-reminders-${todayISO()}.ics`, icsFor(it)); },
    icsOne: () => { const it = allReminders().find(i => i.key === el.dataset.key); if (it) deliverIcs(`autolog-${it.sec}-${todayISO()}.ics`, icsFor([it])); },
    logRem: () => { const it = allReminders().find(i => i.key === el.dataset.key); if (it && it.stock) { location.hash = '#/inventory'; return; } if (it) { db.settings.current = it.vid; save(); maintForm(cur(), SEC[it.sec]); } },
    addProgram: pickLibrary, customProgram: () => programForm(null), addLib: () => programForm(el.dataset.id), editProgram: () => programForm(null, progById(el.dataset.id)),
    addInv: () => pickCategory('Add to inventory', c => invForm(null, c)), editInv: () => invForm(db.inventory.find(x => x.id === el.dataset.id)),
    addPlan: () => pickCategory('Plan a part', c => planForm(null, c)), planEdit: () => planForm(db.plans.find(x => x.id === el.dataset.id)),
    planBuy: () => planBought(db.plans.find(x => x.id === el.dataset.id)), planInstall: () => planInstall(db.plans.find(x => x.id === el.dataset.id)),
    planScope: () => { location.hash = el.value === 'all' ? '#/plan/all' : '#/plan'; },
    dashScope: () => { db.settings.dashAll = el.value === 'all'; save(); render(); },
    statsCsv: () => exportStatsCSV(v),
    specUseProfile: () => { const ps = vehProfile(v)?.specs || {}; let n = 0; Object.entries(ps).forEach(([k, x]) => { if (!['src', 'note'].includes(k) && (v.specs[k] == null || v.specs[k] === '')) { v.specs[k] = x; n++; } }); save(); render(); toast(n ? `Filled ${n} specs from the owner’s manual` : 'Nothing new to fill'); },
    csv: () => exportCSV(v), export: exportJSON, import: () => $('#importFile').click(),
    theme: () => { db.settings.theme = el.value; save(); applyTheme(); },
    install: async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; render(); },
    eraseAll: async () => { const ok = await ask({ title: 'Erase all data?', msg: 'This deletes every vehicle and record on this device. It can’t be undone.', typeToConfirm: 'ERASE', buttons: [{ label: 'Erase everything', value: true, cls: 'danger', needsType: 1 }, { label: 'Cancel', value: false }] }); if (ok) { db = blank(); save(); applyTheme(); render(); toast('All data erased'); } },
    odo: () => openForm({ title: 'Update odometer', fields: [{ k: 'odometer', l: 'Current odometer', t: 'num', unit: 'mi', step: 1, req: 1 }], values: { odometer: curOdo(v) },
      onSave: vals => { if (vals.odometer < curOdo(v)) { toast(`It can’t be lower than your latest entry (${fmt(curOdo(v))} mi)`); return false; } v.odometer = vals.odometer; } }),
    pickVehicle: () => pickSheet('Vehicles', [...db.vehicles.map(x => ({ title: vname(x), sub: `${vdesc(x)} · ${fmt(curOdo(x))} mi`, icon: I.car, cls: 'c-fuel', right: x === v ? '<span class="current-badge">Current</span>' : '', run: () => { db.settings.current = x.id; save(); render(); } })),
      { title: 'Add vehicle', icon: I.plus, cls: 'c-fuel', run: () => addVehicle() }, { title: 'Manage vehicles', icon: I.wrench, cls: 'c-tires', run: () => { location.hash = '#/garage'; } }]),
  }[act];
  if (run) { if (el.tagName === 'A') e.preventDefault(); run(); }
});
document.addEventListener('input', e => { if (e.target.id !== 'libSearch') return; const q = e.target.value.trim().toLowerCase().split(/\s+/).filter(Boolean); let n = 0; $$('#libList [data-search]').forEach(a => { const ok = q.every(w => a.dataset.search.includes(w)); a.hidden = !ok; if (ok) n++; }); $('#libEmpty').hidden = n > 0; });
$('#importFile').addEventListener('change', e => { const f = e.target.files[0]; if (f) importJSON(f); e.target.value = ''; });

function applyTheme() {
  const t = db.settings.theme, root = document.documentElement;
  if (t === 'light' || t === 'dark') root.dataset.theme = t; else delete root.dataset.theme;
  const dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  const m = $('#themeColor'); if (m) m.content = dark ? '#0c111b' : '#f4f6fb';
}
const mq = matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', applyTheme);
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; if (location.hash.includes('garage')) render(); });
setupSW();
window.addEventListener('storage', e => { if (e.key === KEY) { db = load(); render(); } });

applyTheme(); render(); syncSnapshot(); setTimeout(() => checkNotify(), 1500); loadCatalog();
// Bridge for the optional sync module (sync.js). Sync replaces data only through here.
window.AutoLogApp = {
  getDb: () => db,
  normalize: j => normalize(j),
  replaceDb(n) { db = normalize(n); DBV++; try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Couldn’t save. Your browser storage may be full.'); } try { afterSave(); } catch (e) { console.warn(e); } render(); },
  toast: m => toast(m),
};
window.AutoLog = { catalog: () => CATALOG, comps: () => cur() && compsV(cur()), deep: () => cur() && deepFor(cur()), tco: () => cur() && tcoOf([cur()]), projection: () => cur() && projection([cur()]), alone: () => cur() && aloneStats(compsV(cur())), St, stats: () => cur() && fuelStats(cur()), insights: () => cur() && insights(cur(), fuelStats(cur())), reminders: () => allReminders(), ics: () => icsFor(allReminders()), vinCheck, current: () => cur() };
})();
