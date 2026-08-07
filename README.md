# Annual Fee Register

A small web form that saves every submission straight into a Google Sheet in
real time, plus a live register page that lets you view all entries and
export them as an Excel (`.xlsx`) file at any time.

**Fields collected:** Sr Number (auto), Name, Cadre (ASST/HGA/AAO/AO/ADM/DM),
Branch Code, Annual Fees, Payment Date, Paid By (CASH/CHEQUE/ONLINE).

It's built as plain HTML/CSS/JS so it can be hosted for free on **GitHub
Pages**, with **Google Sheets + Apps Script** acting as the free real-time
database/backend (no server to run, no hosting bill).

```
fee-collector/
├── index.html        ← the entry form
├── admin.html         ← live register + "Export as .xlsx" button
├── assets/
│   ├── style.css
│   ├── script.js       ← form submit logic
│   ├── admin.js        ← register/table + export logic
│   └── config.js        ← paste your Apps Script URL here
└── Code.gs             ← paste this into the Apps Script editor
```

---

## 1. Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new,
   blank spreadsheet. Name it something like **Annual Fee Register**.
2. That's it — you don't need to add headers or a tab manually, the script
   creates a **Register** sheet/tab and header row automatically the first
   time it runs.

## 2. Add the Apps Script backend

1. In the spreadsheet, go to **Extensions → Apps Script**.
2. Delete anything in the default `Code.gs` editor and paste in the full
   contents of this project's `Code.gs` file.
3. Click **Save** (the disk icon), then **Deploy → New deployment**.
4. Next to "Select type", click the gear icon and choose **Web app**.
5. Fill in the deployment settings:
   - **Execute as:** *Me (your account)*
   - **Who has access:** *Anyone*
   - (This makes the endpoint public so your form can reach it. It does not
     expose your Google account or the sheet itself — only the specific
     data the script chooses to return.)
6. Click **Deploy**, authorize the script when prompted (click through the
   "Google hasn't verified this app" screen — that's expected for your own
   scripts), and copy the **Web app URL** it gives you. It looks like:
   `https://script.google.com/macros/s/AKfycb.../exec`

Keep this tab open — you'll need the URL in the next step.

> **Updating the script later?** Use **Deploy → Manage deployments → Edit
> (pencil) → New version → Deploy**, rather than creating a brand-new
> deployment, so your URL stays the same.

## 3. Point the website at your sheet

Open `assets/config.js` and replace the placeholder with the Web app URL
you just copied:

```js
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycb.../exec";
```

Save the file.

## 4. Put it on GitHub Pages

1. Create a new repository on GitHub (public repos get free Pages hosting;
   private repos need a paid plan for Pages).
2. Upload all the files in this folder (`index.html`, `admin.html`,
   `assets/`), keeping the same structure — or push with git:
   ```bash
   git init
   git add .
   git commit -m "Annual fee register"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
3. In the repository, go to **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a
   branch**, pick the **main** branch and the **/ (root)** folder, then
   **Save**.
5. GitHub will give you a live URL after a minute or two, typically:
   `https://<your-username>.github.io/<your-repo>/`

Share that link with whoever needs to submit entries. `admin.html` (e.g.
`.../admin.html`) is the register/export view — keep that link for office
use only, since it lists every entry.

## 5. Using it day to day

- **Entry form (`index.html`):** fill in the fields and click **Save
  entry**. It's stamped with the next serial number and written to the
  sheet immediately — refresh the Google Sheet and you'll see it appear.
- **Register (`admin.html`):** shows every row live, with a running total
  of entries and fees collected, a search box, and an **Export as .xlsx**
  button that downloads everything currently shown as a spreadsheet file.
- **Direct export:** since the data lives in a normal Google Sheet, you can
  also just open the sheet itself any time and use **File → Download** to
  get `.xlsx`, `.csv`, or `.pdf` directly from Google Sheets.

## Notes & customization

- **Validation:** both the browser form and the Apps Script backend check
  that cadre and paid-by are one of the allowed values, so the sheet can't
  be polluted by a stray direct API call.
- **Concurrent submissions:** the script uses `LockService` so two people
  submitting at the exact same moment still get distinct, correct serial
  numbers.
- **Renaming fields/adding new ones:** add the field to the `<form>` in
  `index.html`, the `payload` object in `assets/script.js`, the `HEADERS`
  array and validation in `Code.gs`, and the table/export columns in
  `admin.html` / `assets/admin.js`.
- **Restricting who can submit:** the web app is intentionally public
  (anonymous) so anyone with the link can add an entry, matching a typical
  "public fee counter" use case. If you'd rather require a Google login,
  redeploy with **Who has access: Anyone within [your org]** — note that
  in that mode, requests must include Google auth, so the plain `fetch()`
  calls here would need to be adapted (ask if you need this).
