const DEFAULT_STATE = {
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

async function getState() {
  const stored = await chrome.storage.local.get(DEFAULT_STATE);
  return {
    enabled: stored.enabled ?? DEFAULT_STATE.enabled,
    stats: { ...DEFAULT_STATE.stats, ...(stored.stats ?? {}) }
  };
}

async function setState(partial) {
  const current = await getState();
  const next = {
    ...current,
    ...partial,
    stats: {
      ...current.stats,
      ...(partial.stats ?? {})
    }
  };
  await chrome.storage.local.set(next);
  return next;
}

async function broadcastState() {
  const state = await getState();
  const tabs = await chrome.tabs.query({ url: "https://claude.ai/*" });
  for (const tab of tabs) {
    if (!tab.id) {
      continue;
    }

    chrome.tabs.sendMessage(tab.id, { type: "PRISM_STATE_SYNC", payload: state }).catch(() => {});
  }
}

async function reportResponse(payload) {
  const current = await getState();
  const requests = current.stats.requests + 1;
  const tokensSaved = current.stats.tokensSaved + (payload.tokensSaved ?? 0);
  const fillerRemoved = current.stats.fillerRemoved + (payload.fillerRemoved ?? 0);

  const next = await setState({
    stats: {
      requests,
      tokensSaved,
      fillerRemoved,
      avgTokensSaved: requests === 0 ? 0 : tokensSaved / requests,
      avgFillerRemoved: requests === 0 ? 0 : fillerRemoved / requests,
      lastSaved: payload.tokensSaved ?? 0
    }
  });

  await broadcastState();
  return next;
}

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set(DEFAULT_STATE);
});

chrome.runtime.onStartup.addListener(async () => {
  const state = await getState();
  await chrome.storage.local.set(state);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  void (async () => {
    switch (message?.type) {
      case "PRISM_GET_STATE":
        sendResponse(await getState());
        return;
      case "PRISM_SET_ENABLED": {
        const next = await setState({ enabled: Boolean(message.payload?.enabled) });
        await broadcastState();
        sendResponse(next);
        return;
      }
      case "PRISM_REPORT_RESPONSE":
        sendResponse(await reportResponse(message.payload ?? {}));
        return;
      case "PRISM_GET_STATS": {
        const state = await getState();
        sendResponse(state.stats);
        return;
      }
      default:
        sendResponse({ ok: false });
    }
  })();

  return true;
});
