/* ============================================================
   Calculadora de Beneficios Pecuniarios — una app diseñada por Vincent
   Todo el estado vive en localStorage; sin backend.
   ============================================================ */

const STORAGE_KEY = 'cbp_state_v1';
const KEEP_LOGIN_KEY = 'cbp_keep_logged_in';
const PERSIST_SESSION_KEY = 'cbp_session_persist';

const DEFAULT_FEES = { listingFee: 0.20, processingFixed: 0.25, transactionPct: 6.5, processingPct: 3 };

const CURRENCIES = [
  { code: 'USD', symbol: '$',  decimals: 2 },
  { code: 'EUR', symbol: '€',  decimals: 2 },
  { code: 'GBP', symbol: '£',  decimals: 2 },
  { code: 'MXN', symbol: '$',  decimals: 2 },
  { code: 'CLP', symbol: '$',  decimals: 0 },
  { code: 'ARS', symbol: '$',  decimals: 0 },
  { code: 'COP', symbol: '$',  decimals: 0 },
  { code: 'BRL', symbol: 'R$', decimals: 2 },
  { code: 'CAD', symbol: '$',  decimals: 2 },
  { code: 'AUD', symbol: '$',  decimals: 2 },
];
const DEFAULT_RATES = { USD:1, EUR:0.92, GBP:0.79, MXN:18.5, CLP:950, ARS:990, COP:4100, BRL:5.4, CAD:1.37, AUD:1.53 };

