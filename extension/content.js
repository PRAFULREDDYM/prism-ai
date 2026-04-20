(function prismContentScript() {
  const BADGE_ID = "prism-extension-badge";
  let currentState = {
    enabled: true,
    stats: {
      requests: 0,
      tokensSaved: 0,
      fillerRemoved: 0,
      avgTokensSaved: 0,
      avgFillerRemoved: 0,
      lastSaved: 0
    }
  };

  function injectPageBridge() {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("page-bridge.js");
    script.async = false;
    document.documentElement.appendChild(script);
    script.remove();
  }

  function ensureBadge() {
    let badge = document.getElementById(BADGE_ID);
    if (badge) {
      return badge;
    }

    badge = document.createElement("div");
    badge.id = BADGE_ID;
    badge.className = "prism-pill";
    document.documentElement.appendChild(badge);
    return badge;
  }

  function renderBadge() {
    const badge = ensureBadge();
    if (!currentState.enabled) {
      badge.textContent = "◆ Prism off";
      badge.classList.add("prism-pill-off");
      return;
    }

    badge.classList.remove("prism-pill-off");
    badge.textContent = `◆ Prism active | saved ${currentState.stats.lastSaved ?? 0} tokens`;
  }

  function syncStateToPage() {
    window.postMessage(
      {
        source: "prism-extension",
        type: "PRISM_STATE",
        payload: { enabled: currentState.enabled }
      },
      "*"
    );
  }

  function requestState() {
    chrome.runtime.sendMessage({ type: "PRISM_GET_STATE" }, (state) => {
      if (!state) {
        return;
      }

      currentState = state;
      renderBadge();
      syncStateToPage();
    });
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "PRISM_STATE_SYNC") {
      currentState = message.payload;
      renderBadge();
      syncStateToPage();
    }
  });

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.source !== "prism-page" || event.data?.type !== "PRISM_RESPONSE") {
      return;
    }

    const payload = {
      tokensSaved: Number(event.data.payload?.tokensSaved ?? 0),
      fillerRemoved: Number(event.data.payload?.fillerRemoved ?? 0),
      intent: event.data.payload?.intent ?? "",
      domains: event.data.payload?.domains ?? ""
    };

    chrome.runtime.sendMessage({ type: "PRISM_REPORT_RESPONSE", payload }, (state) => {
      if (!state) {
        return;
      }

      currentState = state;
      renderBadge();
    });
  });

  injectPageBridge();
  requestState();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderBadge, { once: true });
  } else {
    renderBadge();
  }
})();
