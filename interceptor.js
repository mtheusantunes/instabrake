(() => {
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const [resource, config] = args;
    const url = typeof resource === "string" ? resource : resource?.url || "";

    const isFeedLocked = document.documentElement.getAttribute("data-instabrake-feed-locked") === "true";

    if (isFeedLocked) {
      const isTimelineFeed = url.includes("/graphql/query") || url.includes("/api/v1/feed/");
      if (isTimelineFeed) {
        let isPagination = true;
        if (config && config.body) {
          const bodyStr = typeof config.body === "string" ? config.body : "";
          if (
            bodyStr.includes("Like") ||
            bodyStr.includes("Comment") ||
            bodyStr.includes("Direct") ||
            bodyStr.includes("Save")
          ) {
            isPagination = false;
          }
        }

        if (isPagination) {
          const emptyResponse = {
            data: {
              xdt_api__v1__feed__timeline: {
                items: [],
                more_available: false,
                next_max_id: null,
                pagination_token: null,
              },
            },
            items: [],
            more_available: false,
            next_max_id: null,
            status: "ok",
          };
          return new Response(JSON.stringify(emptyResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
    }

    return originalFetch.apply(this, args);
  };
})();
