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
};
const LIB = (window.AUTOLOG_REWARDS && window.AUTOLOG_REWARDS.programs) || [];
const LIB_CHECKED = (window.AUTOLOG_REWARDS && window.AUTOLOG_REWARDS.checked) || 'Oct 2026';
const libById = id => LIB.find(x => x.id === id) || null;

/* ---------- maintenance sections (schema-driven) ---------- */
const H = l => ({ t: 'h', l });
const F = {
  date: { k: 'date', l: 'Date', t: 'date', req: 1, half: 1, def: () => todayISO() },
  odo: { k: 'odo', l: 'Odometer', t: 'num', unit: 'mi', req: 1, half: 1, step: 1, def: (v) => curOdo(v) || '' },
  cost: { k: 'cost', l: 'Cost', t: 'num', pre: '$', step: 0.01, half: 1 },
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
    fields: [F.date, F.odo,
      H('Oil'), { k: 'brand', l: 'Oil brand', t: 'text', half: 1, list: 1 }, { k: 'viscosity', l: 'Viscosity', t: 'text', half: 1, list: ['0W-16', '0W-20', '5W-20', '5W-30', '10W-30', '0W-40', '5W-40', '15W-40'] },
      { k: 'oilType', l: 'Type', t: 'seg', opts: ['Synthetic', 'Blend', 'Conventional', 'High mileage'] },
      { k: 'qty', l: 'Quantity', t: 'num', unit: 'qts', half: 1, step: 0.1 }, F.cost,
      H('Filter'), { k: 'filterBrand', l: 'Filter brand', t: 'text', half: 1, list: 1 }, { k: 'filterPart', l: 'Filter part #', t: 'text', half: 1 },
      H('Service'), F.doneBy, F.shop,
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
      { k: 'qty', l: 'Quantity', t: 'num', unit: 'gal', half: 1, step: 0.1 }, F.cost,
      F.doneBy, F.shop,
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
      F.cost, F.doneBy, F.shop,
      H('Next inspection'), F.intMi(12000), F.intMo(12), F.notes],
    summary: e => `${e.axle || ''} · ${e.padsReplaced ? 'New pads' : (e.rotors && e.rotors !== 'Not serviced' ? 'Rotor service' : 'Inspection')}`,
    chips: e => [e.padsReplaced && [e.padBrand, e.padMaterial].filter(Boolean).join(' '), e.rotors && e.rotors !== 'Not serviced' && `Rotors ${e.rotors.toLowerCase()}`, e.thickness != null && e.thickness !== '' && `${e.thickness} mm pads`, e.fluid && e.fluid !== 'None' && `Fluid ${e.fluid.toLowerCase()}`],
  },
  {
    id: 'tires', title: 'Tires', icon: I.tires, noun: 'tire service',
    fields: [F.date, F.odo,
      { k: 'services', l: 'What was done', t: 'multi', opts: ['New tires', 'Rotation', 'Balance', 'Alignment', 'Pressure check', 'Tread check', 'Repair'], def: ['Rotation'] },
      H('Tire details'),
      { k: 'brand', l: 'Brand', t: 'text', half: 1, list: 1, showIf: v => has(v.services, 'New tires') }, { k: 'model', l: 'Model', t: 'text', half: 1, showIf: v => has(v.services, 'New tires') },
      { k: 'size', l: 'Size', t: 'text', half: 1, ph: '225/45R17', showIf: v => has(v.services, 'New tires') }, { k: 'loadSpeed', l: 'Load/speed rating', t: 'text', half: 1, ph: '94V', showIf: v => has(v.services, 'New tires') },
      { k: 'dot', l: 'DOT date code', t: 'text', half: 1, ph: 'WWYY e.g. 3225', showIf: v => has(v.services, 'New tires') }, { k: 'count', l: 'Tires replaced', t: 'num', half: 1, step: 1, def: 4, showIf: v => has(v.services, 'New tires') },
      { k: 'psi', l: 'Pressure (PSI)', t: 'quad', step: 0.5, showIf: v => has(v.services, 'Pressure check') },
      { k: 'tread', l: 'Tread depth (32nds)', t: 'quad', step: 1, showIf: v => has(v.services, 'Tread check') || has(v.services, 'Rotation') || has(v.services, 'New tires') },
      { k: 'repair', l: 'Repair details', t: 'text', ph: 'e.g. Plug, RR tire', showIf: v => has(v.services, 'Repair') },
      F.cost, F.doneBy, F.shop,
      H('Next rotation'), { ...F.intMi(5000, 'Rotate again in'), hint: 'The rotation reminder counts from your last rotation or new set.' }, F.intMo(6), F.notes],
    anchor: list => list.find(e => has(e.services, 'Rotation') || has(e.services, 'New tires')) || null,
    summary: e => (e.services || []).join(', ') || 'Tire service',
    chips: e => [has(e.services, 'New tires') && [e.brand, e.model, e.size].filter(Boolean).join(' '), quadText(e.psi, ' psi'), quadText(e.tread, '/32'), e.repair],
  },
  {
    id: 'plugs', title: 'Spark plugs & wires', icon: I.plugs, noun: 'ignition service',
    fields: [F.date, F.odo,
      H('Spark plugs'), { k: 'brand', l: 'Plug brand', t: 'text', half: 1, list: 1 }, { k: 'part', l: 'Plug part #', t: 'text', half: 1 },
      { k: 'ptype', l: 'Type', t: 'seg', opts: ['Copper', 'Platinum', 'Double platinum', 'Iridium'] },
      { k: 'gap', l: 'Gap', t: 'num', unit: 'in', half: 1, step: 0.001, ph: '0.044' }, { k: 'qty', l: 'Quantity', t: 'num', half: 1, step: 1 },
      H('Wires / coils'), { k: 'wires', l: 'Also replaced', t: 'seg', opts: ['None', 'Wires', 'Coils', 'Boots'], def: 'None' },
      { k: 'wireBrand', l: 'Brand', t: 'text', half: 1, showIf: v => v.wires && v.wires !== 'None' }, { k: 'wirePart', l: 'Part #', t: 'text', half: 1, showIf: v => v.wires && v.wires !== 'None' },
      F.cost, F.doneBy, F.shop,
      H('Next replacement'), { ...F.intMi(60000), hint: 'Typical intervals: copper 30k, platinum 60k, iridium 100k miles.' }, F.intMo(72), F.notes],
    summary: e => [e.brand, e.ptype].filter(Boolean).join(' ') || 'Spark plugs',
    chips: e => [e.part, e.gap && `Gap ${e.gap}"`, e.qty && `×${e.qty}`, e.wires && e.wires !== 'None' && `${e.wires} ${[e.wireBrand, e.wirePart].filter(Boolean).join(' ')}`.trim()],
  },
  {
    id: 'battery', title: 'Battery', icon: I.battery, noun: 'battery entry',
    fields: [F.date, F.odo,
      { k: 'events', l: 'What was done', t: 'multi', opts: ['New battery', 'Voltage test', 'Terminals cleaned', 'Charged / jumped'], def: ['Voltage test'] },
      H('Battery'),
      { k: 'brand', l: 'Brand', t: 'text', half: 1, list: 1, showIf: v => has(v.events, 'New battery') }, { k: 'model', l: 'Model', t: 'text', half: 1, showIf: v => has(v.events, 'New battery') },
      { k: 'group', l: 'Group size', t: 'text', half: 1, ph: '24F, H6, 51R', showIf: v => has(v.events, 'New battery') }, { k: 'cca', l: 'CCA', t: 'num', half: 1, step: 1, showIf: v => has(v.events, 'New battery') },
      { k: 'warranty', l: 'Warranty', t: 'num', unit: 'months', half: 1, step: 1, def: 36, showIf: v => has(v.events, 'New battery') },
      { k: 'resting', l: 'Resting voltage', t: 'num', unit: 'V', half: 1, step: 0.01, showIf: v => has(v.events, 'Voltage test') || has(v.events, 'New battery') },
      { k: 'cranking', l: 'Cranking voltage', t: 'num', unit: 'V', half: 1, step: 0.01, showIf: v => has(v.events, 'Voltage test') || has(v.events, 'New battery') },
      { k: 'hint1', t: 'hint', l: 'Healthy readings: about 12.6 V resting and above about 9.6 V while cranking.' },
      F.cost, F.doneBy, F.shop, F.notes],
    summary: e => (e.events || []).join(', ') || 'Battery',
    chips: e => [has(e.events, 'New battery') && [e.brand, e.model, e.group && `Grp ${e.group}`, e.cca && `${e.cca} CCA`].filter(Boolean).join(' '), e.resting && `${e.resting} V rest`, e.cranking && `${e.cranking} V crank`],
  },
];
const SEC = Object.fromEntries(SECTIONS.map(s => [s.id, s]));
function quadText(q, u) { if (!q) return ''; const parts = TIRE_POS.map(([k, l]) => q[k] != null && q[k] !== '' ? `${l} ${q[k]}` : null).filter(Boolean); return parts.length ? parts.join(' ') + u : ''; }

