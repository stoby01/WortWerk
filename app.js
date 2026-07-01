(async function startWortwerk() {
document.body.classList.add("auth-pending");
const FALLBACK_STORAGE_KEY = "wortwerk-data-v4-fallback";
const LEGACY_AUTH_STORAGE_KEY = "wortwerk-local-account-v1";
const AUTH_STORAGE_KEY = "wortwerk-local-accounts-v1";
const AUTH_SESSION_KEY = "wortwerk-local-account-session";
const AUTH_LAST_USER_KEY = "wortwerk-local-account-last-user";
const DEFAULT_USER_DATABASE = "WortwerkDB";
const LEGACY_STORAGE_KEYS = ["wortwerk-data-v3", "wortwerk-data-v2", "wortwerk-data-v1"];
const SCHEMA_VERSION = 5;
const APP_VERSION = "0.6.7";
const PASSWORD_HASH_ITERATIONS = 210000;
const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const SCHEDULER_VERSION = "wortwerk-simple-v1";
const DEFAULT_SETTINGS = {
  newCardsPerDay: 10,
  retentionTarget: 0.9,
  dailyMinutesGoal: 10,
};

let storageMode = "indexeddb";
let activeFallbackStorageKey = FALLBACK_STORAGE_KEY;

const state = {
  decks: [],
  reviewLog: [],
  settings: { ...DEFAULT_SETTINGS },
  activeDeckId: null,
  view: "welcome",
  editingDeckId: null,
  editingCardId: null,
  searchQuery: "",
  sortOrder: "newest",
  cardTagFilter: "",
  cardMetaFilter: "all",
  statsRange: 30,
  undoReview: null,
  trash: [],
  backups: [],
  migrationReport: null,
  validationReport: null,
  lastRepairReport: null,
  importPreview: null,
  cardImageDraft: null,
  storageMode,
  study: null,
  authUser: null,
};

const elements = {
  deckList: document.querySelector("#deckList"),
  deckTotal: document.querySelector("#deckTotal"),
  pageTitle: document.querySelector("#pageTitle"),
  contentArea: document.querySelector("#contentArea"),
  topbarAction: document.querySelector("#topbarAction"),
  newDeckSidebar: document.querySelector("#newDeckSidebar"),
  statisticsNav: document.querySelector("#statisticsNav"),
  securityNav: document.querySelector("#securityNav"),
  deckModal: document.querySelector("#deckModal"),
  cardModal: document.querySelector("#cardModal"),
  deckForm: document.querySelector("#deckForm"),
  cardForm: document.querySelector("#cardForm"),
  deckName: document.querySelector("#deckName"),
  deckDescription: document.querySelector("#deckDescription"),
  cardFront: document.querySelector("#cardFront"),
  cardBack: document.querySelector("#cardBack"),
  cardHint: document.querySelector("#cardHint"),
  cardTags: document.querySelector("#cardTags"),
  cardMarked: document.querySelector("#cardMarked"),
  cardDifficulty: document.querySelector("#cardDifficulty"),
  cardImage: document.querySelector("#cardImage"),
  cardImageAlt: document.querySelector("#cardImageAlt"),
  cardImagePreview: document.querySelector("#cardImagePreview"),
  cardImagePreviewImg: document.querySelector("#cardImagePreviewImg"),
  cardImagePreviewName: document.querySelector("#cardImagePreviewName"),
  cardImagePreviewInfo: document.querySelector("#cardImagePreviewInfo"),
  cardImageRemove: document.querySelector("#cardImageRemove"),
  cardDuplicateWarning: document.querySelector("#cardDuplicateWarning"),
  deckModalEyebrow: document.querySelector("#deckModalEyebrow"),
  deckModalTitle: document.querySelector("#deckModalTitle"),
  deckSubmitButton: document.querySelector("#deckSubmitButton"),
  cardModalEyebrow: document.querySelector("#cardModalEyebrow"),
  cardModalTitle: document.querySelector("#cardModalTitle"),
  cardSubmitButton: document.querySelector("#cardSubmitButton"),
  importFile: document.querySelector("#importFile"),
  importPreviewModal: document.querySelector("#importPreviewModal"),
  importPreviewForm: document.querySelector("#importPreviewForm"),
  importPreviewContent: document.querySelector("#importPreviewContent"),
  importConfirmButton: document.querySelector("#importConfirmButton"),
  toast: document.querySelector("#toast"),
  saveStatus: document.querySelector("#saveStatus"),
  saveStatusText: document.querySelector("#saveStatusText"),
  accountSwitch: document.querySelector("#accountSwitch"),
  sidebar: document.querySelector("#sidebar"),
  mobileMenu: document.querySelector("#mobileMenu"),
  mobileBackdrop: document.querySelector("#mobileBackdrop"),
};

let toastTimer;
let saveStatusTimer;

function fallbackStorageKeyFor(account) {
  if (!account || account.databaseName === DEFAULT_USER_DATABASE) return FALLBACK_STORAGE_KEY;
  return `${FALLBACK_STORAGE_KEY}-${account.id}`;
}

function emptyStoredData() {
  return { decks: [], reviewLog: [], settings: { ...DEFAULT_SETTINGS } };
}

function loadLegacyData(account) {
  const fallbackKey = fallbackStorageKeyFor(account);
  try {
    if (!account || account.databaseName === DEFAULT_USER_DATABASE) {
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        const legacy = localStorage.getItem(legacyKey);
        if (legacy) return { data: JSON.parse(legacy), sourceKey: legacyKey };
      }
    }

    const fallback = localStorage.getItem(fallbackKey);
    if (fallback) return { data: JSON.parse(fallback), sourceKey: fallbackKey };
  } catch {
    return { data: null, sourceKey: "beschädigter Browser-Speicher" };
  }

  return {
    data: emptyStoredData(),
    sourceKey: "leere Sammlung",
  };
}

function normalizeData(rawData) {
  const source = rawData?.data ?? rawData;
  const rawDecks = Array.isArray(source) ? source : source?.decks;
  const rawReviewLog = Array.isArray(source?.reviewLog) ? source.reviewLog : [];

  return {
    decks: Array.isArray(rawDecks) ? rawDecks.map(normalizeDeck).filter(Boolean) : [],
    reviewLog: rawReviewLog.filter((entry) => entry && typeof entry === "object"),
    settings: normalizeSettings(source?.settings),
  };
}

function normalizeSettings(settings) {
  const source = settings && typeof settings === "object" ? settings : {};
  const allowedNewCards = [5, 10, 20, 30];
  const retentionTarget = numberOr(source.retentionTarget, DEFAULT_SETTINGS.retentionTarget);
  const dailyMinutesGoal = clamp(Math.round(numberOr(source.dailyMinutesGoal, 10)), 5, 60);

  return {
    newCardsPerDay: allowedNewCards.includes(Number(source.newCardsPerDay))
      ? Number(source.newCardsPerDay)
      : DEFAULT_SETTINGS.newCardsPerDay,
    retentionTarget: [0.85, 0.9, 0.93].includes(retentionTarget)
      ? retentionTarget
      : DEFAULT_SETTINGS.retentionTarget,
    dailyMinutesGoal,
  };
}

function normalizeDeck(deck) {
  if (!deck || typeof deck !== "object") return null;

  const createdAt = validDateString(deck.createdAt) ? deck.createdAt : new Date().toISOString();
  return {
    id: typeof deck.id === "string" && deck.id ? deck.id : createId(),
    name: typeof deck.name === "string" && deck.name.trim() ? deck.name.trim() : "Unbenannter Stapel",
    description: typeof deck.description === "string" ? deck.description : "",
    createdAt,
    updatedAt: validDateString(deck.updatedAt) ? deck.updatedAt : createdAt,
    cards: Array.isArray(deck.cards) ? deck.cards.map(normalizeCard).filter(Boolean) : [],
  };
}

function normalizeCard(card) {
  if (!card || typeof card !== "object") return null;

  const createdAt = validDateString(card.createdAt) ? card.createdAt : new Date().toISOString();
  const learning = card.learning && typeof card.learning === "object" ? card.learning : {};

  return {
    id: typeof card.id === "string" && card.id ? card.id : createId(),
    front: typeof card.front === "string" ? card.front : "",
    back: typeof card.back === "string" ? card.back : "",
    hint: typeof card.hint === "string" ? card.hint : "",
    tags: normalizeTags(card.tags),
    marked: card.marked === true,
    difficulty: ["auto", "easy", "medium", "hard"].includes(card.difficulty)
      ? card.difficulty
      : "auto",
    image: normalizeCardImage(card.image),
    createdAt,
    updatedAt: validDateString(card.updatedAt) ? card.updatedAt : createdAt,
    learning: {
      status: ["new", "learning", "review"].includes(learning.status) ? learning.status : "new",
      dueAt: validDateString(learning.dueAt) ? learning.dueAt : createdAt,
      intervalDays: numberOr(learning.intervalDays, 0),
      ease: clamp(numberOr(learning.ease, 2.5), 1.3, 3.2),
      reviewCount: Math.max(0, numberOr(learning.reviewCount, 0)),
      lapseCount: Math.max(0, numberOr(learning.lapseCount, 0)),
      lastReviewedAt: validDateString(learning.lastReviewedAt) ? learning.lastReviewedAt : null,
    },
  };
}

function normalizeTags(value) {
  const rawTags = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,;]/) : [];
  const unique = new Map();
  rawTags.forEach((tag) => {
    const cleaned = String(tag ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
    if (!cleaned) return;
    const key = cleaned.toLocaleLowerCase("de");
    if (!unique.has(key)) unique.set(key, cleaned);
  });
  return [...unique.values()].slice(0, 20);
}

function normalizeCardImage(image) {
  if (!image) return null;
  const source = typeof image === "string" ? { dataUrl: image } : image;
  if (
    typeof source.dataUrl !== "string" ||
    !/^data:image\/(?:jpeg|png|webp|gif);base64,/i.test(source.dataUrl)
  ) {
    return null;
  }
  return {
    dataUrl: source.dataUrl,
    mimeType: SUPPORTED_IMAGE_TYPES.includes(source.mimeType) ? source.mimeType : "image/webp",
    width: Math.max(0, Math.round(numberOr(source.width, 0))),
    height: Math.max(0, Math.round(numberOr(source.height, 0))),
    originalName: typeof source.originalName === "string" ? source.originalName.slice(0, 120) : "Kartenbild",
    alt: typeof source.alt === "string" ? source.alt.slice(0, 120) : "",
  };
}

function currentData() {
  return {
    decks: state.decks,
    reviewLog: state.reviewLog,
    settings: state.settings,
  };
}

async function saveData() {
  setSaveStatus("saving");

  try {
    if (state.storageMode === "indexeddb") {
      await window.WortwerkStorage.persistData(currentData(), SCHEMA_VERSION);
    } else {
      localStorage.setItem(
        activeFallbackStorageKey,
        JSON.stringify({ schemaVersion: SCHEMA_VERSION, ...currentData() }),
      );
    }
    clearTimeout(saveStatusTimer);
    saveStatusTimer = setTimeout(() => setSaveStatus("saved"), 220);
    return true;
  } catch {
    setSaveStatus("error");
    showToast("Speichern fehlgeschlagen. Bitte erstelle vorsichtshalber eine Sicherung.", "error");
    return false;
  }
}

async function loadAccountData(account) {
  activeFallbackStorageKey = fallbackStorageKeyFor(account);
  const legacyResult = loadLegacyData(account);
  const fallbackData = {
    ...normalizeData(legacyResult.data),
    sourceKey: legacyResult.sourceKey,
  };

  let nextStorageMode = "indexeddb";
  let storageResult;

  try {
    storageResult = await window.WortwerkStorage.initialize(
      fallbackData,
      SCHEMA_VERSION,
      account.databaseName,
    );
  } catch (error) {
    nextStorageMode = "localstorage-fallback";
    storageResult = {
      data: fallbackData,
      trash: [],
      backups: [],
      migrationReport: {
        performed: false,
        source: legacyResult.sourceKey,
        error: String(error),
      },
      database: null,
    };
  }

  const loadedData = normalizeData(storageResult.data);
  storageMode = nextStorageMode;
  state.decks = loadedData.decks;
  state.reviewLog = loadedData.reviewLog;
  state.settings = loadedData.settings;
  state.activeDeckId = null;
  state.view = "welcome";
  state.editingDeckId = null;
  state.editingCardId = null;
  state.searchQuery = "";
  state.sortOrder = "newest";
  state.cardTagFilter = "";
  state.cardMetaFilter = "all";
  state.statsRange = 30;
  state.undoReview = null;
  state.trash = storageResult.trash.sort((a, b) => Date.parse(b.deletedAt) - Date.parse(a.deletedAt));
  state.backups = storageResult.backups.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  state.migrationReport = storageResult.migrationReport;
  state.validationReport = null;
  state.lastRepairReport = null;
  state.importPreview = null;
  state.cardImageDraft = null;
  state.storageMode = nextStorageMode;
  state.study = null;
}

function setSaveStatus(status) {
  elements.saveStatus.className = `save-status ${status}`;
  const messages = {
    saving: "Speichert …",
    saved: "Lokal gespeichert",
    error: "Speichern fehlgeschlagen",
  };
  elements.saveStatusText.textContent = messages[status] ?? "Lokal bereit";
}

function createId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function validDateString(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function numberOr(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  const temp = document.createElement("div");
  temp.textContent = String(value ?? "");
  return temp.innerHTML;
}

function icon(name) {
  const paths = {
    add: '<path d="M12 5v14M5 12h14" />',
    back: '<path d="m15 18-6-6 6-6" />',
    calendar:
      '<rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" />',
    database:
      '<ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />',
    cards:
      '<path d="M5.5 6.5h11a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" /><path d="m8 6.5.5-2h10a2 2 0 0 1 2 2v8l-2 .5" />',
    chart:
      '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />',
    check: '<path d="m5 12 4 4L19 6" />',
    clock: '<circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />',
    download: '<path d="M12 3v12m0 0 5-5m-5 5-5-5M5 19h14" />',
    edit: '<path d="m4 16-.7 4 4-.7L18.5 8.1a2.1 2.1 0 0 0-3-3L4 16Z" /><path d="m13.8 6.2 4 4" />',
    flip: '<path d="M4 7h12a4 4 0 0 1 4 4v1" /><path d="m7 4-3 3 3 3M20 17H8a4 4 0 0 1-4-4v-1" /><path d="m17 20 3-3-3-3" />',
    hint: '<path d="M9 18h6M10 22h4M8.4 14.5A6 6 0 1 1 15.6 14.5c-.9.7-1.6 1.6-1.6 2.5h-4c0-.9-.7-1.8-1.6-2.5Z" />',
    import: '<path d="M12 21V9m0 0 5 5m-5-5-5 5M5 5h14" />',
    learn: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11a3 3 0 0 1 3 3v15a3 3 0 0 0-3-3H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" /><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H14v18a3 3 0 0 1 3-3h.5a2.5 2.5 0 0 1 2.5 2.5v-15Z" />',
    key: '<path d="M15 7a4 4 0 1 0 2.8 6.8L21 17v3h-3l-2-2h-2v-2l-1.2-1.2A4 4 0 0 0 15 7Z" /><circle cx="15" cy="11" r="1" />',
    lock:
      '<rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />',
    logout: '<path d="M10 17 15 12l-5-5M15 12H3" /><path d="M14 4h4a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-4" />',
    next: '<path d="m9 18 6-6-6-6" />',
    search: '<circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />',
    settings:
      '<circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />',
    shuffle: '<path d="M4 7h3c4 0 6 10 10 10h3" /><path d="m17 14 3 3-3 3M4 17h3c1.5 0 2.7-1.4 3.8-3M14 7c1-1.2 2-2 3-2h3" /><path d="m17 2 3 3-3 3" />',
    trash:
      '<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />',
    target:
      '<circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" />',
    trend: '<path d="m3 17 6-6 4 4 8-9" /><path d="M15 6h6v6" />',
    restore: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" />',
    shield:
      '<path d="M12 3 4.5 6v5.5c0 4.7 3.1 8 7.5 9.5 4.4-1.5 7.5-4.8 7.5-9.5V6L12 3Z" /><path d="m9 12 2 2 4-5" />',
    undo: '<path d="M9 7 4 12l5 5" /><path d="M4 12h9a6 6 0 0 1 6 6" />',
    upload: '<path d="M12 16V4m0 0 5 5m-5-5-5 5M5 20h14" />',
    user: '<circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" />',
    warning:
      '<path d="M10.3 3.7 2.5 18a2 2 0 0 0 1.8 3h15.4a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" />',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] ?? paths.cards}</svg>`;
}

function authIsSupported() {
  return Boolean(globalThis.crypto?.subtle && globalThis.crypto?.getRandomValues && globalThis.TextEncoder);
}

function normalizeAuthRecord(record, index = 0) {
  if (
    typeof record?.username !== "string" ||
    typeof record?.salt !== "string" ||
    typeof record?.hash !== "string"
  ) {
    return null;
  }

  const id =
    typeof record.id === "string" && record.id
      ? record.id
      : index === 0
        ? "default-user"
        : createId();

  return {
    id,
    username: record.username.trim() || "Benutzer",
    salt: record.salt,
    hash: record.hash,
    iterations: Number(record.iterations) || PASSWORD_HASH_ITERATIONS,
    databaseName:
      typeof record.databaseName === "string" && record.databaseName
        ? record.databaseName
        : index === 0
          ? DEFAULT_USER_DATABASE
          : userDatabaseName(id),
    createdAt: validDateString(record.createdAt) ? record.createdAt : null,
    updatedAt: validDateString(record.updatedAt) ? record.updatedAt : null,
  };
}

function userDatabaseName(userId) {
  return `WortwerkDB_${String(userId).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function readAuthAccounts() {
  try {
    const rawAccounts = localStorage.getItem(AUTH_STORAGE_KEY);
    if (rawAccounts) {
      const parsed = JSON.parse(rawAccounts);
      const source = Array.isArray(parsed) ? parsed : parsed?.accounts;
      if (Array.isArray(source)) {
        const accounts = source.map(normalizeAuthRecord).filter(Boolean);
        if (accounts.length) return accounts;
      }
    }

    const legacyRawRecord = localStorage.getItem(LEGACY_AUTH_STORAGE_KEY);
    if (!legacyRawRecord) return [];
    const legacyRecord = normalizeAuthRecord(JSON.parse(legacyRawRecord), 0);
    if (!legacyRecord) return [];
    const accounts = [legacyRecord];
    writeAuthAccounts(accounts);
    return accounts;
  } catch {
    return [];
  }
}

function writeAuthAccounts(accounts) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ version: 1, accounts }));
}

