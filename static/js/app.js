// ============================================================
//  TransitIQ — Map & UI Logic
//  Uses Leaflet for map rendering, Nominatim for geocoding
//  Dijkstra's is in dijkstra.js (custom, no routing library)
// ============================================================

let map, networkData;
let startCoords = null, endCoords = null;
let startMarker = null, endMarker = null;
let routeLayers = [];
let searchTimeout = null;
let startSearchTimeout = null;

// ─── INIT ───────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  initMap();
  await loadNetwork();
  setupEvents();
});

function initMap() {
  map = L.map('map', {
    center: [12.9716, 77.5946],
    zoom: 12,
    zoomControl: false
  });

  // Bright CartoDB Positron tiles — clean & bright
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> © <a href="https://carto.com">CARTO</a>',
    maxZoom: 19
  }).addTo(map);

  L.control.zoom({ position: 'bottomright' }).addTo(map);
}

async function loadNetwork() {
  try {
    const res = await fetch('/api/network');
    networkData = await res.json();
    drawNetworkOnMap();
  } catch (e) {
    showError('Could not load transit network.');
  }
}

// ─── DRAW FULL NETWORK (faint background) ────────────────────
function drawNetworkOnMap() {
  if (!networkData) return;
  const stopMap = {};
  networkData.stops.forEach(s => (stopMap[s.id] = s));

  networkData.connections.forEach(conn => {
    const a = stopMap[conn.from], b = stopMap[conn.to];
    if (!a || !b) return;
    L.polyline([[a.lat, a.lng], [b.lat, b.lng]], {
      color: conn.mode === 'metro' ? '#3B82F6' : '#F97316',
      weight: conn.mode === 'metro' ? 2.5 : 2,
      opacity: 0.18,
      dashArray: conn.mode === 'bus' ? '5 5' : null
    }).addTo(map);
  });

  networkData.stops.forEach(stop => {
    const isMetro = stop.type === 'metro';
    L.circleMarker([stop.lat, stop.lng], {
      radius: isMetro ? 5 : 4,
      fillColor: isMetro ? '#3B82F6' : '#F97316',
      color: '#fff',
      weight: 1.5,
      fillOpacity: 0.6
    }).bindTooltip(`<b>${stop.name}</b><br><span style="color:${isMetro ? '#3B82F6' : '#F97316'}">${isMetro ? '🚇 Metro' : '🚌 Bus'}</span>`, {
      direction: 'top', className: 'stop-tooltip'
    }).addTo(map);
  });
}

// ─── EVENTS ─────────────────────────────────────────────────
function setupEvents() {
  document.getElementById('locBtn').addEventListener('click', getLocation);
  document.getElementById('calcBtn').addEventListener('click', calculateRoute);
  document.getElementById('closeResults').addEventListener('click', () => {
    document.getElementById('resultsPanel').style.display = 'none';
  });

  // Start input — always editable, supports manual typing
  document.getElementById('startInput').addEventListener('input', onStartInput);

  // End input
  document.getElementById('endInput').addEventListener('input', onDestinationInput);

  // Close dropdowns on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('#startInput') && !e.target.closest('#startDropdown')) {
      document.getElementById('startDropdown').style.display = 'none';
    }
    if (!e.target.closest('#endInput') && !e.target.closest('#searchDropdown')) {
      document.getElementById('searchDropdown').style.display = 'none';
    }
  });
}

// ─── GEOLOCATION ────────────────────────────────────────────
function getLocation() {
  if (!navigator.geolocation) return showError('Geolocation not supported.');

  const btn = document.getElementById('locBtn');
  btn.innerHTML = '<span class="spin">↻</span>';
  btn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    pos => {
      btn.innerHTML = '◎'; btn.disabled = false;
      startCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      document.getElementById('startInput').value = 'My Current Location';
      placeMarker('start', startCoords.lat, startCoords.lng, 'Your Location');
      map.setView([startCoords.lat, startCoords.lng], 14);
      hideError();
    },
    () => {
      btn.innerHTML = '◎'; btn.disabled = false;
      showError('Location access denied. Please type your start location.');
    }
  );
}

// ─── NOMINATIM SEARCH — START FIELD ──────────────────────────
function onStartInput() {
  clearTimeout(startSearchTimeout);
  const q = document.getElementById('startInput').value.trim();
  const dropdown = document.getElementById('startDropdown');
  if (q.length < 3) { dropdown.style.display = 'none'; return; }

  // Clear previous coords since user is typing a new location
  startCoords = null;

  startSearchTimeout = setTimeout(() => searchNominatim(q, 'start'), 400);
}

// ─── NOMINATIM SEARCH — END FIELD ────────────────────────────
function onDestinationInput() {
  clearTimeout(searchTimeout);
  const q = document.getElementById('endInput').value.trim();
  const dropdown = document.getElementById('searchDropdown');
  if (q.length < 3) { dropdown.style.display = 'none'; return; }
  searchTimeout = setTimeout(() => searchNominatim(q, 'end'), 400);
}

