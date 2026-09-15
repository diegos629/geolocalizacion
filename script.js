const locateBtn = document.getElementById('locateBtn');
const copyLocationBtn = document.getElementById('copyLocationBtn');
const statusEl = document.getElementById('status');
const latitudEl = document.getElementById('latitud');
const longitudEl = document.getElementById('longitud');
const precisionEl = document.getElementById('precision');
const tiempoEl = document.getElementById('tiempo');
const mapLink = document.getElementById('mapLink');
const mapEl = document.getElementById('map');
const eventForm = document.getElementById('eventForm');
const eventTypeInput = document.getElementById('eventType');
const eventNoteInput = document.getElementById('eventNote');
const historyList = document.getElementById('historyList');
const historyCount = document.getElementById('historyCount');
const historyToggleBtn = document.getElementById('historyToggleBtn');
const watchToggle = document.getElementById('watchToggle');
const loginCard = document.getElementById('loginCard');
const appContent = document.getElementById('appContent');
const locationPanel = document.getElementById('locationPanel');
const userLoginForm = document.getElementById('userLoginForm');
const tutorLoginForm = document.getElementById('tutorLoginForm');
const userRoleBtn = document.getElementById('userRoleBtn');
const tutorRoleBtn = document.getElementById('tutorRoleBtn');
const loginIntro = document.getElementById('loginIntro');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const userPhone = document.getElementById('userPhone');
const userPassword = document.getElementById('userPassword');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginPairingCode = document.getElementById('loginPairingCode');
const tutorName = document.getElementById('tutorName');
const tutorEmail = document.getElementById('tutorEmail');
const tutorPhone = document.getElementById('tutorPhone');
const sendAlertBtn = document.getElementById('sendAlertBtn');
const saveTutorBtn = document.getElementById('saveTutorBtn');
const pairingCodeEl = document.getElementById('pairingCode');
const generateCodeBtn = document.getElementById('generateCodeBtn');
const alertBox = document.getElementById('alertBox');
const installBtn = document.getElementById('installBtn');
const installHint = document.getElementById('installHint');
const userPairingBox = document.getElementById('userPairingBox');
const userPairingCode = document.getElementById('userPairingCode');
const copyPairingBtn = document.getElementById('copyPairingBtn');
const refreshPairingBtn = document.getElementById('refreshPairingBtn');
const tutorUserPhone = document.getElementById('tutorUserPhone');
const emergencyTutorPhone = document.getElementById('emergencyTutorPhone');
const emergencyBtn = document.getElementById('emergencyBtn');
const registerTutorBtn = document.getElementById('registerTutorBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const tutorPanel = document.getElementById('tutorPanel');
const bluetoothBtn = document.getElementById('bluetoothBtn');
const bluetoothStatus = document.getElementById('bluetoothStatus');
const accountBadge = document.getElementById('accountBadge');
const leftRail = document.getElementById('leftRail');
const logoutBtn = document.getElementById('logoutBtn');
const openRailBtn = document.getElementById('openRailBtn');
const closeRailBtn = document.getElementById('closeRailBtn');
const infoRailBtn = document.getElementById('infoRailBtn');
const infoPanel = document.getElementById('infoPanel');
const infoUserName = document.getElementById('infoUserName');
const infoUserEmail = document.getElementById('infoUserEmail');
const infoUserPhone = document.getElementById('infoUserPhone');
const infoCode = document.getElementById('infoCode');
const infoTutorName = document.getElementById('infoTutorName');
const infoTutorEmail = document.getElementById('infoTutorEmail');
const infoTutorPhone = document.getElementById('infoTutorPhone');
const callRailBtn = document.getElementById('callRailBtn');

const STORAGE_KEY = 'gmac-history';
const TUTOR_KEY = 'gmac-tutor';
const SESSION_KEY = 'gmac-tutor-session';
const PAIRING_KEY = 'gmac-pairing-code';
const USER_PROFILE_KEY = 'gmac-user-profile';
const THEME_KEY = 'gmac-theme';
const PAIRING_TTL = 7 * 24 * 60 * 60 * 1000;
let lastCoords = null;
let deferredPrompt = null;
let alertActivated = false;
let bluetoothDevice = null;
let heartRateCharacteristic = null;
let abnormalHeartRateReadings = 0;
let lastHeartRateAlertAt = 0;
let currentRole = 'tutor';
let alertAudioContext = null;
let currentAccountEmail = '';
let sharedPairingCode = '';
let linkedUserPhone = '';
let alertPollTimer = null;
let lastRemoteAlertId = 0;
registerTutorBtn.hidden = true;
registerTutorBtn.setAttribute('aria-hidden', 'true');
registerTutorBtn.style.display = 'none';

if (registerTutorBtn && window.location.protocol !== 'file:') {
  registerTutorBtn.hidden = true;
}
const HEART_RATE_SERVICE = 'heart_rate';
const HEART_RATE_CHARACTERISTIC = 'heart_rate_measurement';
const HEART_RATE_ALERT_COOLDOWN = 10 * 60 * 1000;

const defaultHistory = [
  {
    id: safeRandomId(),
    type: 'Caída',
    note: 'Se reportó caída al entrar a la vivienda.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    coords: { lat: -34.6037, lng: -58.3816 }
  },
  {
    id: safeRandomId(),
    type: 'Problema clínico',
    note: 'Mareos y dolor leve durante la tarde.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
    coords: { lat: -34.6037, lng: -58.3816 }
  }
];

function setStatus(message, type = '') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function applyTheme(theme = 'light') {
  const safeTheme = theme === 'dark' ? 'dark' : 'light';
  document.body.dataset.theme = safeTheme;
  localStorage.setItem(THEME_KEY, safeTheme);

  if (themeToggleBtn) {
    themeToggleBtn.textContent = safeTheme === 'dark' ? 'Modo claro' : 'Modo oscuro';
  }
}

function loadTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(savedTheme);
}

