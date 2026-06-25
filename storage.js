(function createWortwerkStorage(global) {
  const DB_NAME = "WortwerkDB";
  const DB_VERSION = 1;
  const MAX_BACKUPS = 12;
  const STORES = {
    decks: "decks",
    cards: "cards",
    reviews: "reviews",
    settings: "settings",
    trash: "trash",
    backups: "backups",
    meta: "meta",
  };

  let databasePromise;
  let writeQueue = Promise.resolve();

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function transactionComplete(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error("Transaktion abgebrochen"));
    });
  }

  function openDatabase() {
    if (databasePromise) return databasePromise;

    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(STORES.decks)) {
          const store = db.createObjectStore(STORES.decks, { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt");
          store.createIndex("name", "name");
        }

        if (!db.objectStoreNames.contains(STORES.cards)) {
          const store = db.createObjectStore(STORES.cards, { keyPath: "id" });
          store.createIndex("deckId", "deckId");
          store.createIndex("dueAt", "learning.dueAt");
          store.createIndex("status", "learning.status");
          store.createIndex("updatedAt", "updatedAt");
        }

        if (!db.objectStoreNames.contains(STORES.reviews)) {
          const store = db.createObjectStore(STORES.reviews, { keyPath: "id" });
          store.createIndex("cardId", "cardId");
          store.createIndex("deckId", "deckId");
          store.createIndex("reviewedAt", "reviewedAt");
        }

        if (!db.objectStoreNames.contains(STORES.settings)) {
          db.createObjectStore(STORES.settings, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(STORES.trash)) {
          const store = db.createObjectStore(STORES.trash, { keyPath: "id" });
          store.createIndex("deletedAt", "deletedAt");
          store.createIndex("kind", "kind");
        }

        if (!db.objectStoreNames.contains(STORES.backups)) {
          const store = db.createObjectStore(STORES.backups, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt");
        }

        if (!db.objectStoreNames.contains(STORES.meta)) {
          db.createObjectStore(STORES.meta, { keyPath: "key" });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("Die Datenbank wird noch in einem anderen Tab verwendet."));
    });

    return databasePromise;
  }

  function enqueueWrite(operation) {
    const next = writeQueue.then(operation, operation);
    writeQueue = next.catch(() => {});
    return next;
  }

  async function getAll(storeName) {
    const db = await openDatabase();
    const transaction = db.transaction(storeName, "readonly");
    const result = await requestToPromise(transaction.objectStore(storeName).getAll());
    await transactionComplete(transaction);
    return result;
  }

  async function getOne(storeName, key) {
    const db = await openDatabase();
    const transaction = db.transaction(storeName, "readonly");
    const result = await requestToPromise(transaction.objectStore(storeName).get(key));
    await transactionComplete(transaction);
    return result;
  }

  async function readData() {
    const [decks, cards, reviews, settingsRecord] = await Promise.all([
      getAll(STORES.decks),
      getAll(STORES.cards),
      getAll(STORES.reviews),
      getOne(STORES.settings, "user"),
    ]);

    const cardsByDeck = new Map();
    cards.forEach((cardRecord) => {
      const { deckId, ...card } = cardRecord;
      if (!cardsByDeck.has(deckId)) cardsByDeck.set(deckId, []);
      cardsByDeck.get(deckId).push(card);
    });

    return {
      decks: decks.map((deck) => ({
        ...deck,
        cards: cardsByDeck.get(deck.id) ?? [],
      })),
      reviewLog: reviews,
      settings: settingsRecord ? settingsRecord.value : undefined,
    };
  }

  async function persistData(data, schemaVersion) {
    return enqueueWrite(async () => {
      const db = await openDatabase();
      const transaction = db.transaction(
        [STORES.decks, STORES.cards, STORES.reviews, STORES.settings, STORES.meta],
        "readwrite",
      );
      const deckStore = transaction.objectStore(STORES.decks);
      const cardStore = transaction.objectStore(STORES.cards);
      const reviewStore = transaction.objectStore(STORES.reviews);
      const settingsStore = transaction.objectStore(STORES.settings);
      const metaStore = transaction.objectStore(STORES.meta);

      deckStore.clear();
      cardStore.clear();
      reviewStore.clear();

      data.decks.forEach((deck) => {
        const { cards, ...deckRecord } = deck;
        deckStore.put(deckRecord);
        cards.forEach((card) => cardStore.put({ ...card, deckId: deck.id }));
      });
      data.reviewLog.forEach((review) => reviewStore.put(review));
      settingsStore.put({ id: "user", value: data.settings });
      metaStore.put({
        key: "database",
        initialized: true,
        schemaVersion,
        updatedAt: new Date().toISOString(),
      });

      await transactionComplete(transaction);
    });
  }

  async function addTrash(entry) {
    return enqueueWrite(async () => {
      const db = await openDatabase();
      const transaction = db.transaction(STORES.trash, "readwrite");
      transaction.objectStore(STORES.trash).put(entry);
      await transactionComplete(transaction);
    });
  }

  async function deleteTrash(id) {
    return enqueueWrite(async () => {
      const db = await openDatabase();
      const transaction = db.transaction(STORES.trash, "readwrite");
      transaction.objectStore(STORES.trash).delete(id);
      await transactionComplete(transaction);
    });
  }

  async function clearTrash() {
    return enqueueWrite(async () => {
      const db = await openDatabase();
      const transaction = db.transaction(STORES.trash, "readwrite");
      transaction.objectStore(STORES.trash).clear();
      await transactionComplete(transaction);
    });
  }

  async function createBackup(data, reason, schemaVersion, kind = "automatic") {
    return enqueueWrite(async () => {
      const db = await openDatabase();
      const transaction = db.transaction(STORES.backups, "readwrite");
      const store = transaction.objectStore(STORES.backups);
      const now = new Date().toISOString();
      store.put({
        id: global.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        createdAt: now,
        reason,
        kind,
        schemaVersion,
        summary: summarizeData(data),
        data: structuredClone(data),
      });

      const backups = await requestToPromise(store.getAll());
      backups
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(MAX_BACKUPS)
        .forEach((backup) => store.delete(backup.id));
      await transactionComplete(transaction);
    });
  }

  async function deleteBackup(id) {
    return enqueueWrite(async () => {
      const db = await openDatabase();
      const transaction = db.transaction(STORES.backups, "readwrite");
      transaction.objectStore(STORES.backups).delete(id);
      await transactionComplete(transaction);
    });
  }

  function summarizeData(data) {
    return {
      decks: data.decks.length,
      cards: data.decks.reduce((sum, deck) => sum + deck.cards.length, 0),
      reviews: data.reviewLog.length,
    };
  }

  async function ensureDailyBackup(data, schemaVersion) {
    const count = data.decks.reduce((sum, deck) => sum + deck.cards.length, 0);
    if (!data.decks.length && !count && !data.reviewLog.length) return false;

    const backups = await getAll(STORES.backups);
    const today = new Date().toLocaleDateString("sv-SE");
    const exists = backups.some(
      (backup) =>
        backup.kind === "automatic" &&
        new Date(backup.createdAt).toLocaleDateString("sv-SE") === today,
    );
    if (exists) return false;
    await createBackup(data, "Automatische Tagessicherung", schemaVersion, "automatic");
    return true;
  }

  async function initialize(fallbackData, schemaVersion) {
    if (!("indexedDB" in global)) {
      throw new Error("IndexedDB wird von diesem Browser nicht unterstützt.");
    }

    await openDatabase();
    const meta = await getOne(STORES.meta, "database");
    let migrationReport;

    if (!meta?.initialized) {
      await persistData(fallbackData, schemaVersion);
      migrationReport = {
        performed: true,
        completedAt: new Date().toISOString(),
        source: fallbackData.sourceKey ?? "leere Sammlung",
        ...summarizeData(fallbackData),
      };

      const db = await openDatabase();
      const transaction = db.transaction(STORES.meta, "readwrite");
      transaction.objectStore(STORES.meta).put({
        key: "migration-report",
        ...migrationReport,
      });
      await transactionComplete(transaction);
    } else {
      migrationReport = await getOne(STORES.meta, "migration-report");
    }

    const data = await readData();
    await ensureDailyBackup(data, schemaVersion);

    return {
      data,
      trash: await getAll(STORES.trash),
      backups: await getAll(STORES.backups),
      migrationReport,
      database: {
        name: DB_NAME,
        version: DB_VERSION,
      },
    };
  }

  global.WortwerkStorage = {
    initialize,
    persistData,
    addTrash,
    deleteTrash,
    clearTrash,
    listTrash: () => getAll(STORES.trash),
    createBackup,
    deleteBackup,
    listBackups: () => getAll(STORES.backups),
    getBackup: (id) => getOne(STORES.backups, id),
    ensureDailyBackup,
  };
})(window);
