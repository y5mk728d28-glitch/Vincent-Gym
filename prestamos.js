/* ============ CONSTANTS ============ */
const STORAGE_KEY = 'vincentloans-state';
const US_STATES = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
  ['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['DC','Washington D.C.'],['FL','Florida'],
  ['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],
  ['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],
  ['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],
  ['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],
  ['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],
  ['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],
  ['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],
  ['VT','Vermont'],['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming']
];
const FREQ_DAYS = { diario:1, semanal:7, quincenal:15, anual:365 };
const FREQ_LABEL = { diario:'Diario', semanal:'Semanal', quincenal:'Quincenal', anual:'Anual', personalizado:'Personalizado' };
const PENALTY_RATE = 0.05;

/* ============ ID / FOLIO GENERATORS ============
   Cliente:  {Iniciales(2)}{AñoNac(2)}{Estado(2)}{5 dígitos al azar}   — asignado una sola vez, de por vida
   Préstamo: {Estado(2)}{Año del préstamo(2)}{Categoría(1)}{5 dígitos al azar}
             Categoría por monto: <$100 = C, $100–$9,999.99 = M, >=$10,000 = D
*/
function nameInitials(nombre){
  const words = String(nombre||'').trim().split(/\s+/).filter(Boolean);
  if(words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if(words.length === 1) return words[0].slice(0,2).toUpperCase().padEnd(2,'X');
  return 'XX';
}
function montoCategoria(monto){
  if(monto < 100) return 'C';
  if(monto < 10000) return 'M';
  return 'D';
}
function clientBirthYear(client){
  if(client.fechaNacimiento){ const d = parseDate(client.fechaNacimiento); if(d) return d.getFullYear(); }
  return client.anioNacimiento || 0;
}
function generateClientCodigo(nombre, anioNacimiento, estado){
  const prefix = nameInitials(nombre) + String(anioNacimiento||0).padStart(2,'0').slice(-2) + (estado||'NV');
  let codigo;
  do { codigo = prefix + randomDigits(5); } while(state.clients.some(c => c.codigo === codigo));
  return codigo;
}
function generateLoanFolio(estado, fechaInicio, principal){
  const anio = String(parseDate(fechaInicio).getFullYear()).slice(-2);
  const prefix = estado + anio + montoCategoria(principal);
  let folio;
  do { folio = prefix + randomDigits(5); } while(state.loans.some(l => l.folio === folio));
  return folio;
}

/* ============ STATE & PERSISTENCE ============ */
function defaultState(){
  return {
    setup: { done:false, adminPinHash:null, lender:{ nombre:'', direccion:'', ciudad:'', estado:'NV' } },
    clients: [],
    loans: []
  };
}
let state = defaultState();

async function saveState(){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch(e){ console.error('save failed', e); showToast('⚠️ No se pudo guardar — exporta un respaldo'); }
}
function loadState(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) state = Object.assign(defaultState(), JSON.parse(raw));
  } catch(e){ state = defaultState(); }
  migrateState();
}
/* Backfills fields/IDs added after some clients/loans already existed on a
   device, so older saved data doesn't crash newer code and picks up the
   new ID formats automatically. */
function migrateState(){
  for(const loan of state.loans){
    for(const c of loan.cuotas){
      if(!Array.isArray(c.pagos)) c.pagos = [];
    }
  }
  for(const client of state.clients){
    if(!Array.isArray(client.historialDirecciones)) client.historialDirecciones = [];
    if(/^\d{6}$/.test(client.codigo || '')){
      client.codigo = generateClientCodigo(client.nombre, clientBirthYear(client), client.estado || 'NV');
    }
  }
  for(const loan of state.loans){
    if(/^P-[A-Z0-9]{6}$/.test(loan.folio || '')){
      const client = state.clients.find(c => c.id === loan.clientId);
      loan.folio = generateLoanFolio((client && client.estado) || 'NV', loan.fechaInicio, loan.principal);
    }
  }
  saveState();
}

/* ============ HASH ============ */
async function hashPin(pin){
  if(window.crypto && crypto.subtle && (location.protocol==='https:' || location.hostname==='localhost')){
    try{
      const enc = new TextEncoder().encode(String(pin));
      const buf = await crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    }catch(e){}
  }
  let h = 0;
  const s = String(pin);
  for(let i=0;i<s.length;i++){ h = (h*31 + s.charCodeAt(i)) >>> 0; }
  return 'fb_' + h.toString(16);
}

/* ============ DATE / MONEY UTILS ============ */
function localDateStr(d){ d = d || new Date(); const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0'); return y+'-'+m+'-'+day; }
function parseDate(s){ if(!s) return null; const parts = s.split('-').map(Number); return new Date(parts[0], parts[1]-1, parts[2]); }
function todayMidnight(){ const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
function addDays(d, n){ const r = new Date(d); r.setDate(r.getDate()+n); return r; }
function daysBetween(a,b){ return Math.round((b-a)/86400000); }
function formatDateEs(s, opts){
  const d = parseDate(s); if(!d) return '—';
  return d.toLocaleDateString('es-ES', opts || {day:'numeric', month:'short', year:'numeric'});
}
function round2(n){ return Math.round((n + Number.EPSILON) * 100) / 100; }
function fmtMoney(n){ return '$' + (n||0).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2}); }
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
function randomDigits(n){ let s=''; for(let i=0;i<n;i++) s += Math.floor(Math.random()*10); return s; }

/* ============ LOAN MATH ============ */
function periodDays(loan){
  return loan.frecuencia === 'personalizado' ? (Number(loan.diasPersonalizado) || 1) : FREQ_DAYS[loan.frecuencia];
}

function buildSchedule(loan){
  const n = Number(loan.numCuotas);
  const pDays = periodDays(loan);
  const start = parseDate(loan.fechaInicio);
  const cuotas = [];
  if(!n || n < 1 || !pDays || pDays < 1 || !start) return cuotas;

  if(loan.tasaTipo === 'simple'){
    const interesPeriodo = round2(loan.principal * (loan.tasa/100));
    const capitalPorCuota = loan.principal / n;
    for(let i=1;i<=n;i++){
      const venc = addDays(start, pDays*i);
      const capital = i === n ? round2(loan.principal - round2(capitalPorCuota*(n-1))) : round2(capitalPorCuota);
      cuotas.push({
        numero:i, fechaVencimiento: localDateStr(venc),
        capital, interes: interesPeriodo, montoBase: round2(capital + interesPeriodo),
        estatus:'pendiente', fechaPago:null, montoPagado:0, metodoPago:'', pagos:[]
      });
    }
  } else {
    const periodsPerYear = 365 / pDays;
    const r = (loan.tasa/100) / periodsPerYear;
    const montoCuota = r === 0 ? loan.principal/n : loan.principal * r / (1 - Math.pow(1+r, -n));
    let saldo = loan.principal;
    for(let i=1;i<=n;i++){
      let interes = round2(saldo * r);
      let capital = round2(montoCuota - interes);
      if(i === n) capital = round2(saldo);
      saldo = round2(saldo - capital);
      const venc = addDays(start, pDays*i);
      cuotas.push({
        numero:i, fechaVencimiento: localDateStr(venc),
        capital, interes, montoBase: round2(capital + interes),
        estatus:'pendiente', fechaPago:null, montoPagado:0, metodoPago:'', pagos:[]
      });
    }
  }
  return cuotas;
}

function computeEffectiveAPR(principal, cuotas, fechaInicio){
  const start = parseDate(fechaInicio);
  if(!cuotas.length || !principal) return 0;
  function pv(dailyRate){
    let sum = 0;
    for(const c of cuotas){
      const days = daysBetween(start, parseDate(c.fechaVencimiento));
      sum += c.montoBase / Math.pow(1+dailyRate, days);
    }
    return sum;
  }
  let lo = 0, hi = 2;
  for(let i=0;i<80;i++){
    const mid = (lo+hi)/2;
    if(pv(mid) > principal) lo = mid; else hi = mid;
  }
  return round2(((lo+hi)/2) * 365 * 100);
}

/* dynamic status: 'cobrado' is sticky once paid; otherwise derived from due date */
function cuotaEstatus(cuota){
  if(cuota.estatus === 'cobrado') return 'cobrado';
  const venc = parseDate(cuota.fechaVencimiento);
  if(venc < todayMidnight()) return 'atrasado';
  return 'pendiente';
}
function montoAPagar(cuota){
  const est = cuotaEstatus(cuota);
  return est === 'atrasado' ? round2(cuota.montoBase * (1+PENALTY_RATE)) : cuota.montoBase;
}
function interesAPagar(cuota){
  const est = cuotaEstatus(cuota);
  return est === 'atrasado' ? round2(cuota.interes * (1+PENALTY_RATE)) : cuota.interes;
}
function cuotaPagosTotal(cuota){
  return round2((cuota.pagos||[]).reduce((s,p) => s + p.monto, 0));
}
function renewalHint(cuota){
  const n = (cuota.pagos||[]).filter(p => p.tipo === 'interes').length;
  if(!n || cuota.estatus === 'cobrado') return '';
  return ` · 🔄 ${n} renovación${n>1?'es':''} (${fmtMoney(cuotaPagosTotal(cuota))} cobrado)`;
}

function loanTotals(loan){
  let pagado = 0, saldo = 0, atrasadas = 0;
  for(const c of loan.cuotas){
    const est = cuotaEstatus(c);
    pagado += cuotaPagosTotal(c);
    if(est !== 'cobrado'){ saldo += montoAPagar(c); if(est === 'atrasado') atrasadas++; }
  }
  return { pagado: round2(pagado), saldo: round2(saldo), atrasadas };
}

function loanIsActive(loan){
  return loan.cuotas.some(c => cuotaEstatus(c) !== 'cobrado');
}
function loanIsLate(loan){
  return loan.cuotas.some(c => cuotaEstatus(c) === 'atrasado');
}

/* ============ AUTH / SESSION ============ */
let session = null; // { role: 'admin' } or { role:'cliente', clientId }

function setupNeeded(){ return !state.setup.done; }

async function completeSetup(){
  const nombre = document.getElementById('su_nombre').value.trim();
  const direccion = document.getElementById('su_direccion').value.trim();
  const ciudad = document.getElementById('su_ciudad').value.trim();
  const estado = document.getElementById('su_estado').value;
  const pin1 = document.getElementById('su_pin1').value.trim();
  const pin2 = document.getElementById('su_pin2').value.trim();
  const err = document.getElementById('su_error');
  err.textContent = '';
  if(!nombre){ err.textContent = 'Ingresa tu nombre.'; return; }
  if(!/^\d{4,6}$/.test(pin1)){ err.textContent = 'El PIN debe tener entre 4 y 6 dígitos.'; return; }
  if(pin1 !== pin2){ err.textContent = 'Los PIN no coinciden.'; return; }
  state.setup.lender = { nombre, direccion, ciudad, estado };
  state.setup.adminPinHash = await hashPin(pin1);
  state.setup.done = true;
  await saveState();
  showLoginView();
}

function setLoginTab(tab){
  document.getElementById('loginTabAdmin').classList.toggle('active', tab==='admin');
  document.getElementById('loginTabCliente').classList.toggle('active', tab==='cliente');
  document.getElementById('loginPanelAdmin').style.display = tab==='admin' ? '' : 'none';
  document.getElementById('loginPanelCliente').style.display = tab==='cliente' ? '' : 'none';
  document.getElementById('li_error').textContent = '';
}

async function loginAdmin(){
  const pin = document.getElementById('li_adminPin').value.trim();
  const err = document.getElementById('li_error');
  const h = await hashPin(pin);
  if(h !== state.setup.adminPinHash){ err.textContent = 'PIN incorrecto.'; return; }
  session = { role:'admin' };
  sessionStorage.setItem('vl_session', JSON.stringify(session));
  document.getElementById('li_adminPin').value = '';
  err.textContent = '';
  showAdminView();
}

async function loginClient(){
  const code = document.getElementById('li_clientCode').value.trim().toUpperCase();
  const pin = document.getElementById('li_clientPin').value.trim();
  const err = document.getElementById('li_error');
  const client = state.clients.find(c => c.codigo === code);
  if(!client){ err.textContent = 'Código no encontrado.'; return; }
  const h = await hashPin(pin);
  if(h !== client.pinHash){ err.textContent = 'PIN incorrecto.'; return; }
  session = { role:'cliente', clientId: client.id };
  sessionStorage.setItem('vl_session', JSON.stringify(session));
  document.getElementById('li_clientCode').value = '';
  document.getElementById('li_clientPin').value = '';
  err.textContent = '';
  showClientView();
}

function logout(){
  session = null;
  sessionStorage.removeItem('vl_session');
  closeSettings();
  showLoginView();
}

/* ============ VIEW ROUTING ============ */
function hideAllViews(){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('show'));
  document.getElementById('bottomNav').style.display = 'none';
  document.getElementById('mainFab').style.display = 'none';
}
function showSetupView(){ hideAllViews(); document.getElementById('view-setup').classList.add('show'); }
function showLoginView(){
  hideAllViews();
  document.getElementById('loginBrandTitle').textContent = state.setup.lender.nombre || 'Vincent Bank';
  document.getElementById('view-login').classList.add('show');
}
function showAdminView(){
  hideAllViews();
  document.getElementById('view-admin').classList.add('show');
  document.getElementById('bottomNav').style.display = 'flex';
  document.getElementById('mainFab').style.display = 'flex';
  switchAdminTab('dashboard');
}
function showClientView(){
  hideAllViews();
  const client = state.clients.find(c => c.id === session.clientId);
  document.getElementById('clientHelloName').textContent = client ? client.nombre : '—';
  document.getElementById('view-client').classList.add('show');
  renderClientView();
}

let currentAdminTab = 'dashboard';
let currentLoanId = null;
let currentClientId = null;

function switchAdminTab(tab){
  currentAdminTab = tab;
  document.querySelectorAll('.admin-tab').forEach(e => e.style.display = 'none');
  document.getElementById('navDashboard').classList.toggle('active', tab==='dashboard');
  document.getElementById('navClientes').classList.toggle('active', tab==='clientes');
  document.getElementById('navPrestamos').classList.toggle('active', tab==='prestamos');
  document.getElementById('mainFab').style.display = (tab === 'loandetail' || tab === 'clientdetail') ? 'none' : 'flex';
  if(tab==='dashboard'){ document.getElementById('admin-tab-dashboard').style.display=''; renderDashboard(); }
  else if(tab==='clientes'){ document.getElementById('admin-tab-clientes').style.display=''; renderClients(); }
  else if(tab==='prestamos'){ document.getElementById('admin-tab-prestamos').style.display=''; renderLoans(); }
  else if(tab==='loandetail'){ document.getElementById('admin-tab-loandetail').style.display=''; }
  else if(tab==='clientdetail'){ document.getElementById('admin-tab-clientdetail').style.display=''; }
}
function handleFabClick(){
  if(currentAdminTab === 'clientes') openClientModal();
  else openLoanModal();
}

/* ============ CLIENTS ============ */
let editingClientId = null;
function openClientModal(clientId){
  editingClientId = clientId || null;
  const c = editingClientId ? state.clients.find(x => x.id === editingClientId) : null;
  document.getElementById('clientModalTitle').textContent = c ? 'Editar cliente' : 'Nuevo cliente';
  document.getElementById('c_nombre').value = c ? c.nombre : '';
  document.getElementById('c_telefono').value = c ? c.telefono : '';
  document.getElementById('c_email').value = c ? c.email : '';
  document.getElementById('c_direccion').value = c ? c.direccion : '';
  document.getElementById('c_ciudad').value = c ? c.ciudad : '';
  document.getElementById('c_estado').value = c ? c.estado : 'NV';
  document.getElementById('c_fechaNacimiento').value = c ? (c.fechaNacimiento || (c.anioNacimiento ? c.anioNacimiento + '-01-01' : '')) : '';
  document.getElementById('c_codigo').value = c ? c.codigo : '';
  document.getElementById('c_pin').value = '';
  document.getElementById('c_pinLabel').textContent = c ? 'Nuevo PIN (opcional)' : 'PIN de acceso del cliente (4 dígitos)';
  document.getElementById('c_pinHint').textContent = c ? 'Deja en blanco para mantener el PIN actual.' : 'El código de cliente se genera automáticamente. Compártelo junto con este PIN para que el cliente entre a su cuenta.';
  document.getElementById('c_notas').value = c ? c.notas : '';
  document.getElementById('clientModalOverlay').classList.add('show');
}
function closeClientModal(){ document.getElementById('clientModalOverlay').classList.remove('show'); }

function regenerateClientCodigoField(){
  const nombre = document.getElementById('c_nombre').value.trim();
  const fechaNacimiento = document.getElementById('c_fechaNacimiento').value;
  const estado = document.getElementById('c_estado').value;
  if(!nombre || !fechaNacimiento){ showToast('Completa nombre y fecha de nacimiento primero'); return; }
  const anio = parseDate(fechaNacimiento).getFullYear();
  document.getElementById('c_codigo').value = generateClientCodigo(nombre, anio, estado);
}

async function saveClient(){
  const nombre = document.getElementById('c_nombre').value.trim();
  const pin = document.getElementById('c_pin').value.trim();
  const fechaNacimiento = document.getElementById('c_fechaNacimiento').value;
  const estado = document.getElementById('c_estado').value;
  const direccion = document.getElementById('c_direccion').value.trim();
  const ciudad = document.getElementById('c_ciudad').value.trim();
  const telefono = document.getElementById('c_telefono').value.trim();
  const email = document.getElementById('c_email').value.trim();
  const notas = document.getElementById('c_notas').value.trim();
  const codigoInput = document.getElementById('c_codigo').value.trim().toUpperCase();
  if(!nombre){ showToast('Ingresa el nombre del cliente'); return; }
  const fechaNacDate = fechaNacimiento ? parseDate(fechaNacimiento) : null;
  if(!fechaNacDate || fechaNacDate > new Date() || fechaNacDate.getFullYear() < 1900){ showToast('Ingresa una fecha de nacimiento válida'); return; }
  const anioNacimiento = fechaNacDate.getFullYear();

  const editing = editingClientId ? state.clients.find(c => c.id === editingClientId) : null;
  if(!editing && !/^\d{4}$/.test(pin)){ showToast('El PIN del cliente debe ser de 4 dígitos'); return; }
  if(editing && pin && !/^\d{4}$/.test(pin)){ showToast('El PIN debe ser de 4 dígitos, o déjalo en blanco para no cambiarlo'); return; }

  let codigo;
  if(codigoInput){
    if(state.clients.some(c => c.codigo === codigoInput && c.id !== editingClientId)){ showToast('Ese ID de cliente ya está en uso'); return; }
    codigo = codigoInput;
  } else {
    codigo = editing ? editing.codigo : generateClientCodigo(nombre, anioNacimiento, estado);
  }

  if(editing){
    if(editing.direccion !== direccion || editing.ciudad !== ciudad || editing.estado !== estado){
      editing.historialDirecciones = editing.historialDirecciones || [];
      editing.historialDirecciones.push({ direccion: editing.direccion, ciudad: editing.ciudad, estado: editing.estado, fecha: localDateStr() });
    }
    Object.assign(editing, { nombre, telefono, email, direccion, ciudad, estado, fechaNacimiento, notas, codigo });
    if(pin) editing.pinHash = await hashPin(pin);
    await saveState();
    closeClientModal();
    renderClients();
    if(currentClientId === editing.id) renderClientDetail();
    showToast('Cliente actualizado');
    return;
  }

  const client = {
    id: uid(), nombre, telefono, email, direccion, ciudad, estado, fechaNacimiento, notas,
    codigo, pinHash: await hashPin(pin),
    historialDirecciones: [],
    createdAt: Date.now()
  };
  state.clients.push(client);
  await saveState();
  closeClientModal();
  renderClients();
  document.getElementById('code_clientName').textContent = client.nombre;
  document.getElementById('code_codigo').textContent = client.codigo;
  document.getElementById('code_pin').textContent = pin;
  document.getElementById('codeModalOverlay').classList.add('show');
}
function closeCodeModal(){ document.getElementById('codeModalOverlay').classList.remove('show'); }

function deleteClient(id){
  if(state.loans.some(l => l.clientId === id)){ showToast('Este cliente tiene préstamos registrados. Elimínalos primero.'); return; }
  if(!confirm('¿Eliminar este cliente?')) return;
  state.clients = state.clients.filter(c => c.id !== id);
  saveState();
  if(currentAdminTab === 'clientdetail') closeClientDetail(); else renderClients();
}

function renderClients(){
  const q = (document.getElementById('clientSearch').value || '').toLowerCase();
  const list = document.getElementById('clientsList');
  const items = state.clients.filter(c => c.nombre.toLowerCase().includes(q) || c.codigo.toLowerCase().includes(q));
  if(!items.length){
    list.innerHTML = '';
    document.getElementById('emptyStateGlobal').style.display = state.clients.length ? 'none' : 'block';
    document.getElementById('emptyStateText').textContent = 'Aún no hay clientes. Toca + para agregar el primero.';
    return;
  }
  document.getElementById('emptyStateGlobal').style.display = 'none';
  list.innerHTML = items.map(c => {
    const loanCount = state.loans.filter(l => l.clientId === c.id).length;
    const score = computeCreditScore(c);
    return `<div class="item-card" onclick="openClientDetail('${c.id}')">
      <div class="item-top">
        <div><div class="item-title">${escapeHtml(c.nombre)}</div><div class="item-sub">${c.codigo} · ${loanCount} préstamo(s)</div></div>
        <span class="status-badge ${score.color}">${score.score}</span>
      </div>
      <div class="item-meta">
        ${c.telefono ? `<div class="item-meta-item">📞 ${escapeHtml(c.telefono)}</div>` : ''}
        ${c.estado ? `<div class="item-meta-item">📍 ${escapeHtml(c.ciudad||'')} ${c.estado}</div>` : ''}
      </div>
      <div class="item-actions" onclick="event.stopPropagation()">
        <button class="mini-btn primary" onclick="openClientDetail('${c.id}')">👤 Ver detalle</button>
        <button class="mini-btn" onclick="openLoanModalFor('${c.id}')">+ Préstamo</button>
        <button class="mini-btn danger" onclick="deleteClient('${c.id}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
}
function viewClientCode(id){
  const c = state.clients.find(x => x.id === id);
  if(!c) return;
  document.getElementById('code_clientName').textContent = c.nombre;
  document.getElementById('code_codigo').textContent = c.codigo;
  document.getElementById('code_pin').textContent = '(el PIN no se guarda en texto — usa "restablecer" si el cliente lo olvidó)';
  document.getElementById('codeModalOverlay').classList.add('show');
}
function openLoanModalFor(clientId){
  openLoanModal();
  document.getElementById('l_clientId').value = clientId;
  updateLoanPreview();
}

/* ============ CREDIT SCORE (internal heuristic, not a real credit bureau score) ============ */
function computeCreditScore(client){
  const loans = state.loans.filter(l => l.clientId === client.id);
  let score = 650;
  let renovaciones = 0, prestamosCompletados = 0, cuotasTardias = 0;
  let atrasoActivo = false;
  for(const loan of loans){
    let loanCompletado = loan.cuotas.length > 0;
    for(const c of loan.cuotas){
      const est = cuotaEstatus(c);
      if(est === 'atrasado') atrasoActivo = true;
      renovaciones += (c.pagos||[]).filter(p => p.tipo === 'interes').length;
      if(est === 'cobrado'){
        if(c.fechaPago && parseDate(c.fechaPago) > parseDate(c.fechaVencimiento)) cuotasTardias++;
      } else {
        loanCompletado = false;
      }
    }
    if(loanCompletado) prestamosCompletados++;
  }
  score += Math.min(prestamosCompletados * 15, 90);
  score -= Math.min(renovaciones * 5, 100);
  score -= Math.min(cuotasTardias * 8, 80);
  if(atrasoActivo) score -= 40;
  score = Math.max(300, Math.min(850, Math.round(score)));
  let label, color;
  if(score >= 740){ label = 'Excelente'; color = 'cobrado'; }
  else if(score >= 640){ label = 'Bueno'; color = 'cobrado'; }
  else if(score >= 560){ label = 'Regular'; color = 'pendiente'; }
  else { label = 'Riesgo'; color = 'atrasado'; }
  return { score, label, color, prestamosCompletados, renovaciones, cuotasTardias, atrasoActivo };
}

/* ============ CLIENT DETAIL ============ */
function openClientDetail(clientId){
  currentClientId = clientId;
  switchAdminTab('clientdetail');
  renderClientDetail();
}
function closeClientDetail(){ switchAdminTab('clientes'); }

function renderClientDetail(){
  const client = state.clients.find(c => c.id === currentClientId);
  if(!client) return;
  const loans = state.loans.filter(l => l.clientId === client.id);
  const score = computeCreditScore(client);

  document.getElementById('cd_nombre').textContent = client.nombre;
  document.getElementById('cd_codigo').textContent = client.codigo;
  document.getElementById('cd_score').textContent = score.score;
  document.getElementById('cd_score').style.color = `var(--${score.color==='cobrado'?'good':score.color==='pendiente'?'warn':'danger'})`;
  document.getElementById('cd_scoreLabel').textContent = score.label + (score.atrasoActivo ? ' · tiene cuota(s) atrasada(s) ahora' : '');
  document.getElementById('cd_scoreLabel').className = 'status-badge ' + score.color;

  let prestadoHist = 0, pagadoHist = 0;
  const ledger = [];
  for(const loan of loans){
    prestadoHist += loan.principal;
    for(const c of loan.cuotas){
      for(const p of (c.pagos||[])){
        pagadoHist += p.monto;
        ledger.push({ fecha:p.fecha, monto:p.monto, tipo:p.tipo, metodo:p.metodo, folio:loan.folio, numero:c.numero });
      }
    }
  }
  document.getElementById('cd_kpiPrestado').textContent = fmtMoney(prestadoHist);
  document.getElementById('cd_kpiPagado').textContent = fmtMoney(pagadoHist);
  document.getElementById('cd_kpiPrestamos').textContent = loans.length;

  document.getElementById('cd_infoCard').innerHTML = `
    <div class="item-meta" style="flex-direction:column;gap:8px;align-items:flex-start;">
      <div class="item-meta-item">📞 ${escapeHtml(client.telefono || '—')}</div>
      <div class="item-meta-item">✉️ ${escapeHtml(client.email || '—')}</div>
      <div class="item-meta-item">📍 ${escapeHtml(client.direccion || '—')}, ${escapeHtml(client.ciudad || '—')}, ${client.estado || '—'}</div>
      <div class="item-meta-item">🎂 ${client.fechaNacimiento ? formatDateEs(client.fechaNacimiento) : (client.anioNacimiento || '—')}</div>
      ${client.notas ? `<div class="item-meta-item">📝 ${escapeHtml(client.notas)}</div>` : ''}
    </div>`;

  const hist = client.historialDirecciones || [];
  document.getElementById('cd_addressHistory').innerHTML = hist.length ? hist.slice().reverse().map(h => `
    <div class="item-card"><div class="item-sub">${formatDateEs(h.fecha)}</div><div>${escapeHtml(h.direccion || '—')}, ${escapeHtml(h.ciudad || '—')}, ${h.estado || '—'}</div></div>
  `).join('') : '<div class="empty-state" style="padding:20px;"><div>Sin cambios de dirección registrados.</div></div>';

  document.getElementById('cd_loansList').innerHTML = loans.length ? loans.map(loan => {
    const totals = loanTotals(loan);
    const status = loanStatusLabel(loan);
    return `<div class="item-card" onclick="openLoanDetail('${loan.id}')">
      <div class="item-top">
        <div><div class="item-title">${loan.folio}</div><div class="item-sub">${fmtMoney(loan.principal)} · ${FREQ_LABEL[loan.frecuencia]}</div></div>
        <span class="status-badge ${status}">${status}</span>
      </div>
      <div class="item-meta"><div class="item-meta-item">💵 Saldo: ${fmtMoney(totals.saldo)}</div></div>
    </div>`;
  }).join('') : '<div class="empty-state" style="padding:20px;"><div>Sin préstamos todavía.</div></div>';

  ledger.sort((a,b) => b.fecha.localeCompare(a.fecha));
  document.getElementById('cd_paymentLedger').innerHTML = ledger.length ? ledger.map(p => `
    <div class="item-card">
      <div class="item-top">
        <div><div class="item-title">${fmtMoney(p.monto)}</div><div class="item-sub">${p.folio} · Cuota #${p.numero} · ${p.metodo}</div></div>
        <span class="status-badge ${p.tipo==='interes' ? 'pendiente' : 'cobrado'}">${p.tipo==='interes' ? 'solo interés' : 'completo'}</span>
      </div>
      <div class="item-meta"><div class="item-meta-item">📅 ${formatDateEs(p.fecha)}</div></div>
    </div>`).join('') : '<div class="empty-state" style="padding:20px;"><div>Sin pagos registrados todavía.</div></div>';
}

/* ============ LOANS ============ */
let loanFilter = 'all';
function setLoanFilter(f){
  loanFilter = f;
  document.querySelectorAll('#admin-tab-prestamos .chip').forEach(b => b.classList.toggle('active', b.dataset.f === f));
  renderLoans();
}

let currentTasaTipo = 'simple';
let currentFrecuencia = 'diario';

function setTasaTipo(t){
  currentTasaTipo = t;
  document.getElementById('tipo_simple').classList.toggle('active', t==='simple');
  document.getElementById('tipo_apr').classList.toggle('active', t==='apr');
  document.getElementById('l_tasaLabel').textContent = t==='simple' ? 'Tasa por periodo (%)' : 'Tasa anual nominal / APR (%)';
  updateLoanPreview();
}
function setFrecuencia(f){
  currentFrecuencia = f;
  document.querySelectorAll('.freq-opt').forEach(b => b.classList.toggle('active', b.dataset.f === f));
  document.getElementById('l_diasWrap').style.display = f === 'personalizado' ? '' : 'none';
  updateLoanPreview();
}

function openLoanModal(){
  const sel = document.getElementById('l_clientId');
  sel.innerHTML = state.clients.map(c => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`).join('') || '<option value="">— crea un cliente primero —</option>';
  document.getElementById('l_principal').value = '';
  document.getElementById('l_tasa').value = '';
  document.getElementById('l_numCuotas').value = '';
  document.getElementById('l_diasPersonalizado').value = '';
  document.getElementById('l_fechaInicio').value = localDateStr();
  setTasaTipo('simple');
  setFrecuencia('diario');
  document.getElementById('loanPreviewBox').style.display = 'none';
  document.getElementById('loanModalOverlay').classList.add('show');
}
function closeLoanModal(){ document.getElementById('loanModalOverlay').classList.remove('show'); }

function draftLoanFromForm(){
  const principal = parseFloat(document.getElementById('l_principal').value);
  const tasa = parseFloat(document.getElementById('l_tasa').value);
  const numCuotas = parseInt(document.getElementById('l_numCuotas').value, 10);
  const diasPersonalizado = parseInt(document.getElementById('l_diasPersonalizado').value, 10);
  const fechaInicio = document.getElementById('l_fechaInicio').value;
  if(!(principal>0) || !(tasa>=0) || !(numCuotas>0) || !fechaInicio) return null;
  if(currentFrecuencia==='personalizado' && !(diasPersonalizado>0)) return null;
  return { principal, tasa, tasaTipo: currentTasaTipo, frecuencia: currentFrecuencia, diasPersonalizado, numCuotas, fechaInicio };
}

function updateLoanPreview(){
  const draft = draftLoanFromForm();
  const box = document.getElementById('loanPreviewBox');
  if(!draft){ box.style.display = 'none'; return; }
  const cuotas = buildSchedule(draft);
  if(!cuotas.length){ box.style.display = 'none'; return; }
  const interesTotal = round2(cuotas.reduce((s,c)=>s+c.interes,0));
  const total = round2(draft.principal + interesTotal);
  const apr = computeEffectiveAPR(draft.principal, cuotas, draft.fechaInicio);
  document.getElementById('pv_interesTotal').textContent = fmtMoney(interesTotal);
  document.getElementById('pv_cuota').textContent = fmtMoney(cuotas[0].montoBase);
  document.getElementById('pv_apr').textContent = apr.toFixed(2) + '%';
  document.getElementById('pv_total').textContent = fmtMoney(total);
  box.style.display = '';
}

async function saveLoan(){
  const clientId = document.getElementById('l_clientId').value;
  if(!clientId){ showToast('Selecciona un cliente'); return; }
  const client = state.clients.find(c => c.id === clientId);
  const draft = draftLoanFromForm();
  if(!draft){ showToast('Completa monto, tasa, # de cuotas y fecha correctamente'); return; }
  const cuotas = buildSchedule(draft);
  if(!cuotas.length){ showToast('No se pudo calcular el calendario de pagos'); return; }
  const loan = {
    id: uid(), clientId,
    principal: draft.principal, tasa: draft.tasa, tasaTipo: draft.tasaTipo,
    frecuencia: draft.frecuencia, diasPersonalizado: draft.diasPersonalizado || null,
    numCuotas: draft.numCuotas, fechaInicio: draft.fechaInicio,
    cuotas, createdAt: Date.now()
  };
  loan.folio = generateLoanFolio(client.estado, loan.fechaInicio, loan.principal);
  state.loans.push(loan);
  await saveState();
  closeLoanModal();
  renderLoans();
  showToast('Préstamo creado');
}

function deleteLoan(id){
  if(!confirm('¿Eliminar este préstamo y todo su historial de pagos?')) return;
  state.loans = state.loans.filter(l => l.id !== id);
  saveState();
  closeLoanDetail();
  renderLoans();
}

function loanStatusLabel(loan){
  if(loanIsLate(loan)) return 'atrasado';
  if(loanIsActive(loan)) return 'pendiente';
  return 'cobrado';
}

function renderLoans(){
  const q = (document.getElementById('loanSearch').value || '').toLowerCase();
  const list = document.getElementById('loansList');
  let items = state.loans.map(l => ({ loan:l, client: state.clients.find(c=>c.id===l.clientId) }));
  items = items.filter(({loan,client}) => {
    const name = client ? client.nombre.toLowerCase() : '';
    return name.includes(q) || loan.folio.toLowerCase().includes(q);
  });
  if(loanFilter === 'atrasado') items = items.filter(({loan}) => loanIsLate(loan));
  if(loanFilter === 'activo') items = items.filter(({loan}) => loanIsActive(loan));

  if(!items.length){
    list.innerHTML = '';
    document.getElementById('emptyStateGlobal').style.display = state.loans.length ? 'none' : 'block';
    document.getElementById('emptyStateText').textContent = 'Aún no hay préstamos. Toca + para crear el primero.';
    return;
  }
  document.getElementById('emptyStateGlobal').style.display = 'none';
  list.innerHTML = items.map(({loan,client}) => {
    const totals = loanTotals(loan);
    const status = loanStatusLabel(loan);
    return `<div class="item-card" onclick="openLoanDetail('${loan.id}')">
      <div class="item-top">
        <div><div class="item-title">${escapeHtml(client ? client.nombre : '—')}</div><div class="item-sub">${loan.folio} · ${fmtMoney(loan.principal)} · ${FREQ_LABEL[loan.frecuencia]}</div></div>
        <span class="status-badge ${status}">${status}</span>
      </div>
      <div class="item-meta">
        <div class="item-meta-item">💵 Saldo: ${fmtMoney(totals.saldo)}</div>
        ${totals.atrasadas ? `<div class="item-meta-item">⏰ ${totals.atrasadas} cuota(s) atrasada(s)</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function openLoanDetail(id){
  currentLoanId = id;
  switchAdminTab('loandetail');
  renderLoanDetail();
}
function closeLoanDetail(){ switchAdminTab('prestamos'); }

function renderLoanDetail(){
  const loan = state.loans.find(l => l.id === currentLoanId);
  if(!loan) return;
  const client = state.clients.find(c => c.id === loan.clientId);
  document.getElementById('ld_clientName').textContent = client ? client.nombre : '—';
  document.getElementById('ld_sub').textContent = `${loan.folio} · ${fmtMoney(loan.principal)} · ${loan.tasa}% ${loan.tasaTipo==='simple'?'simple':'APR'} · ${FREQ_LABEL[loan.frecuencia]}`;
  const totals = loanTotals(loan);
  document.getElementById('ld_kpiPagado').textContent = fmtMoney(totals.pagado);
  document.getElementById('ld_kpiSaldo').textContent = fmtMoney(totals.saldo);
  document.getElementById('ld_kpiAtrasadas').textContent = totals.atrasadas;
  const wrap = document.getElementById('ld_cuotasList');
  wrap.innerHTML = loan.cuotas.map(c => {
    const est = cuotaEstatus(c);
    const monto = est === 'cobrado' ? c.montoPagado : montoAPagar(c);
    const hasHistory = c.pagos && c.pagos.length > 0;
    const editIcon = (hasHistory && est !== 'cobrado')
      ? `<button class="mini-btn" style="flex:none;padding:6px 8px;" onclick="event.stopPropagation();openEditPaidModal('${loan.id}',${c.numero})">✏️</button>`
      : '';
    return `<div class="cuota-row" onclick="${est==='cobrado' ? `openEditPaidModal('${loan.id}',${c.numero})` : `openPayModal('${loan.id}',${c.numero})`}">
      <div class="cuota-num">${c.numero}</div>
      <div class="cuota-info">
        <div class="cuota-date">${formatDateEs(c.fechaVencimiento)}</div>
        <div class="cuota-amt">${fmtMoney(monto)}${est==='atrasado' ? ' (con 5% penalidad)' : ''}${renewalHint(c)}</div>
      </div>
      ${editIcon}
      <span class="status-badge ${est}">${est}</span>
    </div>`;
  }).join('');
}

/* ============ PAYMENTS ============ */
let payCtx = null;
let currentPayType = 'full';

function setPayType(type){
  currentPayType = type;
  document.getElementById('paytype_full').classList.toggle('active', type==='full');
  document.getElementById('paytype_interest').classList.toggle('active', type==='interest');
  document.getElementById('pay_interestHint').style.display = type==='interest' ? '' : 'none';
  document.getElementById('payConfirmBtn').textContent = type==='interest' ? 'Renovar cuota' : 'Marcar cobrado';
  if(!payCtx) return;
  const loan = state.loans.find(l => l.id === payCtx.loanId);
  const c = loan.cuotas.find(x => x.numero === payCtx.numero);
  const monto = type==='interest' ? interesAPagar(c) : montoAPagar(c);
  document.getElementById('pay_montoLabel').textContent = type==='interest' ? 'Monto a cobrar (interés)' : 'Monto a cobrar';
  document.getElementById('pay_monto').textContent = fmtMoney(monto);
  document.getElementById('pay_montoPagado').value = monto;
}

function openPayModal(loanId, numero){
  const loan = state.loans.find(l => l.id === loanId);
  const c = loan.cuotas.find(x => x.numero === numero);
  const est = cuotaEstatus(c);
  payCtx = { loanId, numero };
  document.getElementById('pay_numero').textContent = c.numero;
  document.getElementById('pay_vencInput').value = c.fechaVencimiento;
  document.getElementById('pay_estatus').textContent = est;
  document.getElementById('pay_fecha').value = localDateStr();
  document.getElementById('pay_metodo').value = 'Efectivo';
  setPayType('full');
  document.getElementById('payModalOverlay').classList.add('show');
}
function closePayModal(){ document.getElementById('payModalOverlay').classList.remove('show'); }

async function saveVencimientoOnly(){
  if(!payCtx) return;
  const loan = state.loans.find(l => l.id === payCtx.loanId);
  const c = loan.cuotas.find(x => x.numero === payCtx.numero);
  const nueva = document.getElementById('pay_vencInput').value;
  if(!nueva){ showToast('Selecciona una fecha'); return; }
  c.fechaVencimiento = nueva;
  await saveState();
  closePayModal();
  renderLoanDetail();
  renderLoans();
  showToast('Fecha de vencimiento actualizada');
}

async function confirmPayment(){
  if(!payCtx) return;
  const loan = state.loans.find(l => l.id === payCtx.loanId);
  const c = loan.cuotas.find(x => x.numero === payCtx.numero);
  if(!Array.isArray(c.pagos)) c.pagos = [];
  const editedVenc = document.getElementById('pay_vencInput').value;
  if(editedVenc) c.fechaVencimiento = editedVenc;
  const fecha = document.getElementById('pay_fecha').value;
  const monto = round2(parseFloat(document.getElementById('pay_montoPagado').value) || 0);
  const metodo = document.getElementById('pay_metodo').value;

  if(currentPayType === 'interest'){
    const fechaVencimientoAnterior = c.fechaVencimiento;
    c.pagos.push({ fecha, monto, tipo:'interes', metodo, fechaVencimientoAnterior });
    c.fechaVencimiento = localDateStr(addDays(todayMidnight(), periodDays(loan)));
    c.estatus = 'pendiente';
  } else {
    c.pagos.push({ fecha, monto, tipo:'completo', metodo });
    c.estatus = 'cobrado';
    c.fechaPago = fecha;
    c.montoPagado = monto;
    c.metodoPago = metodo;
  }
  await saveState();
  closePayModal();
  renderLoanDetail();
  renderLoans();
  showToast(currentPayType === 'interest' ? 'Cuota renovada' : 'Pago registrado');
}
async function undoPayment(loanId, numero){
  if(!confirm('¿Deshacer este pago y marcar la cuota como pendiente de nuevo?')) return;
  const loan = state.loans.find(l => l.id === loanId);
  const c = loan.cuotas.find(x => x.numero === numero);
  let popped = null;
  if(Array.isArray(c.pagos)) popped = c.pagos.pop();
  if(popped && popped.tipo === 'interes' && popped.fechaVencimientoAnterior){
    c.fechaVencimiento = popped.fechaVencimientoAnterior;
  }
  c.estatus = 'pendiente'; c.fechaPago = null; c.montoPagado = 0; c.metodoPago = '';
  await saveState();
  renderLoanDetail();
  renderLoans();
}

/* ============ EDIT LAST PAYMENT ============ */
let editPaidCtx = null;
function openEditPaidModal(loanId, numero){
  const loan = state.loans.find(l => l.id === loanId);
  const c = loan.cuotas.find(x => x.numero === numero);
  if(!c.pagos || !c.pagos.length){ showToast('Esta cuota no tiene pagos registrados todavía'); return; }
  editPaidCtx = { loanId, numero };
  const p = c.pagos[c.pagos.length - 1];
  document.getElementById('ep_numero').textContent = c.numero;
  document.getElementById('ep_tipo').textContent = p.tipo === 'interes' ? 'Solo interés (renovación)' : 'Pago completo';
  document.getElementById('ep_fecha').value = p.fecha;
  document.getElementById('ep_monto').value = p.monto;
  document.getElementById('ep_metodo').value = p.metodo || 'Efectivo';
  document.getElementById('editPaidModalOverlay').classList.add('show');
}
function closeEditPaidModal(){ document.getElementById('editPaidModalOverlay').classList.remove('show'); }
async function confirmEditPaidPayment(){
  if(!editPaidCtx) return;
  const loan = state.loans.find(l => l.id === editPaidCtx.loanId);
  const c = loan.cuotas.find(x => x.numero === editPaidCtx.numero);
  const p = c.pagos[c.pagos.length - 1];
  p.fecha = document.getElementById('ep_fecha').value;
  p.monto = round2(parseFloat(document.getElementById('ep_monto').value) || 0);
  p.metodo = document.getElementById('ep_metodo').value;
  if(c.estatus === 'cobrado' && p.tipo === 'completo'){
    c.fechaPago = p.fecha; c.montoPagado = p.monto; c.metodoPago = p.metodo;
  }
  await saveState();
  closeEditPaidModal();
  renderLoanDetail();
  renderLoans();
  showToast('Pago actualizado');
}
async function undoPaymentFromEdit(){
  if(!editPaidCtx) return;
  const { loanId, numero } = editPaidCtx;
  closeEditPaidModal();
  await undoPayment(loanId, numero);
}

/* ============ DASHBOARD ============ */
function renderDashboard(){
  document.getElementById('todayDate').textContent = new Date().toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  let cartera = 0, cobradoMes = 0, atrasado = 0;
  const now = new Date();
  const upcoming = [];
  for(const loan of state.loans){
    const client = state.clients.find(c => c.id === loan.clientId);
    for(const c of loan.cuotas){
      const est = cuotaEstatus(c);
      for(const p of (c.pagos||[])){
        const pd = parseDate(p.fecha);
        if(pd && pd.getMonth()===now.getMonth() && pd.getFullYear()===now.getFullYear()) cobradoMes += p.monto;
      }
      if(est !== 'cobrado'){
        const amt = montoAPagar(c);
        cartera += amt;
        if(est === 'atrasado'){ atrasado += amt; upcoming.push({loan, client, c, est}); }
      }
    }
  }
  for(const loan of state.loans){
    const client = state.clients.find(c => c.id === loan.clientId);
    const proximas = loan.cuotas.filter(c => cuotaEstatus(c)==='pendiente').sort((a,b)=>a.fechaVencimiento.localeCompare(b.fechaVencimiento)).slice(0,1);
    for(const c of proximas) upcoming.push({loan, client, c, est:'pendiente'});
  }
  upcoming.sort((a,b)=> a.c.fechaVencimiento.localeCompare(b.c.fechaVencimiento));

  document.getElementById('statCartera').textContent = fmtMoney(cartera);
  document.getElementById('statCobradoMes').textContent = fmtMoney(cobradoMes);
  document.getElementById('statAtrasado').textContent = fmtMoney(atrasado);
  document.getElementById('statClientes').textContent = state.clients.length;

  const wrap = document.getElementById('dashUpcomingList');
  if(!upcoming.length){
    wrap.innerHTML = '<div class="empty-state"><div class="icon">✅</div><div>No hay cuotas próximas ni atrasadas.</div></div>';
    return;
  }
  wrap.innerHTML = upcoming.slice(0,12).map(({loan,client,c,est}) => `
    <div class="item-card" onclick="openLoanDetail('${loan.id}')">
      <div class="item-top">
        <div><div class="item-title">${escapeHtml(client ? client.nombre : '—')}</div><div class="item-sub">${loan.folio} · Cuota #${c.numero}</div></div>
        <span class="status-badge ${est}">${est}</span>
      </div>
      <div class="item-meta">
        <div class="item-meta-item">📅 ${formatDateEs(c.fechaVencimiento)}</div>
        <div class="item-meta-item">💵 ${fmtMoney(montoAPagar(c))}</div>
      </div>
    </div>`).join('');
}

/* ============ CLIENT VIEW ============ */
function renderClientView(){
  const client = state.clients.find(c => c.id === session.clientId);
  const loans = state.loans.filter(l => l.clientId === client.id);
  const wrap = document.getElementById('clientLoansList');
  document.getElementById('clientEmptyState').style.display = loans.length ? 'none' : 'block';
  wrap.innerHTML = loans.map(loan => {
    const totals = loanTotals(loan);
    const status = loanStatusLabel(loan);
    const rows = loan.cuotas.map(c => {
      const est = cuotaEstatus(c);
      const monto = est === 'cobrado' ? c.montoPagado : montoAPagar(c);
      return `<div class="cuota-row" style="margin:0 0 8px;">
        <div class="cuota-num">${c.numero}</div>
        <div class="cuota-info"><div class="cuota-date">${formatDateEs(c.fechaVencimiento)}</div><div class="cuota-amt">${fmtMoney(monto)}${est==='atrasado' ? ' (con 5% penalidad)' : ''}${renewalHint(c)}</div></div>
        <span class="status-badge ${est}">${est}</span>
      </div>`;
    }).join('');
    return `<div class="item-card">
      <div class="item-top">
        <div><div class="item-title">${loan.folio}</div><div class="item-sub">${fmtMoney(loan.principal)} · ${FREQ_LABEL[loan.frecuencia]}</div></div>
        <span class="status-badge ${status}">${status}</span>
      </div>
      <div class="item-meta">
        <div class="item-meta-item">✅ Pagado: ${fmtMoney(totals.pagado)}</div>
        <div class="item-meta-item">💵 Saldo: ${fmtMoney(totals.saldo)}</div>
      </div>
      <div style="margin-top:12px;">${rows}</div>
      <div class="item-actions">
        <button class="mini-btn primary" onclick="generateContractPDF('${loan.id}','es')">📄 Contrato (Español)</button>
        <button class="mini-btn primary" onclick="generateContractPDF('${loan.id}','en')">📄 Contract (English)</button>
      </div>
    </div>`;
  }).join('');
}

/* ============ SETTINGS ============ */
function openSettings(){
  document.getElementById('s_nombre').value = state.setup.lender.nombre;
  document.getElementById('s_direccion').value = state.setup.lender.direccion;
  document.getElementById('s_ciudad').value = state.setup.lender.ciudad;
  document.getElementById('s_estado').value = state.setup.lender.estado;
  document.getElementById('s_newPin1').value = '';
  document.getElementById('s_newPin2').value = '';
  document.getElementById('settingsOverlay').classList.add('show');
}
function closeSettings(){ document.getElementById('settingsOverlay').classList.remove('show'); }
async function saveLenderInfo(){
  state.setup.lender = {
    nombre: document.getElementById('s_nombre').value.trim(),
    direccion: document.getElementById('s_direccion').value.trim(),
    ciudad: document.getElementById('s_ciudad').value.trim(),
    estado: document.getElementById('s_estado').value
  };
  await saveState();
  showToast('Datos guardados');
}
async function changeAdminPin(){
  const p1 = document.getElementById('s_newPin1').value.trim();
  const p2 = document.getElementById('s_newPin2').value.trim();
  if(!/^\d{4,6}$/.test(p1)){ showToast('El PIN debe tener 4-6 dígitos'); return; }
  if(p1 !== p2){ showToast('Los PIN no coinciden'); return; }
  state.setup.adminPinHash = await hashPin(p1);
  await saveState();
  document.getElementById('s_newPin1').value = '';
  document.getElementById('s_newPin2').value = '';
  showToast('PIN actualizado');
}
function exportData(){
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'vincent-loans-respaldo-' + localDateStr() + '.json';
  document.body.appendChild(a); a.click(); a.remove();
}
function importData(ev){
  const file = ev.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const data = JSON.parse(reader.result);
      if(!data.clients || !data.loans || !data.setup) throw new Error('formato inválido');
      if(!confirm('Esto reemplazará todos los datos actuales. ¿Continuar?')) return;
      state = Object.assign(defaultState(), data);
      await saveState();
      showToast('Respaldo importado');
      location.reload();
    } catch(e){ showToast('Archivo inválido'); }
  };
  reader.readAsText(file);
  ev.target.value = '';
}

/* ============ PDF CONTRACT ============ */
const CONTRACT_FREQ_EN = { diario:'daily', semanal:'weekly', quincenal:'biweekly', anual:'annual', personalizado:'custom-interval' };
const CONTRACT_FREQ_ES = { diario:'diario', semanal:'semanal', quincenal:'quincenal', anual:'anual', personalizado:'de intervalo personalizado' };

const CONTRACT_STRINGS = {
  en: {
    docTitle: 'PROMISSORY NOTE AND LOAN AGREEMENT',
    loanIdDate: (folio, date) => 'Loan ID: ' + folio + '   |   Date: ' + date,
    notice: 'NOTICE: This document is a template generated for general convenience and does NOT constitute legal advice. Interest rates, fees, and disclosure requirements for consumer loans are governed by the laws of the state where the Lender operates and, in many cases, by mandatory consumer-protection laws of the state where the Borrower resides. Interstate lending may require licensing in the Borrower\'s state. Both parties should consult a licensed attorney before relying on this agreement.',
    s1: '1. PARTIES',
    lenderLine: (l) => 'Lender: ' + (l.nombre||'—') + ', residing/operating at ' + (l.direccion||'—') + ', ' + (l.ciudad||'—') + ', ' + (l.estado||'—') + ' ("Lender").',
    borrowerLine: (c) => 'Borrower: ' + (c?c.nombre:'—') + ', residing at ' + (c?(c.direccion||'—'):'—') + ', ' + (c?(c.ciudad||'—'):'—') + ', ' + (c?(c.estado||'—'):'—') + ' ("Borrower").',
    s2: '2. LOAN AMOUNT',
    loanAmount: (m,f) => 'Lender agrees to lend Borrower the principal sum of ' + m + ' USD, disbursed on or about ' + f + '.',
    s3: '3. INTEREST',
    interestSimple: (t,f,it) => 'Interest is calculated as simple interest at a fixed rate of ' + t + '% per ' + f + ' payment period, applied to the original principal amount, for a total interest of ' + it + ' over the life of the loan.',
    interestApr: (t,it) => 'Interest is calculated on an amortizing basis (declining balance), at a nominal annual rate of ' + t + '%, applied to the outstanding principal balance each payment period, for a total interest of ' + it + ' over the life of the loan.',
    aprDisclosure: (a) => 'Disclosure — Effective Annual Percentage Rate (APR): ' + a + '%. This figure reflects the true annualized cost of this loan based on the payment schedule below, consistent with standard Truth in Lending Act (TILA) disclosure practice.',
    s4: '4. PAYMENT SCHEDULE',
    schedule: (n,f,extra,start,total) => 'Total of ' + n + ' payments, ' + f + extra + ', beginning ' + start + '. Total amount to be repaid if all payments are made on time: ' + total + '.',
    everyDays: (n) => ' (every ' + n + ' days)',
    thNum:'#', thDue:'Due Date', thPrincipal:'Principal', thInterest:'Interest', thPayment:'Payment',
    s5: '5. LATE PAYMENT FEE',
    lateFee: 'If any installment is not received by its due date, a one-time late fee equal to five percent (5%) of that installment amount will be added to the amount due for that installment. This fee does not compound and applies once per late installment.',
    s6: '6. PREPAYMENT',
    prepay: 'Borrower may prepay all or part of the outstanding balance at any time without penalty.',
    s7: '7. DEFAULT',
    default_: 'If Borrower fails to make a payment within a reasonable grace period after its due date, Lender may declare the remaining unpaid balance immediately due and payable, and may pursue any remedy available under applicable law, including referral to collections.',
    s8: '8. GOVERNING LAW',
    governing: (e) => 'This Agreement shall be governed by the laws of the State of ' + e + ', without regard to its conflict-of-laws principles, EXCEPT to the extent that the mandatory consumer-protection or usury laws of Borrower\'s state of residence apply and cannot be waived by contract, in which case such laws shall govern to that limited extent.',
    s9: '9. ELECTRONIC SIGNATURES / ENTIRE AGREEMENT',
    entire: 'This Agreement constitutes the entire understanding between the parties. The parties agree that electronic or typed signatures below are intended to have the same legal effect as handwritten signatures, pursuant to the federal ESIGN Act. If any provision of this Agreement is held unenforceable, the remaining provisions remain in full force.',
    lenderSig: (n) => 'Lender Signature: ' + (n||''),
    borrowerSig: (n) => 'Borrower Signature: ' + (n||''),
    dateLine: 'Date: ______________',
    fname: 'Contract-'
  },
  es: {
    docTitle: 'PAGARÉ Y CONTRATO DE PRÉSTAMO',
    loanIdDate: (folio, date) => 'Préstamo #: ' + folio + '   |   Fecha: ' + date,
    notice: 'AVISO: Este documento es una plantilla generada por conveniencia general y NO constituye asesoría legal. Las tasas de interés, cargos y requisitos de divulgación para préstamos al consumidor están regidos por las leyes del estado donde opera el Prestamista y, en muchos casos, por las leyes de protección al consumidor del estado donde reside el Cliente. Prestar dinero a residentes de otros estados puede requerir una licencia en el estado del Cliente. Ambas partes deben consultar a un abogado licenciado antes de basarse en este contrato. Esta es una traducción de cortesía para facilitar la comprensión del Cliente — en caso de discrepancia con la versión en inglés, prevalece el texto en inglés.',
    s1: '1. PARTES',
    lenderLine: (l) => 'Prestamista: ' + (l.nombre||'—') + ', con domicilio/operando en ' + (l.direccion||'—') + ', ' + (l.ciudad||'—') + ', ' + (l.estado||'—') + ' ("Prestamista").',
    borrowerLine: (c) => 'Cliente: ' + (c?c.nombre:'—') + ', con domicilio en ' + (c?(c.direccion||'—'):'—') + ', ' + (c?(c.ciudad||'—'):'—') + ', ' + (c?(c.estado||'—'):'—') + ' ("Cliente").',
    s2: '2. MONTO DEL PRÉSTAMO',
    loanAmount: (m,f) => 'El Prestamista acuerda prestar al Cliente la suma de capital de ' + m + ' USD, desembolsada alrededor del ' + f + '.',
    s3: '3. INTERÉS',
    interestSimple: (t,f,it) => 'El interés se calcula como interés simple a una tasa fija de ' + t + '% por cada periodo de pago ' + f + ', aplicado sobre el monto de capital original, para un interés total de ' + it + ' durante la vida del préstamo.',
    interestApr: (t,it) => 'El interés se calcula sobre saldo insoluto (amortización decreciente), a una tasa anual nominal de ' + t + '%, aplicada sobre el saldo de capital pendiente en cada periodo de pago, para un interés total de ' + it + ' durante la vida del préstamo.',
    aprDisclosure: (a) => 'Divulgación — Tasa de Interés Anual Efectiva (APR): ' + a + '%. Esta cifra refleja el costo anualizado real de este préstamo con base en el calendario de pagos a continuación, siguiendo la práctica estándar de divulgación equivalente a la Truth in Lending Act (TILA) de EE. UU.',
    s4: '4. CALENDARIO DE PAGOS',
    schedule: (n,f,extra,start,total) => 'Total de ' + n + ' pagos, de frecuencia ' + f + extra + ', comenzando el ' + start + '. Monto total a pagar si todos los pagos se realizan a tiempo: ' + total + '.',
    everyDays: (n) => ' (cada ' + n + ' días)',
    thNum:'#', thDue:'Vencimiento', thPrincipal:'Capital', thInterest:'Interés', thPayment:'Pago',
    s5: '5. CARGO POR PAGO ATRASADO',
    lateFee: 'Si una cuota no se recibe en su fecha de vencimiento, se añadirá a esa cuota un cargo por atraso único equivalente al cinco por ciento (5%) del monto de esa cuota. Este cargo no es acumulativo y aplica una sola vez por cuota atrasada.',
    s6: '6. PAGO ANTICIPADO',
    prepay: 'El Cliente puede pagar por adelantado, total o parcialmente, el saldo pendiente en cualquier momento sin penalidad.',
    s7: '7. INCUMPLIMIENTO',
    default_: 'Si el Cliente no realiza un pago dentro de un periodo de gracia razonable después de su vencimiento, el Prestamista podrá declarar de inmediato exigible el saldo pendiente total y podrá recurrir a cualquier remedio disponible bajo la ley aplicable, incluyendo el envío a cobranza.',
    s8: '8. LEY APLICABLE',
    governing: (e) => 'Este Contrato se regirá por las leyes del Estado de ' + e + ', sin considerar sus principios de conflicto de leyes, EXCEPTO en la medida en que las leyes obligatorias de protección al consumidor o de usura del estado de residencia del Cliente apliquen y no puedan renunciarse por contrato, en cuyo caso dichas leyes regirán en esa medida limitada.',
    s9: '9. FIRMAS ELECTRÓNICAS / ACUERDO COMPLETO',
    entire: 'Este Contrato constituye el entendimiento completo entre las partes. Ambas partes acuerdan que las firmas electrónicas o escritas a continuación tienen el mismo efecto legal que una firma manuscrita, conforme a la ley federal ESIGN Act de EE. UU. Si alguna disposición de este Contrato se considera inválida, las demás disposiciones permanecen vigentes.',
    lenderSig: (n) => 'Firma del Prestamista: ' + (n||''),
    borrowerSig: (n) => 'Firma del Cliente: ' + (n||''),
    dateLine: 'Fecha: ______________',
    fname: 'Contrato-'
  }
};

function generateContractPDF(loanId, lang){
  lang = (lang === 'es') ? 'es' : 'en';
  const T = CONTRACT_STRINGS[lang];
  const loan = state.loans.find(l => l.id === loanId);
  if(!loan) return;
  const freqLabel = (lang === 'es' ? CONTRACT_FREQ_ES : CONTRACT_FREQ_EN)[loan.frecuencia];
  const client = state.clients.find(c => c.id === loan.clientId);
  const lender = state.setup.lender;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'pt', format:'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 54;
  let y = 50;
  const lineH = 14;
  const dateOpts = {day:'numeric', month:'long', year:'numeric'};
  function fmtDate(s, opts){
    const d = parseDate(s); if(!d) return '—';
    return d.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', opts || dateOpts);
  }

  function wrapText(text, width, size){
    doc.setFontSize(size);
    return doc.splitTextToSize(text, width);
  }
  function ensureSpace(needed){
    if(y + needed > 740){ doc.addPage(); y = 50; }
  }
  function heading(text){
    ensureSpace(24);
    doc.setFont('helvetica','bold'); doc.setFontSize(11);
    doc.text(text, marginX, y); y += 16;
    doc.setFont('helvetica','normal');
  }
  function para(text, size){
    size = size || 9.5;
    const lines = wrapText(text, pageW - marginX*2, size);
    ensureSpace(lines.length*lineH);
    doc.setFontSize(size);
    doc.text(lines, marginX, y);
    y += lines.length*lineH + 6;
  }

  const cuotas = loan.cuotas;
  const interesTotal = round2(cuotas.reduce((s,c)=>s+c.interes,0));
  const totalAPagar = round2(loan.principal + interesTotal);
  const apr = computeEffectiveAPR(loan.principal, cuotas, loan.fechaInicio);

  // Title
  doc.setFont('helvetica','bold'); doc.setFontSize(15);
  doc.text(T.docTitle, pageW/2, y, {align:'center'});
  y += 20;
  doc.setFont('helvetica','normal'); doc.setFontSize(9.5);
  doc.text(T.loanIdDate(loan.folio, fmtDate(loan.fechaInicio)), pageW/2, y, {align:'center'});
  y += 20;

  // Disclaimer box
  doc.setDrawColor(200,150,20); doc.setFillColor(255,248,225);
  const discText = wrapText(T.notice, pageW - marginX*2 - 16, 8);
  const boxH = discText.length * 10 + 14;
  doc.rect(marginX, y, pageW - marginX*2, boxH, 'FD');
  doc.setFontSize(8); doc.setTextColor(120,80,0);
  doc.text(discText, marginX+8, y+12);
  doc.setTextColor(0,0,0);
  y += boxH + 18;

  heading(T.s1);
  para(T.lenderLine(lender));
  para(T.borrowerLine(client));

  heading(T.s2);
  para(T.loanAmount(fmtMoney(loan.principal), fmtDate(loan.fechaInicio)));

  heading(T.s3);
  if(loan.tasaTipo === 'simple'){
    para(T.interestSimple(loan.tasa, freqLabel, fmtMoney(interesTotal)));
  } else {
    para(T.interestApr(loan.tasa, fmtMoney(interesTotal)));
  }
  para(T.aprDisclosure(apr.toFixed(2)), 9.5);

  heading(T.s4);
  const extra = loan.frecuencia === 'personalizado' ? T.everyDays(loan.diasPersonalizado) : '';
  para(T.schedule(loan.numCuotas, freqLabel, extra, fmtDate(cuotas[0].fechaVencimiento), fmtMoney(totalAPagar)));

  ensureSpace(20);
  doc.setFont('helvetica','bold'); doc.setFontSize(9);
  doc.text(T.thNum, marginX, y);
  doc.text(T.thDue, marginX+40, y);
  doc.text(T.thPrincipal, marginX+160, y);
  doc.text(T.thInterest, marginX+260, y);
  doc.text(T.thPayment, marginX+360, y);
  y += 10;
  doc.setDrawColor(180); doc.line(marginX, y, pageW-marginX, y); y += 10;
  doc.setFont('helvetica','normal');
  for(const c of cuotas){
    ensureSpace(lineH);
    doc.text(String(c.numero), marginX, y);
    doc.text(fmtDate(c.fechaVencimiento), marginX+40, y);
    doc.text(fmtMoney(c.capital), marginX+160, y);
    doc.text(fmtMoney(c.interes), marginX+260, y);
    doc.text(fmtMoney(c.montoBase), marginX+360, y);
    y += lineH;
  }
  y += 12;

  heading(T.s5);
  para(T.lateFee);

  heading(T.s6);
  para(T.prepay);

  heading(T.s7);
  para(T.default_);

  heading(T.s8);
  para(T.governing(lender.estado==='NV' ? (lang==='es'?'Nevada':'Nevada') : lender.estado));

  heading(T.s9);
  para(T.entire);

  ensureSpace(90);
  y += 20;
  doc.line(marginX, y, marginX+200, y);
  doc.line(marginX+260, y, marginX+460, y);
  y += 12;
  doc.setFontSize(9);
  doc.text(T.lenderSig(lender.nombre), marginX, y);
  doc.text(T.dateLine, marginX+260, y);
  y += 30;
  doc.line(marginX, y, marginX+200, y);
  doc.line(marginX+260, y, marginX+460, y);
  y += 12;
  doc.text(T.borrowerSig(client ? client.nombre : ''), marginX, y);
  doc.text(T.dateLine, marginX+260, y);

  doc.save(T.fname + loan.folio + (lang==='es' ? '-ES' : '-EN') + '.pdf');
}

/* ============ MISC UI ============ */
function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
let toastTimer = null;
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

function populateStateSelects(){
  const opts = US_STATES.map(([code,name]) => `<option value="${code}">${name}</option>`).join('');
  ['su_estado','c_estado','s_estado'].forEach(id => { document.getElementById(id).innerHTML = opts; });
  document.getElementById('su_estado').value = 'NV';
  document.getElementById('s_estado').value = 'NV';
}

/* ============ UPDATE BANNER ============ */
let myVersion = null;
function checkForUpdate(){
  fetch(location.href.split('#')[0].split('?')[0] + '?_v=' + Date.now(), { cache:'no-store' })
    .then(r => r.text())
    .then(html => {
      const m = html.match(/name="build-version" content="([^"]+)"/);
      if(m && m[1] && m[1] !== myVersion) document.getElementById('updateBanner')?.classList.add('show');
    })
    .catch(() => {});
}
function forceFreshReload(){
  if('caches' in window){ caches.keys().then(keys => keys.forEach(k => caches.delete(k))); }
  location.href = location.href.split('#')[0].split('?')[0] + '?_v=' + Date.now();
}

/* ============ INIT ============ */
function init(){
  const m = document.querySelector('meta[name="build-version"]');
  myVersion = m ? m.content : null;
  loadState();
  populateStateSelects();

  if(setupNeeded()){ showSetupView(); return; }

  try {
    const raw = sessionStorage.getItem('vl_session');
    if(raw) session = JSON.parse(raw);
  } catch(e){}

  if(session && session.role === 'admin'){ showAdminView(); }
  else if(session && session.role === 'cliente' && state.clients.some(c => c.id === session.clientId)){ showClientView(); }
  else { showLoginView(); }

  setInterval(checkForUpdate, 5*60*1000);
}
document.addEventListener('DOMContentLoaded', init);
