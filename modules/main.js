import { labelsArray, defaultOptions, selectors, urls, hide } from "../modules/lib.js";

let extensionContextInvalidated = false;
let activeMutationObserver = null;

function handleExtensionContextError(error) {
  const message = error instanceof Error ? error.message : String(error?.message || error);
  if (message.includes("Extension context invalidated")) {
    extensionContextInvalidated = true;
    activeMutationObserver?.disconnect();
    return true;
  }
  return false;
}

function getExtensionUrl(path) {
  try {
    return chrome.runtime.getURL(path);
  } catch (error) {
    if (handleExtensionContextError(error)) {
      return "";
    }
    throw error;
  }
}

try {
  const interceptorScript = document.createElement("script");
  interceptorScript.src = getExtensionUrl("interceptor.js");
  if (!interceptorScript.src) {
    throw new Error("InstaBrake interceptor URL is unavailable.");
  }
  (document.head || document.documentElement).appendChild(interceptorScript);
  interceptorScript.onload = () => interceptorScript.remove();
} catch (error) {
  if (!extensionContextInvalidated && !handleExtensionContextError(error)) {
    console.warn("InstaBrake interceptor load error:", error);
  }
}

const translate = (key, substitutions) => {
  try {
    return chrome.i18n.getMessage(key, substitutions) || "";
  } catch (error) {
    if (handleExtensionContextError(error)) {
      return "";
    }
    throw error;
  }
};

const limitIconUrl = getExtensionUrl("public/ib128.png");
let directReelViewerState = null;