const I18N = {
  es: {
    'dash.hero.label':'Resumen general','dash.hero.desc':'Así va tu catálogo de productos Printify hoy',
    'dash.stat.products':'Productos catalogados','dash.stat.avgcost':'Costo producción prom.',
    'dash.stat.avgshipcost':'Shipping (costo) prom.','dash.stat.avgshipclient':'Shipping (cliente) prom.',
    'dash.table.title':'Catálogo de productos','dash.empty':'Aún no hay productos. Agrégalos desde "Calculadora de Precios".',
    'th.producto':'Producto','th.colortalla':'Color / Tamaño','th.proveedor':'Proveedor','th.costoprod':'Costo Producción',
    'th.shipcosto':'Shipping (Costo)','th.shipcliente':'Shipping (Cliente)','th.acciones':'Acciones','th.fecha':'Fecha',
    'th.cant':'Cant.','th.precioventa':'Precio venta','th.costototal':'Costo total','th.resultado':'Resultado','th.estado':'Estado',
    'precios.tab.calc':'Calculadora','precios.tab.catalogo':'Inputs / Catálogo','precios.selecciona':'Elige tu producto',
    'precios.producto':'Producto','precios.inputs':'Inputs','precios.ganancia':'Ganancia deseada ($)','precios.ads':'Etsy Ads ($)',
    'precios.descuento':'Descuento (%)','precios.shipcliente':'Shipping cliente ($)','precios.freeship':'¿Envío gratis?',
    'opt.si':'Sí','opt.no':'No','precios.costos':'Información de costos del producto','precios.costototal':'Costo Total por Item',
    'precios.costoseditinfo':'Todos los valores de esta sección son editables: ajústalos para este cálculo sin cambiar tu catálogo ni tus ajustes generales.',
    'precios.subtotalfijas':'Subtotal Tarifas Fijas',
    'precios.precioganancia':'Precio y Ganancia','precios.preciominimo':'Precio mínimo de venta',
    'precios.preciosub':'cubre costos, tarifas de Etsy y tu ganancia deseada','precios.clientepaga':'Lo que paga el cliente',
    'precios.catalogotitle':'Tus productos (Inputs)',
    'precios.catalogoinfo':'Cada variación (color/talla) cuenta como un producto distinto. Estos datos alimentan automáticamente el Dashboard y el selector de la calculadora.',
    'precios.catalogoempty':'Agrega tu primer producto con el botón +.',
    'gan.inversion':'Inversión','gan.ganancianeta':'Ganancia neta','gan.perdida':'Pérdida',
    'gan.chart.estado':'Órdenes por estado','gan.chart.finanzas':'Inversión vs. ganancia vs. pérdida','gan.chart.productos':'Ingresos por producto',
    'gan.registrotitle':'Registro de ventas','gan.empty':'Registra tu primera venta con el botón +.',
    'nav.dashboard':'Dashboard','nav.precios':'Precios','nav.ganancias':'Ganancias',
    'modal.nuevoproducto':'Nuevo producto','modal.nuevaventa':'Nueva venta','btn.cancelar':'Cancelar','btn.guardar':'Guardar',
    'sale.costototalu':'Costo total ($/u, editable)','sale.notas':'Notas (opcional)',
    'estado.vendido':'Vendido','estado.devuelto':'Devuelto','estado.perdido':'Perdido / Dañado','estado.otro':'Otro',
    'settings.title':'Ajustes','settings.moneda':'Moneda','settings.actualizartasas':'Actualizar tasas de cambio',
    'settings.idioma':'Idioma y región','settings.idiomalabel':'Idioma de la app','settings.regionlabel':'Región / País',
    'settings.tarifasetsy':'Tarifas de Etsy (editable)','settings.listingfee':'Listing fee ($)','settings.processingfixed':'Processing fee fijo ($)',
    'settings.transactionpct':'Transaction fee (%)','settings.processingpct':'Processing fee (%)','btn.guardartarifas':'Guardar tarifas',
    'settings.cuenta':'Cuenta','settings.nombretienda':'Nombre de tu tienda','settings.mantenersesion':'Mantener sesión iniciada',
    'settings.mantenersesionsub':'No pedir contraseña al volver a abrir','settings.seguridad':'Cambiar acceso','settings.usuario':'Usuario',
    'settings.nuevacontrasena':'Nueva contraseña (opcional)','settings.repetir':'Repetir nueva contraseña','btn.guardarcambios':'Guardar cambios de acceso',
    'btn.cerrarsesion':'Cerrar sesión',
  },
  en: {
    'dash.hero.label':'Overview','dash.hero.desc':"Here's how your Printify catalog looks today",
    'dash.stat.products':'Catalogued products','dash.stat.avgcost':'Avg. production cost',
    'dash.stat.avgshipcost':'Avg. shipping (cost)','dash.stat.avgshipclient':'Avg. shipping (customer)',
    'dash.table.title':'Product catalog','dash.empty':'No products yet. Add them from "Price Calculator".',
    'th.producto':'Product','th.colortalla':'Color / Size','th.proveedor':'Provider','th.costoprod':'Production Cost',
    'th.shipcosto':'Shipping (Cost)','th.shipcliente':'Shipping (Customer)','th.acciones':'Actions','th.fecha':'Date',
    'th.cant':'Qty.','th.precioventa':'Sale price','th.costototal':'Total cost','th.resultado':'Result','th.estado':'Status',
    'precios.tab.calc':'Calculator','precios.tab.catalogo':'Inputs / Catalog','precios.selecciona':'Choose your product',
    'precios.producto':'Product','precios.inputs':'Inputs','precios.ganancia':'Desired profit ($)','precios.ads':'Etsy Ads ($)',
    'precios.descuento':'Discount (%)','precios.shipcliente':'Customer shipping ($)','precios.freeship':'Free shipping?',
    'opt.si':'Yes','opt.no':'No','precios.costos':'Product cost information','precios.costototal':'Total Cost per Item',
    'precios.costoseditinfo':"Every value in this section is editable: adjust them for this calculation without changing your catalog or your general settings.",
    'precios.subtotalfijas':'Fixed Fees Subtotal',
    'precios.precioganancia':'Price & Profit','precios.preciominimo':'Minimum sale price',
    'precios.preciosub':'covers costs, Etsy fees and your desired profit','precios.clientepaga':'What the customer pays',
    'precios.catalogotitle':'Your products (Inputs)',
    'precios.catalogoinfo':'Each variation (color/size) counts as a distinct product. This data automatically feeds the Dashboard and the calculator selector.',
    'precios.catalogoempty':'Add your first product with the + button.',
    'gan.inversion':'Investment','gan.ganancianeta':'Net profit','gan.perdida':'Loss',
    'gan.chart.estado':'Orders by status','gan.chart.finanzas':'Investment vs. profit vs. loss','gan.chart.productos':'Revenue by product',
    'gan.registrotitle':'Sales log','gan.empty':'Log your first sale with the + button.',
    'nav.dashboard':'Dashboard','nav.precios':'Prices','nav.ganancias':'Profit',
    'modal.nuevoproducto':'New product','modal.nuevaventa':'New sale','btn.cancelar':'Cancel','btn.guardar':'Save',
    'sale.costototalu':'Total cost ($/unit, editable)','sale.notas':'Notes (optional)',
    'estado.vendido':'Sold','estado.devuelto':'Returned','estado.perdido':'Lost / Damaged','estado.otro':'Other',
    'settings.title':'Settings','settings.moneda':'Currency','settings.actualizartasas':'Refresh exchange rates',
    'settings.idioma':'Language & region','settings.idiomalabel':'App language','settings.regionlabel':'Region / Country',
    'settings.tarifasetsy':'Etsy fees (editable)','settings.listingfee':'Listing fee ($)','settings.processingfixed':'Fixed processing fee ($)',
    'settings.transactionpct':'Transaction fee (%)','settings.processingpct':'Processing fee (%)','btn.guardartarifas':'Save fees',
    'settings.cuenta':'Account','settings.nombretienda':'Your shop name','settings.mantenersesion':'Keep me logged in',
    'settings.mantenersesionsub':"Don't ask for password on reopen",'settings.seguridad':'Change access','settings.usuario':'Username',
    'settings.nuevacontrasena':'New password (optional)','settings.repetir':'Repeat new password','btn.guardarcambios':'Save access changes',
    'btn.cerrarsesion':'Log out',
  }
};

/* ============ ROOT STATE ============ */
let root = loadRoot();
let session = null;          // {accountId}
let account = null;          // current account object
let data = null;             // current account's data bucket
let authMode = 'login';
let preciosSubTab = 'calc';
let freeShip = false;
let pendingUsername = '';
let chartEstado, chartFinanzas, chartProductos;

function loadRoot(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e){}
  return { accounts: [], data: {} };
}
function saveRoot(){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(root)); } catch(e){ console.error('save failed', e); }
}
function freshData(){
  return {
    settings: { currency:'USD', language:'es', region:'', fees: Object.assign({}, DEFAULT_FEES), rates: Object.assign({}, DEFAULT_RATES), ratesUpdated: null },
    products: [],
    sales: [],
  };
}
function ensureAccountData(accId){
  if (!root.data[accId]) root.data[accId] = freshData();
  const d = root.data[accId];
  if (!d.settings) d.settings = freshData().settings;
  if (!d.settings.fees) d.settings.fees = Object.assign({}, DEFAULT_FEES);
  if (!d.settings.rates) d.settings.rates = Object.assign({}, DEFAULT_RATES);
  if (!d.products) d.products = [];
  if (!d.sales) d.sales = [];
  return d;
}

