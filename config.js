/* ============================================================
   FireOps — Config
   NFIRS codes (Hebrew), apparatus types, stations, roles
   ============================================================ */

const CONFIG = {

  // קודי NFIRS מותאמים לעברית — כל אירוע מקבל code + name + severity ברירת מחדל
  INCIDENT_TYPES: [
    { code: 111, name_he: 'שריפת מבנה',            name_en: 'Building Fire',       severity: 1 },
    { code: 112, name_he: 'שריפת מבנה (לא בניין)',  name_en: 'Structure Fire',      severity: 2 },
    { code: 130, name_he: 'שריפת רכב',             name_en: 'Vehicle Fire',        severity: 3 },
    { code: 140, name_he: 'שריפת חורש / שטח פתוח',   name_en: 'Wildland Fire',       severity: 2 },
    { code: 311, name_he: 'הצלת חיים / עזרה רפואית', name_en: 'Medical Assist',      severity: 2 },
    { code: 320, name_he: 'תאונת דרכים עם פצועים',   name_en: 'MVA with Injury',     severity: 2 },
    { code: 351, name_he: 'חילוץ ממעלית',           name_en: 'Elevator Rescue',     severity: 4 },
    { code: 352, name_he: 'חילוץ מהריסות',           name_en: 'Building Collapse',   severity: 1 },
    { code: 411, name_he: 'דליפת גז',                name_en: 'Gas Leak',            severity: 2 },
    { code: 412, name_he: 'דליפת חומ"ס',             name_en: 'Hazmat Spill',        severity: 1 },
    { code: 611, name_he: 'אזעקת שווא',              name_en: 'False Alarm',         severity: 4 },
    { code: 700, name_he: 'אחר',                     name_en: 'Other',               severity: 4 }
  ],

  // סוגי רכבים — לכל סוג איוש מינימלי
  APPARATUS_TYPES: [
    { key: 'engine',   name_he: 'כבאית',        min_staffing: 4, callsign_prefix: 'כב' },
    { key: 'ladder',   name_he: 'סולם',          min_staffing: 3, callsign_prefix: 'סול' },
    { key: 'rescue',   name_he: 'רכב חילוץ',     min_staffing: 2, callsign_prefix: 'חיל' },
    { key: 'command',  name_he: 'רכב פיקוד',     min_staffing: 2, callsign_prefix: 'פיק' },
    { key: 'tanker',   name_he: 'מכלית מים',     min_staffing: 2, callsign_prefix: 'מכ' },
    { key: 'hazmat',   name_he: 'רכב חומ"ס',     min_staffing: 3, callsign_prefix: 'חמס' },
    { key: 'brush',    name_he: 'רכב יער',        min_staffing: 2, callsign_prefix: 'יער' },
    { key: 'utility',  name_he: 'רכב לוגיסטיקה', min_staffing: 1, callsign_prefix: 'לוג' }
  ],

  // משמרות
  SHIFT_PATTERNS: [
    { key: '24_48',  name_he: 'משמרת 24/48',  hours: 24 },
    { key: 'day',    name_he: 'משמרת יום',     hours: 12, start: '07:00', end: '19:00' },
    { key: 'night',  name_he: 'משמרת לילה',    hours: 12, start: '19:00', end: '07:00' },
    { key: 'office', name_he: 'משמרת משרד',    hours:  8, start: '08:00', end: '16:00' }
  ],

  // תפקידים / רמות הרשאה (מהנמוך לגבוה)
  ROLES: {
    viewer:            { name_he: 'צופה',         level: 1 },
    firefighter:       { name_he: 'כבאי',          level: 2 },
    volunteer:         { name_he: 'מתנדב',         level: 2 },
    shift_officer:     { name_he: 'קצין משמרת',    level: 3 },
    dispatcher:        { name_he: 'מוקדן',         level: 4 },
    equipment_manager: { name_he: 'מנהל ציוד',     level: 4 },
    station_chief:     { name_he: 'מפקד תחנה',     level: 5 }
  },

  // בסיסי טייסות כיבוי אווירי (Air Tactical Group)
  AIRBASES: [
    { id: 'megiddo', name: 'בסיס מגידו', squadron: 'טייסת 24 "הצופים"', lat: 32.5953, lng: 35.2358, aircraft_count: 14 }
  ],

  // סוגי מטוסי כיבוי
  AIRCRAFT_TYPES: [
    { key: 'at802',   name_he: 'AT-802F "אווירון"',    icon: '✈️', capacity_l: 800,  speed_kmh: 250 },
    { key: 'bell412', name_he: 'מסוק Bell 412',        icon: '🚁', capacity_l: 1200, speed_kmh: 220 },
    { key: 'cl415',   name_he: 'CL-415 Super Scooper', icon: '✈️', capacity_l: 6100, speed_kmh: 360 }
  ],

  // תחנות ברירת מחדל (יישמרו ב-LocalStorage ב-init אם לא קיימות)
  DEFAULT_STATIONS: [
    { id: 'haifa-central',  name: 'חיפה — מרכז',   region: 'חיפה',     lat: 32.8190, lng: 34.9885 },
    { id: 'haifa-krayot',   name: 'חיפה — קריות',  region: 'חיפה',     lat: 32.8295, lng: 35.0820 },
    { id: 'nesher',         name: 'נשר',          region: 'חיפה',     lat: 32.7700, lng: 35.0411 },
    { id: 'akko',           name: 'עכו',          region: 'גליל',     lat: 32.9281, lng: 35.0820 }
  ],

  // Run Cards — שילובי (סוג אירוע × רמת alarm) → רשימת units. ברירות מחדל בסיסיות.
  // ניתן להרחיב לכל תחנה בנפרד דרך Settings בעתיד
  DEFAULT_RUN_CARDS: {
    '111_1': ['engine', 'engine', 'ladder', 'command'],
    '111_2': ['engine', 'engine', 'engine', 'ladder', 'tanker', 'command'],
    '111_3': ['engine', 'engine', 'engine', 'engine', 'ladder', 'ladder', 'tanker', 'rescue', 'command'],
    '130_3': ['engine'],
    '140_2': ['brush', 'tanker', 'engine'],
    '320_2': ['rescue', 'engine'],
    '351_4': ['rescue'],
    '411_2': ['engine', 'hazmat'],
    '412_1': ['hazmat', 'engine', 'engine', 'command']
  },

  // צבעי חומרה (לתצוגה)
  SEVERITY_COLORS: {
    1: '#FF2E2E', // קריטי
    2: '#FF4500', // חמור
    3: '#FFD23F', // בינוני
    4: '#00D4FF', // נמוך
    5: '#8A93A6'  // מינורי
  },

  // הגדרות סנכרון
  STORAGE_KEY: 'fireOpsState_v1',
  SETTINGS_KEY: 'fireOpsSettings_v1',
  AUTH_KEY: 'fireOpsAuth_v1',
  SYNC_DEBOUNCE_MS: 800
};

// helper — מחזיר תפקיד לפי key
CONFIG.getRole = function(key) {
  return this.ROLES[key] || this.ROLES.viewer;
};

// helper — בודק הרשאה מינימלית
CONFIG.canAccess = function(userRole, requiredLevel) {
  const role = this.getRole(userRole);
  return role.level >= requiredLevel;
};

// helper — מחזיר סוג אירוע לפי code
CONFIG.getIncidentType = function(code) {
  return this.INCIDENT_TYPES.find(t => t.code === code) || this.INCIDENT_TYPES[0];
};

// helper — מחזיר סוג רכב לפי key
CONFIG.getApparatusType = function(key) {
  return this.APPARATUS_TYPES.find(t => t.key === key) || this.APPARATUS_TYPES[0];
};