function setBluetoothStatus(message, type = '') {
  bluetoothStatus.textContent = message;
  bluetoothStatus.className = `connection-status ${type}`.trim();
}

function unlockAlertAudio() {
  if (!alertAudioContext) {
    alertAudioContext = new AudioContext();
  }

  if (alertAudioContext.state === 'suspended') {
    alertAudioContext.resume().catch(() => {});
  }
}

function playAlertSound() {
  try {
    unlockAlertAudio();
    const startTime = alertAudioContext.currentTime;
    [0, 0.22, 0.44].forEach((offset) => {
      const oscillator = alertAudioContext.createOscillator();
      const gain = alertAudioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, startTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.18, startTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + offset + 0.14);
      oscillator.connect(gain);
      gain.connect(alertAudioContext.destination);
      oscillator.start(startTime + offset);
      oscillator.stop(startTime + offset + 0.15);
    });
  } catch (error) {
    // Algunos navegadores bloquean audio hasta que el usuario interactúa.
  }
}

function formatDate(date) {
  if (Number.isNaN(date.getTime())) {
    return 'Fecha no válida';
  }

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function safeRandomId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `event-${Date.now()}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizePairingCode(value = '') {
  return String(value ?? '').trim().replace(/\s+/g, '').toUpperCase();
}

function isSharedServerAvailable() {
  return window.location.protocol === 'http:' || window.location.protocol === 'https:';
}

async function savePairingCodeToServer(code) {
  if (!isSharedServerAvailable()) return false;

  try {
    const response = await fetch('/api/pairing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        phone: userPhone?.value || '',
        tutorPhone: emergencyTutorPhone?.value || ''
      })
    });
    if (!response.ok) return false;
    sharedPairingCode = code;
    return true;
  } catch (error) {
    return false;
  }
}

async function loadPairingCodeFromServer() {
  if (!isSharedServerAvailable()) return '';

  try {
    const response = await fetch('/api/pairing', { cache: 'no-store' });
    if (!response.ok) return '';
    const data = await response.json();
    sharedPairingCode = normalizePairingCode(data.code);
    linkedUserPhone = String(data.phone || '').replace(/\D/g, '');
    return sharedPairingCode;
  } catch (error) {
    return '';
  }
}

async function sendAlertToServer(message) {
  const code = sharedPairingCode || getPairingCode();
  if (!code || !isSharedServerAvailable()) return false;

  try {
    const response = await fetch('/api/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, message })
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function checkRemoteAlert() {
  if (currentRole !== 'tutor' || !isSharedServerAvailable()) return;
  const code = sharedPairingCode || await loadPairingCodeFromServer();
  if (!code) return;

  try {
    const response = await fetch(`/api/alert?code=${encodeURIComponent(code)}`, { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    if (data.alert && data.alert.id > lastRemoteAlertId) {
      lastRemoteAlertId = data.alert.id;
      showAlertMessage(`Alerta recibida: ${data.alert.message}`);
      setStatus('Alerta de emergencia recibida. Revisa el mensaje y llama al contacto.', 'error');
    }
  } catch (error) {
    // La app sigue funcionando aunque el servidor no responda temporalmente.
  }
}

function startAlertPolling() {
  if (alertPollTimer) clearInterval(alertPollTimer);
  checkRemoteAlert();
  alertPollTimer = setInterval(checkRemoteAlert, 3000);
}

function stopAlertPolling() {
  if (alertPollTimer) clearInterval(alertPollTimer);
  alertPollTimer = null;
}

function getPairingCode() {
  const stored = localStorage.getItem(PAIRING_KEY);
  if (!stored) return '';

  try {
    const parsed = JSON.parse(stored);
    if (parsed.code) {
      const normalized = normalizePairingCode(parsed.code);
      if (Date.now() - parsed.createdAt < PAIRING_TTL) {
        return normalized;
      }
      if (!parsed.createdAt || Date.now() - parsed.createdAt >= PAIRING_TTL) {
        localStorage.removeItem(PAIRING_KEY);
      }
    }
  } catch (error) {
    return normalizePairingCode(stored);
  }

  return '';
}

function getHistory() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return defaultHistory;

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length ? parsed : defaultHistory;
  } catch (error) {
    return defaultHistory;
  }
}

function saveHistory(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function updateHistoryList() {
  const entries = getHistory();
  historyCount.textContent = entries.length;

  if (!entries.length) {
    historyList.innerHTML = '<li class="empty-state">Todavía no hay eventos registrados.</li>';
    return;
  }

  historyList.innerHTML = entries
    .slice()
    .reverse()
    .map((entry) => {
      const safeType = escapeHtml(entry.type || 'Sin tipo');
      const safeNote = escapeHtml(entry.note || 'Sin observación adicional.');
      const locationDetails = currentRole === 'tutor'
        ? `<div>
              <span>Ubicación</span>
              <small>${entry.coords ? `${Number(entry.coords.lat).toFixed(4)}, ${Number(entry.coords.lng).toFixed(4)}` : 'Sin ubicación'}</small>
              ${entry.coords ? `<button type="button" class="history-location-btn" data-location-url="${escapeHtml(getLocationUrl(entry.coords.lat, entry.coords.lng))}">Abrir ubicación</button>` : '<span>Sin ubicación</span>'}
            </div>`
        : '';
      return `
        <li class="history-item">
          <div class="history-status">
            <span class="status-dot"></span>
            <span>Evento registrado</span>
            <time>${formatDate(new Date(entry.date))}</time>
          </div>
          <div class="history-details">
            <div>
              <span>Tipo</span>
              <strong>${safeType}</strong>
            </div>
            <div>
              <span>Información</span>
              <p>${safeNote}</p>
            </div>
            ${locationDetails}
          </div>
        </li>
      `;
    })
    .join('');
}

function addEventToHistory(type, note) {
  const entries = getHistory();
  const newEntry = {
    id: safeRandomId(),
    type,
    note,
    date: new Date().toISOString(),
    accountEmail: currentAccountEmail,
    coords: lastCoords ? { lat: lastCoords.latitude, lng: lastCoords.longitude } : null
  };

  entries.push(newEntry);
  saveHistory(entries);
  updateHistoryList();

  if (['Caída', 'Desmayo', 'Problema clínico', 'Mareos'].includes(type)) {
    triggerTutorAlert(`Evento detectado: ${type}. Observación: ${note}`);
  }
}

function saveTutorData() {
  const tutor = {
    name: tutorName.value.trim(),
    email: tutorEmail.value.trim(),
    phone: tutorPhone.value.trim()
  };

  localStorage.setItem(TUTOR_KEY, JSON.stringify(tutor));
  return tutor;
}

function loadTutorData() {
  const stored = localStorage.getItem(TUTOR_KEY);
  if (!stored) return null;

  try {
    const tutor = JSON.parse(stored);
    if (tutor && (tutor.name || tutor.email || tutor.phone)) {
      tutorName.value = tutor.name || '';
      tutorEmail.value = tutor.email || '';
      tutorPhone.value = tutor.phone || '';
      emergencyTutorPhone.value = tutor.phone || '';
      return tutor;
    }
  } catch (error) {
    return null;
  }

  return null;
}

function loadUserProfile() {
  const stored = localStorage.getItem(USER_PROFILE_KEY);
  if (!stored) return;

  try {
    const profile = JSON.parse(stored);
    userName.value = profile.name || '';
    userEmail.value = profile.email || '';
    userPhone.value = profile.phone || '';
  } catch (error) {
    localStorage.removeItem(USER_PROFILE_KEY);
  }
}

function loadTutorSession() {
  const storedSession = sessionStorage.getItem(SESSION_KEY);
  if (!storedSession) return false;

  try {
    const session = JSON.parse(storedSession);
    if (session.role === 'user') {
      userName.value = session.name || '';
      userEmail.value = session.email || '';
      currentAccountEmail = session.email || '';
      showAppContent('user');
      return true;
    }
    loginEmail.value = session.email || '';
    tutorEmail.value = session.email || '';
    currentAccountEmail = session.email || '';
  } catch (error) {
    loginEmail.value = storedSession;
    tutorEmail.value = storedSession;
    currentAccountEmail = storedSession;
  }

  showAppContent('tutor');
  return true;
}

function showAppContent(role = 'tutor') {
  currentRole = role;
  loginCard.classList.add('hidden');
  appContent.classList.remove('hidden');
  if (leftRail) {
    leftRail.classList.remove('hidden');
    leftRail.classList.remove('is-open');
  }
  if (openRailBtn) {
    openRailBtn.classList.remove('hidden');
    openRailBtn.setAttribute('aria-expanded', 'false');
  }
  locationPanel.classList.toggle('hidden', role !== 'tutor');
  userPairingBox.classList.toggle('hidden', role !== 'user');
  tutorPanel.classList.toggle('hidden', role !== 'tutor');
  registerTutorBtn.hidden = true;
  registerTutorBtn.classList.add('hidden');
  registerTutorBtn.setAttribute('aria-hidden', 'true');
  registerTutorBtn.style.display = 'none';

  emergencyBtn.hidden = role === 'tutor';
  emergencyBtn.style.display = role === 'tutor' ? 'none' : 'block';
  emergencyBtn.setAttribute('aria-hidden', String(role === 'tutor'));
  callRailBtn.textContent = role === 'tutor' ? 'Llamar a la persona usuaria' : 'Llamar al tutor';

  bluetoothBtn.hidden = role === 'tutor';
  bluetoothBtn.style.display = role === 'tutor' ? 'none' : 'block';
  bluetoothBtn.setAttribute('aria-hidden', String(role === 'tutor'));

  const eventFormEl = document.getElementById('eventForm');
  if (eventFormEl) {
    eventFormEl.hidden = role === 'tutor';
    eventFormEl.style.display = role === 'tutor' ? 'none' : 'block';
    eventFormEl.setAttribute('aria-hidden', String(role === 'tutor'));
    eventFormEl.classList.toggle('hidden', role === 'tutor');
  }

  accountBadge.textContent = currentAccountEmail ? `${role === 'user' ? 'Usuario' : 'Tutor'}: ${currentAccountEmail}` : 'Cuenta activa';
  pairingCodeEl.textContent = getPairingCode() || '--';
  userPairingCode.textContent = getPairingCode() || '--';
  updateHistoryList();
  updateInstallPromptState();
  updateInfoPanel(role);
  if (role === 'tutor') startAlertPolling();
  else stopAlertPolling();
}

function updateInfoPanel(role = currentRole) {
  if (!infoUserName || !infoUserEmail || !infoUserPhone || !infoCode) return;
  infoUserName.textContent = userName.value || 'No registrado';
  infoUserEmail.textContent = userEmail.value || 'No registrado';
  infoUserPhone.textContent = userPhone.value || 'No registrado';
  infoCode.textContent = getPairingCode() || '--';
  infoTutorName.textContent = tutorName.value || 'No registrado';
  infoTutorEmail.textContent = tutorEmail.value || 'No registrado';
  infoTutorPhone.textContent = tutorPhone.value || 'No registrado';
}

function resetToLoginScreen() {
  currentAccountEmail = '';
  stopAlertPolling();
  sessionStorage.removeItem(SESSION_KEY);
  loginCard.classList.remove('hidden');
  appContent.classList.add('hidden');
  if (leftRail) {
    leftRail.classList.add('hidden');
    leftRail.classList.remove('is-open');
  }
  if (openRailBtn) {
    openRailBtn.classList.add('hidden');
    openRailBtn.setAttribute('aria-expanded', 'false');
  }
  accountBadge.textContent = 'Cuenta activa';
  setStatus('Sesión cerrada. Inicia sesión para continuar.', 'success');
  setLoginRole('user');
}

function updateInstallPromptState() {
  if (window.matchMedia('(display-mode: standalone)').matches) {
    installBtn.style.display = 'none';
    if (installHint) {
      installHint.textContent = 'La app ya está instalada.';
    }
    return;
  }

  installBtn.style.display = 'block';

  if (installHint) {
    installHint.textContent = deferredPrompt
      ? 'Instala esta app en tu pantalla de inicio desde Chrome.'
      : 'En Chrome puedes usar el menú ⋮ y elegir “Instalar app”.';
  }
}

async function generatePairingCode() {
  const randomBytes = new Uint32Array(1);
  globalThis.crypto.getRandomValues(randomBytes);
  const code = normalizePairingCode(`GMAC-${String(randomBytes[0] % 10000).padStart(4, '0')}`);
  localStorage.setItem(PAIRING_KEY, JSON.stringify({ code, createdAt: Date.now() }));
  await savePairingCodeToServer(code);
  pairingCodeEl.textContent = code;
  userPairingCode.textContent = code;
  setStatus('Código generado. Compártelo con el tutor.', 'success');
  return code;
}

async function copyPairingCode() {
  const code = getPairingCode();
  if (!code) {
    setStatus('Primero genera un código de vinculación.', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(code);
    setStatus('Código copiado correctamente.', 'success');
  } catch (error) {
    setStatus('No se pudo copiar el código automáticamente.', 'error');
  }
}

function setLoginRole(role) {
  const isUser = role === 'user';
  userLoginForm.classList.toggle('hidden', !isUser);
  tutorLoginForm.classList.toggle('hidden', isUser);
  userRoleBtn.classList.toggle('active', isUser);
  tutorRoleBtn.classList.toggle('active', !isUser);
  userRoleBtn.setAttribute('aria-selected', String(isUser));
  tutorRoleBtn.setAttribute('aria-selected', String(!isUser));
  loginIntro.textContent = isUser
    ? 'Ingresa para generar un código y vincular a tu tutor.'
    : 'Ingresa tus datos y el código de la persona usuaria para vincularte.';
}

function openTutorCommunication(message) {
  const tutor = saveTutorData();
  const cleanEmail = (tutor.email || '').trim();
    const cleanPhone = (tutor.phone || '').replace(/\D/g, '');

  if (cleanEmail && !cleanPhone) {
    const mailtoUrl = `mailto:${encodeURIComponent(cleanEmail)}?subject=${encodeURIComponent('G.M.A.C - Alerta')}&body=${encodeURIComponent(message)}`;
    window.location.href = mailtoUrl;
    setStatus('Se abrió el correo para enviar la alerta al tutor.', 'success');
    return;
  }

  if (cleanPhone) {
    const whatsAppUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsAppUrl, '_blank', 'noopener,noreferrer');
    setStatus('Se abrió WhatsApp con la alerta preparada para el tutor.', 'success');
    return;
  }

  setStatus('Registra un correo o teléfono del tutor para enviar alertas.', 'error');
}

function callTutorAutomatically() {
  const cleanPhone = (emergencyTutorPhone.value || tutorPhone.value || '').replace(/\D/g, '');
  if (!cleanPhone) {
    setStatus('Registra primero el teléfono del tutor para activar la llamada automática.', 'error');
    return false;
  }

  window.location.href = `tel:${cleanPhone}`;
  return true;
}

function callContact() {
  const cleanPhone = currentRole === 'tutor'
    ? (tutorUserPhone?.value || linkedUserPhone || '').replace(/\D/g, '')
    : (tutorPhone.value || '').replace(/\D/g, '');
  if (!cleanPhone) {
    setStatus(currentRole === 'tutor'
      ? 'La persona usuaria no registró un teléfono de contacto.'
      : 'Registra el teléfono del tutor para poder llamarlo.', 'error');
    return;
  }

  window.location.href = `tel:${cleanPhone}`;
}

function showAlertMessage(message) {
  alertBox.textContent = message;

  const callButton = document.createElement('button');
  callButton.type = 'button';
  callButton.className = 'alert-call-btn';
  callButton.textContent = currentRole === 'tutor' ? 'Llamar a la persona usuaria' : 'Llamar al tutor';
  callButton.addEventListener('click', callContact);
  alertBox.appendChild(callButton);
  alertBox.classList.remove('hidden');
  playAlertSound();

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('G.M.A.C - Alerta', { body: message });
  }

  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200]);
  }
}

function buildAlertMessage(reason) {
  const locationText = lastCoords
    ? `Ubicación: ${getLocationUrl()}`
    : 'Ubicación: no disponible';

  const tutorReference = tutorName.value ? `Tutor: ${tutorName.value}.` : 'Tutor: no registrado.';
  const emailReference = tutorEmail.value ? `Correo: ${tutorEmail.value}.` : '';
  const phoneReference = tutorPhone.value ? `Contacto: ${tutorPhone.value}.` : '';

  return `G.M.A.C: ${reason} ${locationText}. ${tutorReference} ${emailReference} ${phoneReference}`.trim();
}

async function triggerTutorAlert(reason, options = {}) {
  const fullMessage = buildAlertMessage(reason);
  showAlertMessage(fullMessage);
  alertActivated = true;
  setStatus('Se activó una alerta automática para el tutor.', 'error');
  const sentToServer = await sendAlertToServer(fullMessage);

  if (navigator.clipboard) {
    navigator.clipboard.writeText(fullMessage).catch(() => {});
  }

  if (!options.autoCall) {
    openTutorCommunication(fullMessage);
  }
  if (sentToServer) {
    setStatus('Alerta enviada al tutor por la conexión compartida.', 'success');
  }
}

function updateMap(latitude, longitude) {
  const mapUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&z=16&output=embed`;
  mapEl.classList.remove('map-placeholder');
  mapEl.innerHTML = `<iframe
    title="Mapa de ubicación"
    loading="lazy"
    referrerpolicy="no-referrer-when-downgrade"
    src="${mapUrl}"
    allowfullscreen
  ></iframe>`;
}

