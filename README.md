# FireOps 🔥

מערכת ניהול תחנת כיבוי אש ומוקד דיווחים — בעברית, RTL, futuristic UI.

## מה זה

מערכת אזרחית-תפעולית שמשלבת **שני עולמות** שכיום בנויים כמערכות נפרדות:
1. **ניהול תחנה ושגרה** — לוחמי אש, רכבים (apparatus), ציוד, אימונים, משמרות
2. **מוקד דיווחים והזנקה (CAD)** — קליטת דיווחי שריפה, סיווג, הזנקת צוותים, תיעוד אירוע

## Stack

- Vanilla JavaScript · HTML5 · CSS3 (ללא build step)
- Firebase Firestore + LocalStorage (local-first עם debounced sync)
- Leaflet.js + OpenStreetMap (CartoDB Dark Matter tiles)
- PWA (Service Worker)
- Web Audio API (sound effects synthesized in-browser)
- RTL מלא · עברית

## Visual

War-room / command-center aesthetic — Tom Clancy's The Division × Cyberpunk 2077 × EVE Online.
- Glassmorphism panels על רקע שחור-כחלחל עמוק
- Neon accents: אדום-כתום (אש), סיאן (סטטוסים), ירוק/צהוב/אדום (LED)
- Fonts: Orbitron + Rajdhani + JetBrains Mono + Heebo (עברית)
- Pulsing rings, glow, scanning lines, flame flicker

## הרצה מקומית

פתיחת `index.html` בדפדפן ישירות עובד, אבל מומלץ דרך HTTP server (ל-PWA + Service Worker):

```powershell
python -m http.server 8000
# או
npx serve .
```

ואז http://localhost:8000

## מצב נוכחי

**Phase 1 — Foundation** ✅
- Shell עם topbar / sidebar / page container
- Auth (כניסה פשוטה — שם + תפקיד + תחנה)
- 8 דפים (מוקד פעיל, השאר placeholder)
- מסך מוקד תפקודי: מפה + מרקרים pulsing + יחידות + spawn animation עם sound
- LocalStorage persistence
- Multi-station selector
- PWA

**הבאות:**
- Phase 2 — Roster & Apparatus (כבאים ורכבים)
- Phase 3 — Scheduling (משמרות)
- Phase 6 — Dispatch / CAD מלא (incident intake form, Run Cards)
- Phase 7 — Mobile Responder App

ראה גם: `CLAUDE.md` להנחיות פיתוח לסשנים עתידיים.
