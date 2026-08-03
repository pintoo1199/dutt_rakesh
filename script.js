/* ============================================================
   Staff Registration Form — Front-end logic
   - Client-side validation (required, email, phone, date)
   - Submits to the Google Apps Script Web App as text/plain
     (avoids a CORS preflight, which Apps Script web apps can't
     answer with custom headers)
   - Loading indicator, success/error banners, form reset
   - Basic duplicate-submission guard (disables button + a
     short-lived local fingerprint check) as a first line of
     defense in front of the server-side check in Code.gs
   ============================================================ */

// ---- CONFIGURATION ---------------------------------------------------
// Paste your deployed Apps Script Web App URL here (ends in /exec).
const SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
// -----------------------------------------------------------------------

const form = document.getElementById('registrationForm');
const submitBtn = document.getElementById('submitBtn');
const submitLabel = submitBtn.querySelector('.submit-btn__label');
const submitSpinner = submitBtn.querySelector('.submit-btn__spinner');
const statusBanner = document.getElementById('statusBanner');

const fields = {
  name: document.getElementById('name'),
  cadre: document.getElementById('cadre'),
  boCode: document.getElementById('boCode'),
  mobile: document.getElementById('mobile'),
  email: document.getElementById('email'),
  dob: document.getElementById('dob')
};

const validators = {
  name: (v) => v.trim().length > 0 || 'Name is required.',
  cadre: (v) => v.trim().length > 0 || 'Cadre is required.',
  boCode: (v) => v.trim().length > 0 || 'BO Code is required.',
  mobile: (v) => /^[0-9]{10}$/.test(v.trim()) || 'Enter a valid 10-digit mobile number.',
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Enter a valid email address.',
  dob: (v) => {
    if (!v) return 'Date of birth is required.';
    const date = new Date(v);
    if (isNaN(date.getTime())) return 'Enter a valid date.';
    if (date > new Date()) return 'Date of birth cannot be in the future.';
    return true;
  }
};

// Validate a single field and reflect the result in the UI.
function validateField(key) {
  const input = fields[key];
  const errorEl = form.querySelector(`[data-error-for="${key}"]`);
  const result = validators[key](input.value);

  if (result === true) {
    input.classList.remove('invalid');
    input.classList.add('valid');
    errorEl.textContent = '';
    return true;
  } else {
    input.classList.remove('valid');
    input.classList.add('invalid');
    errorEl.textContent = result;
    return false;
  }
}

// Validate everything; returns true only if all fields pass.
function validateAll() {
  return Object.keys(fields)
    .map(validateField)
    .every(Boolean);
}

// Re-validate on blur so errors clear as the user fixes them.
Object.keys(fields).forEach((key) => {
  fields[key].addEventListener('blur', () => validateField(key));
  fields[key].addEventListener('input', () => {
    if (fields[key].classList.contains('invalid')) validateField(key);
  });
});

function showBanner(type, message) {
  statusBanner.hidden = false;
  statusBanner.className = `status-banner ${type}`;
  statusBanner.textContent = message;
}

function hideBanner() {
  statusBanner.hidden = true;
  statusBanner.textContent = '';
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitSpinner.hidden = !isLoading;
  submitLabel.textContent = isLoading ? 'Submitting…' : 'Submit Entry';
}

// --- Basic client-side duplicate guard --------------------------------
// Stores a fingerprint of the last successful submission in memory
// (page-lifetime only) and blocks an identical resubmission for a
// short window. The authoritative check still happens server-side.
let lastSubmissionFingerprint = null;
let lastSubmissionTime = 0;
const CLIENT_DUPLICATE_WINDOW_MS = 15000;

function buildFingerprint() {
  return Object.keys(fields).map((k) => fields[k].value.trim()).join('|');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideBanner();

  if (!validateAll()) {
    showBanner('error', 'Please fix the highlighted fields before submitting.');
    return;
  }

  const fingerprint = buildFingerprint();
  const now = Date.now();
  if (
    fingerprint === lastSubmissionFingerprint &&
    now - lastSubmissionTime < CLIENT_DUPLICATE_WINDOW_MS
  ) {
    showBanner('error', 'This entry was already submitted moments ago.');
    return;
  }

  const payload = {
    name: fields.name.value.trim(),
    cadre: fields.cadre.value.trim(),
    boCode: fields.boCode.value.trim(),
    mobile: fields.mobile.value.trim(),
    email: fields.email.value.trim(),
    dob: fields.dob.value
  };

  setLoading(true);

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      // text/plain avoids a CORS preflight OPTIONS request, which
      // Apps Script web apps cannot respond to with custom headers.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.success) {
      lastSubmissionFingerprint = fingerprint;
      lastSubmissionTime = now;
      showBanner('success', `Entry recorded successfully (SR NO ${result.srNo}).`);
      form.reset();
      Object.values(fields).forEach((el) => el.classList.remove('valid', 'invalid'));
    } else {
      showBanner('error', result.error || 'Submission failed. Please try again.');
    }
  } catch (err) {
    console.error('Submission error:', err);
    showBanner('error', 'Could not reach the server. Check your connection and try again.');
  } finally {
    setLoading(false);
  }
});