function updateMapLink(latitude, longitude) {
  const googleMapsUrl = getLocationUrl(latitude, longitude);
  mapLink.href = googleMapsUrl;
  mapLink.hidden = false;
}

function getLocationUrl(latitude = lastCoords?.latitude, longitude = lastCoords?.longitude) {
  const safeLatitude = Number(latitude);
  const safeLongitude = Number(longitude);
  if (!Number.isFinite(safeLatitude) || !Number.isFinite(safeLongitude)) {
    return '';
  }

  return `https://www.google.com/maps?q=${safeLatitude},${safeLongitude}`;
}

function copyCoordinates() {
  if (!lastCoords) {
    setStatus('Primero actualiza la ubicación.', 'error');
    return;
  }

  const text = getLocationUrl();

  if (!navigator.clipboard) {
    setStatus('El navegador no permite copiar automáticamente. Copia manualmente la coordenada.', 'error');
    return;
  }

  navigator.clipboard.writeText(text)
    .then(() => setStatus('URL de ubicación copiada correctamente.', 'success'))
    .catch(() => setStatus('No se pudo copiar. Puedes copiar la URL desde el enlace del mapa.', 'error'));
}

function showPosition(position) {
  const { latitude, longitude, accuracy } = position.coords;
  const timestamp = new Date(position.timestamp);

  lastCoords = { latitude, longitude };

  latitudEl.textContent = latitude.toFixed(6);
  longitudEl.textContent = longitude.toFixed(6);
  precisionEl.textContent = `${accuracy.toFixed(0)} m`;
  tiempoEl.textContent = formatDate(timestamp);

  updateMap(latitude, longitude);
  updateMapLink(latitude, longitude);
  setStatus('Ubicación actualizada correctamente.', 'success');
}

