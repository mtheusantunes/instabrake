import { labelsArray, defaultOptions, selectors, urls, hide } from "../modules/lib.js";

try {
  const interceptorScript = document.createElement("script");
  interceptorScript.src = chrome.runtime.getURL("interceptor.js");
  (document.head || document.documentElement).appendChild(interceptorScript);
  interceptorScript.onload = () => interceptorScript.remove();
} catch (error) {
  console.warn("InstaBrake interceptor load error:", error);
}

const translate = (key, substitutions) => chrome.i18n.getMessage(key, substitutions) || "";
const limitIconUrl = chrome.runtime.getURL("public/ib128.png");
let directReelViewerState = null;

async function main() {
  const loadedSettings = await new Promise((resolve) => {
    chrome.storage.sync.get(labelsArray, resolve);
  });

  if (Object.keys(loadedSettings || {}).length === 0) {
    chrome.storage.sync.set(defaultOptions);
  }

  const settings = Object.keys(loadedSettings || {}).length > 0 ? loadedSettings : defaultOptions;

  const mutationObserver = new MutationObserver(onMutation);

  const getVisibleDirectReelVideo = (body) => {
    if (!window.location.pathname.startsWith("/direct/")) {
      return null;
    }

    const videos = [...(body?.querySelectorAll("video") || [])];
    return videos
      .map((video) => ({ video, rect: video.getBoundingClientRect() }))
      .filter(({ video, rect }) => {
        const style = window.getComputedStyle(video);
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width >= window.innerWidth * 0.5 &&
          rect.height >= window.innerHeight * 0.5
        );
      })
      .sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height)[0]?.video || null;
  };

  const preventDirectReelScroll = (event) => {
    if (event.type === "keydown" && event.key === "Escape") {
      return;
    }
    event.preventDefault();
  };

  const lockDirectReelViewer = (video) => {
    if (!directReelViewerState) {
      directReelViewerState = {
        htmlOverflow: document.documentElement.style.overflow,
        bodyOverflow: document.body?.style.overflow || "",
        video,
      };
      document.documentElement.style.overflow = "hidden";
      if (document.body) {
        document.body.style.overflow = "hidden";
      }
      window.addEventListener("wheel", preventDirectReelScroll, { capture: true, passive: false });
      window.addEventListener("touchmove", preventDirectReelScroll, { capture: true, passive: false });
      window.addEventListener("keydown", preventDirectReelScroll, true);
    }

    if (directReelViewerState.video !== video) {
      directReelViewerState.video = video;
      video?.scrollIntoView({ block: "center", inline: "nearest" });
    }
  };

  const unlockDirectReelViewer = () => {
    if (!directReelViewerState) {
      return;
    }

    document.documentElement.style.overflow = directReelViewerState.htmlOverflow;
    if (document.body) {
      document.body.style.overflow = directReelViewerState.bodyOverflow;
    }
    window.removeEventListener("wheel", preventDirectReelScroll, true);
    window.removeEventListener("touchmove", preventDirectReelScroll, true);
    window.removeEventListener("keydown", preventDirectReelScroll, true);
    directReelViewerState = null;
  };

  const dismissAppPrompt = (body) => {
    const appButtonLabel = translate("useAppButton").replace(/\s+/g, " ").trim().toLowerCase();
    const appButton = [...body.querySelectorAll("button")].find((button) => {
      const text = button.textContent?.replace(/\s+/g, " ").trim().toLowerCase();
      return text === appButtonLabel;
    });

    if (!appButton) {
      return;
    }

    let container = appButton.parentElement;
    while (container && container !== body) {
      const closeButton = container
        .querySelector('[role="button"] svg[aria-label="Fechar"], [role="button"] svg[title="Fechar"]')
        ?.closest('[role="button"]');

      if (closeButton) {
        closeButton.click();
        return;
      }

      container = container.parentElement;
    }
  };

  function getReelsDayKey() {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${today.getFullYear()}-${month}-${day}`;
  }

  function getSeenReels() {
    try {
      const stored = JSON.parse(localStorage.getItem("instabrake_seen_reels") || "null");
      if (!stored || stored.date !== getReelsDayKey() || !Array.isArray(stored.ids)) {
        return new Set();
      }
      return new Set(stored.ids);
    } catch {
      return new Set();
    }
  }

  function addSeenReel(id) {
    const seen = getSeenReels();
    seen.add(id);
    localStorage.setItem(
      "instabrake_seen_reels",
      JSON.stringify({ date: getReelsDayKey(), ids: [...seen] }),
    );
    return seen.size;
  }

  function isProfilePage() {
    const segments = window.location.pathname.split("/").filter(Boolean);
    return (
      segments.length === 1 &&
      !/^(explore|reels?|stories|accounts|direct|about|privacy|terms|settings)$/.test(segments[0])
    );
  }

  function getProfileAvatar(target) {
    if (!isProfilePage()) {
      return null;
    }

    const image = target.closest?.("img");
    if (!image) {
      return null;
    }

    const alt = (image.getAttribute("alt") || "").toLowerCase();
    const username = window.location.pathname.split("/").filter(Boolean)[0];
    const profileLink = image.closest(`a[href="/${CSS.escape(username)}/"]`);
    const isProfileImage =
      alt.includes("profile") ||
      alt.includes("foto") ||
      alt.includes("perfil") ||
      Boolean(profileLink);
    const rect = image.getBoundingClientRect();
    if (!isProfileImage || rect.top > window.innerHeight || rect.width < 40 || rect.height < 40) {
      return null;
    }

    return image;
  }

  function showProfilePhoto(image) {
    let overlay = document.getElementById("instabrake-profile-photo-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "instabrake-profile-photo-overlay";
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 1000000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4vw;
        box-sizing: border-box;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
      `;
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
          overlay.remove();
        }
      });
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <img src="${image.currentSrc || image.src}" alt="${translate("profilePictureAlt")}" style="
        display: block;
        width: min(92vw, 800px);
        max-width: 92vw;
        max-height: 800px;
        height: auto;
        border-radius: 50%;
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
        user-select: none;
      ">
    `;
  }

  function setupProfilePhotoViewer() {
    if (document.documentElement.dataset.instabrakeProfilePhotoReady === "true") {
      return;
    }
    document.documentElement.dataset.instabrakeProfilePhotoReady = "true";

    let pressTimer = null;
    let activeImage = null;
    let longPress = false;
    let suppressClickUntil = 0;

    document.addEventListener("pointerdown", (event) => {
      const image = getProfileAvatar(event.target);
      if (!image) {
        return;
      }

      activeImage = image;
      longPress = false;
      window.clearTimeout(pressTimer);
      pressTimer = window.setTimeout(() => {
        if (activeImage === image) {
          longPress = true;
          suppressClickUntil = Date.now() + 1000;
          event.preventDefault();
          event.stopPropagation();
          showProfilePhoto(image);
        }
      }, 500);
    }, true);

    document.addEventListener("pointerup", (event) => {
      window.clearTimeout(pressTimer);
      if (activeImage && longPress) {
        event.preventDefault();
        event.stopPropagation();
        suppressClickUntil = Date.now() + 1000;
      }
      activeImage = null;
    }, true);

    document.addEventListener("pointercancel", () => {
      window.clearTimeout(pressTimer);
      activeImage = null;
      longPress = false;
    }, true);

    document.addEventListener("click", (event) => {
      if (Date.now() < suppressClickUntil && getProfileAvatar(event.target)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);
  }

  function onMutation() {
    const path = window.location.pathname;
    const body = document.body;
    if (!body) {
      return;
    }

    dismissAppPrompt(body);
    setupProfilePhotoViewer();
    const directReelVideo = settings.blockReels || settings.limitReels ? getVisibleDirectReelVideo(body) : null;

    if (directReelVideo) {
      lockDirectReelViewer(directReelVideo);
    } else {
      unlockDirectReelViewer();
    }
  
    if(settings.blockThreads) {
      const threadLinks = body?.querySelectorAll(selectors.nav.threads);
      hide(threadLinks);
    }
    
    if (settings.blockExplore) {
      const exploreLink = body?.querySelectorAll(selectors.nav.explore);
      hide(exploreLink); 
    }

    if (settings.blockReels) {
      const reelsLink = body?.querySelectorAll(selectors.nav.reels);
      hide(reelsLink); 
    }

    if (path === urls.base) {
      const queryParams = new URLSearchParams(window.location.search);
      const isFollowingFeed = queryParams.get("variant") === "following";
     
      if (settings.blockStories) {
        const storyFeed = body?.querySelector(selectors.storyFeed);
        hide(storyFeed);
      }

      const shouldBlockPosts = (isFollowingFeed && settings.blockFollowingPosts) || (!isFollowingFeed && settings.blockPosts);
      if (shouldBlockPosts) {
        const posts = body?.querySelector(selectors.posts);
        const postsLoader = body?.querySelector(selectors.postsLoader);
        const postsContainer = posts?.parentElement?.parentElement?.parentElement;
        hide(posts);
        hide(postsLoader);
        hide(postsContainer);
        posts?.setAttribute("data-instabrake-hidden-post", "true");
        postsContainer?.setAttribute("data-instabrake-hidden-post-container", "true");
      } else {
        // Restore only elements hidden by the extension while handling the other feed.
        body?.querySelectorAll("[data-instabrake-hidden-post]").forEach((post) => {
          post.style.display = "";
          post.removeAttribute("data-instabrake-hidden-post");
        });
        body?.querySelectorAll("[data-instabrake-hidden-post-container]").forEach((container) => {
          container.style.display = "";
          container.removeAttribute("data-instabrake-hidden-post-container");
        });
      }

      // Limit number of posts in Following feed
      if (isFollowingFeed && settings.limitFollowingPosts && !settings.blockFollowingPosts) {
        const followingLimit = Math.max(1, parseInt(settings.followingPostsLimit, 10) || 10);
        const allPosts = body?.querySelectorAll(selectors.posts);
        
        if (allPosts && allPosts.length > 0) {
          if (allPosts.length > followingLimit) {
            document.documentElement.setAttribute("data-instabrake-feed-locked", "true");

            allPosts.forEach((post, index) => {
              if (index >= followingLimit) {
                post.style.display = "none";
              }
            });

            // Remove any loader elements from the DOM to prevent IntersectionObserver triggers
            body?.querySelectorAll(selectors.postsLoader)?.forEach((loader) => loader.remove());

            let feedLimitMsg = document.getElementById("instabrake-feed-limit-msg");
            if (!feedLimitMsg) {
              feedLimitMsg = document.createElement("div");
              feedLimitMsg.id = "instabrake-feed-limit-msg";
              feedLimitMsg.style.cssText = `
                margin: 32px auto;
                padding: 24px 20px;
                text-align: center;
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 12px;
                max-width: 470px;
                width: 90%;
                box-sizing: border-box;
                color: #ffffff;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              `;
              feedLimitMsg.innerHTML = `
                <img src="${limitIconUrl}" alt="" style="display: block; width: 64px; height: 64px; margin: 0 auto 8px;">
                <div style="font-size: 16px; font-weight: 600; margin-bottom: 6px;">${translate("scrollLimitTitle")}</div>
                <div style="font-size: 13px; color: #a8a8a8; line-height: 1.4;">
                  ${translate("scrollLimitMessage", String(followingLimit))}
                </div>
              `;
              const lastVisible = allPosts[followingLimit - 1];
              if (lastVisible && lastVisible.parentElement) {
                lastVisible.insertAdjacentElement("afterend", feedLimitMsg);
              }
            }
          } else {
            document.documentElement.removeAttribute("data-instabrake-feed-locked");
          }
        }
      } else {
        document.documentElement.removeAttribute("data-instabrake-feed-locked");
      }

      if (settings.blockSuggestedFollowers) {
        const suggestedFollowersLink = body?.querySelector(selectors.suggestedFollowers);
        const suggestedFollowersTitle = suggestedFollowersLink?.closest("div");
        const suggestedFollowers = suggestedFollowersTitle?.nextElementSibling;
        hide(suggestedFollowersLink);
        hide(suggestedFollowersTitle);
        hide(suggestedFollowers);
      }

      // Redirect to 'Following' feed
      if (settings.blockForYouFeed) {
        const queryParams = new URLSearchParams(window.location.search);
        if (queryParams?.get("variant") === "home" || queryParams?.get("variant") === null) {
          queryParams.set("variant", "following");
          window.location.search = queryParams.toString();
        }
      }
    }

    const blockStoriesSection = path.includes(urls.stories) && settings.blockStories;
    if (blockStoriesSection) {
      const storiesSection = body;
      hide(storiesSection);
    }

    const isReelsScreen = path.includes(urls.reels) || path.startsWith("/reel");
    if (isReelsScreen) {
      if (settings.blockReels) {
        const main = body?.querySelector(selectors.main);
        hide(main);
      } else if (settings.limitReels) {
        const reelsLimit = Math.max(1, parseInt(settings.reelsLimit, 10) || 10);
        
        // 1. Check current URL for active reel ID
        const urlMatch = path.match(/\/(?:reels|reel)\/([A-Za-z0-9_-]+)/);
        if (urlMatch && urlMatch[1]) {
          addSeenReel(urlMatch[1]);
        }

        // 2. Check active video in center viewport (avoids counting pre-loaded hidden reels)
        const mainVideos = body?.querySelectorAll("main video");
        mainVideos?.forEach((video) => {
          const rect = video.getBoundingClientRect();
          const isCentered = rect.top < window.innerHeight * 0.6 && rect.bottom > window.innerHeight * 0.4;
          if (isCentered) {
            const link = video.closest("a") || video.closest("[role='article']")?.querySelector("a[href*='/reel/'], a[href*='/reels/']");
            const m = link?.getAttribute("href")?.match(/\/(?:reels|reel)\/([A-Za-z0-9_-]+)/);
            if (m && m[1]) {
              addSeenReel(m[1]);
            }
          }
        });

        const seenCount = getSeenReels().size;
        // Block only when user exceeds the configured limit (after watching reelsLimit reels)
        if (seenCount > reelsLimit) {
          body?.querySelectorAll("video").forEach((v) => v.pause());
          const main = body?.querySelector(selectors.main);
          hide(main);

          let reelsOverlay = document.getElementById("instabrake-reels-limit-overlay");
          if (!reelsOverlay) {
            reelsOverlay = document.createElement("div");
            reelsOverlay.id = "instabrake-reels-limit-overlay";
            reelsOverlay.style.cssText = `
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              background: #000000;
              z-index: 999999;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              text-align: center;
              padding: 24px;
              box-sizing: border-box;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            `;
            reelsOverlay.innerHTML = `
              <img src="${limitIconUrl}" alt="" style="display: block; width: 96px; height: 96px; margin: 0 auto 16px;">
              <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #ffffff;">${translate("reelsLimitTitle")}</h2>
              <p style="font-size: 14px; color: #a8a8a8; max-width: 380px; line-height: 1.5; margin-bottom: 24px;">
                ${translate("reelsLimitMessage", String(reelsLimit))}
              </p>
              <a href="/" style="
                background: #e1306c;
                color: #ffffff;
                padding: 10px 24px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: 600;
                font-size: 14px;
                display: inline-block;
              ">${translate("goHome")}</a>
            `;
            document.body.appendChild(reelsOverlay);
          }
        }
      }
    }

    const blockExploreScreen = path.includes(urls.explore) && settings.blockExplore;
    if (blockExploreScreen) {
      const main = body?.querySelector(selectors.main);
      hide(main);
    }
  }

  // Handle Instagram SPA navigation, including mobile web.
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    window.dispatchEvent(new Event("locationchange"));
  };
  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    window.dispatchEvent(new Event("locationchange"));
  };

  window.addEventListener("popstate", onMutation);
  window.addEventListener("locationchange", onMutation);

  // Start observing the DOM for changes
  mutationObserver.observe(document, {
    subtree: true,
    childList: true
  });

  window.addEventListener("scroll", onMutation, { passive: true });

  onMutation([{ addedNodes: [document.documentElement] }]);
}

export { main };
