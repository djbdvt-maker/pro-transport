// ===== LOAD STOPS INTO SIDEBAR =====
async function loadStops() {
  const list = document.getElementById('stopsList');
  try {
    const res = await fetch('/api/stops');
    const stops = await res.json();
    list.innerHTML = '';
    if (stops.length === 0) {
      list.innerHTML = '<li class="stop-loading">No stops yet.</li>';
      return;
    }
    stops.forEach(stop => {
      const li = document.createElement('li');
      li.textContent = stop;
      li.addEventListener('click', () => {
        const startInput = document.getElementById('startInput');
        const endInput = document.getElementById('endInput');
        if (!startInput.value) {
          startInput.value = stop;
        } else if (!endInput.value) {
          endInput.value = stop;
        } else {
          startInput.value = stop;
        }
      });
      list.appendChild(li);
    });
  } catch (err) {
    list.innerHTML = '<li class="stop-loading">Failed to load stops.</li>';
  }
}

// ===== SWAP BUTTON =====
document.getElementById('swapBtn').addEventListener('click', () => {
  const s = document.getElementById('startInput');
  const e = document.getElementById('endInput');
  [s.value, e.value] = [e.value, s.value];
});

// ===== CALCULATE ROUTE =====
document.getElementById('calculateBtn').addEventListener('click', calculateRoute);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') calculateRoute();
});

async function calculateRoute() {
  const start = document.getElementById('startInput').value.trim();
  const end = document.getElementById('endInput').value.trim();
  const btn = document.getElementById('calculateBtn');
  const resultPanel = document.getElementById('resultPanel');
  const errorPanel = document.getElementById('errorPanel');

  resultPanel.style.display = 'none';
  errorPanel.style.display = 'none';

  if (!start || !end) {
    showError('Please enter both a start and destination stop.');
    return;
  }

  btn.classList.add('loading');
  btn.querySelector('.btn-text').textContent = 'Calculating';
  btn.disabled = true;

  try {
    const res = await fetch('/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start, end })
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Something went wrong.');
      return;
    }

    showResult(data);
  } catch (err) {
    showError('Could not connect to the server. Is Flask running?');
  } finally {
    btn.classList.remove('loading');
    btn.querySelector('.btn-text').textContent = 'Calculate Route';
    btn.disabled = false;
  }
}

function showResult(data) {
  const resultPanel = document.getElementById('resultPanel');
  const resultTime = document.getElementById('resultTime');
  const routeSteps = document.getElementById('routeSteps');

  resultTime.textContent = `⏱ ${data.total_time} min total`;
  routeSteps.innerHTML = '';

  // First stop (no transport tag)
  routeSteps.appendChild(makeStep(data.path[0], null, true, false));

  // Middle legs
  data.legs.forEach((leg, i) => {
    routeSteps.appendChild(makeStep(leg.to, leg.mode, false, i === data.legs.length - 1));
  });

  resultPanel.style.display = 'block';
  resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function makeStep(stopName, mode, isStart, isEnd) {
  const div = document.createElement('div');
  div.className = 'route-step';

  const dotClass = isStart || isEnd ? 'start-dot' : (mode || 'metro');
  const dotLabel = isStart ? '●' : (isEnd ? '■' : (mode === 'metro' ? 'M' : 'B'));

  div.innerHTML = `
    <div class="step-dot ${dotClass}">${dotLabel}</div>
    <div class="step-info">
      <div class="step-stop">${stopName}</div>
      ${mode ? `<span class="step-tag ${mode}">${mode.toUpperCase()}</span>` : ''}
    </div>
  `;
  return div;
}

function showError(msg) {
  const errorPanel = document.getElementById('errorPanel');
  document.getElementById('errorMsg').textContent = msg;
  errorPanel.style.display = 'flex';
}

// ===== INIT =====
loadStops();