function showError(error) {
  let message = 'No se pudo obtener la ubicación.';

  switch (error.code) {
    case error.PERMISSION_DENIED:
      message = 'Se denegó el acceso a la ubicación. Permítela y usa HTTPS en el celular para mostrar el mapa.';
      break;
    case error.POSITION_UNAVAILABLE:
      message = 'La ubicación no está disponible. En celulares, la dirección debe usar HTTPS para mostrar el mapa.';
      break;
    case error.TIMEOUT:
      message = 'La solicitud tardó demasiado. Inténtalo nuevamente.';
      break;
    default:
      message = 'Ocurrió un error inesperado al obtener la ubicación.';
      break;
  }

  setStatus(message, 'error');
}

function getLocation() {
  if (!navigator.geolocation) {
    setStatus('Este navegador no soporta geolocalización.', 'error');
    return;
  }

  setStatus('Solicitando permiso para compartir la ubicación...');

  navigator.geolocation.getCurrentPosition(showPosition, showError, {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0,
  });
}

async function connectBluetooth() {
  if (!('bluetooth' in navigator)) {
    setBluetoothStatus('Bluetooth no está disponible en este navegador.', 'error');
    return;
  }

  try {
    setBluetoothStatus('Buscando dispositivo Bluetooth...');
    bluetoothDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [HEART_RATE_SERVICE]
    });
    bluetoothDevice.addEventListener('gattserverdisconnected', () => {
      setBluetoothStatus('El dispositivo Bluetooth se desconectó.', 'error');
    });

    if (!bluetoothDevice.gatt) {
      setBluetoothStatus('El dispositivo no permite conexión GATT.', 'error');
      return;
    }

    await bluetoothDevice.gatt.connect();
    setBluetoothStatus(`Bluetooth conectado: ${bluetoothDevice.name || 'dispositivo'}.`, 'success');
    await startHeartRateMonitoring();
  } catch (error) {
    if (error.name === 'NotFoundError') {
      setBluetoothStatus('No se seleccionó ningún dispositivo Bluetooth.', 'error');
      return;
    }

    setBluetoothStatus('No se pudo conectar el dispositivo Bluetooth.', 'error');
  }
}