/* ============ CRYPTO ============ */
async function hashPin(pin){
  if (window.crypto && crypto.subtle && (location.protocol==='https:' || location.hostname==='localhost')){
    try{
      const enc = new TextEncoder().encode(String(pin));
      const buf = await crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    }catch(e){}
  }
  let h = 0; const s = String(pin);
  for (let i=0;i<s.length;i++){ h = (h<<5)-h+s.charCodeAt(i); h|=0; }
  return 'fb'+Math.abs(h).toString(16);
}

/* ============ TOAST ============ */
let toastTimer=null;
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 2400);
}

/* ============ AUTH ============ */
function switchAuthTab(tab){
  authMode = tab;
  document.getElementById('authTabLogin').classList.toggle('active', tab==='login');
  document.getElementById('authTabSignup').classList.toggle('active', tab==='signup');
  document.getElementById('authPanelLogin').style.display = tab==='login' ? '' : 'none';
  document.getElementById('authPanelSignup').style.display = tab==='signup' ? '' : 'none';
  document.getElementById('loginErr').textContent = '';
  document.getElementById('signupErr').textContent = '';
}

async function doSignup(){
  const err = document.getElementById('signupErr'); err.textContent='';
  const nombre = document.getElementById('su_nombre').value.trim();
  const tienda = document.getElementById('su_tienda').value.trim();
  const username = document.getElementById('su_username').value.trim().toLowerCase();
  const p1 = document.getElementById('su_password').value;
  const p2 = document.getElementById('su_password2').value;
  const keep = document.getElementById('su_keep').checked;
  if (!username){ err.textContent='Ingresa un usuario.'; return; }
  if (root.accounts.some(a=>a.username===username)){ err.textContent='Ese usuario ya existe, intenta iniciar sesión.'; return; }
  if (p1.length < 4){ err.textContent='La contraseña debe tener al menos 4 caracteres.'; return; }
  if (p1 !== p2){ err.textContent='Las contraseñas no coinciden.'; return; }
  const acc = {
    id: 'acc_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7),
    username, nombre: nombre || username, tienda: tienda || 'Mi tienda',
    passwordHash: await hashPin(p1), createdAt: Date.now(),
  };
  root.accounts.push(acc);
  ensureAccountData(acc.id);
  saveRoot();
  session = { accountId: acc.id };
  setKeepLoginEnabled(keep);
  persistSession();
  enterApp();
  showToast('¡Cuenta creada! Bienvenida ' + acc.nombre);
}

async function doLogin(){
  const err = document.getElementById('loginErr'); err.textContent='';
  const username = document.getElementById('li_username').value.trim().toLowerCase();
  const pass = document.getElementById('li_password').value;
  const keep = document.getElementById('li_keep').checked;
  const acc = root.accounts.find(a=>a.username===username);
  if (!acc){ err.textContent='Usuario no encontrado.'; return; }
  const h = await hashPin(pass);
  if (h !== acc.passwordHash){ err.textContent='Contraseña incorrecta.'; return; }
  session = { accountId: acc.id };
  setKeepLoginEnabled(keep);
  persistSession();
  enterApp();
}

