(function(){"use strict";const v={blockReels:!1,blockExplore:!0,blockStories:!1,blockPosts:!0,blockFollowingPosts:!1,limitFollowingPosts:!1,followingPostsLimit:10,limitReels:!0,reelsLimit:10,blockSuggestedFollowers:!0,blockForYouFeed:!1,blockThreads:!0},F=Object.keys(v),u={main:"[role=main]",storyFeed:"div[data-pagelet='story_tray']",posts:"article",postsLoader:"[data-visualcompletion='loading-state']",suggestedFollowers:"a[href*='/explore/people/']",nav:{explore:"a[href='/explore/'], a[href='/explore'], a[href^='/explore/?'], a[href^='/explore?']",reels:"a[href='/reels/'], a[href='/reels'], a[href^='/reels/?'], a[href^='/reels?']",threads:"a[href*='threads']"}},k={base:"/",stories:"/stories",reels:"/reels",explore:"/explore"},d=s=>{s&&(s instanceof Node&&(s.style.display="none"),s instanceof NodeList&&s.forEach(i=>{i.style.display="none"}))};try{const s=document.createElement("script");s.src=chrome.runtime.getURL("interceptor.js"),(document.head||document.documentElement).appendChild(s),s.onload=()=>s.remove()}catch(s){console.warn("InstaBrake interceptor load error:",s)}const w=(s,i)=>chrome.i18n.getMessage(s,i)||"",S=chrome.runtime.getURL("public/ib128.png");let m=null;async function q(){const s=await new Promise(t=>{chrome.storage.sync.get(F,t)});Object.keys(s||{}).length===0&&chrome.storage.sync.set(v);const i=Object.keys(s||{}).length>0?s:v,T=new MutationObserver(b),C=t=>window.location.pathname.startsWith("/direct/")&&[...t?.querySelectorAll("video")||[]].map(n=>({video:n,rect:n.getBoundingClientRect()})).filter(({video:n,rect:f})=>{const a=window.getComputedStyle(n);return a.display!=="none"&&a.visibility!=="hidden"&&f.width>=window.innerWidth*.5&&f.height>=window.innerHeight*.5}).sort((n,f)=>f.rect.width*f.rect.height-n.rect.width*n.rect.height)[0]?.video||null,y=t=>{t.type==="keydown"&&t.key==="Escape"||t.preventDefault()},M=t=>{m||(m={htmlOverflow:document.documentElement.style.overflow,bodyOverflow:document.body?.style.overflow||"",video:t},document.documentElement.style.overflow="hidden",document.body&&(document.body.style.overflow="hidden"),window.addEventListener("wheel",y,{capture:!0,passive:!1}),window.addEventListener("touchmove",y,{capture:!0,passive:!1}),window.addEventListener("keydown",y,!0)),m.video!==t&&(m.video=t,t?.scrollIntoView({block:"center",inline:"nearest"}))},z=()=>{m&&(document.documentElement.style.overflow=m.htmlOverflow,document.body&&(document.body.style.overflow=m.bodyOverflow),window.removeEventListener("wheel",y,!0),window.removeEventListener("touchmove",y,!0),window.removeEventListener("keydown",y,!0),m=null)};function E(){const t=new Date,e=String(t.getMonth()+1).padStart(2,"0"),n=String(t.getDate()).padStart(2,"0");return`${t.getFullYear()}-${e}-${n}`}function L(){try{const t=JSON.parse(localStorage.getItem("instabrake_seen_reels")||"null");return!t||t.date!==E()||!Array.isArray(t.ids)?new Set:new Set(t.ids)}catch{return new Set}}function P(t){const e=L();return e.add(t),localStorage.setItem("instabrake_seen_reels",JSON.stringify({date:E(),ids:[...e]})),e.size}function B(){const t=window.location.pathname.split("/").filter(Boolean);return t.length===1&&!/^(explore|reels?|stories|accounts|direct|about|privacy|terms|settings)$/.test(t[0])}function R(t){if(!B())return null;const e=t.closest?.("img");if(!e)return null;const n=(e.getAttribute("alt")||"").toLowerCase(),f=window.location.pathname.split("/").filter(Boolean)[0],a=e.closest(`a[href="/${CSS.escape(f)}/"]`),h=n.includes("profile")||n.includes("foto")||n.includes("perfil")||!!a,l=e.getBoundingClientRect();return!h||l.top>window.innerHeight||l.width<40||l.height<40?null:e}function D(t){let e=document.getElementById("instabrake-profile-photo-overlay");e||(e=document.createElement("div"),e.id="instabrake-profile-photo-overlay",e.style.cssText=`
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
      `,e.addEventListener("click",n=>{n.target===e&&e.remove()}),document.body.appendChild(e)),e.innerHTML=`
      <img src="${t.currentSrc||t.src}" alt="${w("profilePictureAlt")}" style="
        display: block;
        width: min(92vw, 800px);
        max-width: 92vw;
        max-height: 800px;
        height: auto;
        border-radius: 50%;
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
        user-select: none;
      ">
    `}function I(){if(document.documentElement.dataset.instabrakeProfilePhotoReady==="true")return;document.documentElement.dataset.instabrakeProfilePhotoReady="true";let t=null,e=null,n=!1,f=0;document.addEventListener("pointerdown",a=>{const h=R(a.target);h&&(e=h,n=!1,window.clearTimeout(t),t=window.setTimeout(()=>{e===h&&(n=!0,f=Date.now()+1e3,a.preventDefault(),a.stopPropagation(),D(h))},500))},!0),document.addEventListener("pointerup",a=>{window.clearTimeout(t),e&&n&&(a.preventDefault(),a.stopPropagation(),f=Date.now()+1e3),e=null},!0),document.addEventListener("pointercancel",()=>{window.clearTimeout(t),e=null,n=!1},!0),document.addEventListener("click",a=>{Date.now()<f&&R(a.target)&&(a.preventDefault(),a.stopPropagation())},!0)}function b(){const t=window.location.pathname,e=document.body;if(!e)return;I();const n=i.blockReels||i.limitReels?C(e):null;if(n?M(n):z(),i.blockThreads){const l=e?.querySelectorAll(u.nav.threads);d(l)}if(i.blockExplore){const l=e?.querySelectorAll(u.nav.explore);d(l)}if(i.blockReels){const l=e?.querySelectorAll(u.nav.reels);d(l)}if(t===k.base){const g=new URLSearchParams(window.location.search).get("variant")==="following";if(i.blockStories){const o=e?.querySelector(u.storyFeed);d(o)}if(g&&i.blockFollowingPosts||!g&&i.blockPosts){const o=e?.querySelector(u.posts),c=e?.querySelector(u.postsLoader),r=o?.parentElement?.parentElement?.parentElement;d(o),d(c),d(r),o?.setAttribute("data-instabrake-hidden-post","true"),r?.setAttribute("data-instabrake-hidden-post-container","true")}else e?.querySelectorAll("[data-instabrake-hidden-post]").forEach(o=>{o.style.display="",o.removeAttribute("data-instabrake-hidden-post")}),e?.querySelectorAll("[data-instabrake-hidden-post-container]").forEach(o=>{o.style.display="",o.removeAttribute("data-instabrake-hidden-post-container")});if(g&&i.limitFollowingPosts&&!i.blockFollowingPosts){const o=Math.max(1,parseInt(i.followingPostsLimit,10)||10),c=e?.querySelectorAll(u.posts);if(c&&c.length>0)if(c.length>o){document.documentElement.setAttribute("data-instabrake-feed-locked","true"),c.forEach((p,A)=>{A>=o&&(p.style.display="none")}),e?.querySelectorAll(u.postsLoader)?.forEach(p=>p.remove());let r=document.getElementById("instabrake-feed-limit-msg");if(!r){r=document.createElement("div"),r.id="instabrake-feed-limit-msg",r.style.cssText=`
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
              `,r.innerHTML=`
                <img src="${S}" alt="" style="display: block; width: 64px; height: 64px; margin: 0 auto 8px;">
                <div style="font-size: 16px; font-weight: 600; margin-bottom: 6px;">${w("scrollLimitTitle")}</div>
                <div style="font-size: 13px; color: #a8a8a8; line-height: 1.4;">
                  ${w("scrollLimitMessage",String(o))}
                </div>
              `;const p=c[o-1];p&&p.parentElement&&p.insertAdjacentElement("afterend",r)}}else document.documentElement.removeAttribute("data-instabrake-feed-locked")}else document.documentElement.removeAttribute("data-instabrake-feed-locked");if(i.blockSuggestedFollowers){const o=e?.querySelector(u.suggestedFollowers),c=o?.closest("div"),r=c?.nextElementSibling;d(o),d(c),d(r)}if(i.blockForYouFeed){const o=new URLSearchParams(window.location.search);(o?.get("variant")==="home"||o?.get("variant")===null)&&(o.set("variant","following"),window.location.search=o.toString())}}if(t.includes(k.stories)&&i.blockStories&&d(e),t.includes(k.reels)||t.startsWith("/reel")){if(i.blockReels){const l=e?.querySelector(u.main);d(l)}else if(i.limitReels){const l=Math.max(1,parseInt(i.reelsLimit,10)||10),g=t.match(/\/(?:reels|reel)\/([A-Za-z0-9_-]+)/);if(g&&g[1]&&P(g[1]),e?.querySelectorAll("main video")?.forEach(c=>{const r=c.getBoundingClientRect();if(r.top<window.innerHeight*.6&&r.bottom>window.innerHeight*.4){const x=(c.closest("a")||c.closest("[role='article']")?.querySelector("a[href*='/reel/'], a[href*='/reels/']"))?.getAttribute("href")?.match(/\/(?:reels|reel)\/([A-Za-z0-9_-]+)/);x&&x[1]&&P(x[1])}}),L().size>l){e?.querySelectorAll("video").forEach(p=>p.pause());const c=e?.querySelector(u.main);d(c);let r=document.getElementById("instabrake-reels-limit-overlay");r||(r=document.createElement("div"),r.id="instabrake-reels-limit-overlay",r.style.cssText=`
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
            `,r.innerHTML=`
              <img src="${S}" alt="" style="display: block; width: 96px; height: 96px; margin: 0 auto 16px;">
              <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #ffffff;">${w("reelsLimitTitle")}</h2>
              <p style="font-size: 14px; color: #a8a8a8; max-width: 380px; line-height: 1.5; margin-bottom: 24px;">
                ${w("reelsLimitMessage",String(l))}
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
              ">${w("goHome")}</a>
            `,document.body.appendChild(r))}}}if(t.includes(k.explore)&&i.blockExplore){const l=e?.querySelector(u.main);d(l)}}const $=history.pushState,O=history.replaceState;history.pushState=function(...t){$.apply(this,t),window.dispatchEvent(new Event("locationchange"))},history.replaceState=function(...t){O.apply(this,t),window.dispatchEvent(new Event("locationchange"))},window.addEventListener("popstate",b),window.addEventListener("locationchange",b),T.observe(document,{subtree:!0,childList:!0}),window.addEventListener("scroll",b,{passive:!0}),b()}q()})();
