# FireOps — מדריך ארכיטקטורה לסשנים עתידיים

הקובץ הזה נטען לכל סשן Claude Code בפרויקט. תקרא אותו לפני שינויים מהותיים.

## מה הפרויקט

מערכת ניהול תחנת כיבוי אש + מוקד CAD, בעברית, RTL. **פרויקט עצמאי לחלוטין** — אין שום שיתוף קוד / state / Firebase עם projects אחרים של המשתמש (battalion-scheduler, mabat-443-dashboard וכו'). לקחנו רק **השראה ויזואלית** ו-patterns של flow.

## Stack — לא לשבור

- **Vanilla JS + HTML5 + CSS3, ללא build step**. כל ה-deps דרך CDN. אין npm, אין webpack, אין React.
- **State**: object גלובלי `window.FireOpsState` ב-`app.js`. Persistence: LocalStorage כברירת מחדל; Firebase Firestore אופציונלי (כרגע disabled — ראה `firebase-config.js`).
- **Sync**: debounced 800ms (קונסטנט ב-`CONFIG.SYNC_DEBOUNCE_MS`).
- **Maps**: Leaflet + CartoDB Dark Matter tiles (חינמי).
- **Sounds**: Web Audio API — synthesized בקוד (`sounds.js`), אין MP3 files.
- **Auth**: כרגע local בלבד (`localStorage[fireOpsAuth_v1]`). תפקיד נשמר ביחד עם שם.

## מבנה קבצים

```
index.html              ← shell, sidebar, page container, modals, scripts loaded in order
style.css               ← core: topbar, sidebar, panels, buttons, modal, toast
style-dispatch.css      ← dispatch-specific: incident card, unit card, map, leaflet overrides
config.js               ← NFIRS codes (HE), apparatus types, run cards, roles, stations
firebase-config.js      ← stub (disabled). FireOpsFirebase API for future
sounds.js               ← FireOpsSounds: incidentReceived, unitAcknowledge, uiClick, criticalAlert
dispatch.js             ← FireOpsDispatch: map, markers, render, spawn
app.js                  ← FireOpsApp: state, persistence, auth, nav, clock, toast. Boots on DOMContentLoaded.
sw.js                   ← PWA cache (versioned)
manifest.json           ← PWA metadata
```

**סדר טעינת scripts** ב-`index.html`: Leaflet → config → firebase-config → sounds → dispatch → app. אל תשנה — `app.init()` בסוף הוא הטריגר.

## גישות ודפוסים

### Visual identity (אל תפר!)
- רקע: `radial-gradient` שחור-כחלחל עם grid דק של 50px (`body::before`)
- **Glass**: `.glass` class → blur(20px), border עם neon gradient (`::before` pseudo)
- צבעים: `--fire`, `--fire-glow` לprimary; `--cyan` לסטטוסים/דאטה; `--green/--yellow/--red` ל-LED
- Fonts: `--font-display` (Orbitron) לכותרות; `--font-ui` (Rajdhani) לכפתורים/labels; `--font-mono` (JetBrains) לקודים; `--font-body` (Heebo) לעברית
- Animations: pulse-ring על מפה, cardPulse על active incidents, flame flicker על לוגו, slideDown/Right/fadeUp לentry

### Multi-station
- כל entity (incident, unit, firefighter, apparatus) מקבל `station_id`.
- `FireOpsApp.getCurrentStation()` מחזיר את התחנה הפעילה.
- Views אמורות לסנן לפי `currentStation.id` (ראה `getVisibleIncidents` / `getVisibleUnits` ב-dispatch.js).

### Render orchestrator
- `FireOpsDispatch.renderAll()` קורא ל-`renderIncidents` + `renderUnits` + `renderMarkers`.
- אחרי כל שינוי state → קרא `saveState()` (debounced) + render רלוונטי. אל תקרא Firebase ישירות.

### הוספת view חדש
1. Add SVG icon button ב-`<aside class="sidebar">` עם `data-page="<key>"`.
2. Add `<div class="page page-placeholder" id="page-<key>">` בתוך `.page-container`.
3. אם הדף תפקודי: צור `<key>.js` עם `window.FireOps<Key> = (function() { return { init, renderAll }; })();`
4. הוסף `<script src="<key>.js">` לפני `app.js`.
5. ב-`app.js → wireNav` — `if (page === '<key>') FireOps<Key>.init();`

### הוספת סוג אירוע (NFIRS code)
ב-`config.js → INCIDENT_TYPES`: `{ code, name_he, name_en, severity }`.
חוקי run card: `DEFAULT_RUN_CARDS['<code>_<severity>'] = ['engine', ...]`.

### הוספת תחנה
`config.js → DEFAULT_STATIONS` (יישמר ב-LocalStorage ב-init). או דרך UI ב-Phase Settings בעתיד.

## עקרונות שלא לשבור

- **אין build step** — לא להוסיף npm/webpack/vite. אם צריך lib — CDN.
- **אין framework** — לא לעבור ל-React/Vue/Svelte. Vanilla נשאר.
- **אין emojis בקוד אלא אם המשתמש ביקש**. UI כן מותר (אייקונים, הודעות toast).
- **עברית בכל ה-UI**. identifiers בקוד באנגלית.
- **RTL ברירת מחדל**. אל תכתוב `margin-left` — תכתוב `margin-right` או logical properties.
- **Dark mode בלבד** כרגע. אם תוסיף light — לא להפר את ה-vibe.
- **אין secret commits**. firebase-config.js הוא stub עם REPLACE_ME. אם המשתמש מוסיף keys אמיתיים — וודא שהם לא public, או העבר ל-`firebase-config.local.js` (כבר ב-.gitignore).

## Future Phases

Phase 1 (Foundation) ✅ — shell, auth, dispatch view דמו, multi-station, PWA
Phase 2 — Roster & Apparatus (firefighters, apparatus CRUD)
Phase 3 — Scheduling (shifts פשוט, אילוצים בסיסיים)
Phase 4 — Equipment & Daily Checks (PDF, signatures)
Phase 5 — Training Matrix
Phase 6 — Dispatch / CAD מלא (incident intake form, Run Cards engine, timeline)
Phase 7 — Mobile Responder App (Accept/Decline ל-incidents)
Phase 8 — GIS Layers (hydrants, preplans)
Phase 9 — Reports & יומן מבצעי

ראה תוכנית מקורית: `C:\Users\User\.claude\plans\temporal-squishing-globe.md`.
