(function prismPageBridge() {
  const prismState = { enabled: true };
  const TARGET_PATTERN = /^https:\/\/api\.anthropic\.com\/v1\/messages/;
  const LOCAL_TARGET = "http://localhost:3179/v1/messages";

  function rewriteUrl(url) {
    return typeof url === "string" && TARGET_PATTERN.test(url) ? LOCAL_TARGET : url;
  }

  function emitResponse(payload) {
    try {
      window.postMessage(
        {
          source: "prism-page",
          type: "PRISM_RESPONSE",
          payload
        },
        "*"
      );
    } catch (_error) {}
  }

  function emitFetchResponse(response) {
    emitResponse({
      intent: response.headers.get("x-prism-intent") || "",
      domains: response.headers.get("x-prism-domains") || "",
      tokensSaved: Number(response.headers.get("x-prism-tokens-saved") || 0),
      fillerRemoved: Number(response.headers.get("x-prism-filler-removed") || 0)
    });
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
    if (!prismState.enabled || !TARGET_PATTERN.test(url)) {
      return originalFetch(input, init);
    }

    const rewritten = rewriteUrl(url);
    const nextInput = input instanceof Request ? new Request(rewritten, input) : rewritten;
    const response = await originalFetch(nextInput, init);
    emitFetchResponse(response);
    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
    const tracked = prismState.enabled && typeof url === "string" && TARGET_PATTERN.test(url);
    const nextUrl = tracked ? rewriteUrl(url) : url;
    this.__prismTracked = tracked;
    return originalOpen.call(this, method, nextUrl, async ?? true, user, password);
  };

  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (body) {
    if (this.__prismTracked) {
      this.addEventListener(
        "loadend",
        () => {
          emitResponse({
            intent: this.getResponseHeader("x-prism-intent") || "",
            domains: this.getResponseHeader("x-prism-domains") || "",
            tokensSaved: Number(this.getResponseHeader("x-prism-tokens-saved") || 0),
            fillerRemoved: Number(this.getResponseHeader("x-prism-filler-removed") || 0)
          });
        },
        { once: true }
      );
    }

    return originalSend.call(this, body);
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.source !== "prism-extension") {
      return;
    }

    if (event.data.type === "PRISM_STATE") {
      prismState.enabled = Boolean(event.data.payload?.enabled);
    }
  });
})();