function isKeepLoginEnabled(){
  try { return localStorage.getItem(KEEP_LOGIN_KEY) === '1'; } catch(e){ return false; }
}
function setKeepLoginEnabled(v){
  try {
    localStorage.setItem(KEEP_LOGIN_KEY, v ? '1' : '0');
    if (v && session) localStorage.setItem(PERSIST_SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(PERSIST_SESSION_KEY);
  } catch(e){}
}
function persistSession(){
  try {
    sessionStorage.setItem('cbp_session', JSON.stringify(session));
    if (isKeepLoginEnabled()) localStorage.setItem(PERSIST_SESSION_KEY, JSON.stringify(session));
  } catch(e){}
}
function toggleKeepLogin(){
  setKeepLoginEnabled(!isKeepLoginEnabled());
  document.getElementById('s_keepSwitch').classList.toggle('on', isKeepLoginEnabled());
}

function doLogout(){
  try { sessionStorage.removeItem('cbp_session'); localStorage.removeItem(PERSIST_SESSION_KEY); } catch(e){}
  session = null; account = null; data = null;
  closeSettings();
  document.getElementById('appShell').style.display = 'none';
  document.getElementById('view-auth').classList.add('show');
  document.getElementById('li_username').value=''; document.getElementById('li_password').value='';
}

/* ============ ENTER APP ============ */
function enterApp(){
  account = root.accounts.find(a=>a.id===session.accountId);
  if (!account){ doLogout(); return; }
  data = ensureAccountData(account.id);
  document.getElementById('view-auth').classList.remove('show');
  document.getElementById('appShell').style.display = 'block';
  document.getElementById('dashGreeting').textContent = 'Hola, ' + account.nombre + ' 👋';
  document.getElementById('brandStoreName').textContent = account.tienda;
  applyLanguage();
  renderCurrencyPill();
  goTo('dashboard');
  renderAll();
  initCalcFeeDefaults();
  onCalcProductChange();
}

/* ============ NAV ============ */
function goTo(view){
  document.querySelectorAll('#appShell .view').forEach(v=>v.classList.remove('show'));
  document.getElementById('view-'+view).classList.add('show');
  document.getElementById('navDashboard').classList.toggle('active', view==='dashboard');
  document.getElementById('navPrecios').classList.toggle('active', view==='precios');
  document.getElementById('navGanancias').classList.toggle('active', view==='ganancias');
  if (view==='ganancias') renderCharts();
}
function switchPreciosTab(tab){
  preciosSubTab = tab;
  document.getElementById('preciosSubCalc').classList.toggle('active', tab==='calc');
  document.getElementById('preciosSubCatalogo').classList.toggle('active', tab==='catalogo');
  document.getElementById('preciosPanelCalc').style.display = tab==='calc' ? '' : 'none';
  document.getElementById('preciosPanelCatalogo').style.display = tab==='catalogo' ? '' : 'none';
  if (tab==='catalogo') renderCatalogTable();
}

/* ============ CURRENCY / FORMAT ============ */
function currentCurrency(){ return CURRENCIES.find(c=>c.code===data.settings.currency) || CURRENCIES[0]; }
function fmt(amountUSD){
  const c = currentCurrency();
  const rate = data.settings.rates[c.code] || 1;
  const val = (amountUSD||0) * rate;
  return c.symbol + val.toLocaleString(undefined, { minimumFractionDigits:c.decimals, maximumFractionDigits:c.decimals });
}
function renderCurrencyPill(){
  const c = currentCurrency();
  document.getElementById('currencyPill').innerHTML = c.code + ' ' + c.symbol;
}
function renderCurrencyGrid(){
  const grid = document.getElementById('currencyGrid');
  grid.innerHTML = CURRENCIES.map(c=>{
    const active = c.code===data.settings.currency ? 'active' : '';
    return `<button class="currency-opt ${active}" onclick="setCurrency('${c.code}')">${c.code} ${c.symbol}</button>`;
  }).join('');
  const upd = data.settings.ratesUpdated;
  const lang = data.settings.language;
  const prefix = lang==='en' ? 'Rates updated: ' : 'Tasas actualizadas: ';
  const fallback = lang==='en' ? 'Using default reference rates' : 'Usando tasas de referencia por defecto';
  document.getElementById('ratesUpdatedLabel').textContent = upd
    ? (prefix + new Date(upd).toLocaleString())
    : fallback;
}
function setCurrency(code){
  data.settings.currency = code;
  saveRoot();
  renderCurrencyGrid(); renderCurrencyPill(); renderAll();
}
async function refreshRates(){
  showToast('Actualizando tasas...');
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const json = await res.json();
    if (json && json.rates){
      CURRENCIES.forEach(c=>{
        if (json.rates[c.code]) data.settings.rates[c.code] = json.rates[c.code];
      });
      data.settings.rates.USD = 1;
      data.settings.ratesUpdated = Date.now();
      saveRoot();
      renderCurrencyGrid(); renderAll();
      showToast('Tasas de cambio actualizadas ✓');
      return;
    }
  } catch(e){ /* fall through */ }
  showToast('No se pudo conectar. Se mantienen las tasas actuales.');
}

/* ============ i18n ============ */
function t(key){ return (I18N[data ? data.settings.language : 'es'][key]) || key; }
function applyLanguage(){
  const lang = data.settings.language || 'es';
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    if (I18N[lang][key]) el.textContent = I18N[lang][key];
  });
  document.getElementById('s_language').value = lang;
}
function changeLanguage(lang){
  data.settings.language = lang; saveRoot(); applyLanguage(); renderAll(); renderCurrencyGrid();
}
function saveRegion(val){ data.settings.region = val; saveRoot(); }
function saveStoreName(val){ account.tienda = val || account.tienda; saveRoot(); document.getElementById('brandStoreName').textContent = account.tienda; }

/* ============ FEES ============
   `costs` is an explicit bundle { CP, SC, listingFee, processingFixed, transactionPct, processingPct }
   so callers (the editable price calculator, the sale modal quick-fill) can each supply their own
   values instead of this function reaching into the product catalog or global settings itself. */
function computeFor(costs, inputs){
  const CP = costs.CP || 0;
  const SC = costs.SC || 0;
  const listingFee = costs.listingFee || 0;
  const processingFixed = costs.processingFixed || 0;
  const transactionPct = costs.transactionPct || 0;
  const processingPct = costs.processingPct || 0;
  const EA = inputs.ads || 0;
  const d = (inputs.descuentoPct || 0) / 100;
  const shipCliente = inputs.freeShip ? 0 : (inputs.shipCliente || 0);
  const G = inputs.ganancia || 0;
  const F = CP + SC + EA + listingFee + processingFixed;
  const v = (transactionPct + processingPct) / 100;
  const denom = (1 - d) * (1 - v);
  let P = denom > 0 ? (G + F - shipCliente * (1 - v)) / denom : 0;
  if (!isFinite(P) || P < 0) P = 0;
  const descuentoAmount = P * d;
  const precioConDescuento = P - descuentoAmount;
  const totalCharged = precioConDescuento + shipCliente;
  const transactionFeeAmt = totalCharged * transactionPct / 100;
  const processingPctAmt = totalCharged * processingPct / 100;
  const variableTotal = transactionFeeAmt + processingPctAmt;
  const costoTotalItem = F + variableTotal;
  const netReceived = totalCharged - variableTotal;
  const gananciaReal = netReceived - F;
  return { CP, SC, EA, F, v, P, descuentoAmount, precioConDescuento, shipCliente, totalCharged,
           transactionFeeAmt, processingPctAmt, variableTotal, costoTotalItem, netReceived, gananciaReal,
           listingFee, processingFixed, transactionPct, processingPct };
}

