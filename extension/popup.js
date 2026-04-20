const toggle = document.getElementById("prism-toggle");
const requestsEl = document.getElementById("stat-requests");
const tokensEl = document.getElementById("stat-tokens");
const fillerEl = document.getElementById("stat-filler");
const proxyStatusEl = document.getElementById("proxy-status");

function render(state, stats) {
  toggle.checked = Boolean(state.enabled);
  requestsEl.textContent = String(stats.requests ?? 0);
  tokensEl.textContent = String(stats.tokensSaved ?? 0);
  fillerEl.textContent = Number(stats.avgFillerRemoved ?? 0).toFixed(2);
}

async function fetchProxyHealth() {
  try {
    const response = await fetch("http://localhost:3179/health");
    if (!response.ok) {
      throw new Error("offline");
    }

    proxyStatusEl.textContent = "Proxy online";
    proxyStatusEl.classList.add("status-chip-live");
  } catch (_error) {
    proxyStatusEl.textContent = "Proxy offline";
    proxyStatusEl.classList.remove("status-chip-live");
  }
}

function loadState() {
  chrome.runtime.sendMessage({ type: "PRISM_GET_STATE" }, (state) => {
    chrome.runtime.sendMessage({ type: "PRISM_GET_STATS" }, (stats) => {
      render(state ?? { enabled: true }, stats ?? {});
    });
  });
}

toggle.addEventListener("change", () => {
  chrome.runtime.sendMessage(
    {
      type: "PRISM_SET_ENABLED",
      payload: { enabled: toggle.checked }
    },
    (state) => {
      render(state ?? { enabled: toggle.checked }, (state && state.stats) || {});
    }
  );
});

loadState();
void fetchProxyHealth();
