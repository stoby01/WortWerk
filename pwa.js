(function initializeWortwerkPWA() {
  const PWA_VERSION = "0.6.4";
  const elements = {
    launchScreen: document.querySelector("#appLaunchScreen"),
    launchStatus: document.querySelector("#appLaunchStatus"),
    installCard: document.querySelector("#pwaInstallCard"),
    installTitle: document.querySelector("#pwaInstallTitle"),
    installText: document.querySelector("#pwaInstallText"),
    installButton: document.querySelector("#pwaInstallButton"),
    installDismiss: document.querySelector("#pwaInstallDismiss"),
    updateBanner: document.querySelector("#pwaUpdateBanner"),
    updateButton: document.querySelector("#pwaUpdateButton"),
    updateDismiss: document.querySelector("#pwaUpdateDismiss"),
    updateStatus: document.querySelector("#pwaUpdateStatus"),
    connectionStatus: document.querySelector("#connectionStatus"),
  };

  let deferredInstallPrompt = null;
  let waitingWorker = null;
  let appReady = false;
  let reloadStarted = false;

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  const isAppleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
  const canUseServiceWorker =
    "serviceWorker" in navigator && (window.isSecureContext || isLocalHost);

  function setHidden(element, hidden) {
    if (element) element.hidden = hidden;
  }

  function hideLaunchScreen() {
    if (!elements.launchScreen) return;
    elements.launchScreen.classList.add("is-finished");
    window.setTimeout(() => elements.launchScreen?.remove(), 420);
  }

  function showLaunchError() {
    if (!elements.launchScreen) return;
    elements.launchScreen.classList.add("has-error");
    if (elements.launchStatus) {
      elements.launchStatus.textContent = "Der Start ist fehlgeschlagen. Bitte lade die App neu.";
    }
  }

  function updateConnectionStatus() {
    if (!elements.connectionStatus) return;
    const offline = !navigator.onLine;
    elements.connectionStatus.textContent = offline
      ? "Offline – deine lokalen Daten bleiben verfügbar"
      : "Wieder online";
    elements.connectionStatus.classList.toggle("is-offline", offline);
    elements.connectionStatus.classList.toggle("is-online", !offline);
    setHidden(elements.connectionStatus, false);

    window.clearTimeout(updateConnectionStatus.hideTimer);
    updateConnectionStatus.hideTimer = window.setTimeout(
      () => setHidden(elements.connectionStatus, true),
      offline ? 4500 : 2200,
    );
  }

  function installCardWasDismissed() {
    try {
      return sessionStorage.getItem("wortwerk-install-dismissed") === "1";
    } catch {
      return false;
    }
  }

  function dismissInstallCard() {
    setHidden(elements.installCard, true);
    try {
      sessionStorage.setItem("wortwerk-install-dismissed", "1");
    } catch {
      // Die Installation funktioniert auch ohne Session-Speicher.
    }
  }

  function showInstallCard(mode) {
    if (isStandalone || installCardWasDismissed() || !elements.installCard) return;

    setHidden(elements.installCard, false);
    setHidden(elements.installButton, mode !== "prompt");

    const content = {
      prompt: {
        title: "Wortwerk als App installieren",
        text: "Schneller starten, im Vollbild lernen und nach dem ersten Laden auch offline arbeiten.",
      },
      ios: {
        title: "Wortwerk zum Home-Bildschirm",
        text: "Tippe in Safari auf „Teilen“ und danach auf „Zum Home-Bildschirm“.",
      },
      insecure: {
        title: "Für die App-Installation fehlt HTTPS",
        text: "Im Heimnetz kannst du Wortwerk testen. Installation und Offline-Modus funktionieren auf dem Smartphone über eine HTTPS-Adresse.",
      },
    }[mode];

    elements.installTitle.textContent = content.title;
    elements.installText.textContent = content.text;
  }

  async function requestInstallation() {
    if (!deferredInstallPrompt) return;
    elements.installButton.disabled = true;
    try {
      await deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice.outcome === "accepted") {
        deferredInstallPrompt = null;
        setHidden(elements.installCard, true);
      }
    } catch (error) {
      console.error("Die Installation konnte nicht gestartet werden.", error);
    } finally {
      elements.installButton.disabled = false;
    }
  }

  function showUpdate(worker) {
    waitingWorker = worker;
    if (!elements.updateBanner) return;
    elements.updateStatus.textContent =
      "Eine neue Wortwerk-Version ist bereit. Vor der Aktualisierung wird lokal gesichert.";
    elements.updateButton.disabled = !appReady;
    setHidden(elements.updateBanner, false);
  }

  async function applyUpdate() {
    if (!waitingWorker || !appReady) return;
    elements.updateButton.disabled = true;
    elements.updateDismiss.disabled = true;
    elements.updateStatus.textContent = "Daten werden vor dem Update gesichert …";

    try {
      const backupCreated = await window.WortwerkApp?.createUpdateBackup?.();
      if (backupCreated !== true) {
        throw new Error("Die lokale Sicherung konnte nicht erstellt werden.");
      }
      elements.updateStatus.textContent = "Sicherung fertig. Wortwerk wird aktualisiert …";
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    } catch (error) {
      console.error("Das Wortwerk-Update wurde abgebrochen.", error);
      elements.updateStatus.textContent =
        "Das Update wurde nicht gestartet, weil die Sicherung fehlgeschlagen ist.";
      elements.updateButton.disabled = false;
      elements.updateDismiss.disabled = false;
    }
  }

  async function registerServiceWorker() {
    if (!canUseServiceWorker) {
      if (!window.isSecureContext && !isLocalHost) showInstallCard("insecure");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js", {
        updateViaCache: "none",
      });

      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdate(registration.waiting);
      }

      registration.addEventListener("updatefound", () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener("statechange", () => {
          if (
            installingWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            showUpdate(registration.waiting || installingWorker);
          }
        });
      });

      window.setTimeout(() => registration.update().catch(() => {}), 4000);
      window.setInterval(() => {
        if (document.visibilityState === "visible") registration.update().catch(() => {});
      }, 60 * 60 * 1000);
    } catch (error) {
      console.error("Der Offline-Modus konnte nicht aktiviert werden.", error);
    }
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    showInstallCard("prompt");
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    setHidden(elements.installCard, true);
  });

  window.addEventListener("online", updateConnectionStatus);
  window.addEventListener("offline", updateConnectionStatus);

  window.addEventListener("wortwerk:ready", () => {
    appReady = true;
    if (elements.updateButton) elements.updateButton.disabled = !waitingWorker;
    window.setTimeout(hideLaunchScreen, 160);

    if (!isStandalone && isAppleMobile && window.isSecureContext) {
      window.setTimeout(() => showInstallCard("ios"), 850);
    }
  });

  window.addEventListener("wortwerk:error", showLaunchError);

  navigator.serviceWorker?.addEventListener("controllerchange", () => {
    if (reloadStarted) return;
    reloadStarted = true;
    window.location.reload();
  });

  elements.installButton?.addEventListener("click", requestInstallation);
  elements.installDismiss?.addEventListener("click", dismissInstallCard);
  elements.updateButton?.addEventListener("click", applyUpdate);
  elements.updateDismiss?.addEventListener("click", () => setHidden(elements.updateBanner, true));

  window.WortwerkPWA = {
    version: PWA_VERSION,
    canUseServiceWorker,
    isStandalone,
  };

  registerServiceWorker();
})();