function readHeartRate(event) {
  const value = event.target.value;
  const flags = value.getUint8(0);
  const is16Bit = (flags & 0x01) === 1;
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1);
}

function handleHeartRate(event) {
  const heartRate = readHeartRate(event);
  const isAbnormal = heartRate < 45 || heartRate > 120;

  setBluetoothStatus(`Ritmo cardíaco: ${heartRate} BPM${isAbnormal ? ' (revisar)' : ''}.`, isAbnormal ? 'error' : 'success');

  if (!watchToggle.checked || !isAbnormal) {
    abnormalHeartRateReadings = 0;
    return;
  }

  abnormalHeartRateReadings += 1;
  if (abnormalHeartRateReadings < 3 || Date.now() - lastHeartRateAlertAt < HEART_RATE_ALERT_COOLDOWN) {
    return;
  }

  lastHeartRateAlertAt = Date.now();
  abnormalHeartRateReadings = 0;
  triggerTutorAlert(`El reloj detectó un ritmo cardíaco fuera del rango configurado: ${heartRate} BPM. Verificar a la persona.`);
}

async function startHeartRateMonitoring() {
  try {
    const service = await bluetoothDevice.gatt.getPrimaryService(HEART_RATE_SERVICE);
    heartRateCharacteristic = await service.getCharacteristic(HEART_RATE_CHARACTERISTIC);
    heartRateCharacteristic.addEventListener('characteristicvaluechanged', handleHeartRate);
    await heartRateCharacteristic.startNotifications();
    watchToggle.checked = true;
    setBluetoothStatus('Reloj conectado y vigilancia cardíaca activa.', 'success');
  } catch (error) {
    setBluetoothStatus('Reloj conectado, pero no ofrece frecuencia cardíaca compatible.', 'error');
  }
}

