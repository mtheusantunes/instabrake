export const defaultOptions = {
  blockReels: false,
  blockExplore: true,
  blockStories: false,
  blockPosts: true,
  blockFollowingPosts: false,
  limitFollowingPosts: false,
  followingPostsLimit: 10,
  limitReels: true,
  reelsLimit: 10,
  blockSuggestedFollowers: true,
  blockForYouFeed: false,
  blockThreads: true,
};

export const labelsArray = Object.keys(defaultOptions);

export const selectors = {
  main: "[role=main]",
  storyFeed: "div[data-pagelet='story_tray']",
  posts: "article",
  postsLoader: "[data-visualcompletion='loading-state']",
  suggestedFollowers: "a[href*='/explore/people/']",
  nav: {
    direct: "a[href*='/direct/inbox/']",
    activity: "a[href*='/accounts/activity']",
    explore: "a[href='/explore/'], a[href='/explore'], a[href^='/explore/?'], a[href^='/explore?']",
    reels: "a[href='/reels/'], a[href='/reels'], a[href^='/reels/?'], a[href^='/reels?']",
    threads: "a[href*='threads']",
  }
};

export const urls = {
  base: "/",
  stories: "/stories",
  reels: "/reels",
  explore: "/explore"
};

export const hide = (elements) => {
  if (!elements) {
    return;
  }
  if (elements instanceof Node) {
    elements.style.display = "none";
  }
  if (elements instanceof NodeList) {
    elements.forEach((element) => {
      element.style.display = "none";
    });
  }
}
 