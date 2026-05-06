// ===== MODE TOGGLE =====
let selectedMode = 'bus';

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedMode = btn.dataset.mode;
  });
});

// ===== SUBMIT ROUTE =====
document.getElementById('submitBtn').addEventListener('click', submitRoute);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitRoute();
});

async function submitRoute() {
  const from = document.getElementById('addFrom').value.trim();
  const to = document.getElementById('addTo').value.trim();
  const time = document.getElementById('addTime').value.trim();
  const btn = document.getElementById('submitBtn');
  const successPanel = document.getElementById('successPanel');
  const errorPanel = document.getElementById('errorPanel');

  successPanel.style.display = 'none';
  errorPanel.style.display = 'none';

  if (!from || !to || !time) {
    showError('Please fill in all fields.');
    return;
  }

  if (parseInt(time) <= 0) {
    showError('Travel time must be greater than 0.');
    return;
  }

  btn.disabled = true;
  btn.querySelector('.btn-text').textContent = 'Submitting...';

  try {
    const res = await fetch('/api/add-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, time: parseInt(time), mode: selectedMode })
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Something went wrong.');
      return;
    }

    showSuccess(data.message);
    document.getElementById('addFrom').value = '';
    document.getElementById('addTo').value = '';
    document.getElementById('addTime').value = '';

  } catch (err) {
    showError('Could not connect to the server. Is Flask running?');
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-text').textContent = 'Submit Route';
  }
}

function showError(msg) {
  const panel = document.getElementById('errorPanel');
  document.getElementById('errorMsg').textContent = msg;
  panel.style.display = 'flex';
}

function showSuccess(msg) {
  const panel = document.getElementById('successPanel');
  document.getElementById('successMsg').textContent = msg;
  panel.style.display = 'flex';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