locateBtn.addEventListener('click', () => {
  getLocation();
});

registerTutorBtn.addEventListener('click', () => {
  if (registerTutorBtn.hidden) return;

  if (currentRole === 'user') {
    sessionStorage.removeItem(SESSION_KEY);
    appContent.classList.add('hidden');
    loginCard.classList.remove('hidden');
    setLoginRole('tutor');
    return;
  }

  const isHidden = tutorPanel.classList.toggle('hidden');
  registerTutorBtn.setAttribute('aria-expanded', String(!isHidden));
});

bluetoothBtn.addEventListener('click', connectBluetooth);

copyLocationBtn.addEventListener('click', () => {
  copyCoordinates();
});

historyList.addEventListener('click', (event) => {
  const locationButton = event.target.closest('.history-location-btn');
  if (!locationButton) {
    return;
  }

  window.open(locationButton.dataset.locationUrl, '_blank', 'noopener,noreferrer');
});

historyToggleBtn.addEventListener('click', () => {
  const isCollapsed = historyList.classList.toggle('history-collapsed');
  historyToggleBtn.textContent = isCollapsed ? 'Mostrar' : 'Minimizar';
  historyToggleBtn.setAttribute('aria-expanded', String(!isCollapsed));
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) {
    const message = 'La descarga automática no está disponible. En Chrome, usa el menú ⋮ y elige “Instalar app”.';
    if (installHint) {
      installHint.textContent = message;
    }
    if (appContent.classList.contains('hidden')) {
      loginIntro.textContent = message;
    } else {
      setStatus(message, 'error');
    }
    return;
  }

  deferredPrompt.prompt();
  const result = await deferredPrompt.userChoice;

  if (result.outcome === 'accepted') {
    setStatus('La aplicación se está instalando.', 'success');
    if (installHint) {
      installHint.textContent = 'Instalación iniciada. La app quedará disponible en tu pantalla principal.';
    }
  } else {
    setStatus('La instalación fue cancelada.', 'error');
  }

  deferredPrompt = null;
  updateInstallPromptState();
});