async function main() {
  if (extensionContextInvalidated) {
    return;
  }

  let loadedSettings;
  try {
    loadedSettings = await new Promise((resolve, reject) => {
      try {
        chrome.storage.sync.get(labelsArray, (settings) => {
          try {
            const lastError = chrome.runtime.lastError;
            if (lastError) {
              reject(lastError);
              return;
            }
            resolve(settings);
          } catch (error) {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  } catch (error) {
    if (handleExtensionContextError(error)) {
      return;
    }
    throw error;
  }

  if (Object.keys(loadedSettings || {}).length === 0) {
    try {
      chrome.storage.sync.set(defaultOptions);
    } catch (error) {
      if (handleExtensionContextError(error)) {
        return;
      }
      throw error;
    }
  }

  const settings = Object.keys(loadedSettings || {}).length > 0 ? loadedSettings : defaultOptions;

  const mutationObserver = new MutationObserver(onMutation);
  activeMutationObserver = mutationObserver;

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

  function getHomeLogoLink(body) {
    const homeLinks = [...body.querySelectorAll('a[href="/"]')].filter((link) => {
      const rect = link.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.top < 160;
    });

    return homeLinks.find((link) => {
      const label = link.querySelector("svg")?.getAttribute("aria-label")?.toLowerCase();
      const title = link.querySelector("svg title")?.textContent?.toLowerCase();
      return label === "instagram" || title === "instagram";
    }) || homeLinks.find((link) => link.querySelector("svg"));
  }

  function closeHomeFeedMenu() {
    document.getElementById("instabrake-home-feed-menu")?.remove();
  }

  function isDesktopInterface() {
    return window.innerWidth >= 768;
  }

  function showHomeFeedMenu(anchor) {
    closeHomeFeedMenu();

    const menu = document.createElement("div");
    menu.id = "instabrake-home-feed-menu";
    menu.setAttribute("role", "dialog");
    menu.style.cssText = `
      position: fixed;
      z-index: 1000000;
      min-width: 220px;
      padding: 8px 0;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      background: #262626;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
      color: #f5f5f5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    `;

    const followingIcon = `
      <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path clip-rule="evenodd" d="M9.874 14.438c3.5 0 6.611 1.662 8.46 4.224.945 1.308.2 3.019-1.26 3.423-1.5.416-3.973.915-7.2.915-3.224 0-5.702-.501-7.21-.92-1.465-.407-2.182-2.126-1.249-3.419 1.85-2.56 4.959-4.223 8.459-4.223Zm0 2c-2.864 0-5.367 1.359-6.837 3.394a.167.167 0 0 0-.025.167c.021.057.076.123.187.155 1.36.377 3.658.846 6.675.846 3.02 0 5.313-.466 6.666-.842.12-.033.177-.103.198-.16a.164.164 0 0 0-.025-.165c-1.47-2.036-3.975-3.395-6.839-3.395Z" fill="currentColor" fill-rule="evenodd"></path>
        <path d="M15.467 12.064a1 1 0 0 1 1.187-.768c2.547.548 4.744 1.994 6.18 3.984a1 1 0 0 1-1.621 1.17c-1.141-1.58-2.906-2.753-4.979-3.199a1 1 0 0 1-.767-1.187Z" fill="currentColor"></path>
        <path clip-rule="evenodd" d="M9.875 3a4.938 4.938 0 1 1 0 9.875 4.938 4.938 0 0 1 0-9.875Zm0 2a2.938 2.938 0 1 0 0 5.875 2.938 2.938 0 0 0 0-5.875Z" fill="currentColor" fill-rule="evenodd"></path>
        <path d="M15.174 1.003a4.5 4.5 0 0 1 3.432 7.188 1 1 0 0 1-1.602-1.197 2.5 2.5 0 0 0-1.906-3.993 1 1 0 0 1 .076-1.998Z" fill="currentColor"></path>
      </svg>`;
    const favoritesIcon = `
      <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path d="M18.18 22.51a.99.99 0 0 1-.513-.142L12 18.975l-5.667 3.393a1 1 0 0 1-1.492-1.062l1.37-6.544-4.876-4.347a.999.999 0 0 1 .536-1.737l6.554-.855 2.668-5.755a1 1 0 0 1 1.814 0l2.668 5.755 6.554.855a.999.999 0 0 1 .536 1.737l-4.876 4.347 1.37 6.544a1 1 0 0 1-.978 1.205ZM12 16.81a1 1 0 0 1 .514.142l4.22 2.528-1.021-4.873a.998.998 0 0 1 .313-.952l3.676-3.276-4.932-.644a1 1 0 0 1-.778-.57L12 4.867l-1.992 4.297a1 1 0 0 1-.779.57l-4.931.644 3.676 3.276a.998.998 0 0 1 .313.951l-1.02 4.873 4.22-2.527A1 1 0 0 1 12 16.81Z"></path>
      </svg>`;

    const options = [
      { href: "/?variant=following", label: translate("homeFollowing"), icon: followingIcon },
      { href: "/?variant=favorites", label: translate("homeFavorites"), icon: favoritesIcon },
    ];
    options.forEach(({ href, label, icon }) => {
      const option = document.createElement("a");
      option.href = href;
      option.innerHTML = `<span>${label}</span>${icon}`;
      option.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        color: inherit;
        text-decoration: none;
        font-size: 14px;
        line-height: 22px;
      `;
      option.addEventListener("mouseenter", () => {
        option.style.background = "rgba(255, 255, 255, 0.1)";
      });
      option.addEventListener("mouseleave", () => {
        option.style.background = "";
      });
      menu.appendChild(option);
    });

    document.body.appendChild(menu);
    const rect = anchor.getBoundingClientRect();
    menu.style.left = `${Math.max(8, rect.left)}px`;
    menu.style.top = `${Math.min(window.innerHeight - menu.offsetHeight - 8, rect.bottom + 8)}px`;

    setTimeout(() => {
      document.addEventListener("click", (event) => {
        if (!menu.contains(event.target) && !anchor.contains(event.target)) {
          closeHomeFeedMenu();
        }
      }, { once: true, capture: true });
    }, 0);
  }

  function setupHomeFeedMenu(body) {
    if (window.location.pathname !== "/" || !isDesktopInterface()) {
      closeHomeFeedMenu();
      return;
    }

    const anchor = getHomeLogoLink(body);
    if (!anchor || anchor.dataset.instabrakeHomeMenuReady === "true") {
      return;
    }
    anchor.dataset.instabrakeHomeMenuReady = "true";
    anchor.addEventListener("click", (event) => {
      if (!isDesktopInterface()) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (document.getElementById("instabrake-home-feed-menu")) {
        closeHomeFeedMenu();
      } else {
        showHomeFeedMenu(anchor);
      }
    }, true);
  }

  function onMutation() {
    if (extensionContextInvalidated) {
      return;
    }

    const path = window.location.pathname;
    const body = document.body;
    if (!body) {
      return;
    }

    dismissAppPrompt(body);
    setupProfilePhotoViewer();
    setupHomeFeedMenu(body);
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