/* ============ PRODUCTS ============ */
function renderProductSelect(selEl, includeEmpty){
  const opts = data.products.map(p=>`<option value="${p.id}">${escapeHtml(p.nombre)} — ${escapeHtml(p.colortalla)}</option>`).join('');
  selEl.innerHTML = (includeEmpty ? `<option value="">Selecciona...</option>` : '') + opts;
}
function onCalcProductChange(){
  const product = getCalcProduct();
  if (product){
    document.getElementById('calcCP').value = product.costoProduccion;
    document.getElementById('calcSC').value = product.shippingCosto;
  }
  runPriceCalc();
}
function getCalcProduct(){
  const sel = document.getElementById('calcProductSelect');
  return data.products.find(p=>p.id===sel.value) || null;
}
function initCalcFeeDefaults(){
  const fees = data.settings.fees;
  document.getElementById('calcListingFee').value = fees.listingFee;
  document.getElementById('calcProcessingFixed').value = fees.processingFixed;
  document.getElementById('calcTransactionPct').value = fees.transactionPct;
  document.getElementById('calcProcessingPct').value = fees.processingPct;
}
function setFreeShip(val){
  freeShip = val;
  document.getElementById('freeShipYes').classList.toggle('active', val);
  document.getElementById('freeShipNo').classList.toggle('active', !val);
  runPriceCalc();
}