watchToggle.addEventListener('change', () => {
  if (watchToggle.checked) {
    setStatus('Vigilancia cardíaca activada.', 'success');
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  } else {
    setStatus('Vigilancia cardíaca desactivada.', 'success');
  }
});

sendAlertBtn.addEventListener('click', () => {
  const reason = 'Alerta enviada manualmente al tutor por posible recaída o problema clínico.';
  triggerTutorAlert(reason);
});

userRoleBtn.addEventListener('click', () => setLoginRole('user'));
tutorRoleBtn.addEventListener('click', () => setLoginRole('tutor'));

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    resetToLoginScreen();
  });
}

function setRailOpen(isOpen) {
  if (!leftRail || !openRailBtn) return;
  leftRail.classList.toggle('is-open', isOpen);
  openRailBtn.setAttribute('aria-expanded', String(isOpen));
}

openRailBtn?.addEventListener('click', () => setRailOpen(true));
closeRailBtn?.addEventListener('click', () => setRailOpen(false));
infoRailBtn?.addEventListener('click', () => {
  infoPanel?.classList.toggle('hidden');
  updateInfoPanel();
});
callRailBtn?.addEventListener('click', () => {
  if (currentRole === 'tutor') callContact();
  else callTutorAutomatically();
});
tutorUserPhone?.addEventListener('input', () => updateInfoPanel());
[tutorName, tutorEmail, tutorPhone, userName, userEmail, userPhone].forEach((field) => {
  field?.addEventListener('input', () => updateInfoPanel());
});
emergencyTutorPhone?.addEventListener('input', () => {
  tutorPhone.value = emergencyTutorPhone.value;
  localStorage.setItem(TUTOR_KEY, JSON.stringify({
    name: tutorName.value.trim(),
    email: tutorEmail.value.trim(),
    phone: emergencyTutorPhone.value.trim()
  }));
  updateInfoPanel();
});