// ─── SHARED NOMINATIM FETCH ──────────────────────────────────
async function searchNominatim(query, type) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ' Bengaluru')}&format=json&limit=5&viewbox=77.3,12.7,77.9,13.2&bounded=1&accept-language=en`;
  try {
    const res = await fetch(url);
    const results = await res.json();
    if (type === 'end') {
      showDropdown(results, 'searchDropdown', 'end');
    } else {
      showDropdown(results, 'startDropdown', 'start');
    }
  } catch (e) { /* silent */ }
}

// ─── UNIFIED DROPDOWN RENDERER ───────────────────────────────
function showDropdown(results, dropdownId, type) {
  const dropdown = document.getElementById(dropdownId);
  const inputId = type === 'start' ? 'startInput' : 'endInput';

  if (!results.length) {
    dropdown.innerHTML = '<div class="drop-item no-result">No results in Bengaluru</div>';
    dropdown.style.display = 'block';
    return;
  }

  dropdown.innerHTML = results.map(r => {
    const parts = r.display_name.split(',');
    const name = parts[0].trim();
    const sub  = parts.slice(1, 3).join(',').trim();
    return `<div class="drop-item" data-lat="${r.lat}" data-lng="${r.lon}" data-name="${name}">
      <span class="drop-name">${name}</span>
      <span class="drop-sub">${sub}</span>
    </div>`;
  }).join('');

  dropdown.querySelectorAll('.drop-item[data-lat]').forEach(el => {
    el.addEventListener('click', () => {
      const coords = { lat: parseFloat(el.dataset.lat), lng: parseFloat(el.dataset.lng) };

      if (type === 'start') {
        startCoords = coords;
        document.getElementById(inputId).value = el.dataset.name;
        placeMarker('start', coords.lat, coords.lng, el.dataset.name);
        map.setView([coords.lat, coords.lng], 14);
      } else {
        endCoords = coords;
        document.getElementById(inputId).value = el.dataset.name;
        placeMarker('end', coords.lat, coords.lng, el.dataset.name);
      }

      dropdown.style.display = 'none';
      hideError();
    });
  });
  dropdown.style.display = 'block';
}

// ─── MARKERS ─────────────────────────────────────────────────
function placeMarker(type, lat, lng, label) {
  if (type === 'start') {
    if (startMarker) map.removeLayer(startMarker);
    startMarker = L.marker([lat, lng], { icon: pinIcon('#22C55E', '●') })
      .addTo(map).bindPopup(`<b>From:</b> ${label}`);
  } else {
    if (endMarker) map.removeLayer(endMarker);
    endMarker = L.marker([lat, lng], { icon: pinIcon('#EF4444', '●') })
      .addTo(map).bindPopup(`<b>To:</b> ${label}`);
  }
}

function pinIcon(color, symbol) {
  return L.divIcon({
    html: `<div style="
      width:28px;height:28px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.25);
    "></div>`,
    iconSize: [28, 28], iconAnchor: [14, 28], className: ''
  });
}

// ─── CALCULATE ROUTE ─────────────────────────────────────────
async function calculateRoute() {
  if (!startCoords) { showError('📍 Please set your starting location. Type a place or use the ◎ button.'); return; }
  if (!endCoords)   { showError('🔍 Please search and select a destination.'); return; }
  if (!networkData) { showError('Network data loading, please wait.'); return; }

  hideError();
  const btn = document.getElementById('calcBtn');
  const label = btn.querySelector('.btn-label');
  const arrow = btn.querySelector('.arrow');

  label.textContent = 'Calculating…';
  if (arrow) arrow.style.display = 'none';
  btn.disabled = true;

  // Small delay so UI updates before heavy computation
  await new Promise(r => setTimeout(r, 50));

  try {
    const result = findBestRoute(
      networkData,
      startCoords.lat, startCoords.lng,
      endCoords.lat,   endCoords.lng
    );

    if (!result) {
      showError('No route found. Your location may be too far from the transit network.');
      return;
    }
    drawRoute(result);
    showResults(result);
  } catch (e) {
    showError('Error calculating route: ' + e.message);
  } finally {
    label.textContent = 'Find Route';
    if (arrow) arrow.style.display = '';
    btn.disabled = false;
  }
}

