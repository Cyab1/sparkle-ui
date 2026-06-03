import { useEffect, useRef, useState } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { PageTitle } from "@/components/shared/PageTitle";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";

// ── Elfsight widget ID ────────────────────────────────────────────────────────
const ELFSIGHT_APP_ID = "elfsight-app-634db65e-6224-4128-ade4-41d236a25823";

// ── Social platform defaults ──────────────────────────────────────────────────
const DEFAULT_SOCIALS = {
  instagramHandle: "mk2riversfitness",
  facebookUrl: "",
  tiktokUrl: "",
  facebookEmbedEnabled: false,
  tiktokEmbedEnabled: false,
};

// ── Instagram Feed (Elfsight) ─────────────────────────────────────────────────
function InstagramFeed() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const existing = document.getElementById("elfsight-platform");
    if (!existing) {
      const script = document.createElement("script");
      script.id = "elfsight-platform";
      script.src = "https://elfsightcdn.com/platform.js";
      script.async = true;
      document.body.appendChild(script);
    } else {
      // @ts-ignore
      window.eapps?.platform?.reload?.();
    }
  }, []);

  return (
    <div ref={ref} style={{ minHeight: 300 }}>
      <div className={ELFSIGHT_APP_ID} data-elfsight-app-lazy />
    </div>
  );
}

// ── Facebook page embed ───────────────────────────────────────────────────────
function FacebookFeed({ pageUrl }: { pageUrl: string }) {
  useEffect(() => {
    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src =
        "https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    } else {
      // @ts-ignore
      window.FB?.XFBML?.parse();
    }
  }, [pageUrl]);

  return (
    <div>
      <div id="fb-root" />
      <div
        className="fb-page"
        data-href={pageUrl}
        data-tabs="timeline"
        data-width="500"
        data-height="600"
        data-small-header="true"
        data-adapt-container-width="true"
        data-hide-cover="false"
        data-show-facepile="true"
      />
    </div>
  );
}

type PlatformTab = "instagram" | "facebook" | "tiktok";