generateCodeBtn.addEventListener('click', generatePairingCode);
copyPairingBtn.addEventListener('click', copyPairingCode);
refreshPairingBtn.addEventListener('click', async () => {
  await generatePairingCode();
});

userLoginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const name = userName.value.trim();
  const email = userEmail.value.trim().toLowerCase();
  if (!name || !userEmail.validity.valid || userPassword.value.length < 6) {
    setStatus('Ingresa nombre, correo válido y una contraseña de al menos 6 caracteres.', 'error');
    return;
  }

  currentAccountEmail = email;
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify({ name, email, phone: userPhone.value.trim(), updatedAt: Date.now() }));
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ role: 'user', name, email }));
  userPassword.value = '';
  const userEventForm = document.getElementById('eventForm');
  if (userEventForm) {
    userEventForm.hidden = false;
    userEventForm.style.display = 'block';
    userEventForm.removeAttribute('aria-hidden');
    userEventForm.classList.remove('hidden');
  }
  showAppContent('user');
  await generatePairingCode();
  setStatus('Sesión iniciada. Comparte el código con tu tutor.', 'success');
});

tutorLoginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = loginEmail.value.trim().toLowerCase();
  const password = loginPassword.value;
  const pairingCode = normalizePairingCode(loginPairingCode.value);

  if (!loginEmail.validity.valid || password.length < 6) {
    setStatus('Revisa el correo y la contraseña.', 'error');
    return;
  }

  const expectedPairingCode = await loadPairingCodeFromServer() || getPairingCode();
  if (!expectedPairingCode || pairingCode !== expectedPairingCode) {
    setStatus('El código de vinculación no coincide con el generado por la persona usuaria. Revisa que sea el mismo y que no haya caducado.', 'error');
    return;
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ role: 'tutor', email }));
  currentAccountEmail = email;
  tutorEmail.value = email;
  saveTutorData();
  loginPassword.value = '';
  loginPairingCode.value = '';
  const tutorEventForm = document.getElementById('eventForm');
  if (tutorEventForm) {
    tutorEventForm.hidden = true;
    tutorEventForm.style.display = 'none';
    tutorEventForm.setAttribute('aria-hidden', 'true');
    tutorEventForm.classList.add('hidden');
  }
  showAppContent();
  setStatus('Sesión de tutor iniciada y cuenta vinculada.', 'success');
  getLocation();
});

saveTutorBtn.addEventListener('click', () => {
  const tutor = saveTutorData();
  if (!tutor.name && !tutor.email && !tutor.phone) {
    setStatus('Complete el nombre, el correo o el teléfono del tutor para vincularlo.', 'error');
    return;
  }
  setStatus('Tutor vinculado correctamente.', 'success');
});

emergencyBtn.addEventListener('click', async () => {
  if (currentRole === 'user') {
    callTutorAutomatically();
  }
  await triggerTutorAlert('Emergencia activada: posible recaída o problema de salud urgente.', { autoCall: currentRole === 'user' });
});

eventForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const type = eventTypeInput.value.trim();
  const note = eventNoteInput.value.trim();

  if (!note) {
    setStatus('Escribe una observación antes de guardar el evento.', 'error');
    return;
  }

  addEventToHistory(type, note);
  eventNoteInput.value = '';
  setStatus('Evento guardado en el historial.', 'success');
});

loadTutorData();
loadUserProfile();
loadTheme();
loadTutorSession();
updateHistoryList();

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  });
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  updateInstallPromptState();
});

updateInstallPromptState();

document.addEventListener('pointerdown', unlockAlertAudio, { once: true });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Se ignora si el servicio no está disponible en este entorno.
    });
  });
}

if (window.matchMedia('(display-mode: standalone)').matches) {
  installBtn.style.display = 'none';
}