function readAuthRecord(userId = state.authUser?.id) {
  const accounts = readAuthAccounts();
  if (userId) return accounts.find((account) => account.id === userId) ?? null;
  const lastUserId = readLastUserId();
  return accounts.find((account) => account.id === lastUserId) ?? accounts[0] ?? null;
}

function upsertAuthRecord(record) {
  const accounts = readAuthAccounts();
  const index = accounts.findIndex((account) => account.id === record.id);
  if (index >= 0) accounts[index] = record;
  else accounts.push(record);
  writeAuthAccounts(accounts);
  return record;
}

function readLastUserId() {
  try {
    return localStorage.getItem(AUTH_LAST_USER_KEY);
  } catch {
    return null;
  }
}

function rememberLastUser(record) {
  try {
    localStorage.setItem(AUTH_LAST_USER_KEY, record.id);
  } catch {
    // Ohne localStorage wird beim naechsten Start der erste lokale Benutzer vorgeschlagen.
  }
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function createPasswordSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes);
}

async function hashPassword(password, salt, iterations = PASSWORD_HASH_ITERATIONS) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: base64ToBytes(salt),
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

function constantTimeEqual(first, second) {
  if (typeof first !== "string" || typeof second !== "string" || first.length !== second.length) {
    return false;
  }
  let mismatch = 0;
  for (let index = 0; index < first.length; index += 1) {
    mismatch |= first.charCodeAt(index) ^ second.charCodeAt(index);
  }
  return mismatch === 0;
}

async function verifyPassword(password, record) {
  if (!record) return false;
  const candidateHash = await hashPassword(password, record.salt, record.iterations);
  return constantTimeEqual(candidateHash, record.hash);
}

function sessionKeyFor(record) {
  return `${record.id}:${record.hash}`;
}

function authSessionIsValid(record) {
  try {
    if (!record) return false;
    const key = sessionKeyFor(record);
    return localStorage.getItem(AUTH_SESSION_KEY) === key || sessionStorage.getItem(AUTH_SESSION_KEY) === key;
  } catch {
    return false;
  }
}

function rememberAuthSession(record) {
  try {
    localStorage.setItem(AUTH_SESSION_KEY, sessionKeyFor(record));
    sessionStorage.removeItem(AUTH_SESSION_KEY);
  } catch {
    // Ohne lokalen Speicher muss beim Neuladen erneut angemeldet werden.
  }
}

function clearAuthSession() {
  try {
    localStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
  } catch {
    // Ignorieren: Die App kann trotzdem wieder gesperrt werden.
  }
}

function setAuthStatus(message, type = "error") {
  const status = document.querySelector("#authStatus");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("error", type === "error");
  status.classList.toggle("success", type === "success");
  status.hidden = !message;
}

function authButtonLabel(mode) {
  if (mode === "setup") return "Konto anlegen";
  if (mode === "change") return "Passwort ändern";
  return "Anmelden";
}

function renderAuthOverlay(mode = "login", message = "", selectedUserId = readLastUserId()) {
  document.querySelector("#authOverlay")?.remove();
  const accounts = readAuthAccounts();
  const record =
    mode === "change"
      ? readAuthRecord()
      : accounts.find((account) => account.id === selectedUserId) ?? accounts[0] ?? null;
  const overlay = document.createElement("section");
  overlay.className = "auth-overlay";
  overlay.id = "authOverlay";
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("role", "dialog");

  const isSetup = mode === "setup";
  const isChange = mode === "change";
  const disabled = !authIsSupported();
  const title = isSetup ? "Lokales Konto anlegen" : isChange ? "Passwort ändern" : "Anmelden";
  const subtitle = isSetup
    ? "Wähle einen Benutzernamen und ein Passwort für diese installierte Wortwerk-App."
    : isChange
      ? `Du änderst das Passwort für ${escapeHtml(record?.username ?? "dein lokales Konto")}.`
      : `Willkommen zurück${record?.username ? `, ${escapeHtml(record.username)}` : ""}.`;

  overlay.innerHTML = `
    <form class="auth-card" id="authForm" data-auth-mode="${mode}">
      <div class="auth-brand">
        <span class="auth-brand-mark">${icon("lock")}</span>
        <div>
          <span class="eyebrow">Wortwerk Konto</span>
          <h2>${title}</h2>
        </div>
      </div>
      <p class="auth-copy">${subtitle}</p>

      ${
        disabled
          ? `<div class="auth-status error">Dieser Browser unterstützt Web Crypto nicht. Die lokale Kontosperre kann hier nicht sicher gestartet werden.</div>`
          : ""
      }

      ${
        isChange
          ? ""
          : `<label class="field">
              <span>Benutzername</span>
              <input
                name="username"
                type="text"
                maxlength="40"
                autocomplete="username"
                value="${escapeHtml(record?.username ?? "")}"
                ${record && !isSetup ? "readonly" : ""}
                required
              />
            </label>`
      }

      ${
        isChange
          ? `<label class="field">
              <span>Aktuelles Passwort</span>
              <input name="currentPassword" type="password" autocomplete="current-password" required />
            </label>`
          : ""
      }

      <label class="field">
        <span>${isChange || isSetup ? "Neues Passwort" : "Passwort"}</span>
        <input
          name="password"
          type="password"
          minlength="${isSetup || isChange ? 8 : 1}"
          autocomplete="${isSetup || isChange ? "new-password" : "current-password"}"
          required
        />
      </label>

      ${
        isSetup || isChange
          ? `<label class="field">
              <span>Passwort wiederholen</span>
              <input name="confirmPassword" type="password" minlength="8" autocomplete="new-password" required />
            </label>`
          : ""
      }

      <div class="auth-note">
        ${icon("shield")}
        <p>Das Konto gilt nur auf diesem Gerät und in diesem Browser. Für echte Online-Konten braucht Wortwerk später ein Backend.</p>
      </div>

      <div class="auth-status ${message ? "error" : ""}" id="authStatus" ${message ? "" : "hidden"}>${escapeHtml(message)}</div>

      <div class="auth-actions">
        ${
          isChange
            ? `<button class="button button-ghost" data-auth-cancel type="button">Abbrechen</button>`
            : ""
        }
        <button class="button button-primary" type="submit" ${disabled ? "disabled" : ""}>
          ${icon(isSetup ? "user" : isChange ? "key" : "lock")} ${authButtonLabel(mode)}
        </button>
      </div>
    </form>
  `;

  document.body.append(overlay);
  if (isSetup) {
    const heading = overlay.querySelector("h2");
    const copy = overlay.querySelector(".auth-copy");
    if (heading) heading.textContent = "Lokales Konto anlegen";
    if (copy) copy.textContent = "Lege ein neues lokales Profil mit eigener Lernsammlung an.";
  } else if (!isChange) {
    const heading = overlay.querySelector("h2");
    const copy = overlay.querySelector(".auth-copy");
    if (heading) heading.textContent = "Benutzer wechseln";
    if (copy) copy.textContent = "Waehle einen Benutzer und gib das passende Passwort ein.";
  }

  if (isSetup) {
    const usernameInput = overlay.querySelector('input[name="username"]');
    if (usernameInput) usernameInput.value = "";
  }

  if (!isSetup && !isChange && accounts.length) {
    const usernameField = overlay.querySelector('input[name="username"]')?.closest(".field");
    if (usernameField) {
      usernameField.outerHTML = `
        <label class="field">
          <span>Benutzer</span>
          <select name="userId" autocomplete="username" required>
            ${accounts
              .map(
                (account) => `
                  <option value="${escapeHtml(account.id)}" ${account.id === record?.id ? "selected" : ""}>
                    ${escapeHtml(account.username)}
                  </option>
                `,
              )
              .join("")}
          </select>
        </label>
      `;
    }

    const actions = overlay.querySelector(".auth-actions");
    actions?.insertAdjacentHTML(
      "afterbegin",
      `<button class="button button-ghost" data-auth-create type="button">${icon("add")} Neues Konto</button>`,
    );
  }

  const firstInput = overlay.querySelector("select, input");
  window.setTimeout(() => firstInput?.focus(), 60);

  overlay.querySelector("#authForm").addEventListener("submit", handleAuthSubmit);
  overlay.querySelector("[data-auth-cancel]")?.addEventListener("click", () => overlay.remove());
  overlay.querySelector("[data-auth-create]")?.addEventListener("click", () => renderAuthOverlay("setup"));
}

function unlockApp(record) {
  state.authUser = {
    id: record.id,
    username: record.username,
    databaseName: record.databaseName,
    createdAt: record.createdAt,
  };
  rememberLastUser(record);
  document.body.classList.remove("auth-pending");
  document.body.classList.add("auth-ready");
  document.querySelector("#authOverlay")?.remove();
  renderAccountChip();
}

async function finishAccountActivation(record, message = "") {
  await loadAccountData(record);
  rememberAuthSession(record);
  unlockApp(record);
  const resolver = pendingAuthResolve;
  pendingAuthResolve = null;
  resolver?.();
  if (!resolver) {
    await saveData();
    render();
  }
  if (message) showToast(message);
}

async function createAuthRecord(username, password, existingAccounts = readAuthAccounts(), existingRecord = null) {
  const now = new Date().toISOString();
  const salt = createPasswordSalt();
  const id = existingRecord?.id ?? createId();
  return {
    id,
    username: username.trim().slice(0, 40),
    salt,
    hash: await hashPassword(password, salt),
    iterations: PASSWORD_HASH_ITERATIONS,
    databaseName:
      existingRecord?.databaseName ?? (existingAccounts.length ? userDatabaseName(id) : DEFAULT_USER_DATABASE),
    createdAt: existingRecord?.createdAt ?? now,
    updatedAt: now,
  };
}

function validateNewPassword(password, confirmPassword) {
  if (password.length < 8) {
    throw new Error("Das Passwort muss mindestens 8 Zeichen lang sein.");
  }
  if (password !== confirmPassword) {
    throw new Error("Die beiden Passwörter stimmen nicht überein.");
  }
}

let pendingAuthResolve = null;
let appReadyDispatched = false;

function dispatchAppReadyOnce() {
  if (appReadyDispatched) return;
  appReadyDispatched = true;
  window.dispatchEvent(new CustomEvent("wortwerk:ready"));
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);
  const mode = form.dataset.authMode;
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  submitButton.disabled = true;
  setAuthStatus("Wird geprüft ...", "success");

  try {
    if (mode === "setup") {
      if (username.length < 2) throw new Error("Der Benutzername muss mindestens 2 Zeichen lang sein.");
      validateNewPassword(password, confirmPassword);
      const accounts = readAuthAccounts();
      if (accounts.some((account) => account.username.toLocaleLowerCase("de") === username.toLocaleLowerCase("de"))) {
        throw new Error("Diesen Benutzernamen gibt es bereits.");
      }
      const record = await createAuthRecord(username, password, accounts);
      upsertAuthRecord(record);
      await finishAccountActivation(record, "Lokales Konto wurde angelegt.");
      return;
    }

    const selectedUserId = String(formData.get("userId") ?? "");
    const record = mode === "change" ? readAuthRecord() : readAuthRecord(selectedUserId);
    if (!record) {
      renderAuthOverlay("setup", "Es wurde noch kein lokales Konto gefunden.");
      return;
    }

    if (mode === "change") {
      const currentPassword = String(formData.get("currentPassword") ?? "");
      validateNewPassword(password, confirmPassword);
      if (!(await verifyPassword(currentPassword, record))) {
        throw new Error("Das aktuelle Passwort ist nicht korrekt.");
      }
      const updatedRecord = await createAuthRecord(record.username, password, readAuthAccounts(), record);
      upsertAuthRecord(updatedRecord);
      rememberAuthSession(updatedRecord);
      unlockApp(updatedRecord);
      if (state.view === "security") renderSecurity();
      showToast("Passwort wurde geändert.");
      return;
    }

    if (!(await verifyPassword(password, record))) {
      throw new Error("Benutzername oder Passwort ist nicht korrekt.");
    }
    await finishAccountActivation(record, "Angemeldet.");
  } catch (error) {
    setAuthStatus(error.message || "Anmeldung fehlgeschlagen.");
  } finally {
    submitButton.disabled = false;
  }
}

function initializeAccountGate() {
  const accounts = readAuthAccounts();
  const sessionAccount = accounts.find((account) => authSessionIsValid(account));
  if (sessionAccount) {
    return finishAccountActivation(sessionAccount);
  }

  const record = readAuthRecord();
  if (!accounts.length) {
    renderAuthOverlay("setup");
  } else {
    renderAuthOverlay("login", "", record?.id);
  }

  dispatchAppReadyOnce();
  return new Promise((resolve) => {
    pendingAuthResolve = resolve;
  });
}

function openUserSwitch() {
  renderAuthOverlay("login", "", state.authUser?.id ?? readLastUserId());
}

function lockApp() {
  clearAuthSession();
  state.study = null;
  closeDialog(elements.deckModal);
  closeDialog(elements.cardModal);
  closeDialog(elements.importPreviewModal);
  document.body.classList.add("auth-pending");
  document.body.classList.remove("auth-ready");
  renderAuthOverlay("login", "", state.authUser?.id ?? readLastUserId());
}

function openPasswordChange() {
  renderAuthOverlay("change");
}

function renderAccountChip() {
  if (!elements.accountSwitch) return;
  const username = state.authUser?.username ?? "Benutzer";
  elements.accountSwitch.innerHTML = `${icon("user")}<span><small>Eingeloggt als</small><strong>${escapeHtml(username)}</strong></span>`;
}

function setTopbarAction(label, action, iconName) {
  elements.topbarAction.dataset.action = action;
  elements.topbarAction.innerHTML = `${icon(iconName)}<span>${escapeHtml(label)}</span>`;
}

function getActiveDeck() {
  return state.decks.find((deck) => deck.id === state.activeDeckId);
}

function render() {
  renderAccountChip();
  renderDeckNavigation();
  elements.statisticsNav.classList.toggle("active", state.view === "statistics");
  elements.securityNav.classList.toggle("active", state.view === "security");

  if (state.view === "security") {
    renderSecurity();
    return;
  }

  if (state.view === "statistics") {
    renderStatistics();
    return;
  }

  if (state.view === "study" && state.study) {
    renderStudy();
    return;
  }

  const activeDeck = getActiveDeck();
  if (activeDeck && state.view === "deck") {
    renderDeck(activeDeck);
  } else {
    renderWelcome();
  }
}

function renderDeckNavigation() {
  elements.deckTotal.textContent = state.decks.length;
  elements.deckList.innerHTML = state.decks
    .map((deck) => {
      const stats = getDeckStats(deck);
      return `
        <button
          class="deck-nav-item ${deck.id === state.activeDeckId && state.view !== "statistics" ? "active" : ""}"
          type="button"
          data-deck-id="${deck.id}"
        >
          <span class="deck-nav-icon">${icon("cards")}</span>
          <span class="deck-nav-copy">
            <span class="deck-nav-name">${escapeHtml(deck.name)}</span>
            <span class="deck-nav-count">
              ${deck.cards.length} ${deck.cards.length === 1 ? "Karte" : "Karten"}
              ${stats.sessionDue ? ` · ${stats.sessionDue} fällig` : ""}
            </span>
          </span>
          <span class="deck-nav-chevron">${icon("next")}</span>
        </button>
      `;
    })
    .join("");
}