function runPriceCalc(){
  const product = getCalcProduct();
  const infoBox = document.getElementById('calcProductInfo');
  if (!product){
    infoBox.textContent = 'Agrega un producto en la pestaña "Inputs / Catálogo" para empezar a calcular.';
  } else {
    infoBox.innerHTML = `<b>${escapeHtml(product.proveedor||'—')}</b> · Catálogo: costo producción ${fmt(product.costoProduccion)} · shipping costo ${fmt(product.shippingCosto)} (editable abajo)`;
  }
  const costs = {
    CP: parseFloat(document.getElementById('calcCP').value)||0,
    SC: parseFloat(document.getElementById('calcSC').value)||0,
    listingFee: parseFloat(document.getElementById('calcListingFee').value)||0,
    processingFixed: parseFloat(document.getElementById('calcProcessingFixed').value)||0,
    transactionPct: parseFloat(document.getElementById('calcTransactionPct').value)||0,
    processingPct: parseFloat(document.getElementById('calcProcessingPct').value)||0,
  };
  const inputs = {
    ganancia: parseFloat(document.getElementById('calcGanancia').value)||0,
    ads: parseFloat(document.getElementById('calcAds').value)||0,
    descuentoPct: parseFloat(document.getElementById('calcDescuento').value)||0,
    shipCliente: parseFloat(document.getElementById('calcShipCliente').value)||0,
    freeShip,
  };
  const r = computeFor(costs, inputs);

  document.getElementById('subtotalFijas').textContent = fmt(r.F);
  document.getElementById('variableFeesList').innerHTML = [
    row(`Transaction Fee (${r.transactionPct}%)`, fmt(r.transactionFeeAmt)),
    row(`Processing Fee (${r.processingPct}%)`, fmt(r.processingPctAmt)),
    row('<b>Subtotal Tarifas Variables</b>', '<b>'+fmt(r.variableTotal)+'</b>'),
  ].join('');
  document.getElementById('costoTotalItem').textContent = fmt(r.costoTotalItem);

  document.getElementById('priceBreakdown').innerHTML = [
    row('Costo Total por Item', fmt(r.costoTotalItem)),
    row(`Descuento aplicado (${inputs.descuentoPct}%)`, fmt(r.descuentoAmount)),
    row('Ganancia Deseada', fmt(inputs.ganancia)),
  ].join('');
  document.getElementById('precioMinimo').textContent = fmt(r.P);

  document.getElementById('clientBreakdown').innerHTML = [
    row('Precio Venta', fmt(r.P)),
    row('Menos: Descuento', '-'+fmt(r.descuentoAmount)),
    row('<b>Precio con Descuento</b>', '<b>'+fmt(r.precioConDescuento)+'</b>'),
    row('+ Shipping', fmt(r.shipCliente)),
    row('<b>Costo Final del Cliente</b>', '<b>'+fmt(r.totalCharged)+'</b>'),
  ].join('');
}
function row(lbl, val){ return `<div class="breakdown-row"><span class="lbl">${lbl}</span><span class="val">${val}</span></div>`; }
function escapeHtml(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---- product CRUD ---- */
function openProductModal(id){
  document.getElementById('pm_id').value = id || '';
  const p = id ? data.products.find(x=>x.id===id) : null;
  document.getElementById('productModalTitle').textContent = p ? 'Editar producto' : t('modal.nuevoproducto');
  document.getElementById('pm_nombre').value = p ? p.nombre : '';
  document.getElementById('pm_colortalla').value = p ? p.colortalla : '';
  document.getElementById('pm_proveedor').value = p ? p.proveedor : '';
  document.getElementById('pm_costoprod').value = p ? p.costoProduccion : '';
  document.getElementById('pm_shipcosto').value = p ? p.shippingCosto : '';
  document.getElementById('pm_shipcliente').value = p ? p.shippingCliente : 5.99;
  document.getElementById('productModalOverlay').classList.add('show');
}
function closeProductModal(){ document.getElementById('productModalOverlay').classList.remove('show'); }
function saveProduct(){
  const id = document.getElementById('pm_id').value;
  const nombre = document.getElementById('pm_nombre').value.trim();
  const colortalla = document.getElementById('pm_colortalla').value.trim();
  if (!nombre){ showToast('Ponle un nombre al producto'); return; }
  const obj = {
    id: id || ('prod_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)),
    nombre, colortalla, proveedor: document.getElementById('pm_proveedor').value.trim(),
    costoProduccion: parseFloat(document.getElementById('pm_costoprod').value)||0,
    shippingCosto: parseFloat(document.getElementById('pm_shipcosto').value)||0,
    shippingCliente: parseFloat(document.getElementById('pm_shipcliente').value)||0,
  };
  if (id){
    const idx = data.products.findIndex(p=>p.id===id);
    if (idx>=0) data.products[idx] = obj;
  } else {
    data.products.push(obj);
  }
  saveRoot();
  closeProductModal();
  renderAll();
  showToast('Producto guardado ✓');
}
function deleteProduct(id){
  if (!confirm('¿Eliminar este producto del catálogo?')) return;
  data.products = data.products.filter(p=>p.id!==id);
  saveRoot();
  renderAll();
}

/* ============ RENDER: DASHBOARD & CATALOG ============ */
function renderAll(){
  renderDashboard();
  renderCatalogTable();
  renderProductSelect(document.getElementById('calcProductSelect'), false);
  renderProductSelect(document.getElementById('sm_producto'), true);
  runPriceCalc();
  renderSalesTable();
  renderGananciasStats();
  if (document.getElementById('view-ganancias').classList.contains('show')) renderCharts();
}

function renderDashboard(){
  const products = data.products;
  document.getElementById('statProductCount').textContent = products.length;
  const avg = (key) => products.length ? (products.reduce((s,p)=>s+(p[key]||0),0)/products.length) : 0;
  document.getElementById('statAvgCost').textContent = fmt(avg('costoProduccion'));
  document.getElementById('statAvgShipCost').textContent = fmt(avg('shippingCosto'));
  document.getElementById('statAvgShipClient').textContent = fmt(avg('shippingCliente'));

  const body = document.getElementById('dashboardTableBody');
  const empty = document.getElementById('dashboardEmpty');
  if (!products.length){ body.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display='none';
  body.innerHTML = products.map(p=>`
    <tr>
      <td>${escapeHtml(p.nombre)}</td>
      <td>${escapeHtml(p.colortalla)||'—'}</td>
      <td>${escapeHtml(p.proveedor)||'—'}</td>
      <td>${fmt(p.costoProduccion)}</td>
      <td>${fmt(p.shippingCosto)}</td>
      <td>${fmt(p.shippingCliente)}</td>
    </tr>`).join('');
}

function renderCatalogTable(){
  const products = data.products;
  const body = document.getElementById('catalogTableBody');
  const empty = document.getElementById('catalogEmpty');
  if (!products.length){ body.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display='none';
  body.innerHTML = products.map(p=>`
    <tr>
      <td>${escapeHtml(p.nombre)}</td>
      <td>${escapeHtml(p.colortalla)||'—'}</td>
      <td>${escapeHtml(p.proveedor)||'—'}</td>
      <td>${fmt(p.costoProduccion)}</td>
      <td>${fmt(p.shippingCosto)}</td>
      <td>${fmt(p.shippingCliente)}</td>
      <td><div class="row-actions">
        <button class="mini-btn" onclick="openProductModal('${p.id}')"><svg class="icon icon-sm"><use href="#ic-edit"/></svg></button>
        <button class="mini-btn danger" onclick="deleteProduct('${p.id}')"><svg class="icon icon-sm"><use href="#ic-trash"/></svg></button>
      </div></td>
    </tr>`).join('');
}

/* ============ SALES / GANANCIAS ============ */
function openSaleModal(id){
  document.getElementById('sm_id').value = id || '';
  const s = id ? data.sales.find(x=>x.id===id) : null;
  document.getElementById('saleModalTitle').textContent = s ? 'Editar venta' : t('modal.nuevaventa');
  document.getElementById('sm_fecha').value = s ? s.fecha : new Date().toISOString().slice(0,10);
  renderProductSelect(document.getElementById('sm_producto'), true);
  document.getElementById('sm_producto').value = s ? s.productId : '';
  document.getElementById('sm_cantidad').value = s ? s.cantidad : 1;
  document.getElementById('sm_precio').value = s ? s.precioVenta : 0;
  document.getElementById('sm_costo').value = s ? s.costoTotal : 0;
  document.getElementById('sm_estado').value = s ? s.estado : 'vendido';
  document.getElementById('sm_notas').value = s ? (s.notas||'') : '';
  if (!s) onSaleProductChange();
  document.getElementById('saleModalOverlay').classList.add('show');
  recalcSaleModal();
}
document.addEventListener('change', (e)=>{ if (e.target && e.target.id==='sm_producto') onSaleProductChange(); });
function onSaleProductChange(){
  const p = data.products.find(x=>x.id===document.getElementById('sm_producto').value);
  if (p){
    const fees = data.settings.fees;
    document.getElementById('sm_costo').value = (p.costoProduccion + p.shippingCosto + fees.listingFee + fees.processingFixed).toFixed(2);
  }
  recalcSaleModal();
}
function closeSaleModal(){ document.getElementById('saleModalOverlay').classList.remove('show'); }
function recalcSaleModal(){
  const cant = parseFloat(document.getElementById('sm_cantidad').value)||0;
  const precio = parseFloat(document.getElementById('sm_precio').value)||0;
  const costo = parseFloat(document.getElementById('sm_costo').value)||0;
  const resultado = (precio-costo)*cant;
  const box = document.getElementById('saleModalPreview');
  const cls = resultado>=0 ? 'good' : 'danger';
  box.innerHTML = `Ingreso total: <b>${fmt(precio*cant)}</b> · Costo total: <b>${fmt(costo*cant)}</b> · Resultado: <b style="color:var(--${cls})">${fmt(resultado)}</b>`;
}
function saveSale(){
  const id = document.getElementById('sm_id').value;
  const productId = document.getElementById('sm_producto').value;
  const product = data.products.find(p=>p.id===productId);
  if (!product){ showToast('Elige un producto'); return; }
  const obj = {
    id: id || ('sale_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)),
    fecha: document.getElementById('sm_fecha').value || new Date().toISOString().slice(0,10),
    productId, productLabel: product.nombre + ' — ' + product.colortalla,
    cantidad: parseFloat(document.getElementById('sm_cantidad').value)||1,
    precioVenta: parseFloat(document.getElementById('sm_precio').value)||0,
    costoTotal: parseFloat(document.getElementById('sm_costo').value)||0,
    estado: document.getElementById('sm_estado').value,
    notas: document.getElementById('sm_notas').value.trim(),
  };
  if (id){
    const idx = data.sales.findIndex(s=>s.id===id);
    if (idx>=0) data.sales[idx] = obj;
  } else {
    data.sales.push(obj);
  }
  saveRoot();
  closeSaleModal();
  renderSalesTable(); renderGananciasStats(); renderCharts();
  showToast('Venta guardada ✓');
}
function deleteSale(id){
  if (!confirm('¿Eliminar este registro de venta?')) return;
  data.sales = data.sales.filter(s=>s.id!==id);
  saveRoot();
  renderSalesTable(); renderGananciasStats(); renderCharts();
}

const ESTADO_META = {
  vendido:  { label: () => t('estado.vendido'),  cls:'good'  },
  devuelto: { label: () => t('estado.devuelto'), cls:'warn'  },
  perdido:  { label: () => t('estado.perdido'),  cls:'danger'},
  otro:     { label: () => t('estado.otro'),     cls:'muted' },
};

function renderSalesTable(){
  const body = document.getElementById('salesTableBody');
  const empty = document.getElementById('salesEmpty');
  const sales = [...data.sales].sort((a,b)=> (b.fecha||'').localeCompare(a.fecha||''));
  if (!sales.length){ body.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display='none';
  body.innerHTML = sales.map(s=>{
    const resultado = (s.precioVenta - s.costoTotal) * s.cantidad;
    const meta = ESTADO_META[s.estado] || ESTADO_META.otro;
    const resCls = resultado>=0 ? 'good' : 'danger';
    return `<tr>
      <td>${escapeHtml(s.fecha)}</td>
      <td>${escapeHtml(s.productLabel)}</td>
      <td>${s.cantidad}</td>
      <td>${fmt(s.precioVenta)}</td>
      <td>${fmt(s.costoTotal)}</td>
      <td><span style="color:var(--${resCls});font-weight:700;">${fmt(resultado)}</span></td>
      <td><span class="badge ${meta.cls}">${meta.label()}</span></td>
      <td><div class="row-actions">
        <button class="mini-btn" onclick="openSaleModal('${s.id}')"><svg class="icon icon-sm"><use href="#ic-edit"/></svg></button>
        <button class="mini-btn danger" onclick="deleteSale('${s.id}')"><svg class="icon icon-sm"><use href="#ic-trash"/></svg></button>
      </div></td>
    </tr>`;
  }).join('');
}

function renderGananciasStats(){
  let inversion=0, gananciaNeta=0, perdida=0;
  data.sales.forEach(s=>{
    const costoTotal = s.costoTotal * s.cantidad;
    const ingreso = s.precioVenta * s.cantidad;
    inversion += costoTotal;
    if (s.estado==='vendido') gananciaNeta += (ingreso - costoTotal);
    else if (s.estado==='devuelto' || s.estado==='perdido') perdida += costoTotal;
  });
  document.getElementById('statInversion').textContent = fmt(inversion);
  document.getElementById('statGananciaNeta').textContent = fmt(gananciaNeta);
  document.getElementById('statPerdida').textContent = fmt(perdida);
  return { inversion, gananciaNeta, perdida };
}

/* ============ CHARTS ============ */
const PALETTE = ['#7c3aed','#a78bfa','#c4b5fd','#5b21b6','#e11d48','#d97706','#16a34a','#0ea5e9','#f472b6','#94a3b8'];

function renderCharts(){
  if (typeof Chart === 'undefined') return;
  renderChartEstado();
  renderChartFinanzas();
  renderChartProductos();
}
function destroyIf(c){ if (c) c.destroy(); }

function renderChartEstado(){
  const counts = { vendido:0, devuelto:0, perdido:0, otro:0 };
  data.sales.forEach(s=>{ counts[s.estado] = (counts[s.estado]||0) + s.cantidad; });
  const labels = Object.keys(counts).map(k=> (ESTADO_META[k]||ESTADO_META.otro).label());
  const values = Object.values(counts);
  const colors = ['#16a34a','#d97706','#e11d48','#94a3b8'];
  destroyIf(chartEstado);
  const ctx = document.getElementById('chartEstado').getContext('2d');
  chartEstado = new Chart(ctx, { type:'doughnut', data:{ labels, datasets:[{ data:values, backgroundColor:colors, borderWidth:2, borderColor:'#fdfcff' }]},
    options: baseChartOptions() });
  renderLegend('legendEstado', labels, colors);
}
function renderChartFinanzas(){
  const { inversion, gananciaNeta, perdida } = renderGananciasStats();
  const labels = [t('gan.inversion'), t('gan.ganancianeta'), t('gan.perdida')];
  const values = [Math.max(inversion,0), Math.max(gananciaNeta,0), Math.max(perdida,0)];
  const colors = ['#7c3aed','#16a34a','#e11d48'];
  destroyIf(chartFinanzas);
  const ctx = document.getElementById('chartFinanzas').getContext('2d');
  chartFinanzas = new Chart(ctx, { type:'doughnut', data:{ labels, datasets:[{ data:values, backgroundColor:colors, borderWidth:2, borderColor:'#fdfcff' }]},
    options: baseChartOptions() });
  renderLegend('legendFinanzas', labels, colors);
}
function renderChartProductos(){
  const revenueByProduct = {};
  data.sales.filter(s=>s.estado==='vendido').forEach(s=>{
    revenueByProduct[s.productLabel] = (revenueByProduct[s.productLabel]||0) + s.precioVenta*s.cantidad;
  });
  let entries = Object.entries(revenueByProduct).sort((a,b)=>b[1]-a[1]);
  if (entries.length > 6){
    const top = entries.slice(0,5);
    const restSum = entries.slice(5).reduce((s,e)=>s+e[1],0);
    entries = top.concat([['Otros', restSum]]);
  }
  const labels = entries.map(e=>e[0]);
  const values = entries.map(e=>e[1]);
  const colors = PALETTE;
  destroyIf(chartProductos);
  const ctx = document.getElementById('chartProductos').getContext('2d');
  chartProductos = new Chart(ctx, { type:'doughnut', data:{ labels, datasets:[{ data: values.length?values:[1], backgroundColor: values.length?colors:['#e5e0f5'], borderWidth:2, borderColor:'#fdfcff' }]},
    options: baseChartOptions() });
  renderLegend('legendProductos', labels.length?labels:['Sin ventas aún'], values.length?colors:['#e5e0f5']);
}
function baseChartOptions(){
  return { responsive:true, maintainAspectRatio:false, cutout:'62%', plugins:{ legend:{ display:false },
    tooltip:{ callbacks:{ label:(ctx)=> ctx.label + ': ' + fmt(ctx.parsed) } } } };
}
function renderLegend(elId, labels, colors){
  document.getElementById(elId).innerHTML = labels.map((l,i)=>
    `<span class="legend-item"><span class="legend-dot" style="background:${colors[i%colors.length]}"></span>${escapeHtml(l)}</span>`).join('');
}

/* ============ SETTINGS ============ */
function openSettings(focus){
  document.getElementById('s_language').value = data.settings.language;
  document.getElementById('s_region').value = data.settings.region || '';
  document.getElementById('s_listingFee').value = data.settings.fees.listingFee;
  document.getElementById('s_processingFixed').value = data.settings.fees.processingFixed;
  document.getElementById('s_transactionPct').value = data.settings.fees.transactionPct;
  document.getElementById('s_processingPct').value = data.settings.fees.processingPct;
  document.getElementById('s_tienda').value = account.tienda;
  document.getElementById('s_username').value = account.username;
  pendingUsername = account.username;
  document.getElementById('s_newpass1').value = '';
  document.getElementById('s_newpass2').value = '';
  document.getElementById('accountErr').textContent = '';
  document.getElementById('s_keepSwitch').classList.toggle('on', isKeepLoginEnabled());
  renderCurrencyGrid();
  document.getElementById('settingsOverlay').classList.add('show');
  if (focus==='moneda') document.getElementById('settingsMoneda').scrollIntoView({block:'start'});
}
function closeSettings(){ document.getElementById('settingsOverlay').classList.remove('show'); }
function saveFees(){
  data.settings.fees = {
    listingFee: parseFloat(document.getElementById('s_listingFee').value)||0,
    processingFixed: parseFloat(document.getElementById('s_processingFixed').value)||0,
    transactionPct: parseFloat(document.getElementById('s_transactionPct').value)||0,
    processingPct: parseFloat(document.getElementById('s_processingPct').value)||0,
  };
  saveRoot();
  runPriceCalc();
  showToast('Tarifas actualizadas ✓');
}
async function saveAccount(){
  const err = document.getElementById('accountErr'); err.textContent='';
  const newUsername = (document.getElementById('s_username').value || '').trim().toLowerCase();
  const p1 = document.getElementById('s_newpass1').value;
  const p2 = document.getElementById('s_newpass2').value;
  if (!newUsername){ err.textContent='El usuario no puede estar vacío.'; return; }
  if (newUsername !== account.username && root.accounts.some(a=>a.username===newUsername)){
    err.textContent='Ese usuario ya está en uso.'; return;
  }
  if (p1 || p2){
    if (p1.length < 4){ err.textContent='La nueva contraseña debe tener al menos 4 caracteres.'; return; }
    if (p1 !== p2){ err.textContent='Las contraseñas no coinciden.'; return; }
    account.passwordHash = await hashPin(p1);
  }
  account.username = newUsername;
  saveRoot();
  persistSession();
  showToast('Datos de acceso actualizados ✓');
}

/* ============ INIT ============ */
document.addEventListener('DOMContentLoaded', ()=>{
  try {
    const raw = sessionStorage.getItem('cbp_session') || (isKeepLoginEnabled() ? localStorage.getItem(PERSIST_SESSION_KEY) : null);
    if (raw) session = JSON.parse(raw);
  } catch(e){}

  if (session && root.accounts.some(a=>a.id===session.accountId)){
    enterApp();
  } else {
    document.getElementById('view-auth').classList.add('show');
  }

  document.getElementById('sm_fecha').value = new Date().toISOString().slice(0,10);

  ['productModalOverlay','saleModalOverlay','settingsOverlay'].forEach(id=>{
    document.getElementById(id).addEventListener('click', (e)=>{
      if (e.target.id===id) e.currentTarget.classList.remove('show');
    });
  });
});
