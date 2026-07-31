# Staff Registration Form — Deployment & Testing Guide

## 1. Sheet structure (derived from `Form_Data.xlsx`)

Your uploaded file has one sheet with these columns:

| Column | Source header       | Form field type | Required | Notes |
|--------|----------------------|------------------|----------|-------|
| A | Timestamp | — | auto | Added by the script on every submission |
| B | SR NO | — | auto | Auto-incremented by the script (`last row - 1`) |
| C | NAME | text | yes | |
| D | CADRE | text | yes | |
| E | BO CODE | text | yes | |
| F | MOBILE NO | tel | yes | Validated as 10 digits |
| G | Email id | email | yes | Validated with a standard email pattern |
| H | DATE OF BIRTH | date | yes | Must be a valid past date |

The script auto-writes the header row the first time it runs, so you don't need to type headers into the sheet yourself — just make sure the sheet is otherwise empty when you deploy.

**Adding a column later:** add it to the `COLUMNS` array in `Code.gs`, add a matching key to the `row` array in `doPost`, add the field to `index.html`, and add its key/validator to `fields`/`validators` in `script.js`. No other logic needs to change.

---

## 2. Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank spreadsheet.
2. Rename it (e.g. "Staff Registration Data").
3. Rename the first tab to `Sheet1` (or update `SHEET_NAME` in `Code.gs` to match your tab name).
4. Leave the sheet empty — headers are created automatically on first submission.

## 3. Create the Apps Script project

1. In the Sheet, go to **Extensions → Apps Script**.
2. Delete the placeholder `myFunction()` code in `Code.gs`.
3. Paste in the full contents of the provided `Code.gs` file.
4. Click the disk icon (or **Ctrl/Cmd+S**) to save. Name the project (e.g. "Registration Form Backend").

This step also links the script to the Sheet automatically, since it was created from **Extensions → Apps Script**.

## 4. Publish as a Web App

1. In the Apps Script editor, click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in:
   - **Description:** e.g. "v1"
   - **Execute as:** **Me** (your account) — required so the script can write to the sheet regardless of who submits the form.
   - **Who has access:** **Anyone** — required for a public, unauthenticated form.
4. Click **Deploy**.
5. Google will prompt you to **Authorize access**. Choose your account, click **Advanced → Go to (project name)**, then **Allow**. (This warning is expected for personal Apps Script projects — it's your own script.)
6. Copy the **Web app URL** shown (it ends in `/exec`). This is your `SCRIPT_URL`.

**Whenever you edit `Code.gs` after this**, changes won't go live until you create a **new deployment version**: Deploy → Manage deployments → edit (pencil) → New version → Deploy.

## 5. Connect the form to the Web App URL

1. Open `script.js`.
2. Replace the placeholder in this line with the URL you copied:
   ```js
   const SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
   ```
3. Save.

## 6. Host the HTML form

You have a few options for a shareable public URL:

- **GitHub Pages** (free, simple): push `index.html`, `style.css`, and `script.js` to a public repo, enable Pages in the repo settings, and use the generated `https://<username>.github.io/<repo>/` URL.
- **Google Sites**: embed the HTML via an "Embed" block (requires the HTML to be hosted somewhere fetchable, or use Sites' HTML embed for simple cases).
- **Any static host** (Netlify, Vercel, Firebase Hosting, your own server): drag-and-drop or deploy the three files as-is — no build step is required.

Keep all three files (`index.html`, `style.css`, `script.js`) in the same folder, since `index.html` links to the other two by relative path.

---

## 7. Testing checklist

**Validation**
- [ ] Submit with every field empty → each field shows its own error message, submission is blocked.
- [ ] Enter an invalid email (e.g. `abc@`) → email-specific error shown.
- [ ] Enter a mobile number with letters or fewer than 10 digits → mobile-specific error shown.
- [ ] Pick a future date of birth → date-specific error shown.
- [ ] Fix one invalid field and tab away → only that field's error clears.

**Submission flow**
- [ ] Fill all fields correctly and submit → button shows a spinner and "Submitting…", then a success banner with the assigned SR NO.
- [ ] Check the Google Sheet → a new row appears with Timestamp, SR NO, and all submitted values.
- [ ] Confirm SR NO increments correctly on a second submission.
- [ ] Confirm the form fully resets (all fields cleared, valid/invalid styles removed) after success.

**Duplicate prevention**
- [ ] Submit the same data twice in quick succession → second attempt is rejected with a duplicate-submission message (blocked client-side within ~15s, and server-side within ~30s even from a different device/browser).

**Error handling**
- [ ] Temporarily break `SCRIPT_URL` (wrong URL) and submit → a "could not reach the server" error is shown, and the form does not silently fail.
- [ ] Open the Apps Script project → confirm an `ErrorLog` tab is created in the Sheet if a server-side error occurs, capturing the timestamp, context, and payload.

**Cross-device**
- [ ] Test on a desktop browser at full width.
- [ ] Test on a narrow mobile viewport (or resize browser < 520px) → field labels stack above inputs, layout stays usable, no horizontal scrolling.
- [ ] Test on iOS Safari and Android Chrome if possible — date pickers and numeric keyboards (`inputmode="numeric"` on mobile) render natively.

**Access control**
- [ ] Open the form URL in an incognito/private window (logged out of Google) → form loads and submits successfully, confirming "Anyone" access is correctly configured.