function renderWelcome() {
  state.view = "welcome";
  elements.pageTitle.textContent = "Willkommen bei Wortwerk";
  setTopbarAction("Stapel erstellen", "create-deck", "add");

  const dueTotal = state.decks.reduce((total, deck) => total + getDeckStats(deck).sessionDue, 0);
  const cardTotal = state.decks.reduce((total, deck) => total + deck.cards.length, 0);

  elements.contentArea.innerHTML = `
    <div class="welcome-layout">
      <section class="welcome-card">
        <div class="welcome-card-content">
          <span class="welcome-kicker">✦ Jeden Tag ein bisschen</span>
          <h2>Wörter, die<br />bei dir bleiben.</h2>
          <p>
            Lerne mit aktivem Erinnern und passenden Abständen – ruhig,
            übersichtlich und in deinem Tempo.
          </p>
          <button class="button" data-action="${state.decks.length ? "open-first-deck" : "create-deck"}" type="button">
            ${icon(state.decks.length ? "learn" : "add")}
            ${state.decks.length ? "Sammlung öffnen" : "Ersten Stapel erstellen"}
          </button>
        </div>
      </section>

      <section class="how-it-works">
        <span class="eyebrow">Dein Überblick</span>
        <h3>${state.decks.length ? "Bereit für die nächste Runde" : "Dein Lernmaterial an einem Ort"}</h3>
        <div class="steps">
          <div class="step">
            <span class="step-number">${state.decks.length}</span>
            <div><strong>Stapel</strong><p>Nach Sprache, Thema oder Kurs sortiert.</p></div>
          </div>
          <div class="step">
            <span class="step-number">${cardTotal}</span>
            <div><strong>Karten</strong><p>Klassisch mit Vorder- und Rückseite.</p></div>
          </div>
          <div class="step">
            <span class="step-number">${dueTotal}</span>
            <div><strong>Jetzt fällig</strong><p>Wortwerk plant die nächsten Wiederholungen für dich.</p></div>
          </div>
        </div>
      </section>
    </div>
  `;
}

function getDeckStats(deck) {
  const now = Date.now();
  const newCount = deck.cards.filter((card) => card.learning.status === "new").length;
  const dueReviews = deck.cards.filter(
    (card) => card.learning.status !== "new" && Date.parse(card.learning.dueAt) <= now,
  ).length;
  const learned = deck.cards.filter((card) => card.learning.status === "review").length;

  return {
    newCount,
    dueReviews,
    learned,
    sessionDue: dueReviews + Math.min(newCount, state.settings.newCardsPerDay),
  };
}

function renderDeck(deck) {
  elements.pageTitle.textContent = deck.name;
  setTopbarAction("Karte hinzufügen", "create-card", "add");

  const stats = getDeckStats(deck);
  const description = deck.description
    ? escapeHtml(deck.description)
    : "Dieser Stapel hat noch keine Beschreibung.";

  elements.contentArea.innerHTML = `
    <section class="deck-overview">
      <div class="deck-hero">
        <div>
          <span class="eyebrow">Stapelübersicht</span>
          <p class="deck-description">${description}</p>
        </div>
        <div class="deck-primary-actions">
          <button
            class="button button-primary"
            data-action="start-study"
            type="button"
            ${stats.sessionDue === 0 ? "disabled" : ""}
          >
            ${icon("learn")}
            ${stats.sessionDue ? `${stats.sessionDue} fällige lernen` : "Heute alles geschafft"}
          </button>
          <button class="button button-secondary" data-action="start-practice" type="button" ${deck.cards.length ? "" : "disabled"}>
            ${icon("shuffle")} Frei üben
          </button>
        </div>
      </div>

      <div class="stats-grid">
        <article class="stat-card">
          <span class="stat-card-label">Jetzt fällig</span>
          <strong>${stats.sessionDue}</strong>
          <small>inklusive bis zu ${state.settings.newCardsPerDay} neuer Karten</small>
        </article>
        <article class="stat-card">
          <span class="stat-card-label">Noch neu</span>
          <strong>${stats.newCount}</strong>
          <small>noch ohne Lernbewertung</small>
        </article>
        <article class="stat-card">
          <span class="stat-card-label">Im Langzeitlernen</span>
          <strong>${stats.learned}</strong>
          <small>mit geplantem Wiederholungstermin</small>
        </article>
      </div>

      <div class="management-bar">
        <div class="management-group">
          <button class="button button-compact button-secondary" data-action="edit-deck" type="button">
            ${icon("edit")} Stapel bearbeiten
          </button>
          <button class="button button-compact button-danger-ghost" data-action="delete-deck" type="button">
            ${icon("trash")} Stapel löschen
          </button>
        </div>
        <div class="management-group">
          <button class="button button-compact button-secondary" data-action="export-csv" type="button">
            ${icon("download")} CSV
          </button>
          <button class="button button-compact button-secondary" data-action="export-json" type="button">
            ${icon("download")} Sicherung
          </button>
          <button class="button button-compact button-secondary" data-action="import" type="button">
            ${icon("upload")} Import
          </button>
        </div>
      </div>

      ${
        deck.cards.length
          ? renderCardManagement(deck)
          : `
            <div class="empty-cards">
              <div>
                <span class="empty-cards-icon">${icon("cards")}</span>
                <h2>Noch keine Karten</h2>
                <p>Füge deine erste klassische Vorder-/Rückseitenkarte hinzu.</p>
                <button class="button button-primary" data-action="create-card" type="button">
                  ${icon("add")} Erste Karte hinzufügen
                </button>
              </div>
            </div>
          `
      }
    </section>
  `;
}

function renderCardManagement(deck) {
  const tags = [...new Set(deck.cards.flatMap((card) => card.tags))]
    .sort((a, b) => a.localeCompare(b, "de"));
  return `
    <div class="cards-toolbar">
      <label class="search-field">
        ${icon("search")}
        <input id="cardSearch" type="search" placeholder="Karten durchsuchen …" value="${escapeHtml(state.searchQuery)}" />
      </label>
      <div class="card-filter-group">
        <label class="sort-field">
          <span>Tag</span>
          <select id="cardTagFilter">
            <option value="">Alle Tags</option>
            ${tags
              .map(
                (tag) =>
                  `<option value="${escapeHtml(tag)}" ${state.cardTagFilter === tag ? "selected" : ""}>${escapeHtml(tag)}</option>`,
              )
              .join("")}
          </select>
        </label>
        <label class="sort-field">
          <span>Auswahl</span>
          <select id="cardMetaFilter">
            <option value="all" ${state.cardMetaFilter === "all" ? "selected" : ""}>Alle Karten</option>
            <option value="marked" ${state.cardMetaFilter === "marked" ? "selected" : ""}>Nur markierte</option>
            <option value="easy" ${state.cardMetaFilter === "easy" ? "selected" : ""}>Leicht</option>
            <option value="medium" ${state.cardMetaFilter === "medium" ? "selected" : ""}>Mittel</option>
            <option value="hard" ${state.cardMetaFilter === "hard" ? "selected" : ""}>Schwer</option>
            <option value="images" ${state.cardMetaFilter === "images" ? "selected" : ""}>Mit Bild</option>
          </select>
        </label>
        <label class="sort-field">
          <span>Sortieren</span>
        <select id="cardSort">
          <option value="newest" ${state.sortOrder === "newest" ? "selected" : ""}>Neueste zuerst</option>
          <option value="oldest" ${state.sortOrder === "oldest" ? "selected" : ""}>Älteste zuerst</option>
          <option value="front" ${state.sortOrder === "front" ? "selected" : ""}>Vorderseite A–Z</option>
          <option value="back" ${state.sortOrder === "back" ? "selected" : ""}>Rückseite A–Z</option>
          <option value="due" ${state.sortOrder === "due" ? "selected" : ""}>Nächste Wiederholung</option>
          <option value="difficulty" ${state.sortOrder === "difficulty" ? "selected" : ""}>Schwierige zuerst</option>
        </select>
        </label>
      </div>
    </div>
    <div id="cardListHost">${renderCardList(deck)}</div>
  `;
}

function renderCardList(deck) {
  const query = state.searchQuery.trim().toLocaleLowerCase("de");
  const cards = deck.cards.filter((card) => {
    const matchesQuery = [card.front, card.back, card.hint, card.image?.alt, ...card.tags]
      .some((value) => String(value ?? "").toLocaleLowerCase("de").includes(query));
    const matchesTag = !state.cardTagFilter || card.tags.includes(state.cardTagFilter);
    const difficulty = getEffectiveDifficulty(card);
    const matchesMeta =
      state.cardMetaFilter === "all" ||
      (state.cardMetaFilter === "marked" && card.marked) ||
      (state.cardMetaFilter === "images" && card.image) ||
      state.cardMetaFilter === difficulty;
    return matchesQuery && matchesTag && matchesMeta;
  });

  const sorted = [...cards].sort((a, b) => {
    if (state.sortOrder === "oldest") return Date.parse(a.createdAt) - Date.parse(b.createdAt);
    if (state.sortOrder === "front") return a.front.localeCompare(b.front, "de");
    if (state.sortOrder === "back") return a.back.localeCompare(b.back, "de");
    if (state.sortOrder === "due") return Date.parse(a.learning.dueAt) - Date.parse(b.learning.dueAt);
    if (state.sortOrder === "difficulty") {
      const weight = { hard: 3, medium: 2, easy: 1, unknown: 0 };
      return weight[getEffectiveDifficulty(b)] - weight[getEffectiveDifficulty(a)];
    }
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });

  if (!sorted.length) {
    return `<div class="no-results">Keine Karte passt zu deiner Suche.</div>`;
  }

  return `
    <div class="cards-heading">
      <h2>${sorted.length} ${sorted.length === 1 ? "Karte" : "Karten"}</h2>
    </div>
    <div class="cards-table">
      <div class="card-row card-row-header" aria-hidden="true">
        <span>Vorderseite</span><span>Rückseite</span><span>Lernstand</span><span></span>
      </div>
      ${sorted
        .map(
          (card) => {
            const difficulty = getEffectiveDifficulty(card);
            return `
            <article class="card-row difficulty-${difficulty}">
              <div class="vocab-side vocab-front">
                <span class="vocab-label">Vorderseite</span>
                <div class="vocab-front-content">
                  ${
                    card.image
                      ? `<img class="card-thumbnail" src="${card.image.dataUrl}" alt="${escapeHtml(card.image.alt)}" />`
                      : ""
                  }
                  <span class="vocab-text">${escapeHtml(card.front || card.image?.alt || "Bildkarte")}</span>
                </div>
                ${card.hint ? `<small class="card-hint-preview">Denkanstoß: ${escapeHtml(card.hint)}</small>` : ""}
                ${renderTagList(card.tags)}
              </div>
              <div class="vocab-side vocab-back">
                <span class="vocab-label">Rückseite</span>
                <span class="vocab-text">${escapeHtml(card.back)}</span>
              </div>
              <div class="learning-state">
                <div class="card-state-badges">
                  <span class="difficulty-badge ${difficulty}">
                    <i aria-hidden="true"></i>${difficultyLabel(difficulty)}
                  </span>
                  <span class="learning-badge ${card.learning.status}">${learningStatusLabel(card.learning.status)}</span>
                </div>
                <small>${dueLabel(card)}</small>
              </div>
              <div class="row-actions">
                <button
                  class="mark-card ${card.marked ? "active" : ""}"
                  type="button"
                  data-toggle-marked="${card.id}"
                  aria-label="${card.marked ? "Markierung entfernen" : "Karte markieren"}"
                  title="${card.marked ? "Markierung entfernen" : "Markieren"}"
                >${icon("star")}</button>
                <button class="edit-card" type="button" data-edit-card-id="${card.id}" aria-label="Karte bearbeiten" title="Bearbeiten">
                  ${icon("edit")}
                </button>
                <button class="delete-card" type="button" data-delete-card-id="${card.id}" aria-label="Karte ${escapeHtml(card.front)} entfernen" title="Entfernen">
                  ${icon("trash")}
                </button>
              </div>
            </article>
          `;
          },
        )
        .join("")}
    </div>
  `;
}