// ─── DRAW ROUTE ON MAP ───────────────────────────────────────
function drawRoute(result) {
  routeLayers.forEach(l => map.removeLayer(l));
  routeLayers = [];

  // Walk: start → first transit stop
  addLine(
    [result.startCoords.lat, result.startCoords.lng],
    [result.walkStart.stop.lat, result.walkStart.stop.lng],
    '#22C55E', 3, '7 5'
  );

  // Transit legs
  for (let i = 0; i < result.path.length - 1; i++) {
    const from = result.stopObjects[i];
    const to   = result.stopObjects[i + 1];
    const mode = result.modes[i];
    addLine([from.lat, from.lng], [to.lat, to.lng],
      mode === 'metro' ? '#2563EB' : '#EA580C', 5, null);
    addStopDot(from.lat, from.lng, mode, from.name);
  }

  // Last transit stop
  const last = result.stopObjects[result.stopObjects.length - 1];
  addStopDot(last.lat, last.lng, result.modes[result.modes.length - 1], last.name);

  // Walk: last transit stop → destination
  addLine(
    [result.walkEnd.stop.lat, result.walkEnd.stop.lng],
    [result.endCoords.lat, result.endCoords.lng],
    '#22C55E', 3, '7 5'
  );

  // Fit bounds
  const allPoints = [
    [result.startCoords.lat, result.startCoords.lng],
    [result.endCoords.lat, result.endCoords.lng],
    ...result.stopObjects.map(s => [s.lat, s.lng])
  ];
  map.fitBounds(L.latLngBounds(allPoints), { padding: [60, 60] });
}

function addLine(from, to, color, weight, dash) {
  const l = L.polyline([from, to], {
    color, weight, opacity: 0.9, dashArray: dash, lineCap: 'round'
  }).addTo(map);
  routeLayers.push(l);
}

function addStopDot(lat, lng, mode, name) {
  const m = L.circleMarker([lat, lng], {
    radius: 7,
    fillColor: mode === 'metro' ? '#2563EB' : '#EA580C',
    color: '#fff', weight: 2, fillOpacity: 1
  }).bindTooltip(name, { direction: 'top', className: 'stop-tooltip' }).addTo(map);
  routeLayers.push(m);
}

// ─── RESULTS PANEL ───────────────────────────────────────────
function showResults(result) {
  // Summary bar
  document.getElementById('totalTimeNum').textContent = Math.round(result.totalTime);
  document.getElementById('totalDist').textContent = result.transitDistance.toFixed(1) + ' km';
  document.getElementById('stopCount').textContent = result.path.length + ' stops';

  // Steps
  let html = '';

  // Walk to first stop
  html += stepCard('walk',
    `Walk to ${result.walkStart.stop.name}`,
    `${metersStr(result.walkStart.dist)} · ${Math.round(result.walkStart.time)} min`);

  // Group consecutive same-mode legs
  const grouped = groupLegs(result.path, result.modes, result.stopObjects);
  grouped.forEach(g => {
    html += stepCard(g.mode,
      `${g.from.name} → ${g.to.name}`,
      `${g.stops} stop${g.stops !== 1 ? 's' : ''} · ${Math.round(g.time)} min · ${g.line || ''}`);
  });

  // Walk to destination
  html += stepCard('walk',
    `Walk to destination`,
    `${metersStr(result.walkEnd.dist)} · ${Math.round(result.walkEnd.time)} min`);

  document.getElementById('stepsContainer').innerHTML = html;
  document.getElementById('resultsPanel').style.display = 'flex';
}

function groupLegs(path, modes, stopObjects) {
  const groups = [];
  let i = 0;
  while (i < modes.length) {
    const mode = modes[i];
    const fromStop = stopObjects[i];
    let j = i;
    let time = 0;
    while (j < modes.length && modes[j] === mode) {
      const a = stopObjects[j], b = stopObjects[j + 1];
      time += (haversine(a.lat, a.lng, b.lat, b.lng) / SPEEDS[mode]) * 60;
      j++;
    }
    const toStop = stopObjects[j];
    const line = fromStop.line === 'Interchange' || toStop.line === 'Interchange'
      ? '' : (fromStop.line ? fromStop.line + ' Line' : '');
    groups.push({ mode, from: fromStop, to: toStop, stops: j - i, time, line });
    i = j;
  }
  return groups;
}

function stepCard(mode, title, detail) {
  const cfg = {
    metro: { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: '🚇', label: 'METRO' },
    bus:   { color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA', icon: '🚌', label: 'BUS'   },
    walk:  { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', icon: '🚶', label: 'WALK'  }
  };
  const c = cfg[mode];
  return `
    <div class="step-card" style="border-left:3px solid ${c.color}">
      <div class="step-icon-wrap" style="background:${c.bg};color:${c.color}">${c.icon}</div>
      <div class="step-text">
        <div class="step-title">${title}</div>
        <div class="step-detail">${detail}</div>
      </div>
      <span class="step-badge" style="background:${c.bg};color:${c.color};border:1px solid ${c.border}">${c.label}</span>
    </div>`;
}

function metersStr(km) {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

// ─── ERROR ───────────────────────────────────────────────────
function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.style.display = 'block';
}

function hideError() {
  document.getElementById('errorMsg').style.display = 'none';
}
