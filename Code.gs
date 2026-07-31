/**
 * ============================================================
 *  GOOGLE APPS SCRIPT BACKEND — Form → Google Sheet
 * ============================================================
 *  Sheet columns (row 1 headers), based on the uploaded Excel file:
 *    A: Timestamp        (auto-added by this script)
 *    B: SR NO             (auto-incremented by this script)
 *    C: NAME
 *    D: CADRE
 *    E: BO CODE
 *    F: MOBILE NO
 *    G: Email id
 *    H: DATE OF BIRTH
 *
 *  DEPLOYMENT: Extensions > Apps Script in your Google Sheet,
 *  paste this file as Code.gs, then Deploy > New deployment >
 *  Web app. See the Deployment Steps section of the writeup
 *  for full instructions.
 * ============================================================
 */

// ---- CONFIGURATION -------------------------------------------------
// Change SHEET_NAME if your tab is named differently.
const SHEET_NAME = 'Sheet1';

// The exact column order written to the sheet.
// Edit this array (and the HTML form) if columns are added/removed later —
// nothing else in this script needs to change.
const COLUMNS = [
  'Timestamp',
  'SR NO',
  'NAME',
  'CADRE',
  'BO CODE',
  'MOBILE NO',
  'Email id',
  'DATE OF BIRTH'
];

// Simple duplicate-prevention window (seconds). A submission with an
// identical payload from the same source within this window is rejected.
const DUPLICATE_WINDOW_SECONDS = 30;

// ---------------------------------------------------------------------

/**
 * Handles GET requests — used only as a health check / to verify the
 * deployment URL is reachable. The form itself uses POST.
 */
function doGet(e) {
  return jsonResponse({
    status: 'ok',
    message: 'Form backend is running. Submit data via POST.'
  });
}

/**
 * Handles POST requests from the HTML form.
 * Expects a JSON body (sent as text/plain to avoid CORS preflight — see
 * the front-end fetch() call) with keys matching COLUMNS (minus
 * Timestamp/SR NO, which this script fills in automatically).
 */
function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    // Prevent two simultaneous submissions from writing to the same row.
    lock.waitLock(10000);

    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: 'No data received.' });
    }

    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      logError('JSON parse error', parseErr, e.postData.contents);
      return jsonResponse({ success: false, error: 'Invalid JSON payload.' });
    }

    // --- Server-side validation (never trust the client alone) -------
    const validationError = validateSubmission(data);
    if (validationError) {
      return jsonResponse({ success: false, error: validationError });
    }

    // --- Duplicate submission check -----------------------------------
    if (isDuplicateSubmission(data)) {
      return jsonResponse({
        success: false,
        error: 'This looks like a duplicate submission. Please wait a moment before resubmitting.'
      });
    }

    // --- Write to sheet --------------------------------------------------
    const sheet = getSheet();
    const nextSerial = getNextSerialNumber(sheet);
    const timestamp = new Date();

    const row = [
      timestamp,
      nextSerial,
      data.name || '',
      data.cadre || '',
      data.boCode || '',
      formatPhoneForSheet(data.mobile),
      data.email || '',
      data.dob || ''
    ];

    sheet.appendRow(row);
    recordSubmissionFingerprint(data);

    return jsonResponse({
      success: true,
      message: 'Submission recorded successfully.',
      srNo: nextSerial
    });

  } catch (err) {
    logError('doPost error', err, e && e.postData ? e.postData.contents : '');
    return jsonResponse({
      success: false,
      error: 'Server error while saving your submission. Please try again.'
    });
  } finally {
    lock.releaseLock();
  }
}

// ---- Helpers ----------------------------------------------------------

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  ensureHeaderRow(sheet);
  return sheet;
}

/** Writes the header row if the sheet is empty (first-run convenience). */
function ensureHeaderRow(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS);
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

/** SR NO auto-increments based on existing rows (header row excluded). */
function getNextSerialNumber(sheet) {
  const lastRow = sheet.getLastRow();
  return lastRow <= 1 ? 1 : lastRow; // header is row 1, so row count = serial count + 1
}

/**
 * Validates required fields, email format, phone format, and date format.
 * Returns an error string, or null if valid.
 */
function validateSubmission(data) {
  if (!data.name || String(data.name).trim() === '') {
    return 'Name is required.';
  }
  if (!data.cadre || String(data.cadre).trim() === '') {
    return 'Cadre is required.';
  }
  if (!data.boCode || String(data.boCode).trim() === '') {
    return 'BO Code is required.';
  }
  if (!data.mobile || !/^[0-9]{10}$/.test(String(data.mobile).replace(/\D/g, ''))) {
    return 'A valid 10-digit mobile number is required.';
  }
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return 'A valid email address is required.';
  }
  if (!data.dob || !/^\d{4}-\d{2}-\d{2}$/.test(data.dob)) {
    return 'Date of birth must be a valid date.';
  }
  const dobDate = new Date(data.dob);
  if (isNaN(dobDate.getTime()) || dobDate > new Date()) {
    return 'Date of birth must be a valid past date.';
  }
  return null;
}

function formatPhoneForSheet(mobile) {
  // Keep as text (prefixed) so Sheets doesn't strip a leading 0 or treat it as a number.
  return String(mobile).replace(/\D/g, '');
}

/**
 * Duplicate prevention: hashes the submission and checks the
 * ScriptCache for a matching fingerprint within the time window.
 */
function isDuplicateSubmission(data) {
  const cache = CacheService.getScriptCache();
  const fingerprint = buildFingerprint(data);
  return cache.get(fingerprint) !== null;
}

function recordSubmissionFingerprint(data) {
  const cache = CacheService.getScriptCache();
  const fingerprint = buildFingerprint(data);
  cache.put(fingerprint, '1', DUPLICATE_WINDOW_SECONDS);
}

function buildFingerprint(data) {
  const raw = [data.name, data.cadre, data.boCode, data.mobile, data.email, data.dob].join('|');
  return 'sub_' + Utilities.base64Encode(
    Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, raw)
  );
}

/** Central error logger — writes to an "ErrorLog" sheet so failures are visible. */
function logError(context, err, payload) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName('ErrorLog');
    if (!logSheet) {
      logSheet = ss.insertSheet('ErrorLog');
      logSheet.appendRow(['Timestamp', 'Context', 'Error', 'Payload']);
      logSheet.getRange(1, 1, 1, 4).setFontWeight('bold');
    }
    logSheet.appendRow([new Date(), context, String(err), payload || '']);
  } catch (loggingErr) {
    // If logging itself fails, fall back to the built-in Stackdriver logger.
    console.error('Failed to log error:', loggingErr);
  }
}

/** Wraps a JS object as a JSON text output (Apps Script web apps can't set custom CORS headers,
 *  so the front end uses a "simple request" — see script.js for details). */
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