function renderTagList(tags) {
  if (!tags.length) return "";
  return `<span class="tag-list">${tags
    .map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`)
    .join("")}</span>`;
}

function calculateAutoDifficulty(card) {
  const reviews = state.reviewLog.filter((entry) => entry.cardId === card.id);
  if (reviews.length < 2) return "unknown";

  const incorrect = reviews.filter((entry) => entry.rating === "again").length;
  const hard = reviews.filter((entry) => entry.rating === "hard").length;
  const averageMs =
    reviews.reduce((sum, entry) => sum + Math.max(0, numberOr(entry.responseTimeMs, 0)), 0) /
    reviews.length;
  const score =
    (incorrect / reviews.length) * 2 +
    (hard / reviews.length) +
    (averageMs > 18000 ? 0.65 : averageMs > 10000 ? 0.3 : 0) +
    (card.learning.lapseCount >= 3 ? 0.5 : 0);

  if (score >= 1.25) return "hard";
  if (score >= 0.48) return "medium";
  return "easy";
}

function getEffectiveDifficulty(card) {
  return card.difficulty === "auto" ? calculateAutoDifficulty(card) : card.difficulty;
}

function difficultyLabel(value) {
  return { easy: "Leicht", medium: "Mittel", hard: "Schwer", unknown: "Noch offen" }[value] ?? "Noch offen";
}

function learningStatusLabel(status) {
  return { new: "Neu", learning: "Im Lernen", review: "Gelernt" }[status] ?? "Neu";
}

function dueLabel(card) {
  if (card.learning.status === "new") return "bereit für die erste Runde";

  const difference = Date.parse(card.learning.dueAt) - Date.now();
  if (difference <= 0) return "jetzt fällig";
  if (difference < 60 * 60 * 1000) return `in ${Math.max(1, Math.round(difference / 60000))} Min.`;
  if (difference < 24 * 60 * 60 * 1000) return `in ${Math.max(1, Math.round(difference / 3600000))} Std.`;
  return `in ${Math.max(1, Math.round(difference / 86400000))} Tagen`;
}

function renderStatistics() {
  const stats = calculateStatistics(state.statsRange);
  elements.pageTitle.textContent = "Lernstatistik";
  setTopbarAction("Zur Sammlung", "go-home", "back");

  elements.contentArea.innerHTML = `
    <section class="statistics-view">
      <div class="statistics-hero">
        <div>
          <span class="eyebrow">Heute</span>
          <h2>${
            stats.dueToday
              ? stats.dueToday === 1
                ? "1 Karte ist bereit"
                : `${stats.dueToday} Karten sind bereit`
              : "Für heute ist alles geschafft"
          }</h2>
          <p>
            ${
              stats.dueToday
                ? `Ungefähr ${stats.estimatedMinutes} ${
                    stats.estimatedMinutes === 1 ? "ruhige Minute" : "ruhige Minuten"
                  } – danach übernimmt Wortwerk wieder die Planung.`
                : "Du kannst frei weiterüben oder einfach morgen wiederkommen."
            }
          </p>
        </div>
        <button
          class="button statistics-start-button"
          data-action="start-next-due"
          type="button"
          ${stats.dueToday ? "" : "disabled"}
        >
          ${icon("learn")}
          ${stats.dueToday ? "Nächste Lernrunde starten" : "Heute nichts fällig"}
        </button>
      </div>

      <div class="statistics-toolbar">
        <div>
          <span class="eyebrow">Deine Entwicklung</span>
          <h2>Fortschritt, der verständlich bleibt</h2>
        </div>
        <div class="range-switch" aria-label="Statistikzeitraum">
          ${[7, 30, 90]
            .map(
              (days) => `
                <button
                  class="${state.statsRange === days ? "active" : ""}"
                  data-stats-range="${days}"
                  type="button"
                >${days} Tage</button>
              `,
            )
            .join("")}
        </div>
      </div>

      <div class="statistics-kpis">
        ${statisticsKpi(
          "Erinnert",
          stats.retention === null ? "–" : `${stats.retention}%`,
          `Ziel: ${Math.round(state.settings.retentionTarget * 100)} %`,
          "target",
          stats.retention === null ? 0 : stats.retention,
        )}
        ${statisticsKpi("Wiederholungen", stats.reviewCount, `in ${state.statsRange} Tagen`, "cards")}
        ${statisticsKpi("Aktive Tage", stats.activeDays, `von ${state.statsRange} Tagen`, "calendar")}
        ${statisticsKpi("Antwortzeit", stats.averageSeconds ? `${stats.averageSeconds} Sek.` : "–", "durchschnittlich", "clock")}
      </div>

      <div class="statistics-grid">
        <article class="analytics-card activity-card">
          <div class="analytics-card-header">
            <div>
              <span class="eyebrow">Lernrhythmus</span>
              <h3>Deine letzten ${stats.activity.length} Tage</h3>
            </div>
            <span class="soft-badge">${stats.consistency} von ${stats.activity.length} Tagen</span>
          </div>
          ${renderActivityChart(stats.activity)}
          <p class="analytics-note">Pausen sind Teil des Rhythmus. Entscheidend ist, dass du wiederkommst.</p>
        </article>

        <article class="analytics-card retention-card">
          <span class="eyebrow">Erinnerungsquote</span>
          <div class="retention-visual">
            <div
              class="retention-ring"
              style="--retention: ${stats.retention ?? 0}; --target: ${Math.round(state.settings.retentionTarget * 100)}"
            >
              <strong>${stats.retention === null ? "–" : `${stats.retention}%`}</strong>
              <small>tatsächlich erinnert</small>
            </div>
            <div>
              <h3>${retentionMessage(stats.retention)}</h3>
              <p>${retentionExplanation(stats.retention)}</p>
            </div>
          </div>
        </article>

        <article class="analytics-card forecast-card">
          <div class="analytics-card-header">
            <div>
              <span class="eyebrow">Vorschau</span>
              <h3>Die kommenden sieben Tage</h3>
            </div>
            ${icon("trend")}
          </div>
          ${renderForecast(stats.forecast)}
          <p class="analytics-note">
            Die Vorschau kombiniert bekannte Termine mit deinem Limit für neue Karten.
          </p>
        </article>

        <article class="analytics-card collection-card">
          <span class="eyebrow">Sammlung</span>
          <h3>${stats.totalCards} Karten insgesamt</h3>
          <div class="collection-distribution">
            ${distributionRow("Neu", stats.newCards, stats.totalCards, "new")}
            ${distributionRow("Im Lernen", stats.learningCards, stats.totalCards, "learning")}
            ${distributionRow("Langzeitlernen", stats.learnedCards, stats.totalCards, "review")}
          </div>
        </article>
      </div>

      <article class="analytics-card problem-section">
        <div class="analytics-card-header">
          <div>
            <span class="eyebrow">Braucht Aufmerksamkeit</span>
            <h3>${stats.problemCards.length ? `${stats.problemCards.length} schwierige Karten` : "Keine auffälligen Karten"}</h3>
          </div>
          ${icon(stats.problemCards.length ? "warning" : "check")}
        </div>
        ${renderProblemCards(stats.problemCards)}
      </article>

      <div class="settings-heading">
        <span class="eyebrow">Deine Lernplanung</span>
        <h2>So viel Struktur wie hilfreich ist</h2>
      </div>

      <div class="settings-grid">
        <article class="analytics-card settings-card">
          <div class="settings-title">
            ${icon("target")}
            <div><h3>Lernintensität</h3><p>Beeinflusst die Abstände unseres einfachen Schedulers.</p></div>
          </div>
          <div class="choice-grid retention-choices">
            ${retentionChoice(0.85, "Entspannt", "Weniger Wiederholungen")}
            ${retentionChoice(0.9, "Ausgewogen", "Empfohlener Standard")}
            ${retentionChoice(0.93, "Intensiv", "Kürzere Abstände")}
          </div>
          <p class="settings-footnote">
            Das ist aktuell eine verständliche Lernintensität – noch keine exakt berechnete FSRS-Wahrscheinlichkeit.
          </p>
        </article>

        <article class="analytics-card settings-card">
          <div class="settings-title">
            ${icon("cards")}
            <div><h3>Neue Karten pro Tag</h3><p>Fällige Wiederholungen haben immer Vorrang.</p></div>
          </div>
          <div class="choice-grid compact-choices">
            ${[5, 10, 20, 30]
              .map(
                (amount) => `
                  <button
                    class="${state.settings.newCardsPerDay === amount ? "active" : ""}"
                    data-setting="newCardsPerDay"
                    data-setting-value="${amount}"
                    type="button"
                  ><strong>${amount}</strong><span>pro Tag</span></button>
                `,
              )
              .join("")}
          </div>
          <p class="settings-footnote">${newCardLoadMessage(state.settings.newCardsPerDay)}</p>
        </article>

        <article class="analytics-card settings-card">
          <div class="settings-title">
            ${icon("clock")}
            <div><h3>Tägliches Zeitziel</h3><p>Ein sanfter Rahmen, kein Erfolgszwang.</p></div>
          </div>
          <label class="minutes-slider">
            <input
              id="minutesGoal"
              type="range"
              min="5"
              max="30"
              step="5"
              value="${state.settings.dailyMinutesGoal}"
            />
            <strong>${state.settings.dailyMinutesGoal} Minuten</strong>
          </label>
          <p class="settings-footnote">${timeGoalMessage(stats)}</p>
        </article>
      </div>

      <article class="scheduler-lab">
        <div class="scheduler-lab-copy">
          <span class="eyebrow">Wortwerk-Labor</span>
          <h2>Einfacher Scheduler und FSRS</h2>
          <p>
            Dein aktueller Scheduler bleibt aktiv und nachvollziehbar. Parallel sammelt das
            Wiederholungsprotokoll die Daten, die für einen seriösen FSRS-Vergleich nötig sind.
          </p>
        </div>
        <div class="scheduler-comparison">
          <div class="scheduler-column active">
            <span>Aktiv</span>
            <h3>Wortwerk Simple</h3>
            <p>Klare Regeln, sofort verständlich und vollständig lokal.</p>
            <strong>${stats.reviewCountAll} protokollierte Bewertungen</strong>
          </div>
          <div class="scheduler-arrow">${icon("next")}</div>
          <div class="scheduler-column">
            <span>Vorbereitung</span>
            <h3>FSRS-Schattenmodell</h3>
            <p>
              Noch nicht aktiviert. Für persönliche Parameter sind mehrere hundert echte
              Bewertungen sinnvoll.
            </p>
            <div class="lab-progress"><span style="width:${stats.fsrsReadiness}%"></span></div>
            <strong>${stats.fsrsReadiness}% Datenbasis · ${stats.reviewCountAll}/200 Mindestziel</strong>
          </div>
        </div>
      </article>
    </section>
  `;

  requestAnimationFrame(() => {
    elements.contentArea.querySelectorAll("[data-animate-value]").forEach((item) => {
      item.classList.add("animated");
    });
  });
}

function statisticsKpi(label, value, detail, iconName, progress = null) {
  return `
    <article class="statistics-kpi" data-animate-value>
      <span class="statistics-kpi-icon">${icon(iconName)}</span>
      <div>
        <span>${label}</span>
        <strong>${value}</strong>
        <small>${detail}</small>
      </div>
      ${
        progress === null
          ? ""
          : `<span class="kpi-progress"><span style="width:${clamp(progress, 0, 100)}%"></span></span>`
      }
    </article>
  `;
}

function calculateStatistics(rangeDays) {
  const now = new Date();
  const rangeStart = startOfDay(addDays(now, -(rangeDays - 1))).getTime();
  const allCards = state.decks.flatMap((deck) => deck.cards.map((card) => ({ deck, card })));
  const reviews = state.reviewLog.filter((entry) => Date.parse(entry.reviewedAt) >= rangeStart);
  const passing = reviews.filter((entry) => ["hard", "good", "easy"].includes(entry.rating)).length;
  const retention = reviews.length ? Math.round((passing / reviews.length) * 100) : null;
  const activeDayKeys = new Set(reviews.map((entry) => localDayKey(entry.reviewedAt)));
  const responseTimes = reviews
    .map((entry) => Number(entry.responseTimeMs))
    .filter((value) => Number.isFinite(value) && value > 0 && value < 10 * 60 * 1000);
  const averageSeconds = responseTimes.length
    ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length / 1000)
    : null;
  const dueToday = state.decks.reduce((sum, deck) => sum + getDeckStats(deck).sessionDue, 0);
  const secondsPerCard = clamp(averageSeconds ?? 18, 6, 90);
  const activityLength = Math.min(rangeDays, 30);
  const activity = Array.from({ length: activityLength }, (_, index) => {
    const date = addDays(now, -(activityLength - 1 - index));
    const key = localDayKey(date);
    return {
      key,
      label: date.toLocaleDateString("de-DE", { weekday: "short" }).slice(0, 2),
      count: state.reviewLog.filter((entry) => localDayKey(entry.reviewedAt) === key).length,
    };
  });
  const problemCards = getProblemCards(allCards);

  return {
    dueToday,
    estimatedMinutes: Math.max(1, Math.round((dueToday * secondsPerCard) / 60)),
    retention,
    reviewCount: reviews.length,
    reviewCountAll: state.reviewLog.length,
    activeDays: activeDayKeys.size,
    averageSeconds,
    activity,
    consistency: activity.filter((day) => day.count > 0).length,
    forecast: buildForecast(allCards),
    totalCards: allCards.length,
    newCards: allCards.filter(({ card }) => card.learning.status === "new").length,
    learningCards: allCards.filter(({ card }) => card.learning.status === "learning").length,
    learnedCards: allCards.filter(({ card }) => card.learning.status === "review").length,
    problemCards,
    fsrsReadiness: clamp(Math.round((state.reviewLog.length / 200) * 100), 0, 100),
  };
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function localDayKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildForecast(allCards) {
  let remainingNew = allCards.filter(({ card }) => card.learning.status === "new").length;
  const today = startOfDay(new Date());

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index);
    const nextDate = addDays(date, 1);
    const dueReviews = allCards.filter(({ card }) => {
      if (card.learning.status === "new") return false;
      const due = Date.parse(card.learning.dueAt);
      if (index === 0) return due < nextDate.getTime();
      return due >= date.getTime() && due < nextDate.getTime();
    }).length;
    const plannedNew = Math.min(remainingNew, state.settings.newCardsPerDay);
    remainingNew -= plannedNew;

    return {
      label: index === 0 ? "Heute" : date.toLocaleDateString("de-DE", { weekday: "short" }),
      reviews: dueReviews,
      newCards: plannedNew,
      total: dueReviews + plannedNew,
    };
  });
}

function getProblemCards(allCards) {
  return allCards
    .map(({ deck, card }) => {
      const logs = state.reviewLog.filter((entry) => entry.cardId === card.id);
      const failures = logs.filter((entry) => entry.rating === "again").length;
      const failureRate = logs.length ? failures / logs.length : 0;
      const score = card.learning.lapseCount * 2 + failureRate * 5;
      return { deck, card, logs: logs.length, failures, failureRate, score };
    })
    .filter((item) => item.card.learning.lapseCount >= 2 || (item.logs >= 3 && item.failureRate >= 0.4))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function renderActivityChart(activity) {
  const maximum = Math.max(1, ...activity.map((day) => day.count));
  return `
    <div class="activity-chart">
      ${activity
        .map(
          (day) => `
            <div class="activity-day" title="${day.count} Wiederholungen">
              <span class="activity-bar ${day.count ? "active" : ""}" style="--height:${Math.max(8, (day.count / maximum) * 100)}%"></span>
              <small>${day.label}</small>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderForecast(forecast) {
  const maximum = Math.max(1, ...forecast.map((day) => day.total));
  return `
    <div class="forecast-list">
      ${forecast
        .map(
          (day) => `
            <div class="forecast-row">
              <span>${day.label}</span>
              <span class="forecast-track">
                <span style="width:${(day.total / maximum) * 100}%"></span>
              </span>
              <strong>${day.total}</strong>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function distributionRow(label, value, total, className) {
  const percentage = total ? Math.round((value / total) * 100) : 0;
  return `
    <div class="distribution-row ${className}">
      <span>${label}</span>
      <span class="distribution-track"><span style="width:${percentage}%"></span></span>
      <strong>${value}</strong>
    </div>
  `;
}

function renderProblemCards(problemCards) {
  if (!problemCards.length) {
    return `
      <div class="problem-empty">
        <span>${icon("check")}</span>
        <p>Noch zeigt keine Karte ein dauerhaft schwieriges Muster.</p>
      </div>
    `;
  }

  return `
    <div class="problem-list">
      ${problemCards
        .map(
          ({ deck, card, failures, logs }) => `
            <button
              class="problem-card"
              data-problem-deck="${deck.id}"
              data-problem-card="${card.id}"
              type="button"
            >
              <span><strong>${escapeHtml(card.front)}</strong><small>${escapeHtml(deck.name)}</small></span>
              <span>${failures}× nicht gewusst · ${logs} Bewertungen</span>
              ${icon("next")}
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function retentionChoice(value, title, detail) {
  const active = state.settings.retentionTarget === value;
  return `
    <button
      class="${active ? "active" : ""}"
      data-setting="retentionTarget"
      data-setting-value="${value}"
      type="button"
    >
      <strong>${title}</strong>
      <span>${Math.round(value * 100)} % · ${detail}</span>
    </button>
  `;
}

function retentionMessage(retention) {
  if (retention === null) return "Noch keine Vergleichsdaten";
  const target = state.settings.retentionTarget * 100;
  if (retention >= target + 4) return "Du erinnerst aktuell sehr sicher";
  if (retention >= target - 3) return "Du liegst nah an deinem Ziel";
  return "Einige Karten brauchen kürzere Abstände";
}

function retentionExplanation(retention) {
  if (retention === null) return "Nach den ersten Lernrunden entsteht hier ein belastbareres Bild.";
  const target = Math.round(state.settings.retentionTarget * 100);
  return `Dein aktueller Wert wird mit deinem gewählten Ziel von ${target} % verglichen.`;
}

function newCardLoadMessage(amount) {
  if (amount <= 5) return "Ein ruhiger Einstieg mit gut kontrollierbarer Folgelast.";
  if (amount <= 10) return "Ausgewogen für regelmäßige kurze Lerneinheiten.";
  if (amount <= 20) return "Spürbar mehr neue Wörter und entsprechend mehr Wiederholungen.";
  return "Intensiv: Kann in den nächsten Tagen eine deutliche Wiederholungswelle erzeugen.";
}

function timeGoalMessage(stats) {
  if (!stats.dueToday) return "Heute ist keine geplante Lernzeit nötig.";
  if (stats.estimatedMinutes <= state.settings.dailyMinutesGoal) {
    return `Die heutige Prognose von ${stats.estimatedMinutes} ${
      stats.estimatedMinutes === 1 ? "Minute liegt" : "Minuten liegt"
    } innerhalb deines Ziels.`;
  }
  return `Heute ${
    stats.estimatedMinutes === 1
      ? "wird etwa 1 Minute erwartet"
      : `werden etwa ${stats.estimatedMinutes} Minuten erwartet`
  } – etwas mehr als dein gewählter Rahmen.`;
}

function renderSecurity() {
  const report = state.validationReport ?? validateCurrentData();
  const cardCount = state.decks.reduce((sum, deck) => sum + deck.cards.length, 0);
  const storageIsIndexedDb = state.storageMode === "indexeddb";
  const account = readAuthRecord();
  elements.pageTitle.textContent = "Datensicherheit";
  setTopbarAction("Zur Sammlung", "go-home", "back");

  elements.contentArea.innerHTML = `
    <section class="security-view">
      <div class="security-hero ${storageIsIndexedDb ? "safe" : "warning"}">
        <span class="security-hero-icon">${icon(storageIsIndexedDb ? "shield" : "warning")}</span>
        <div>
          <span class="eyebrow">Lokaler Speicherstatus</span>
          <h2>${storageIsIndexedDb ? "Deine Daten liegen in IndexedDB" : "Fallback-Speicher ist aktiv"}</h2>
          <p>
            ${
              storageIsIndexedDb
                ? "Stapel, Karten, Lernprotokolle, Papierkorb und Sicherungen sind getrennt und transaktional gespeichert."
                : "IndexedDB war nicht verfügbar. Wortwerk speichert vorübergehend weiter in localStorage."
            }
          </p>
        </div>
        <span class="security-status-badge">${storageIsIndexedDb ? "Datenbank aktiv" : "Eingeschränkter Modus"}</span>
      </div>

      <div class="security-summary">
        ${securitySummaryCard("Stapel", state.decks.length, "cards")}
        ${securitySummaryCard("Karten", cardCount, "learn")}
        ${securitySummaryCard("Lernprotokolle", state.reviewLog.length, "chart")}
        ${securitySummaryCard("Im Papierkorb", state.trash.length, "trash")}
        ${securitySummaryCard("Sicherungen", state.backups.length, "restore")}
        ${securitySummaryCard("Konto", account?.username ?? "Lokal", "user")}
      </div>

      <div class="security-actions">
        <button class="button button-primary" data-action="create-local-backup" type="button" ${
          storageIsIndexedDb ? "" : "disabled"
        }>
          ${icon("database")} Sicherung jetzt erstellen
        </button>
        <button class="button button-secondary" data-action="import" type="button">
          ${icon("upload")} Daten importieren
        </button>
        <button class="button button-secondary" data-action="run-data-check" type="button">
          ${icon("check")} Daten prüfen
        </button>
        <button class="button button-secondary" data-action="export-json" type="button">
          ${icon("download")} Externe JSON-Sicherung
        </button>
      </div>

      <div class="security-grid">
        ${renderAccountPanel(account)}

        <article class="security-panel validation-panel">
          <div class="security-panel-header">
            <div>
              <span class="eyebrow">Datenprüfung</span>
              <h3>${report.errors.length ? `${report.errors.length} Probleme gefunden` : "Datenstruktur ist in Ordnung"}</h3>
            </div>
            <span class="validation-mark ${report.errors.length ? "error" : "valid"}">
              ${icon(report.errors.length ? "warning" : "check")}
            </span>
          </div>
          <div class="validation-counts">
            <span><strong>${report.decks}</strong> gültige Stapel</span>
            <span><strong>${report.cards}</strong> gültige Karten</span>
            <span><strong>${report.reviews}</strong> Protokolle</span>
          </div>
          ${renderValidationMessages(report)}
          ${
            report.errors.length || report.warnings.length
              ? `<button class="button button-compact button-secondary repair-button" data-action="repair-data" type="button">${icon("restore")} Sicher reparieren</button>`
              : ""
          }
          ${renderLastRepairReport()}
        </article>

        <article class="security-panel migration-panel">
          <div class="security-panel-header">
            <div>
              <span class="eyebrow">Migration</span>
              <h3>${state.migrationReport?.performed ? "Frühere Daten wurden übernommen" : "Aktueller Datenbankstand"}</h3>
            </div>
            ${icon("database")}
          </div>
          ${renderMigrationReport()}
        </article>
      </div>

      <article class="security-panel">
        <div class="security-panel-header">
          <div>
            <span class="eyebrow">Papierkorb</span>
            <h3>${
              state.trash.length
                ? state.trash.length === 1
                  ? "1 gelöschtes Element"
                  : `${state.trash.length} gelöschte Elemente`
                : "Papierkorb ist leer"
            }</h3>
          </div>
          ${
            state.trash.length
              ? `<button class="button button-compact button-danger-ghost" data-action="empty-trash" type="button">${icon("trash")} Leeren</button>`
              : icon("trash")
          }
        </div>
        ${renderTrashList()}
      </article>

      <article class="security-panel">
        <div class="security-panel-header">
          <div>
            <span class="eyebrow">Lokale Sicherungsstände</span>
            <h3>${
              state.backups.length
                ? state.backups.length === 1
                  ? "1 Wiederherstellungspunkt"
                  : `${state.backups.length} Wiederherstellungspunkte`
                : "Noch keine Sicherung vorhanden"
            }</h3>
          </div>
          ${icon("restore")}
        </div>
        ${renderBackupList()}
      </article>

      <article class="database-map">
        <div>
          <span class="eyebrow">Datenbankstruktur</span>
          <h2>Getrennte Bereiche statt eines großen JSON-Textes</h2>
          <p>
            Änderungen werden als IndexedDB-Transaktion gespeichert. Entweder wird der vollständige
            konsistente Zustand übernommen oder die Transaktion wird verworfen.
          </p>
        </div>
        <div class="database-stores">
          ${["decks", "cards", "reviews", "settings", "trash", "backups", "meta"]
            .map((store) => `<span>${icon("database")} ${store}</span>`)
            .join("")}
        </div>
      </article>
    </section>
  `;
}

function securitySummaryCard(label, value, iconName) {
  return `
    <article class="security-summary-card">
      <span>${icon(iconName)}</span>
      <div><strong>${escapeHtml(value)}</strong><small>${label}</small></div>
    </article>
  `;
}

function renderAccountPanel(account) {
  return `
    <article class="security-panel account-panel">
      <div class="security-panel-header">
        <div>
          <span class="eyebrow">Lokales Konto</span>
          <h3>${account ? escapeHtml(account.username) : "Keine Kontosperre aktiv"}</h3>
        </div>
        ${icon("lock")}
      </div>
      <p class="security-muted">
        Das Passwort schützt den Einstieg in diese Browser-App. Die Daten bleiben lokal gespeichert und werden nicht
        mit GitHub Pages synchronisiert.
      </p>
      ${
        account?.createdAt
          ? `<div class="account-meta">
              <span>${icon("calendar")} Erstellt ${formatRelativeDate(account.createdAt)}</span>
              <span>${icon("key")} PBKDF2 · ${account.iterations.toLocaleString("de-DE")} Runden</span>
            </div>`
          : ""
      }
      <div class="account-actions">
        <button class="button button-secondary button-compact" data-action="change-password" type="button">
          ${icon("key")} Passwort ändern
        </button>
        <button class="button button-danger-ghost button-compact" data-action="logout" type="button">
          ${icon("logout")} Abmelden
        </button>
      </div>
    </article>
  `;
}

function validateCurrentData() {
  const errors = [];
  const warnings = [];
  const deckIds = new Set();
  const cardIds = new Set();

  state.decks.forEach((deck, deckIndex) => {
    if (!deck.id || deckIds.has(deck.id)) errors.push(`Stapel ${deckIndex + 1} besitzt keine eindeutige ID.`);
    deckIds.add(deck.id);
    if (!deck.name?.trim()) errors.push(`Stapel ${deckIndex + 1} hat keinen Namen.`);

    deck.cards.forEach((card, cardIndex) => {
      if (!card.id || cardIds.has(card.id)) {
        errors.push(`Karte ${cardIndex + 1} in „${deck.name}“ besitzt keine eindeutige ID.`);
      }
      cardIds.add(card.id);
      if ((!card.front?.trim() && !card.image) || !card.back?.trim()) {
        errors.push(`Eine Karte in „${deck.name}“ hat eine leere Vorder- oder Rückseite.`);
      }
      if (!Array.isArray(card.tags)) {
        errors.push(`Die Tags von „${card.front || card.image?.alt || "Bildkarte"}“ sind ungültig.`);
      }
      if (!["auto", "easy", "medium", "hard"].includes(card.difficulty)) {
        errors.push(`Die Schwierigkeit von „${card.front || card.image?.alt || "Bildkarte"}“ ist ungültig.`);
      }
      if (!validDateString(card.learning?.dueAt)) {
        errors.push(`Die Fälligkeit von „${card.front || card.image?.alt || "Unbenannte Karte"}“ ist ungültig.`);
      }
    });
  });

  const orphanReviews = state.reviewLog.filter((review) => !cardIds.has(review.cardId));
  if (orphanReviews.length) {
    warnings.push(`${orphanReviews.length} Lernprotokolle verweisen auf nicht mehr vorhandene Karten.`);
  }

  return {
    checkedAt: new Date().toISOString(),
    decks: state.decks.length,
    cards: cardIds.size,
    reviews: state.reviewLog.length,
    errors,
    warnings,
  };
}

function renderValidationMessages(report) {
  if (!report.errors.length && !report.warnings.length) {
    return `<p class="validation-success">${icon("check")} Alle IDs, Pflichtfelder, Termine und Beziehungen wurden geprüft.</p>`;
  }

  return `
    <div class="validation-messages">
      ${report.errors.map((message) => `<p class="error">${icon("warning")}${escapeHtml(message)}</p>`).join("")}
      ${report.warnings.map((message) => `<p class="warning">${icon("warning")}${escapeHtml(message)}</p>`).join("")}
    </div>
  `;
}

function renderLastRepairReport() {
  const repair = state.lastRepairReport;
  if (!repair) return "";
  return `
    <div class="repair-report">
      <strong>Letzte Reparatur</strong>
      <span>${repair.changed} Korrekturen · ${repair.removedReviews} verwaiste Protokolle entfernt</span>
      <small>${formatDateTime(repair.completedAt)} · Sicherung wurde vorher erstellt</small>
    </div>
  `;
}

function renderMigrationReport() {
  const migration = state.migrationReport;
  if (!migration) {
    return `<p class="security-muted">Keine frühere Migration wurde protokolliert.</p>`;
  }

  if (migration.error) {
    return `
      <p class="security-muted">IndexedDB konnte nicht initialisiert werden.</p>
      <p class="migration-error">${escapeHtml(migration.error)}</p>
    `;
  }

  return `
    <dl class="migration-details">
      <div><dt>Quelle</dt><dd>${escapeHtml(migration.source ?? "IndexedDB")}</dd></div>
      <div><dt>Stapel</dt><dd>${migration.decks ?? state.decks.length}</dd></div>
      <div><dt>Karten</dt><dd>${migration.cards ?? state.decks.reduce((sum, deck) => sum + deck.cards.length, 0)}</dd></div>
      <div><dt>Protokolle</dt><dd>${migration.reviews ?? state.reviewLog.length}</dd></div>
      <div><dt>Zeitpunkt</dt><dd>${migration.completedAt ? formatDateTime(migration.completedAt) : "bereits eingerichtet"}</dd></div>
    </dl>
    <p class="security-muted">Der alte localStorage-Eintrag wurde als Rückfallsicherung nicht gelöscht.</p>
  `;
}

function renderTrashList() {
  if (!state.trash.length) {
    return `<div class="security-empty">${icon("trash")} Gelöschte Stapel und Karten können hier später wiederhergestellt werden.</div>`;
  }

  return `
    <div class="safety-list">
      ${state.trash
        .map(
          (entry) => `
            <div class="safety-row">
              <span class="safety-row-icon">${icon(entry.kind === "deck" ? "cards" : "learn")}</span>
              <div>
                <strong>${escapeHtml(entry.label)}</strong>
                <small>${entry.kind === "deck" ? "Stapel" : "Karte"} · gelöscht ${formatRelativeDate(entry.deletedAt)}</small>
              </div>
              <div class="safety-row-actions">
                <button class="button button-compact button-secondary" data-restore-trash="${entry.id}" type="button">
                  ${icon("restore")} Wiederherstellen
                </button>
                <button class="icon-button permanent-delete" data-delete-trash="${entry.id}" type="button" aria-label="Endgültig löschen">
                  ${icon("trash")}
                </button>
              </div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderBackupList() {
  if (!state.backups.length) {
    return `<div class="security-empty">${icon("restore")} Wortwerk erstellt automatisch höchstens eine Tagessicherung.</div>`;
  }

  return `
    <div class="safety-list">
      ${state.backups
        .map(
          (backup) => `
            <div class="safety-row">
              <span class="safety-row-icon">${icon("database")}</span>
              <div>
                <strong>${escapeHtml(backup.reason)}</strong>
                <small>
                  ${formatDateTime(backup.createdAt)} · ${backup.summary?.decks ?? 0} Stapel ·
                  ${backup.summary?.cards ?? 0} Karten
                </small>
              </div>
              <div class="safety-row-actions">
                <button class="button button-compact button-secondary" data-restore-backup="${backup.id}" type="button">
                  ${icon("restore")} Wiederherstellen
                </button>
                <button class="icon-button permanent-delete" data-delete-backup="${backup.id}" type="button" aria-label="Sicherung löschen">
                  ${icon("trash")}
                </button>
              </div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function formatDateTime(value) {
  return new Date(value).toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatRelativeDate(value) {
  const difference = Date.now() - Date.parse(value);
  if (difference < 60000) return "gerade eben";
  if (difference < 3600000) return `vor ${Math.max(1, Math.round(difference / 60000))} Min.`;
  if (difference < 86400000) return `vor ${Math.max(1, Math.round(difference / 3600000))} Std.`;
  return `am ${new Date(value).toLocaleDateString("de-DE")}`;
}

async function refreshSafetyData() {
  if (state.storageMode !== "indexeddb") return;
  const [trash, backups] = await Promise.all([
    window.WortwerkStorage.listTrash(),
    window.WortwerkStorage.listBackups(),
  ]);
  state.trash = trash.sort((a, b) => Date.parse(b.deletedAt) - Date.parse(a.deletedAt));
  state.backups = backups.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

async function createLocalBackup(reason = "Manuelle Sicherung", kind = "manual", showConfirmation = true) {
  if (state.storageMode !== "indexeddb") {
    showToast("Lokale Sicherungsstände benötigen IndexedDB.", "error");
    return false;
  }
  await window.WortwerkStorage.createBackup(currentData(), reason, SCHEMA_VERSION, kind);
  await refreshSafetyData();
  if (state.view === "security") renderSecurity();
  if (showConfirmation) showToast("Lokaler Sicherungsstand wurde erstellt.");
  return true;
}

async function createUpdateBackup() {
  const saved = await saveData();
  if (!saved) return false;

  if (state.storageMode !== "indexeddb") {
    return true;
  }

  return createLocalBackup("Vor App-Aktualisierung", "update", false);
}

async function repairCurrentData() {
  await createLocalBackup("Vor automatischer Datenreparatur", "safety", false);
  let changed = 0;
  let removedReviews = 0;
  const deckIds = new Set();
  const cardIds = new Set();
  const cardIdMap = new Map();

  state.decks = state.decks.map((rawDeck) => {
    const deck = normalizeDeck(rawDeck);
    const originalDeckId = deck.id;
    if (!deck.id || deckIds.has(deck.id)) {
      deck.id = createId();
      changed += 1;
    }
    deckIds.add(deck.id);

    deck.cards = deck.cards.map((rawCard) => {
      const card = normalizeCard(rawCard);
      const originalCardId = card.id;
      if (!card.id || cardIds.has(card.id)) {
        card.id = createId();
        changed += 1;
      }
      cardIds.add(card.id);
      if (!cardIdMap.has(originalCardId)) cardIdMap.set(originalCardId, card.id);
      return card;
    });

    state.reviewLog.forEach((review) => {
      if (review.deckId === originalDeckId && deck.id !== originalDeckId) {
        review.deckId = deck.id;
        changed += 1;
      }
    });
    return deck;
  });

  const reviewIds = new Set();
  state.reviewLog = state.reviewLog
    .filter((review) => {
      const mappedCardId = cardIdMap.get(review.cardId) ?? review.cardId;
      if (!cardIds.has(mappedCardId)) {
        removedReviews += 1;
        return false;
      }
      review.cardId = mappedCardId;
      if (!review.id || reviewIds.has(review.id)) {
        review.id = createId();
        changed += 1;
      }
      reviewIds.add(review.id);
      return true;
    })
    .map((review) => ({ ...review }));

  state.settings = normalizeSettings(state.settings);
  state.lastRepairReport = {
    changed,
    removedReviews,
    completedAt: new Date().toISOString(),
  };
  state.validationReport = validateCurrentData();
  await saveData();
  renderSecurity();
  showToast("Datenreparatur abgeschlossen.");
}

async function restoreTrashEntry(id) {
  const entry = state.trash.find((item) => item.id === id);
  if (!entry) return;

  if (entry.kind === "deck") {
    let deck = normalizeDeck(entry.payload.deck);
    const originalDeckId = deck.id;
    if (state.decks.some((item) => item.id === deck.id)) deck.id = createId();
    const existingCardIds = new Set(state.decks.flatMap((item) => item.cards.map((card) => card.id)));
    const cardIdMap = new Map();
    deck.cards = deck.cards.map((card) => {
      const newId = existingCardIds.has(card.id) ? createId() : card.id;
      cardIdMap.set(card.id, newId);
      return { ...card, id: newId };
    });
    state.decks.unshift(deck);
    state.reviewLog.push(
      ...(entry.payload.reviews ?? [])
        .filter((review) => review.deckId === originalDeckId)
        .map((review) => ({
          ...review,
          id: state.reviewLog.some((item) => item.id === review.id) ? createId() : review.id,
          deckId: deck.id,
          cardId: cardIdMap.get(review.cardId) ?? review.cardId,
        })),
    );
    state.activeDeckId = deck.id;
  } else {
    let deck = state.decks.find((item) => item.id === entry.deckId);
    if (!deck) {
      const now = new Date().toISOString();
      deck = {
        id: entry.deckId || createId(),
        name: entry.deckName ? `${entry.deckName} – Wiederhergestellt` : "Wiederhergestellte Karten",
        description: "Automatisch für eine wiederhergestellte Karte angelegt.",
        cards: [],
        createdAt: now,
        updatedAt: now,
      };
      state.decks.unshift(deck);
    }
    const card = normalizeCard(entry.payload.card);
    if (deck.cards.some((item) => item.id === card.id)) card.id = createId();
    deck.cards.unshift(card);
    state.reviewLog.push(
      ...(entry.payload.reviews ?? []).map((review) => ({
        ...review,
        cardId: card.id,
        deckId: deck.id,
      })),
    );
    state.activeDeckId = deck.id;
  }

  await window.WortwerkStorage.deleteTrash(id);
  await saveData();
  await refreshSafetyData();
  state.validationReport = validateCurrentData();
  renderSecurity();
  showToast("Element wurde wiederhergestellt.");
}

async function permanentlyDeleteTrash(id) {
  const entry = state.trash.find((item) => item.id === id);
  if (!entry || !window.confirm(`„${entry.label}“ endgültig löschen? Dies kann nicht rückgängig gemacht werden.`)) {
    return;
  }
  await window.WortwerkStorage.deleteTrash(id);
  await refreshSafetyData();
  renderSecurity();
  showToast("Element wurde endgültig gelöscht.");
}

async function emptyTrash() {
  if (!state.trash.length) return;
  if (!window.confirm(`Alle ${state.trash.length} Elemente endgültig aus dem Papierkorb löschen?`)) return;
  await window.WortwerkStorage.clearTrash();
  await refreshSafetyData();
  renderSecurity();
  showToast("Papierkorb wurde geleert.");
}

async function restoreBackup(id) {
  const backup = await window.WortwerkStorage.getBackup(id);
  if (!backup) return;
  if (!window.confirm(`Sicherung vom ${formatDateTime(backup.createdAt)} wiederherstellen?`)) return;

  await createLocalBackup("Vor Wiederherstellung einer Sicherung", "safety", false);
  const restored = normalizeData(backup.data);
  state.decks = restored.decks;
  state.reviewLog = restored.reviewLog;
  state.settings = restored.settings;
  state.activeDeckId = state.decks[0]?.id ?? null;
  state.validationReport = validateCurrentData();
  await saveData();
  renderSecurity();
  showToast("Sicherung wurde wiederhergestellt.");
}

async function deleteBackup(id) {
  const backup = state.backups.find((item) => item.id === id);
  if (!backup || !window.confirm(`Sicherung „${backup.reason}“ endgültig löschen?`)) return;
  await window.WortwerkStorage.deleteBackup(id);
  await refreshSafetyData();
  renderSecurity();
  showToast("Sicherung wurde gelöscht.");
}

function getStudyCards(deck) {
  const now = Date.now();
  const due = deck.cards
    .filter((card) => card.learning.status !== "new" && Date.parse(card.learning.dueAt) <= now)
    .sort((a, b) => Date.parse(a.learning.dueAt) - Date.parse(b.learning.dueAt));
  const fresh = deck.cards
    .filter((card) => card.learning.status === "new")
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .slice(0, state.settings.newCardsPerDay);

  return [...due, ...fresh];
}

function startStudy(practice = false) {
  const deck = getActiveDeck();
  if (!deck) return;

  const cards = practice ? [...deck.cards] : getStudyCards(deck);
  if (!cards.length) {
    showToast(practice ? "Dieser Stapel enthält noch keine Karten." : "Für heute ist nichts mehr fällig.");
    return;
  }

  state.study = {
    deckId: deck.id,
    cardIds: shuffleArray(cards.map((card) => card.id)),
    index: 0,
    flipped: false,
    hintVisible: false,
    responses: {},
    practice,
    completed: false,
    startedAt: new Date().toISOString(),
    cardShownAt: Date.now(),
  };
  state.view = "study";
  closeMobileMenu();
  render();
}

function renderStudy() {
  renderDeckNavigation();
  const deck = state.decks.find((item) => item.id === state.study.deckId);
  if (!deck) {
    endStudy();
    return;
  }

  elements.pageTitle.textContent = deck.name;
  setTopbarAction("Lernen beenden", "end-study", "back");

  if (state.study.completed) {
    renderStudyComplete(deck);
    return;
  }

  const cardId = state.study.cardIds[state.study.index];
  const card = deck.cards.find((item) => item.id === cardId);
  if (!card) {
    state.study.cardIds.splice(state.study.index, 1);
    if (!state.study.cardIds.length) {
      state.study.completed = true;
    } else {
      state.study.index = Math.min(state.study.index, state.study.cardIds.length - 1);
    }
    renderStudy();
    return;
  }

  const completedCount = Object.keys(state.study.responses).length;
  const total = state.study.cardIds.length;
  const percent = total ? Math.round((completedCount / total) * 100) : 0;
  const response = state.study.responses[card.id];
  const preview = getSchedulePreview(card);
  const difficulty = getEffectiveDifficulty(card);
  const frontTextFit = cardTextFitClass(card.front, Boolean(card.image));
  const backTextFit = cardTextFitClass(card.back, false);

  elements.contentArea.innerHTML = `
    <section class="study-view">
      <div class="study-header">
        <div>
          <span class="eyebrow">${state.study.practice ? "Freies Üben" : "Geplante Wiederholung"}</span>
          <strong>${completedCount} von ${total} bearbeitet</strong>
        </div>
        <button class="button button-compact button-secondary" data-study-action="shuffle" type="button">
          ${icon("shuffle")} Rest mischen
        </button>
      </div>

      <div class="progress-track" aria-label="${percent} Prozent abgeschlossen">
        <span style="width: ${percent}%"></span>
      </div>

      <div class="study-stage">
        <button
          class="study-nav previous"
          data-study-action="previous"
          type="button"
          aria-label="Vorherige Karte"
          ${state.study.index === 0 ? "disabled" : ""}
        >${icon("back")}</button>

        <div class="study-card-wrap">
          <div class="study-card-meta">
            <span class="difficulty-badge ${difficulty}">
              <i aria-hidden="true"></i>${difficultyLabel(difficulty)}
            </span>
            ${renderTagList(card.tags)}
            <button
              class="study-mark-button ${card.marked ? "active" : ""}"
              data-toggle-marked="${card.id}"
              type="button"
              aria-label="${card.marked ? "Markierung entfernen" : "Karte markieren"}"
            >${icon("star")}</button>
          </div>
          <button
            class="study-card ${state.study.flipped ? "flipped" : ""}"
            data-study-action="flip"
            type="button"
            aria-label="Karte umdrehen"
          >
              <span class="study-card-inner">
              <span class="study-card-face study-card-front" aria-hidden="${state.study.flipped}">
                <span class="card-side-label">Vorderseite</span>
                ${
                  card.image
                    ? `<img class="study-card-image" src="${card.image.dataUrl}" alt="${escapeHtml(card.image.alt)}" />`
                    : ""
                }
                ${
                  card.front
                    ? `<strong class="${[card.image ? "with-image" : "", frontTextFit].filter(Boolean).join(" ")}">${escapeHtml(card.front)}</strong>`
                    : ""
                }
                <span class="flip-prompt">${icon("flip")} Antwort zeigen</span>
              </span>
              <span class="study-card-face study-card-back" aria-hidden="${!state.study.flipped}">
                <span class="card-side-label">Rückseite</span>
                <strong class="${backTextFit}">${escapeHtml(card.back)}</strong>
                <span class="flip-prompt">${icon("flip")} Frage zeigen</span>
              </span>
            </span>
          </button>

          ${
            card.hint
              ? `
                <div class="hint-area">
                  <button class="hint-button" data-study-action="hint" type="button">
                    ${icon("hint")} ${state.study.hintVisible ? "Denkanstoß ausblenden" : "Kleiner Denkanstoß"}
                  </button>
                  <p
                    class="hint-text ${state.study.hintVisible ? "visible" : ""}"
                    aria-hidden="${!state.study.hintVisible}"
                  >${escapeHtml(card.hint)}</p>
                </div>
              `
              : `<p class="micro-hint">Nimm dir einen Moment, bevor du die Karte umdrehst.</p>`
          }
        </div>

        <button
          class="study-nav next"
          data-study-action="next"
          type="button"
          aria-label="Nächste Karte"
          ${state.study.index >= total - 1 ? "disabled" : ""}
        >${icon("next")}</button>
      </div>

      <div
        class="study-answer-panel ${state.study.flipped ? "visible" : ""}"
        aria-hidden="${!state.study.flipped}"
        ${state.study.flipped ? "" : "inert"}
      >
        ${
          response
            ? `
              <div class="already-rated">
                ${icon("check")}
                Bereits bewertet: <strong>${ratingLabel(response)}</strong>
              </div>
            `
            : state.study.practice
              ? `
                <button class="button button-primary practice-next" data-study-action="practice-done" type="button">
                  ${icon("next")} Karte angesehen
                </button>
                <small>Der freie Übungsmodus verändert deine Wiederholungstermine nicht.</small>
              `
              : `
                <p>Wie gut konntest du dich erinnern?</p>
                <div class="rating-grid">
                  ${ratingButton("again", "Nicht gewusst", preview.again)}
                  ${ratingButton("hard", "Richtig, aber schwer", preview.hard)}
                  ${ratingButton("good", "Richtig", preview.good)}
                  ${ratingButton("easy", "Sofort gewusst", preview.easy)}
                </div>
              `
        }
      </div>

      <p class="keyboard-help">Leertaste: umdrehen · Pfeiltasten: wechseln${state.study.practice ? "" : " · 1–4: bewerten"}</p>
    </section>
  `;
}

function ratingButton(rating, label, interval) {
  return `
    <button class="rating-button ${rating}" data-rating="${rating}" type="button">
      <strong>${label}</strong>
      <span>${formatInterval(interval)}</span>
    </button>
  `;
}

function ratingLabel(rating) {
  return {
    again: "Nicht gewusst",
    hard: "Richtig, aber schwer",
    good: "Richtig",
    easy: "Sofort gewusst",
    practice: "Frei geübt",
  }[rating];
}

function cardTextFitClass(value, hasImage = false) {
  const text = String(value ?? "").trim();
  const characterCount = [...text].length;
  const wordCount = text ? text.split(/\s+/).length : 0;
  const score = characterCount + wordCount * 7 + (hasImage ? 55 : 0);

  if (score > 520) return "text-fit-ultra";
  if (score > 340) return "text-fit-dense";
  if (score > 210) return "text-fit-long";
  if (score > 120) return "text-fit-medium";
  return "text-fit-short";
}

function getSchedulePreview(card) {
  const current = Math.max(0, card.learning.intervalDays);
  const targetModifier = { 0.85: 1.25, 0.9: 1, 0.93: 0.82 }[state.settings.retentionTarget] ?? 1;
  return {
    again: 10 / 1440,
    hard:
      current < 1
        ? Math.max(1, Math.round(1 * targetModifier))
        : Math.max(1, Math.round(current * 1.2 * targetModifier)),
    good:
      current < 1
        ? Math.max(1, Math.round(3 * targetModifier))
        : Math.max(2, Math.round(current * card.learning.ease * targetModifier)),
    easy:
      current < 1
        ? Math.max(2, Math.round(7 * targetModifier))
        : Math.max(4, Math.round(current * (card.learning.ease + 0.8) * targetModifier)),
  };
}

function formatInterval(days) {
  if (days < 1 / 24) return `${Math.round(days * 1440)} Min.`;
  if (days < 1) return `${Math.round(days * 24)} Std.`;
  if (days === 1) return "1 Tag";
  return `${Math.round(days)} Tage`;
}

function gradeCard(rating) {
  if (!["again", "hard", "good", "easy"].includes(rating)) return;

  const deck = state.decks.find((item) => item.id === state.study.deckId);
  const cardId = state.study.cardIds[state.study.index];
  const card = deck?.cards.find((item) => item.id === cardId);
  if (!card || state.study.responses[card.id]) return;

  const previous = { ...card.learning };
  const previousUpdatedAt = card.updatedAt;
  const preview = getSchedulePreview(card);
  const intervalDays = preview[rating];
  const now = new Date();

  card.learning.intervalDays = intervalDays;
  card.learning.dueAt = new Date(now.getTime() + intervalDays * 86400000).toISOString();
  card.learning.lastReviewedAt = now.toISOString();
  card.learning.reviewCount += 1;
  card.learning.status = rating === "again" ? "learning" : "review";

  if (rating === "again") {
    card.learning.lapseCount += 1;
    card.learning.ease = clamp(card.learning.ease - 0.2, 1.3, 3.2);
  } else if (rating === "hard") {
    card.learning.ease = clamp(card.learning.ease - 0.1, 1.3, 3.2);
  } else if (rating === "easy") {
    card.learning.ease = clamp(card.learning.ease + 0.1, 1.3, 3.2);
  }

  card.updatedAt = now.toISOString();
  deck.updatedAt = now.toISOString();
  state.study.responses[card.id] = rating;
  state.reviewLog.push({
    id: createId(),
    deckId: deck.id,
    cardId: card.id,
    reviewedAt: now.toISOString(),
    rating,
    previousIntervalDays: previous.intervalDays,
    newIntervalDays: intervalDays,
    previousDueAt: previous.dueAt,
    newDueAt: card.learning.dueAt,
    responseTimeMs: Math.max(0, Date.now() - state.study.cardShownAt),
    schedulerVersion: SCHEDULER_VERSION,
  });
  const newLog = state.reviewLog[state.reviewLog.length - 1];
  state.undoReview = {
    deckId: deck.id,
    cardId: card.id,
    logId: newLog.id,
    previousLearning: previous,
    previousUpdatedAt,
  };

  saveData();
  advanceStudy();
}

function advanceStudy() {
  const nextIndex = state.study.cardIds.findIndex(
    (id, index) => index > state.study.index && !state.study.responses[id],
  );

  if (nextIndex >= 0) {
    state.study.index = nextIndex;
    resetStudyCard();
    renderStudy();
    return;
  }

  const firstUnanswered = state.study.cardIds.findIndex((id) => !state.study.responses[id]);
  if (firstUnanswered >= 0) {
    state.study.index = firstUnanswered;
    resetStudyCard();
    renderStudy();
    return;
  }

  state.study.completed = true;
  renderStudy();
}

function resetStudyCard() {
  state.study.flipped = false;
  state.study.hintVisible = false;
  state.study.cardShownAt = Date.now();
}

function renderStudyComplete(deck) {
  const responses = Object.values(state.study.responses);
  const counts = {
    again: responses.filter((item) => item === "again").length,
    hard: responses.filter((item) => item === "hard").length,
    good: responses.filter((item) => item === "good").length,
    easy: responses.filter((item) => item === "easy").length,
    practice: responses.filter((item) => item === "practice").length,
  };

  elements.contentArea.innerHTML = `
    <section class="study-complete">
      <div class="celebration" aria-hidden="true"><span>✦</span><span>✦</span><span>✦</span></div>
      <span class="complete-icon">${icon("check")}</span>
      <span class="eyebrow">Lernrunde abgeschlossen</span>
      <h2>Stark – für heute ist diese Runde geschafft.</h2>
      <p>${responses.length} ${responses.length === 1 ? "Karte wurde" : "Karten wurden"} bearbeitet.</p>
      ${
        state.study.practice
          ? ""
          : `
            <div class="completion-stats">
              <span><strong>${counts.again}</strong>Nicht gewusst</span>
              <span><strong>${counts.hard}</strong>Schwer</span>
              <span><strong>${counts.good}</strong>Richtig</span>
              <span><strong>${counts.easy}</strong>Sofort gewusst</span>
            </div>
          `
      }
      <div class="completion-actions">
        <button class="button button-primary" data-action="end-study" type="button">${icon("back")} Zum Stapel</button>
        ${
          state.undoReview
            ? `<button class="button button-secondary" data-action="undo-review" type="button">${icon("undo")} Letzte Bewertung zurücknehmen</button>`
            : ""
        }
        <button class="button button-secondary" data-action="restart-practice" type="button">${icon("shuffle")} Frei weiterüben</button>
      </div>
    </section>
  `;
}

function endStudy() {
  state.study = null;
  state.view = state.activeDeckId ? "deck" : "welcome";
  render();
}

function undoLastReview() {
  const undo = state.undoReview;
  if (!undo) {
    showToast("Es gibt keine aktuelle Bewertung zum Zurücknehmen.", "error");
    return;
  }

  const deck = state.decks.find((item) => item.id === undo.deckId);
  const card = deck?.cards.find((item) => item.id === undo.cardId);
  if (!deck || !card) return;

  card.learning = { ...undo.previousLearning };
  card.updatedAt = undo.previousUpdatedAt;
  state.reviewLog = state.reviewLog.filter((entry) => entry.id !== undo.logId);

  if (state.study?.cardIds.includes(card.id)) {
    delete state.study.responses[card.id];
    state.study.index = state.study.cardIds.indexOf(card.id);
    state.study.completed = false;
    resetStudyCard();
  }

  state.undoReview = null;
  saveData();
  render();
  showToast("Die letzte Bewertung wurde zurückgenommen.");
}

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

function shuffleRemainingStudyCards() {
  const before = state.study.cardIds.slice(0, state.study.index + 1);
  const remaining = shuffleArray(state.study.cardIds.slice(state.study.index + 1));
  state.study.cardIds = [...before, ...remaining];
  showToast("Die verbleibenden Karten wurden gemischt.");
}

function openDeckModal(deckId = null) {
  closeMobileMenu();
  state.editingDeckId = deckId;
  elements.deckForm.reset();

  if (deckId) {
    const deck = state.decks.find((item) => item.id === deckId);
    if (!deck) return;
    elements.deckModalEyebrow.textContent = "Sammlung anpassen";
    elements.deckModalTitle.textContent = "Stapel bearbeiten";
    elements.deckSubmitButton.textContent = "Änderungen speichern";
    elements.deckName.value = deck.name;
    elements.deckDescription.value = deck.description;
  } else {
    elements.deckModalEyebrow.textContent = "Neue Sammlung";
    elements.deckModalTitle.textContent = "Stapel erstellen";
    elements.deckSubmitButton.textContent = "Stapel erstellen";
  }

  elements.deckModal.showModal();
  requestAnimationFrame(() => elements.deckName.focus());
}

function openCardModal(cardId = null) {
  const deck = getActiveDeck();
  if (!deck) {
    openDeckModal();
    return;
  }

  state.editingCardId = cardId;
  elements.cardForm.reset();
  state.cardImageDraft = null;
  elements.cardDuplicateWarning.hidden = true;

  if (cardId) {
    const card = deck.cards.find((item) => item.id === cardId);
    if (!card) return;
    elements.cardModalEyebrow.textContent = "Vokabel anpassen";
    elements.cardModalTitle.textContent = "Karte bearbeiten";
    elements.cardSubmitButton.textContent = "Änderungen speichern";
    elements.cardFront.value = card.front;
    elements.cardBack.value = card.back;
    elements.cardHint.value = card.hint;
    elements.cardTags.value = card.tags.join(", ");
    elements.cardMarked.checked = card.marked;
    elements.cardDifficulty.value = card.difficulty;
    elements.cardImageAlt.value = card.image?.alt ?? "";
    state.cardImageDraft = card.image ? structuredClone(card.image) : null;
  } else {
    elements.cardModalEyebrow.textContent = "Neue Vokabel";
    elements.cardModalTitle.textContent = "Karte hinzufügen";
    elements.cardSubmitButton.textContent = "Karte hinzufügen";
  }

  renderCardImagePreview();
  elements.cardModal.showModal();
  requestAnimationFrame(() => elements.cardFront.focus());
}

function renderCardImagePreview() {
  const image = state.cardImageDraft;
  elements.cardImagePreview.hidden = !image;
  if (!image) {
    elements.cardImagePreviewImg.removeAttribute("src");
    elements.cardImagePreviewInfo.textContent = "";
    return;
  }

  elements.cardImagePreviewImg.src = image.dataUrl;
  elements.cardImagePreviewImg.alt = image.alt || "Vorschau des Kartenbildes";
  elements.cardImagePreviewName.textContent = image.originalName || "Kartenbild";
  elements.cardImagePreviewInfo.textContent =
    image.width && image.height
      ? `${image.width} × ${image.height} Pixel · optimiert gespeichert`
      : "Optimiert gespeichert";
}

async function processCardImage(file) {
  if (!file) return null;
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Unterstützt werden JPG, PNG, WebP und GIF.");
  }
  if (file.size > MAX_IMAGE_FILE_SIZE) {
    throw new Error("Das Bild ist größer als 5 MB.");
  }

  const sourceUrl = await readFileAsDataUrl(file);
  const image = await loadImage(sourceUrl);
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("Das Bild konnte nicht verarbeitet werden.");
  context.drawImage(image, 0, 0, width, height);

  let mimeType = "image/webp";
  let dataUrl = canvas.toDataURL(mimeType, 0.82);
  if (!dataUrl.startsWith("data:image/webp")) {
    mimeType = "image/jpeg";
    dataUrl = canvas.toDataURL(mimeType, 0.86);
  }

  return {
    dataUrl,
    mimeType,
    width,
    height,
    originalName: file.name.slice(0, 120),
    alt: elements.cardImageAlt.value.trim(),
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(new Error("Die Bilddatei konnte nicht gelesen werden.")));
    reader.readAsDataURL(file);
  });
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Die Bilddatei ist beschädigt oder nicht lesbar.")));
    image.src = url;
  });
}

function comparableText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("de")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function findCardDuplicate(deck, candidate, excludeId = null) {
  const front = comparableText(candidate.front);
  const back = comparableText(candidate.back);

  for (const card of deck.cards) {
    if (card.id === excludeId) continue;
    const cardFront = comparableText(card.front);
    const cardBack = comparableText(card.back);
    const sameImage =
      candidate.image?.dataUrl &&
      card.image?.dataUrl &&
      candidate.image.dataUrl === card.image.dataUrl;

    if ((front && front === cardFront && back === cardBack) || (sameImage && back === cardBack)) {
      return { type: "exact", card };
    }
    if (front && back && front === cardBack && back === cardFront) {
      return { type: "reversed", card };
    }
    if (front && front === cardFront) {
      return { type: "same-front", card };
    }
  }
  return null;
}

function duplicateMessage(duplicate) {
  if (!duplicate) return "";
  const label = duplicate.card.front || duplicate.card.image?.alt || "Bildkarte";
  if (duplicate.type === "exact") {
    return `Diese Karte ist bereits vorhanden: „${label}“.`;
  }
  if (duplicate.type === "reversed") {
    return `Vorder- und Rückseite existieren bereits in umgekehrter Reihenfolge bei „${label}“.`;
  }
  return `Die Vorderseite „${label}“ ist bereits vorhanden, besitzt dort aber eine andere Rückseite.`;
}

function updateDuplicateWarning() {
  const deck = getActiveDeck();
  if (!deck) return;
  const duplicate = findCardDuplicate(
    deck,
    {
      front: elements.cardFront.value,
      back: elements.cardBack.value,
      image: state.cardImageDraft,
    },
    state.editingCardId,
  );
  elements.cardDuplicateWarning.hidden = !duplicate;
  elements.cardDuplicateWarning.innerHTML = duplicate
    ? `${icon("warning")}<span>${escapeHtml(duplicateMessage(duplicate))}</span>`
    : "";
}

function closeDialog(dialog) {
  if (dialog.open) dialog.close();
}

function showToast(message, type = "success") {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.className = `toast visible ${type}`;
  toastTimer = setTimeout(() => {
    elements.toast.className = "toast";
  }, 2800);
}

function closeMobileMenu() {
  elements.sidebar.classList.remove("open");
  elements.mobileBackdrop.classList.remove("visible");
}

function saveDeckFromForm(event) {
  event.preventDefault();
  const name = elements.deckName.value.trim();
  const description = elements.deckDescription.value.trim();
  if (!name) return;

  const now = new Date().toISOString();
  if (state.editingDeckId) {
    const deck = state.decks.find((item) => item.id === state.editingDeckId);
    if (!deck) return;
    deck.name = name;
    deck.description = description;
    deck.updatedAt = now;
    showToast("Stapel wurde aktualisiert.");
  } else {
    const newDeck = {
      id: createId(),
      name,
      description,
      cards: [],
      createdAt: now,
      updatedAt: now,
    };
    state.decks.unshift(newDeck);
    state.activeDeckId = newDeck.id;
    state.view = "deck";
    showToast(`Stapel „${name}“ wurde erstellt.`);
  }

  saveData();
  closeDialog(elements.deckModal);
  state.editingDeckId = null;
  render();
}

async function saveCardFromForm(event) {
  event.preventDefault();
  const deck = getActiveDeck();
  const front = elements.cardFront.value.trim();
  const back = elements.cardBack.value.trim();
  const hint = elements.cardHint.value.trim();
  const tags = normalizeTags(elements.cardTags.value);
  const marked = elements.cardMarked.checked;
  const difficulty = elements.cardDifficulty.value;
  const image = state.cardImageDraft
    ? { ...state.cardImageDraft, alt: elements.cardImageAlt.value.trim() }
    : null;
  if (!deck || (!front && !image) || !back) {
    showToast("Bitte gib Text oder ein Bild für die Vorderseite und eine Erklärung für die Rückseite an.", "error");
    return;
  }

  const duplicate = findCardDuplicate(deck, { front, back, image }, state.editingCardId);
  if (
    duplicate &&
    !window.confirm(`${duplicateMessage(duplicate)} Möchtest du die Karte trotzdem speichern?`)
  ) {
    return;
  }

  const now = new Date().toISOString();
  if (state.editingCardId) {
    const card = deck.cards.find((item) => item.id === state.editingCardId);
    if (!card) return;
    card.front = front;
    card.back = back;
    card.hint = hint;
    card.tags = tags;
    card.marked = marked;
    card.difficulty = difficulty;
    card.image = image;
    card.updatedAt = now;
    showToast("Karte wurde aktualisiert.");
  } else {
    deck.cards.unshift({
      id: createId(),
      front,
      back,
      hint,
      tags,
      marked,
      difficulty,
      image,
      createdAt: now,
      updatedAt: now,
      learning: {
        status: "new",
        dueAt: now,
        intervalDays: 0,
        ease: 2.5,
        reviewCount: 0,
        lapseCount: 0,
        lastReviewedAt: null,
      },
    });
    showToast("Karte wurde hinzugefügt.");
  }

  deck.updatedAt = now;
  saveData();
  closeDialog(elements.cardModal);
  state.editingCardId = null;
  state.cardImageDraft = null;
  render();
}

async function removeCard(cardId) {
  const deck = getActiveDeck();
  const card = deck?.cards.find((item) => item.id === cardId);
  if (!deck || !card) return;
  if (!window.confirm(`Möchtest du die Karte „${card.front}“ in den Papierkorb verschieben?`)) return;

  const reviews = state.reviewLog.filter((entry) => entry.cardId === cardId);
  if (state.storageMode === "indexeddb") {
    await createLocalBackup("Vor dem Löschen einer Karte", "safety", false);
    await window.WortwerkStorage.addTrash({
      id: createId(),
      kind: "card",
      label: card.front,
      deletedAt: new Date().toISOString(),
      deckId: deck.id,
      deckName: deck.name,
      payload: { card: structuredClone(card), reviews: structuredClone(reviews) },
    });
  }

  deck.cards = deck.cards.filter((item) => item.id !== cardId);
  state.reviewLog = state.reviewLog.filter((entry) => entry.cardId !== cardId);
  deck.updatedAt = new Date().toISOString();
  await saveData();
  await refreshSafetyData();
  render();
  showToast(
    state.storageMode === "indexeddb"
      ? "Karte wurde in den Papierkorb verschoben."
      : "Karte wurde dauerhaft entfernt.",
  );
}

async function removeActiveDeck() {
  const deck = getActiveDeck();
  if (!deck) return;
  if (!window.confirm(`Möchtest du den Stapel „${deck.name}“ mit ${deck.cards.length} Karten in den Papierkorb verschieben?`)) {
    return;
  }

  const reviews = state.reviewLog.filter((entry) => entry.deckId === deck.id);
  if (state.storageMode === "indexeddb") {
    await createLocalBackup("Vor dem Löschen eines Stapels", "safety", false);
    await window.WortwerkStorage.addTrash({
      id: createId(),
      kind: "deck",
      label: deck.name,
      deletedAt: new Date().toISOString(),
      payload: { deck: structuredClone(deck), reviews: structuredClone(reviews) },
    });
  }

  state.decks = state.decks.filter((item) => item.id !== deck.id);
  state.reviewLog = state.reviewLog.filter((entry) => entry.deckId !== deck.id);
  state.activeDeckId = null;
  state.view = "welcome";
  await saveData();
  await refreshSafetyData();
  render();
  showToast(
    state.storageMode === "indexeddb"
      ? "Stapel wurde in den Papierkorb verschoben."
      : "Stapel wurde dauerhaft gelöscht.",
  );
}

function exportJsonBackup(silent = false) {
  const payload = {
    product: "Wortwerk",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      decks: state.decks,
      reviewLog: state.reviewLog,
      settings: state.settings,
    },
  };
  downloadBlob(
    JSON.stringify(payload, null, 2),
    `wortwerk-sicherung-${fileDate()}.json`,
    "application/json;charset=utf-8",
  );
  if (!silent) showToast("Vollständige Sicherung wurde erstellt.");
}

function exportActiveDeckCsv() {
  const deck = getActiveDeck();
  if (!deck) return;

  const rows = [
    ["Stapel", "Vorderseite", "Rückseite", "Hinweis", "Tags", "Markiert", "Schwierigkeit", "Bild"],
    ...deck.cards.map((card) => [
      deck.name,
      card.front,
      card.back,
      card.hint,
      card.tags.join(", "),
      card.marked ? "Ja" : "Nein",
      card.difficulty,
      card.image ? "In JSON-Sicherung enthalten" : "",
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
  downloadBlob(csv, `${safeFilename(deck.name)}-${fileDate()}.csv`, "text/csv;charset=utf-8");
  showToast("Der Stapel wurde als CSV exportiert.");
}

function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function fileDate() {
  return new Date().toISOString().slice(0, 10);
}

function safeFilename(value) {
  return value
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "wortwerk-stapel";
}

async function importFile(file) {
  if (!file) return;

  try {
    const text = await file.text();
    if (file.name.toLowerCase().endsWith(".json")) {
      prepareJsonImport(text, file.name);
    } else {
      prepareCsvImport(text, file.name);
    }
  } catch (error) {
    showToast(`Die Datei konnte nicht vorbereitet werden: ${error.message}`, "error");
  } finally {
    elements.importFile.value = "";
  }
}

function prepareJsonImport(text, filename) {
  const parsed = JSON.parse(text);
  const imported = normalizeData(parsed);
  const report = inspectImportedJson(parsed, imported);
  state.importPreview = {
    type: "json",
    filename,
    data: imported,
    report,
  };
  renderImportPreview();
}

function prepareCsvImport(text, filename) {
  const rows = parseCsv(text.replace(/^\uFEFF/, ""));
  if (rows.length < 2) throw new Error("CSV enthält keine Daten");

  const originalHeaders = rows[0].map((header, index) => header.trim() || `Spalte ${index + 1}`);
  const headers = originalHeaders.map((header) => header.toLocaleLowerCase("de"));
  state.importPreview = {
    type: "csv",
    filename,
    headers: originalHeaders,
    rows: rows.slice(1),
    mapping: {
      front: findHeader(headers, ["vorderseite", "front", "frage"]),
      back: findHeader(headers, ["rückseite", "rueckseite", "back", "antwort"]),
      hint: findHeader(headers, ["hinweis", "denkanstoß", "denkanstoss", "hint"]),
      deck: findHeader(headers, ["stapel", "deck"]),
      tags: findHeader(headers, ["tags", "tag", "kategorien", "kategorie"]),
      marked: findHeader(headers, ["markiert", "marked", "favorit", "stern"]),
      difficulty: findHeader(headers, ["schwierigkeit", "difficulty", "stufe"]),
    },
  };
  renderImportPreview();
}

function inspectImportedJson(raw, imported) {
  const errors = [];
  const warnings = [];
  const source = raw?.data ?? raw;
  if (!source || typeof source !== "object") errors.push("Die JSON-Datei enthält kein gültiges Wurzelobjekt.");
  if (!Array.isArray(source) && !Array.isArray(source?.decks)) {
    errors.push("Das Feld „decks“ fehlt oder ist keine Liste.");
  }
  if (source?.schemaVersion && Number(source.schemaVersion) > SCHEMA_VERSION) {
    warnings.push(`Die Datei stammt aus einer neueren Schema-Version (${source.schemaVersion}).`);
  }
  if (!imported.decks.length) warnings.push("Die Sicherung enthält keine Stapel.");

  imported.decks.forEach((deck) => {
    if (!deck.name.trim()) errors.push("Ein Stapel hat keinen Namen.");
    const seen = new Set();
    deck.cards.forEach((card) => {
      if ((!card.front.trim() && !card.image) || !card.back.trim()) {
        errors.push(`Eine Karte im Stapel „${deck.name}“ besitzt eine leere Seite.`);
      }
      const key = `${comparableText(card.front)}\u0000${comparableText(card.back)}`;
      if (seen.has(key)) warnings.push(`Im Stapel „${deck.name}“ befinden sich doppelte Karten.`);
      seen.add(key);
    });
  });

  return {
    errors,
    warnings,
    decks: imported.decks.length,
    cards: imported.decks.reduce((sum, deck) => sum + deck.cards.length, 0),
    reviews: imported.reviewLog.length,
  };
}

function renderImportPreview() {
  const preview = state.importPreview;
  if (!preview) return;

  if (preview.type === "json") {
    elements.importPreviewContent.innerHTML = `
      <div class="import-file-summary">
        ${icon("database")}
        <div><strong>${escapeHtml(preview.filename)}</strong><small>Vollständige JSON-Sicherung</small></div>
      </div>
      <div class="import-summary-grid">
        <span><strong>${preview.report.decks}</strong> Stapel</span>
        <span><strong>${preview.report.cards}</strong> Karten</span>
        <span><strong>${preview.report.reviews}</strong> Bewertungen</span>
      </div>
      ${renderImportReport(preview.report)}
      <div class="import-warning-box">
        ${icon("warning")}
        <p>Eine JSON-Wiederherstellung ersetzt die aktuelle Sammlung. Vorher wird automatisch ein lokaler Sicherungsstand erzeugt.</p>
      </div>
    `;
    elements.importConfirmButton.disabled = preview.report.errors.length > 0;
    elements.importConfirmButton.textContent = "Sicherung wiederherstellen";
  } else {
    const mapping = preview.mapping;
    const sampleRows = preview.rows.slice(0, 5);
    elements.importPreviewContent.innerHTML = `
      <div class="import-file-summary">
        ${icon("cards")}
        <div><strong>${escapeHtml(preview.filename)}</strong><small>${preview.rows.length} Datenzeilen erkannt</small></div>
      </div>
      <div class="mapping-grid">
        ${mappingSelect("Vorderseite", "front", preview.headers, mapping.front, true)}
        ${mappingSelect("Rückseite", "back", preview.headers, mapping.back, true)}
        ${mappingSelect("Stapel", "deck", preview.headers, mapping.deck, false)}
        ${mappingSelect("Hinweis", "hint", preview.headers, mapping.hint, false)}
        ${mappingSelect("Tags", "tags", preview.headers, mapping.tags, false)}
        ${mappingSelect("Markiert", "marked", preview.headers, mapping.marked, false)}
        ${mappingSelect("Schwierigkeit", "difficulty", preview.headers, mapping.difficulty, false)}
      </div>
      <div class="import-table-wrap">
        <table class="import-table">
          <thead><tr>${preview.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
          <tbody>
            ${sampleRows
              .map(
                (row) =>
                  `<tr>${preview.headers
                    .map((_, index) => `<td>${escapeHtml(row[index] ?? "")}</td>`)
                    .join("")}</tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <p class="import-footnote">
        Leere Pflichtfelder werden übersprungen. Exakte Duplikate aus Vorder- und Rückseite werden nicht erneut importiert.
      </p>
    `;
    elements.importConfirmButton.disabled = mapping.front < 0 || mapping.back < 0;
    elements.importConfirmButton.textContent = "Karten importieren";
  }

  elements.importPreviewModal.showModal();
}

function mappingSelect(label, name, headers, selectedIndex, required) {
  return `
    <label>
      <span>${label}${required ? " *" : ""}</span>
      <select data-import-mapping="${name}">
        <option value="-1">${required ? "Bitte auswählen" : "Nicht importieren"}</option>
        ${headers
          .map(
            (header, index) =>
              `<option value="${index}" ${selectedIndex === index ? "selected" : ""}>${escapeHtml(header)}</option>`,
          )
          .join("")}
      </select>
    </label>
  `;
}

function renderImportReport(report) {
  if (!report.errors.length && !report.warnings.length) {
    return `<p class="validation-success">${icon("check")} Die Datei ist mit dem aktuellen Datenmodell kompatibel.</p>`;
  }
  return `
    <div class="validation-messages">
      ${report.errors.map((message) => `<p class="error">${icon("warning")}${escapeHtml(message)}</p>`).join("")}
      ${report.warnings.map((message) => `<p class="warning">${icon("warning")}${escapeHtml(message)}</p>`).join("")}
    </div>
  `;
}

async function confirmImport(event) {
  event.preventDefault();
  const preview = state.importPreview;
  if (!preview) return;

  if (preview.type === "json") {
    if (preview.report.errors.length) return;
    await createLocalBackup("Vor JSON-Wiederherstellung", "safety", false);
    state.decks = preview.data.decks;
    state.reviewLog = preview.data.reviewLog;
    state.settings = preview.data.settings;
    state.activeDeckId = state.decks[0]?.id ?? null;
    await saveData();
    closeDialog(elements.importPreviewModal);
    state.importPreview = null;
    state.validationReport = validateCurrentData();
    state.view = state.activeDeckId ? "deck" : "welcome";
    render();
    showToast("Sicherung wurde wiederhergestellt.");
    return;
  }

  const mapping = {};
  elements.importPreviewContent.querySelectorAll("[data-import-mapping]").forEach((select) => {
    mapping[select.dataset.importMapping] = Number(select.value);
  });
  if (mapping.front < 0 || mapping.back < 0) {
    showToast("Bitte Vorder- und Rückseite zuordnen.", "error");
    return;
  }

  await createLocalBackup("Vor CSV-Import", "safety", false);
  const result = applyCsvImport(preview.rows, mapping);
  await saveData();
  closeDialog(elements.importPreviewModal);
  state.importPreview = null;
  state.validationReport = validateCurrentData();
  state.view = state.activeDeckId ? "deck" : "welcome";
  render();
  showToast(
    `${result.importedCount} Karten importiert${
      result.skippedCount ? `, ${result.skippedCount} Zeilen oder Duplikate übersprungen` : ""
    }.`,
  );
}

function applyCsvImport(rows, mapping) {
  let importedCount = 0;
  let skippedCount = 0;
  let duplicateCount = 0;
  const fallbackDeckName = getActiveDeck()?.name ?? `CSV-Import ${new Date().toLocaleDateString("de-DE")}`;

  rows.forEach((row) => {
    const front = (row[mapping.front] ?? "").trim();
    const back = (row[mapping.back] ?? "").trim();
    const hint = mapping.hint >= 0 ? (row[mapping.hint] ?? "").trim() : "";
    const tags = mapping.tags >= 0 ? normalizeTags(row[mapping.tags] ?? "") : [];
    const markedValue = mapping.marked >= 0 ? comparableText(row[mapping.marked] ?? "") : "";
    const marked = ["ja", "yes", "true", "1", "markiert", "favorit"].includes(markedValue);
    const rawDifficulty = mapping.difficulty >= 0 ? comparableText(row[mapping.difficulty] ?? "") : "";
    const difficulty =
      {
        leicht: "easy",
        easy: "easy",
        mittel: "medium",
        medium: "medium",
        schwer: "hard",
        hard: "hard",
        automatisch: "auto",
        auto: "auto",
      }[rawDifficulty] ?? "auto";
    const deckName =
      mapping.deck >= 0 && row[mapping.deck]?.trim() ? row[mapping.deck].trim() : fallbackDeckName;
    if (!front || !back) {
      skippedCount += 1;
      return;
    }

    let deck = state.decks.find((item) => item.name.toLocaleLowerCase("de") === deckName.toLocaleLowerCase("de"));
    if (!deck) {
      const now = new Date().toISOString();
      deck = {
        id: createId(),
        name: deckName,
        description: "Aus einer CSV-Datei importiert.",
        cards: [],
        createdAt: now,
        updatedAt: now,
      };
      state.decks.unshift(deck);
    }

    const duplicate = findCardDuplicate(deck, { front, back, image: null });
    if (duplicate && ["exact", "reversed"].includes(duplicate.type)) {
      skippedCount += 1;
      duplicateCount += 1;
      return;
    }

    const now = new Date().toISOString();
    deck.cards.push(
      normalizeCard({
        id: createId(),
        front,
        back,
        hint,
        tags,
        marked,
        difficulty,
        createdAt: now,
      }),
    );
    deck.updatedAt = now;
    importedCount += 1;
  });

  state.activeDeckId = state.decks.find(
    (deck) => deck.name.toLocaleLowerCase("de") === fallbackDeckName.toLocaleLowerCase("de"),
  )?.id ?? state.decks[0]?.id;
  return { importedCount, skippedCount, duplicateCount };
}

function findHeader(headers, names) {
  return headers.findIndex((header) => names.includes(header));
}

function parseCsv(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const separator = countOutsideQuotes(firstLine, ";") >= countOutsideQuotes(firstLine, ",") ? ";" : ",";
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === separator && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  row.push(field);
  if (row.some((value) => value.length)) rows.push(row);
  return rows;
}

function countOutsideQuotes(text, character) {
  let count = 0;
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '"') quoted = !quoted;
    if (text[index] === character && !quoted) count += 1;
  }
  return count;
}

function handleAction(action) {
  const deck = getActiveDeck();
  const actions = {
    "create-deck": () => openDeckModal(),
    "open-first-deck": () => {
      state.activeDeckId = state.decks[0]?.id ?? null;
      state.view = state.activeDeckId ? "deck" : "welcome";
      render();
    },
    "create-card": () => openCardModal(),
    "edit-deck": () => openDeckModal(deck?.id),
    "delete-deck": removeActiveDeck,
    "start-study": () => startStudy(false),
    "start-practice": () => startStudy(true),
    "restart-practice": () => startStudy(true),
    "end-study": endStudy,
    "undo-review": undoLastReview,
    "go-home": () => {
      state.view = state.activeDeckId ? "deck" : "welcome";
      render();
    },
    "start-next-due": () => {
      const nextDeck = [...state.decks]
        .map((item) => ({ deck: item, due: getDeckStats(item).sessionDue }))
        .sort((a, b) => b.due - a.due)[0];
      if (!nextDeck?.due) return;
      state.activeDeckId = nextDeck.deck.id;
      state.view = "deck";
      startStudy(false);
    },
    "export-csv": exportActiveDeckCsv,
    "export-json": () => exportJsonBackup(false),
    "create-local-backup": () => createLocalBackup(),
    "run-data-check": () => {
      state.validationReport = validateCurrentData();
      renderSecurity();
      showToast(
        state.validationReport.errors.length
          ? "Datenprüfung abgeschlossen – bitte Hinweise ansehen."
          : "Datenprüfung abgeschlossen: keine strukturellen Fehler gefunden.",
        state.validationReport.errors.length ? "error" : "success",
      );
    },
    "repair-data": repairCurrentData,
    "empty-trash": emptyTrash,
    "change-password": openPasswordChange,
    logout: lockApp,
    import: () => elements.importFile.click(),
  };
  actions[action]?.();
}

function updateSetting(name, rawValue) {
  if (name === "newCardsPerDay") {
    const value = Number(rawValue);
    if ([5, 10, 20, 30].includes(value)) state.settings.newCardsPerDay = value;
  } else if (name === "retentionTarget") {
    const value = Number(rawValue);
    if ([0.85, 0.9, 0.93].includes(value)) state.settings.retentionTarget = value;
  } else if (name === "dailyMinutesGoal") {
    state.settings.dailyMinutesGoal = clamp(Math.round(Number(rawValue)), 5, 60);
  }

  saveData();
  renderStatistics();
}

function handleStudyAction(action) {
  if (!state.study || state.study.completed) return;

  if (action === "flip") {
    state.study.flipped = !state.study.flipped;
    const card = elements.contentArea.querySelector(".study-card");
    const panel = elements.contentArea.querySelector(".study-answer-panel");
    const front = elements.contentArea.querySelector(".study-card-front");
    const back = elements.contentArea.querySelector(".study-card-back");
    card?.classList.toggle("flipped", state.study.flipped);
    panel?.classList.toggle("visible", state.study.flipped);
    panel?.setAttribute("aria-hidden", String(!state.study.flipped));
    if (panel) panel.inert = !state.study.flipped;
    front?.setAttribute("aria-hidden", String(state.study.flipped));
    back?.setAttribute("aria-hidden", String(!state.study.flipped));
    return;
  }

  if (action === "hint") {
    state.study.hintVisible = !state.study.hintVisible;
    renderStudy();
    return;
  }

  if (action === "shuffle") {
    shuffleRemainingStudyCards();
    renderStudy();
    return;
  }

  if (action === "previous" && state.study.index > 0) {
    state.study.index -= 1;
    resetStudyCard();
    renderStudy();
    return;
  }

  if (action === "next" && state.study.index < state.study.cardIds.length - 1) {
    state.study.index += 1;
    resetStudyCard();
    renderStudy();
    return;
  }

  if (action === "practice-done") {
    const cardId = state.study.cardIds[state.study.index];
    state.study.responses[cardId] = "practice";
    advanceStudy();
  }
}

elements.newDeckSidebar.addEventListener("click", () => openDeckModal());
elements.statisticsNav.addEventListener("click", () => {
  state.view = "statistics";
  state.study = null;
  closeMobileMenu();
  render();
});
elements.securityNav.addEventListener("click", async () => {
  state.view = "security";
  state.study = null;
  closeMobileMenu();
  await refreshSafetyData();
  state.validationReport = validateCurrentData();
  render();
});
elements.topbarAction.addEventListener("click", () => handleAction(elements.topbarAction.dataset.action));
elements.accountSwitch.addEventListener("click", openUserSwitch);
elements.deckForm.addEventListener("submit", saveDeckFromForm);
elements.cardForm.addEventListener("submit", saveCardFromForm);
elements.importPreviewForm.addEventListener("submit", confirmImport);
elements.importFile.addEventListener("change", () => importFile(elements.importFile.files[0]));
elements.cardImage.addEventListener("change", async () => {
  const file = elements.cardImage.files[0];
  if (!file) return;
  elements.cardImage.disabled = true;
  elements.cardSubmitButton.disabled = true;
  try {
    state.cardImageDraft = await processCardImage(file);
    renderCardImagePreview();
    updateDuplicateWarning();
    showToast("Bild wurde verkleinert und für die Karte vorbereitet.");
  } catch (error) {
    elements.cardImage.value = "";
    showToast(error.message, "error");
  } finally {
    elements.cardImage.disabled = false;
    elements.cardSubmitButton.disabled = false;
  }
});
elements.cardImageRemove.addEventListener("click", () => {
  state.cardImageDraft = null;
  elements.cardImage.value = "";
  renderCardImagePreview();
  updateDuplicateWarning();
});
elements.cardImageAlt.addEventListener("input", () => {
  if (state.cardImageDraft) {
    state.cardImageDraft.alt = elements.cardImageAlt.value.trim();
    renderCardImagePreview();
  }
});
[elements.cardFront, elements.cardBack].forEach((input) => {
  input.addEventListener("input", updateDuplicateWarning);
});

elements.deckList.addEventListener("click", (event) => {
  const deckButton = event.target.closest("[data-deck-id]");
  if (!deckButton) return;
  state.activeDeckId = deckButton.dataset.deckId;
  state.view = "deck";
  state.study = null;
  state.searchQuery = "";
  state.cardTagFilter = "";
  state.cardMetaFilter = "all";
  closeMobileMenu();
  render();
});

elements.contentArea.addEventListener("click", (event) => {
  const markedButton = event.target.closest("[data-toggle-marked]");
  if (markedButton) {
    const cardId = markedButton.dataset.toggleMarked;
    const deck = state.decks.find((item) => item.cards.some((card) => card.id === cardId));
    const card = deck?.cards.find((item) => item.id === cardId);
    if (!card) return;
    card.marked = !card.marked;
    card.updatedAt = new Date().toISOString();
    deck.updatedAt = card.updatedAt;
    saveData();
    if (state.view === "study") renderStudy();
    else render();
    showToast(card.marked ? "Karte wurde markiert." : "Markierung wurde entfernt.");
    return;
  }

  const restoreTrashButton = event.target.closest("[data-restore-trash]");
  if (restoreTrashButton) {
    restoreTrashEntry(restoreTrashButton.dataset.restoreTrash);
    return;
  }

  const deleteTrashButton = event.target.closest("[data-delete-trash]");
  if (deleteTrashButton) {
    permanentlyDeleteTrash(deleteTrashButton.dataset.deleteTrash);
    return;
  }

  const restoreBackupButton = event.target.closest("[data-restore-backup]");
  if (restoreBackupButton) {
    restoreBackup(restoreBackupButton.dataset.restoreBackup);
    return;
  }

  const deleteBackupButton = event.target.closest("[data-delete-backup]");
  if (deleteBackupButton) {
    deleteBackup(deleteBackupButton.dataset.deleteBackup);
    return;
  }

  const rangeButton = event.target.closest("[data-stats-range]");
  if (rangeButton) {
    state.statsRange = Number(rangeButton.dataset.statsRange);
    renderStatistics();
    return;
  }

  const settingButton = event.target.closest("[data-setting]");
  if (settingButton) {
    updateSetting(settingButton.dataset.setting, settingButton.dataset.settingValue);
    return;
  }

  const problemButton = event.target.closest("[data-problem-card]");
  if (problemButton) {
    const deck = state.decks.find((item) => item.id === problemButton.dataset.problemDeck);
    const card = deck?.cards.find((item) => item.id === problemButton.dataset.problemCard);
    if (!deck || !card) return;
    state.activeDeckId = deck.id;
    state.searchQuery = card.front;
    state.view = "deck";
    render();
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (actionButton && !actionButton.disabled) {
    handleAction(actionButton.dataset.action);
    return;
  }

  const studyButton = event.target.closest("[data-study-action]");
  if (studyButton && !studyButton.disabled) {
    handleStudyAction(studyButton.dataset.studyAction);
    return;
  }

  const ratingButtonElement = event.target.closest("[data-rating]");
  if (ratingButtonElement && state.study?.flipped) {
    gradeCard(ratingButtonElement.dataset.rating);
    return;
  }

  const editButton = event.target.closest("[data-edit-card-id]");
  if (editButton) {
    openCardModal(editButton.dataset.editCardId);
    return;
  }

  const deleteButton = event.target.closest("[data-delete-card-id]");
  if (deleteButton) removeCard(deleteButton.dataset.deleteCardId);
});

elements.contentArea.addEventListener("input", (event) => {
  if (event.target.id !== "cardSearch") return;
  state.searchQuery = event.target.value;
  const deck = getActiveDeck();
  const host = document.querySelector("#cardListHost");
  if (deck && host) host.innerHTML = renderCardList(deck);
});

elements.contentArea.addEventListener("change", (event) => {
  if (event.target.id === "minutesGoal") {
    updateSetting("dailyMinutesGoal", event.target.value);
    return;
  }

  if (!["cardSort", "cardTagFilter", "cardMetaFilter"].includes(event.target.id)) return;
  if (event.target.id === "cardSort") state.sortOrder = event.target.value;
  if (event.target.id === "cardTagFilter") state.cardTagFilter = event.target.value;
  if (event.target.id === "cardMetaFilter") state.cardMetaFilter = event.target.value;
  const deck = getActiveDeck();
  const host = document.querySelector("#cardListHost");
  if (deck && host) host.innerHTML = renderCardList(deck);
});

elements.importPreviewContent.addEventListener("change", () => {
  if (state.importPreview?.type !== "csv") return;
  const mapping = {};
  elements.importPreviewContent.querySelectorAll("[data-import-mapping]").forEach((select) => {
    mapping[select.dataset.importMapping] = Number(select.value);
  });
  elements.importConfirmButton.disabled = mapping.front < 0 || mapping.back < 0;
});

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => closeDialog(document.querySelector(`#${button.dataset.close}`)));
});

[elements.deckModal, elements.cardModal, elements.importPreviewModal].forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog(dialog);
  });
});

elements.mobileMenu.addEventListener("click", () => {
  elements.sidebar.classList.add("open");
  elements.mobileBackdrop.classList.add("visible");
});
elements.mobileBackdrop.addEventListener("click", closeMobileMenu);

document.addEventListener("keydown", (event) => {
  if (state.view !== "study" || !state.study || state.study.completed) return;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;

  if (event.code === "Space") {
    event.preventDefault();
    handleStudyAction("flip");
  } else if (event.key === "ArrowLeft") {
    handleStudyAction("previous");
  } else if (event.key === "ArrowRight") {
    handleStudyAction("next");
  } else if (state.study.flipped && !state.study.practice && ["1", "2", "3", "4"].includes(event.key)) {
    gradeCard({ 1: "again", 2: "hard", 3: "good", 4: "easy" }[event.key]);
  }
});

window.WortwerkApp = Object.freeze({
  version: APP_VERSION,
  createUpdateBackup,
});

await initializeAccountGate();
await saveData();
render();
dispatchAppReadyOnce();
})().catch((error) => {
  console.error("Wortwerk konnte nicht gestartet werden.", error);
  document.body.classList.remove("auth-pending");
  window.dispatchEvent(new CustomEvent("wortwerk:error", { detail: error }));
  const contentArea = document.querySelector("#contentArea");
  if (contentArea) {
    contentArea.innerHTML = `
      <div class="empty-cards">
        <div>
          <h2>Wortwerk konnte nicht gestartet werden</h2>
          <p>Bitte lade die Seite neu. Deine bisherigen Browserdaten wurden nicht gelöscht.</p>
        </div>
      </div>
    `;
  }
});