export function Gallery() {
  const { isMobile } = useBreakpoint();
  const [tab, setTab] = useState<PlatformTab>("instagram");
  const [socials, setSocials] = useState(DEFAULT_SOCIALS);

  useEffect(() => {
    const unsub = onValue(ref(db, "admin_socials"), (snap) => {
      if (snap.exists()) setSocials({ ...DEFAULT_SOCIALS, ...snap.val() });
    });
    return () => unsub();
  }, []);

  const platforms = [
    { id: "instagram" as const, label: "Instagram", icon: "📸" },
    ...(socials.facebookUrl
      ? [{ id: "facebook" as const, label: "Facebook", icon: "👥" }]
      : []),
    ...(socials.tiktokUrl
      ? [{ id: "tiktok" as const, label: "TikTok", icon: "🎵" }]
      : []),
  ];

  return (
    <div
      className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      <PageTitle sub="Follow MK2R across our social platforms">
        Social <span className="text-primary">Media</span>
      </PageTitle>

      {/* Platform tabs */}
      <div
        className="flex gap-1.5 p-1 rounded-xl w-fit mb-6"
        style={{ background: "hsl(var(--secondary))" }}
      >
        {platforms.map((p) => (
          <button
            key={p.id}
            onClick={() => setTab(p.id)}
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all border-none cursor-pointer font-body"
            style={{
              background: tab === p.id ? "hsl(20 100% 50%)" : "transparent",
              color: tab === p.id ? "#000" : "hsl(var(--muted-foreground))",
            }}
          >
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* ── Instagram ──────────────────────────────────────────────────── */}
      {tab === "instagram" && (
        <div className="w-full">
          <div className="flex items-center gap-3 mb-5">
            <div>
              <div className="font-bold text-sm">
                @{socials.instagramHandle}
              </div>
              <div className="text-xs text-muted-foreground">
                Latest posts from Instagram
              </div>
            </div>
            <a
              href="https://www.instagram.com/mktworiversfitness" // ← only this line changed
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginLeft: "auto",
                fontSize: 12,
                fontWeight: 700,
                padding: "6px 14px",
                borderRadius: 8,
                background: "hsl(20 100% 50% / 0.1)",
                color: "hsl(20 100% 50%)",
                border: "1px solid hsl(20 100% 50% / 0.3)",
                textDecoration: "none",
              }}
            >
              Open Instagram ↗
            </a>
          </div>
          <InstagramFeed />
        </div>
      )}

      {/* ── Facebook ───────────────────────────────────────────────────── */}
      {tab === "facebook" && socials.facebookUrl && (
        <div className="w-full">
          <div className="flex items-center gap-3 mb-5">
            <div>
              <div className="font-bold text-sm">MK2R on Facebook</div>
              <div className="text-xs text-muted-foreground">
                Latest posts and updates
              </div>
            </div>
            <a
              href={socials.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginLeft: "auto",
                fontSize: 12,
                fontWeight: 700,
                padding: "6px 14px",
                borderRadius: 8,
                background: "hsl(217 91% 53% / 0.1)",
                color: "hsl(217 91% 53%)",
                border: "1px solid hsl(217 91% 53% / 0.3)",
                textDecoration: "none",
              }}
            >
              Open Facebook ↗
            </a>
          </div>
          {socials.facebookEmbedEnabled ? (
            <FacebookFeed pageUrl={socials.facebookUrl} />
          ) : (
            <div
              className="rounded-xl p-10 text-center"
              style={{
                background: "hsl(217 91% 53% / 0.06)",
                border: "1px solid hsl(217 91% 53% / 0.2)",
              }}
            >
              <div className="text-4xl mb-3">👥</div>
              <div className="font-bold text-sm mb-2">
                Follow us on Facebook
              </div>
              <div className="text-xs text-muted-foreground mb-5">
                Stay up to date with news, events and community updates.
              </div>
              <a
                href={socials.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  fontWeight: 700,
                  fontSize: 13,
                  padding: "10px 20px",
                  borderRadius: 10,
                  background: "hsl(217 91% 53%)",
                  color: "#fff",
                  textDecoration: "none",
                }}
              >
                Visit our Facebook Page ↗
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── TikTok ─────────────────────────────────────────────────────── */}
      {tab === "tiktok" && socials.tiktokUrl && (
        <div className="w-full">
          <div className="flex items-center gap-3 mb-5">
            <div>
              <div className="font-bold text-sm">MK2R on TikTok</div>
              <div className="text-xs text-muted-foreground">
                Workouts, transformations and gym life
              </div>
            </div>
            <a
              href={socials.tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginLeft: "auto",
                fontSize: 12,
                fontWeight: 700,
                padding: "6px 14px",
                borderRadius: 8,
                background: "hsl(var(--secondary))",
                color: "hsl(var(--foreground))",
                border: "1px solid hsl(var(--border))",
                textDecoration: "none",
              }}
            >
              Open TikTok ↗
            </a>
          </div>
          {socials.tiktokEmbedEnabled ? (
            <div className="flex justify-center">
              <blockquote
                className="tiktok-embed"
                cite={socials.tiktokUrl}
                data-unique-id={
                  socials.tiktokUrl.split("@")[1]?.split("/")[0] ?? ""
                }
                data-embed-type="creator"
                style={{ maxWidth: 605, minWidth: 325 }}
              >
                <section />
              </blockquote>
              {!document.getElementById("tiktok-embed-script") &&
                (() => {
                  const s = document.createElement("script");
                  s.id = "tiktok-embed-script";
                  s.src = "https://www.tiktok.com/embed.js";
                  s.async = true;
                  document.body.appendChild(s);
                  return null;
                })()}
            </div>
          ) : (
            <div
              className="rounded-xl p-10 text-center"
              style={{
                background: "hsl(var(--secondary))",
                border: "1px solid hsl(var(--border))",
              }}
            >
              <div className="text-4xl mb-3">🎵</div>
              <div className="font-bold text-sm mb-2">Follow us on TikTok</div>
              <div className="text-xs text-muted-foreground mb-5">
                Watch our latest workout videos and gym highlights.
              </div>
              <a
                href={socials.tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  fontWeight: 700,
                  fontSize: 13,
                  padding: "10px 20px",
                  borderRadius: 10,
                  background: "hsl(var(--foreground))",
                  color: "hsl(var(--background))",
                  textDecoration: "none",
                }}
              >
                Visit our TikTok ↗
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// import { useState, useEffect, useRef } from "react";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { PageTitle } from "@/components/shared/PageTitle";
// import { motion } from "framer-motion";

// // Instagram widget ID (Elfsight)
// const ELFSIGHT_APP_ID = "elfsight-app-634db65e-6224-4128-ade4-41d236a25823";

// // Instagram Feed (Elfsight embed) – fixed loading & reinit
// function InstagramFeed() {
//   const containerRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     const loadAndReload = () => {
//       const existingScript = document.getElementById("elfsight-platform");
//       if (!existingScript) {
//         const script = document.createElement("script");
//         script.id = "elfsight-platform";
//         script.src = "https://elfsightcdn.com/platform.js";
//         script.async = true;
//         document.body.appendChild(script);
//         script.onload = () => {
//           // @ts-ignore
//           if (window.eapps?.platform) window.eapps.platform.reload?.();
//         };
//       } else {
//         // @ts-ignore
//         if (window.eapps?.platform) window.eapps.platform.reload?.();
//       }
//     };

//     loadAndReload();
//   }, []);

//   return (
//     <div
//       ref={containerRef}
//       className={ELFSIGHT_APP_ID}
//       data-elfsight-app-lazy
//       style={{ minHeight: 400 }}
//     />
//   );
// }

// // TikTok Embed (official profile embed)
// function TikTokEmbed({ profile }: { profile: string }) {
//   useEffect(() => {
//     const script = document.createElement("script");
//     script.src = "https://www.tiktok.com/embed.js";
//     script.async = true;
//     document.body.appendChild(script);
//     return () => {
//       if (document.body.contains(script)) document.body.removeChild(script);
//     };
//   }, []);

//   return (
//     <div className="flex justify-center">
//       <blockquote
//         className="tiktok-embed"
//         cite={`https://www.tiktok.com/${profile}`}
//         data-unique-id={profile.replace("@", "")}
//         data-embed-type="profile"
//         style={{ maxWidth: "605px", minWidth: "325px" }}
//       >
//         <section>
//           <a
//             target="_blank"
//             rel="noopener noreferrer"
//             href={`https://www.tiktok.com/${profile}`}
//           >
//             @{profile}
//           </a>
//         </section>
//       </blockquote>
//     </div>
//   );
// }

// // Facebook Page Plugin
// function FacebookPagePlugin({ pageUrl }: { pageUrl: string }) {
//   useEffect(() => {
//     if (document.getElementById("facebook-jssdk")) return;
//     const script = document.createElement("script");
//     script.id = "facebook-jssdk";
//     script.src =
//       "https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0";
//     script.async = true;
//     document.body.appendChild(script);
//   }, []);

//   return (
//     <div className="flex justify-center">
//       <div
//         className="fb-page"
//         data-href={pageUrl}
//         data-tabs="timeline"
//         data-width="500"
//         data-height="600"
//         data-small-header="false"
//         data-adapt-container-width="true"
//         data-hide-cover="false"
//         data-show-facepile="true"
//       >
//         <blockquote cite={pageUrl} className="fb-xfbml-parse-ignore">
//           <a href={pageUrl}>MK Two Rivers Fitness</a>
//         </blockquote>
//       </div>
//     </div>
//   );
// }

// type SocialTab = "instagram" | "tiktok" | "facebook";

// // type SocialTab = "instagram" | "tiktok" | "facebook";

// export function Gallery() {
//   const { isMobile } = useBreakpoint();
//   const [activeTab, setActiveTab] = useState<SocialTab>("instagram");

//   return (
//     <div
//       className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
//     >
//       <PageTitle sub="Follow us on Instagram, TikTok & Facebook">
//         Social Media Platforms
//       </PageTitle>

//       {/* Tab Switcher */}
//       <div className="flex bg-secondary rounded-lg p-1 gap-1 mb-8 w-fit">
//         {(["instagram", "tiktok", "facebook"] as SocialTab[]).map((tab) => (
//           <button
//             key={tab}
//             onClick={() => setActiveTab(tab)}
//             className={`py-2 px-4 rounded-md font-body font-bold text-xs uppercase tracking-wide transition-all duration-150 cursor-pointer ${
//               activeTab === tab
//                 ? "bg-primary text-black"
//                 : "bg-transparent text-muted-foreground hover:text-foreground"
//             }`}
//           >
//             {tab === "instagram" && " Instagram"}
//             {/* {tab === "tiktok" && " TikTok"}
//             {tab === "facebook" && "Facebook"} */}
//           </button>
//         ))}
//       </div>

//       {/* Instagram Feed */}
//       {activeTab === "instagram" && (
//         <motion.div
//           key="instagram"
//           initial={{ opacity: 0, y: 10 }}
//           animate={{ opacity: 1, y: 0 }}
//           exit={{ opacity: 0 }}
//           className="w-full"
//         >
//           <div className="flex items-center gap-2 mb-4">
//             <span className="text-sm font-bold">@mk2riversfitness</span>
//             <span className="text-xs text-muted-foreground">
//               · Latest posts
//             </span>
//           </div>
//           <InstagramFeed />
//         </motion.div>
//       )}

//       {/* TikTok Feed */}
//       {activeTab === "tiktok" && (
//         <motion.div
//           key="tiktok"
//           initial={{ opacity: 0, y: 10 }}
//           animate={{ opacity: 1, y: 0 }}
//           exit={{ opacity: 0 }}
//         >
//           <TikTokEmbed profile="@mk2riversfitness" />
//         </motion.div>
//       )}

//       {/* Facebook Feed */}
//       {activeTab === "facebook" && (
//         <motion.div
//           key="facebook"
//           initial={{ opacity: 0, y: 10 }}
//           animate={{ opacity: 1, y: 0 }}
//           exit={{ opacity: 0 }}
//         >
//           <FacebookPagePlugin pageUrl="https://www.facebook.com/mk2riversfitness" />
//         </motion.div>
//       )}
//     </div>
//   );
// }