/* ---------- fuel + vehicle schema ---------- */
const FUEL_FIELDS = [
  F.date, F.odo,
  { k: 'gallons', l: 'Gallons', t: 'num', unit: 'gal', step: 0.001, req: 1, half: 1 },
  { k: 'price', l: 'Price / gallon', t: 'num', pre: '$', step: 0.001, req: 1, half: 1 },
  { k: 'total', l: 'Total cost', t: 'num', pre: '$', step: 0.01, hint: 'Calculated as gallons × price. Type over it to change it.' },
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
function blank() { return { version: 1, vehicles: [], programs: [], settings: { theme: 'auto', current: null } }; }
function normalize(j) {
  j.version = 2; j.settings = Object.assign({ theme: 'auto', current: null }, j.settings || {});
  j.vehicles = (j.vehicles || []).filter(v => v && v.id);
  j.programs = (Array.isArray(j.programs) ? j.programs : []).filter(x => x && x.id);
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
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Couldn’t save. Your browser storage may be full.'); } try { afterSave(); } catch (e) { console.warn(e); } }
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
    if (f.t === 'h' || f.t === 'hint') continue;
    const el = form.elements[f.k];
    switch (f.t) {
      case 'num': o[f.k] = num(el.value); break;
      case 'seg': o[f.k] = ($(`input[name="${f.k}"]:checked`, form) || {}).value || ''; break;
      case 'multi': o[f.k] = $$(`input[name="${f.k}"]:checked`, form).map(x => x.value); break;
      case 'check': o[f.k] = el.checked; break;
      case 'progs': o[f.k] = db.programs.filter(pr => form.elements[`rw.${pr.id}.on`]?.checked).map(pr => ({ pid: pr.id, name: progName(pr), cpg: num(form.elements[`rw.${pr.id}.cpg`].value), saved: num(form.elements[`rw.${pr.id}.saved`].value), points: num(form.elements[`rw.${pr.id}.points`].value) })); break;
      case 'quad': { const q = {}; TIRE_POS.forEach(([k]) => { q[k] = num(form.elements[`${f.k}.${k}`].value); }); o[f.k] = TIRE_POS.some(([k]) => q[k] != null) ? q : null; break; }
      default: o[f.k] = (el.value || '').trim();
    }
  }
  return o;
}
function openForm({ title, fields, values = {}, pool, onSave, onDelete, saveLabel = 'Save', onInput, onClick, warn }) {
  const d = $('#sheet'), form = $('#sheetForm');
  form.innerHTML = `<div class="sheet-head"><h3>${esc(title)}</h3><button type="button" class="icon-btn" data-close aria-label="Close">${I.close}</button></div>
    <div class="sheet-body">${fields.map(f => fieldHTML(f, values, pool)).join('')}
    ${warn ? '<div class="warnbox" id="formWarn" role="status" aria-live="polite" hidden></div>' : ''}
    ${onDelete ? `<button type="button" class="btn ghost-danger block" data-del style="margin-top:6px">${I.trash} Delete entry</button>` : ''}</div>
    <div class="sheet-foot"><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn primary">${I.check} ${esc(saveLabel)}</button></div>`;
  const applyShow = () => { const vals = readForm(form, fields); fields.forEach(f => { if (f.showIf) { const el = $(`[data-k="${f.k}"]`, form); if (el) el.hidden = !f.showIf(vals); } }); $$('.rw', form).forEach(b => b.classList.toggle('on', !!$('input[data-rwon]', b)?.checked));
    if (warn) { const w = warn(vals) || [], box = $('#formWarn', form); box.hidden = !w.length; box.innerHTML = w.map(x => `<div>⚠ ${esc(x)}</div>`).join(''); } };
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
    title: entry ? 'Edit fill-up' : 'Log fill-up', fields: FUEL_FIELDS, values, pool: x => x.fuel, saveLabel: entry ? 'Save' : 'Add fill-up',
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
function maintForm(v, sec, entry) {
  const last = entries(v, sec.id)[0];
  const values = entry ? { ...entry } : defaults(sec.fields, v, last);
  if (!entry && sec.id === 'tires') { const set = tireSet(v); if (set) Object.assign(values, { brand: set.brand, model: set.model, size: set.size, loadSpeed: set.loadSpeed }); }
  if (!entry) Object.assign(values, specDefaults(sec.id, v, values));
  openForm({
    title: `${entry ? 'Edit' : 'Log'} ${sec.noun}`, fields: sec.fields, values, pool: x => x.maint[sec.id], saveLabel: entry ? 'Save' : 'Add entry',
    warn: vals => specWarnings(sec.id, vals, v),
    onSave: vals => { if (entry) Object.assign(entry, vals); else { v.maint[sec.id].push({ id: uid(), ...vals }); toast(`${sec.title} entry added`); } },
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
  else { inc.vehicles.forEach(v => { if (!db.vehicles.find(x => x.id === v.id)) db.vehicles.push(v); }); inc.programs.forEach(pr => { if (!progById(pr.id)) db.programs.push(pr); }); }
  db = normalize(db);
  save(); applyTheme(); render(); toast('Backup imported');
}

/* ---------- sample data (only added when the user taps “Load sample data”) ---------- */
function sampleVehicle() {
  const d = n => addDays(todayISO(), -n);
  const Fl = (ago, odo, gallons, price, octane, eth, station, extra = {}) => ({ id: uid(), date: d(ago), odo, gallons, price, total: Math.round(gallons * price * 100) / 100, octane, eth, station, full: true, ...extra });
  const m = o => ({ id: uid(), ...o });
  return { id: uid(), name: 'Daily Driver', year: 2019, make: 'Honda', model: 'Accord', trim: '1.5T EX', odometer: 45120, tank: 14.8, created: d(120), sample: true,
    fuel: [
      Fl(94, 42010, 10.8, 3.459, '87', 'E10', 'Costco', { program: 'Costco' }),
      Fl(85, 42356, 11.611, 4.099, '91', 'E0', 'Shell', { program: 'Fuel Rewards', centsOff: 10 }),
      Fl(75, 42722, 11.402, 3.359, '87', 'E10', 'Costco', { program: 'Costco' }),
      Fl(65, 43060, 6.0, 3.419, '87', 'E10', 'Kwik Trip', { full: false, program: 'Kwik Rewards', points: 34, notes: 'Partial fill, was in a hurry' }),
      Fl(60, 43230, 11.104, 3.799, '87', 'E0', 'Kwik Trip', { program: 'Kwik Rewards', points: 61 }),
      Fl(49, 43590, 11.392, 3.299, '87', 'E10', 'Costco', { program: 'Costco' }),
      Fl(38, 43941, 11.939, 3.999, '91', 'E0', 'Shell', { program: 'Fuel Rewards', centsOff: 25 }),
      Fl(28, 44312, 11.451, 3.149, '88', 'E15', 'Kwik Trip', { program: 'Kwik Rewards', points: 41 }),
      Fl(17, 44655, 11.993, 3.279, '87', 'E10', 'Costco', { program: 'Costco', saved: 1.5 }),
      Fl(6, 45008, 11.728, 3.229, '87', 'E10', 'Costco', { program: 'Costco' }),
    ],
    maint: {
      oil: [
        m({ date: d(360), odo: 35180, brand: 'Mobil 1', viscosity: '0W-20', oilType: 'Synthetic', qty: 3.7, filterBrand: 'Honda', filterPart: '15400-PLM-A02', cost: 64.99, doneBy: 'Shop', shop: 'Valvoline Instant', intMiles: 5000, intMonths: 6 }),
        m({ date: d(170), odo: 40150, brand: 'Mobil 1', viscosity: '0W-20', oilType: 'Synthetic', qty: 3.7, filterBrand: 'Honda', filterPart: '15400-PLM-A02', cost: 41.5, doneBy: 'DIY', intMiles: 5000, intMonths: 6 }),
      ],
      coolant: [m({ date: d(770), odo: 30000, service: 'Drain & fill', ctype: 'OAT', color: 'Blue', brand: 'Honda Type 2', mix: 'Premixed 50/50', qty: 1.5, cost: 129, doneBy: 'Shop', shop: 'Honda dealer', intMiles: 60000, intMonths: 60 })],
      brakes: [
        m({ date: d(500), odo: 33500, axle: 'Front', padsReplaced: true, padBrand: 'Akebono', padPart: 'ACT1089', padMaterial: 'Ceramic', thickness: 11, rotors: 'Resurfaced', fluid: 'Flush', fluidType: 'DOT 3', cost: 289, doneBy: 'Shop', shop: 'Midas', intMiles: 12000, intMonths: 12 }),
        m({ date: d(66), odo: 43420, axle: 'Both', padsReplaced: false, thickness: 6, rotors: 'Not serviced', fluid: 'None', cost: 0, doneBy: 'DIY', intMiles: 12000, intMonths: 12, notes: 'Front 6 mm, rear 5 mm. Rotors smooth.' }),
      ],
      tires: [
        m({ date: d(590), odo: 31000, services: ['New tires', 'Balance', 'Alignment'], brand: 'Michelin', model: 'CrossClimate2', size: '225/50R17', loadSpeed: '98V', dot: '0825', count: 4, tread: { fl: 10, fr: 10, rl: 10, rr: 10 }, cost: 912, doneBy: 'Shop', shop: 'Discount Tire', intMiles: 5000, intMonths: 6 }),
        m({ date: d(232), odo: 39800, services: ['Rotation', 'Tread check'], tread: { fl: 8, fr: 8, rl: 8, rr: 9 }, cost: 0, doneBy: 'Shop', shop: 'Discount Tire', intMiles: 5000, intMonths: 6 }),
        m({ date: d(35), odo: 44400, services: ['Pressure check', 'Tread check'], psi: { fl: 35, fr: 35, rl: 34, rr: 33 }, tread: { fl: 6, fr: 6, rl: 7, rr: 7 }, cost: 0, doneBy: 'DIY', intMiles: 5000, intMonths: 6, notes: 'RR a little low, set all to 35' }),
      ],
      plugs: [],
      battery: [
        m({ date: d(1250), odo: 18000, events: ['New battery'], brand: 'Interstate', model: 'MTX-51R', group: '51R', cca: 500, warranty: 36, resting: 12.71, cranking: 10.6, cost: 189.99, doneBy: 'Shop', shop: 'Costco Tire Center' }),
        m({ date: d(35), odo: 44400, events: ['Voltage test', 'Terminals cleaned'], resting: 12.48, cranking: 10.1, cost: 0, doneBy: 'DIY' }),
      ],
    } };
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
  v.fuel.forEach(e => { if (e.program && RW[e.program]) { const pid = RW[e.program]; const r = { pid, name: progName(progById(pid)), cpg: e.centsOff ?? null, saved: e.saved ?? null, points: e.points ?? null }; if (r.cpg != null || r.saved != null || r.points != null || e.program === 'Costco') e.rewards = [r]; delete e.centsOff; delete e.saved; delete e.points; } delete e.program; }); db.vehicles.push(v); db.settings.current = v.id; save(); location.hash = '#/dash'; render(); toast('Sample vehicle and programs loaded. Erase them anytime.');
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
  return `<div class="card empty"><div class="hero-empty">${I.car}</div><div class="big">Welcome to AutoLog</div>
    <div>Track fill-ups, MPG, and all your maintenance. Everything stays on this device and works offline.</div>
    <div class="btn-row"><button class="btn primary" data-act="addVehicle">${I.plus} Add your vehicle</button><button class="btn" data-act="loadSample">Load sample data</button></div></div>`;
}
function viewDash(v) {
  const s = fuelStats(v), ins = insights(v, s);
  const sts = SECTIONS.map(sec => ({ sec, st: sectionStatus(sec, v) }));
  const over = sts.filter(x => x.st.level === 'over').length, soon = sts.filter(x => x.st.level === 'soon').length;
  const dn = dueNow(), dOver = dn.filter(i => i.level === 'over').length;
  const banner = dn.length && !sessionStorage.getItem('autolog:bannerDismissed') ? `<div class="banner ${dOver ? 'over' : 'soon'}" role="status"><a href="#/reminders" style="color:inherit;flex:1">🔔 <b>${dOver ? `${dOver} overdue` : ''}${dOver && dn.length - dOver ? ', ' : ''}${dn.length - dOver ? `${dn.length - dOver} due soon` : ''}</b> across your vehicles. View reminders →</a><button class="icon-btn" data-act="dismissBanner" aria-label="Dismiss">${I.close}</button></div>` : '';
  return `${banner}<section class="card hero">
      <div class="hero-top"><div><div class="eyebrow">${esc(vdesc(v) || 'Vehicle')}</div><h2>${esc(vname(v))}</h2></div>
      <button class="chip-btn" data-act="odo" aria-label="Update odometer">${I.gauge} ${fmt(curOdo(v))} mi</button></div>
      <div class="stats">
        ${stat('Avg MPG', fmt(s.avgMpg, 1))}${stat('Last tank', fmt(s.lastMpg, 1), s.lastMpg ? 'mpg' : '')}${stat('Cost / mile', s.cpm ? c3(s.cpm) : '—')}
        ${stat('Est. range', fmt(s.range), s.range ? 'mi' : '')}${stat('Fuel spent', money(s.totalSpent, 0))}${stat('Rewards', money(s.totalSaved))}
      </div>
      <div class="row-actions"><button class="btn primary" data-act="addFuel">${I.fuel} Log fill-up</button><button class="btn" data-act="pickService">${I.wrench} Log service</button></div>
      <div class="hero-links"><a href="#/specs">${I.car} Specs${v.epa ? ` · EPA ${v.epa.comb} mpg` : ''}</a><a href="#/reminders">🔔 Reminders</a></div>
    </section>
    <section class="card"><h3><span class="spark">${I.spark}</span> Insights</h3>${insightsHTML(ins.slice(0, 3))}<a href="#/fuel" class="link">All fuel stats &amp; insights →</a></section>
    <section class="card"><div class="card-head"><h3>Maintenance</h3><a href="#/service" class="link" style="margin:0">View all</a></div>
      <div class="status-summary">${over ? `<span class="pill over">${over} overdue</span>` : ''}${soon ? `<span class="pill soon">${soon} need attention</span>` : ''}${!over && !soon ? `<span class="pill ok">All good</span>` : ''}</div>
      <div class="status-list">${sts.map(({ sec, st }) => `<a class="srow" href="#/service/${sec.id}"><span class="sicon c-${sec.id}">${sec.icon}</span><span class="sbody"><b>${esc(sec.title)}</b><small>${esc(st.text)}</small></span>${pill(st)}</a>`).join('')}</div>
    </section>`;
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
  const s = fuelStats(v), ins = insights(v, s);
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
  return `<div class="page-title"><h2>Service</h2></div><div class="tiles">${SECTIONS.map(sec => { const st = sectionStatus(sec, v); const n = v.maint[sec.id].length;
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
    <section class="card"><h3>Settings &amp; backup</h3>
      <div class="setting"><b>Appearance</b><div class="seg" role="radiogroup">${['auto', 'light', 'dark'].map(t => `<label><input type="radio" name="theme" value="${t}" ${db.settings.theme === t ? 'checked' : ''} data-act="theme"><span>${t[0].toUpperCase() + t.slice(1)}</span></label>`).join('')}</div></div>
      <div class="setting"><b>Backup</b><small>Your data lives only in this browser. Export a backup now and then, and import it to move to another device.</small>
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
    fields: [{ k: 'tireSize', l: 'Size (front)', t: 'text', half: 1, ph: '225/50R17' }, { k: 'tireSizeRear', l: 'Size (rear, if different)', t: 'text', half: 1 }, { k: 'psiFront', l: 'Front pressure', t: 'num', unit: 'PSI', step: 1, half: 1 }, { k: 'psiRear', l: 'Rear pressure', t: 'num', unit: 'PSI', step: 1, half: 1 }, { k: 'rotateMiles', l: 'Rotate every', t: 'num', unit: 'mi', step: 1, half: 1 }] },
  { id: 'plugs', title: 'Spark plugs', q: 'spark plug part number and gap', where: 'Owner’s manual specifications or maintenance schedule. A parts-store lookup by vehicle also works.',
    fields: [{ k: 'plugPart', l: 'Plug part #', t: 'text', half: 1 }, { k: 'plugType', l: 'Plug type', t: 'select', opts: ['', 'Copper', 'Platinum', 'Double platinum', 'Iridium'], half: 1 }, { k: 'plugGap', l: 'Gap', t: 'num', unit: 'in', step: 0.001, half: 1 }, { k: 'plugIntMiles', l: 'Replace every', t: 'num', unit: 'mi', step: 1, half: 1 }] },
  { id: 'coolant', title: 'Coolant', q: 'coolant type and change interval', where: 'Owner’s manual “Capacities / Fluids”. The required type is often printed on the coolant reservoir or radiator cap.',
    fields: [{ k: 'coolantType', l: 'Type', t: 'select', opts: ['', 'OAT', 'HOAT', 'P-HOAT', 'Si-OAT', 'IAT', 'Universal', 'Other'], half: 1 }, { k: 'coolantSpec', l: 'Spec / brand', t: 'text', half: 1, ph: 'e.g. Honda Type 2' }, { k: 'coolantIntMiles', l: 'Flush every', t: 'num', unit: 'mi', step: 1, half: 1 }, { k: 'coolantIntMonths', l: 'or every', t: 'num', unit: 'months', step: 1, half: 1 }] },
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
  const b = batteryCur(v), exp = wExp(b);
  if (exp && exp >= today) { const dl = daysBetween(today, exp); out.push({ key: `${v.id}:battery:warranty`, vid: v.id, vname: vname(v), sec: 'battery', title: 'Battery warranty ends', level: dl <= 60 ? 'soon' : 'ok', dueDate: exp, effDate: exp, info: true }); }
  return out;
}
const allReminders = () => db.vehicles.flatMap(reminderItems).sort((a, b) => RANK[b.level] - RANK[a.level] || (a.effDate || '9').localeCompare(b.effDate || '9'));
const dueNow = () => allReminders().filter(i => i.level === 'over' || i.level === 'soon');
function reminderText(i) {
  if (i.info) return `Warranty ends ${fdate(i.dueDate)}`;
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
      <div class="entry rem"><span class="sicon c-${i.sec}">${SEC[i.sec].icon}</span><div class="e-main"><b>${esc(i.title)}</b><div class="e-sub">${esc(i.vname)}</div><div class="e-sub">${esc(reminderText(i))}</div>
        <div class="btn-row" style="margin-top:8px"><button class="btn small" data-act="icsOne" data-key="${esc(i.key)}">${I.download} Add to calendar</button>${i.info ? '' : `<button class="btn small" data-act="logRem" data-key="${esc(i.key)}">${I.plus} Log it</button>`}</div></div></div>`).join('')}</div></section>` : ''; }).join('')
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

/* ---------- render + routing ---------- */
let installPrompt = null;
function render() {
  const [page = 'dash', sub] = (location.hash.replace(/^#\/?/, '') || 'dash').split('/');
  const v = cur(), app = $('#app');
  $('#vname').textContent = vname(v);
  $$('#tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === page || (page === 'dash' && a.dataset.tab === 'dash')));
  const fab = $('#fab'); fab.hidden = true; fab.onclick = null;
  let html;
  if (page === 'garage') html = viewGarage();
  else if (page === 'rewards') { html = sub ? viewProgram(sub) : viewRewards(); if (!sub) { fab.hidden = false; fab.setAttribute('aria-label', 'Add rewards program'); fab.onclick = pickLibrary; } }
  else if (page === 'reminders') html = viewReminders();
  else if (!v) html = emptyGarage();
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
    logRem: () => { const it = allReminders().find(i => i.key === el.dataset.key); if (it) { db.settings.current = it.vid; save(); maintForm(cur(), SEC[it.sec]); } },
    addProgram: pickLibrary, customProgram: () => programForm(null), addLib: () => programForm(el.dataset.id), editProgram: () => programForm(null, progById(el.dataset.id)),
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

applyTheme(); render(); syncSnapshot(); setTimeout(() => checkNotify(), 1500);
window.AutoLog = { stats: () => cur() && fuelStats(cur()), insights: () => cur() && insights(cur(), fuelStats(cur())), reminders: () => allReminders(), ics: () => icsFor(allReminders()), vinCheck, current: () => cur() };
})();
