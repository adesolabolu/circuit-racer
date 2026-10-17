// Official start.ng platform connector bridge for Circuit Racer.
// Implements https://start.ng/docs.md specifications.

const CONNECT_ORIGIN = "https://start.ng";
const CONNECT_URL = `${CONNECT_ORIGIN}/connect`;
const TIMEOUT_MS = 6000;

const isBrowser = typeof window !== "undefined" && typeof location !== "undefined";

export const onStartng = isBrowser && (
  location.hostname.endsWith(".start.ng") ||
  location.hostname.endsWith(".start.localhost")
);

export const isGuest = isBrowser && new URLSearchParams(location.search).has("guest");

// Pick up game session token from hash (#startng_session=...) if present
if (isBrowser) {
  try {
    const hash = location.hash.slice(1);
    if (hash) {
      const params = new URLSearchParams(hash);
      const session = params.get("startng_session");
      if (session) {
        sessionStorage.setItem("startng_session", session);
        history.replaceState(null, "", location.pathname + location.search);
      }
    }
  } catch {}
}

// 5 Official start.ng Character Presets for Offline/Localhost Play
export const testStyles = [
  { body: "female", primaryColor: "#a55eea", secondaryColor: "#2b2f4a", skinColor: "#8d5524", hairColor: "#17120f", hair: "braids", hat: "none", accessory: "earrings" },
  { body: "male", primaryColor: "#1dd1a1", secondaryColor: "#222f3e", skinColor: "#5c3a21", hairColor: "#17120f", hair: "afro", hat: "cap", accessory: "glasses" },
  { body: "female", primaryColor: "#ff6b6b", secondaryColor: "#4b6584", skinColor: "#c68642", hairColor: "#4a2c1a", hair: "bun", hat: "beanie", accessory: "scarf" },
  { body: "male", primaryColor: "#f7b731", secondaryColor: "#0c6e5a", skinColor: "#a0662f", hairColor: "#17120f", hair: "dreads", hat: "crown", accessory: "beard" },
  { body: "female", primaryColor: "#4b7bec", secondaryColor: "#5f3dc4", skinColor: "#e0ac69", hairColor: "#c0392b", hair: "ponytail", hat: "tophat", accessory: "backpack" },
];

export const GUEST_STYLE = {
  body: "male",
  primaryColor: "#fd9644",
  secondaryColor: "#3d3d3d",
  skinColor: "#a0662f",
  hairColor: "#17120f",
  hair: "short",
  hat: "cap",
  accessory: "none",
};

export const TEST_USER = {
  id: "local_dev_1",
  name: "Desk Hacker",
  style: testStyles[0],
};

let frame = null;
let ready = null;
let nextId = 1;
const waiting = new Map();

function connect() {
  if (!isBrowser || !onStartng) return Promise.resolve();
  if (ready) return ready;

  ready = new Promise((resolve, reject) => {
    frame = document.createElement("iframe");
    frame.src = CONNECT_URL;
    frame.title = "start.ng connection";
    frame.style.display = "none";
    frame.hidden = true;
    frame.addEventListener("load", () => resolve(), { once: true });
    frame.addEventListener("error", () => reject(new Error("Could not reach start.ng")), { once: true });
    document.body.appendChild(frame);
  });

  window.addEventListener("message", (e) => {
    if (e.origin !== CONNECT_ORIGIN) return; // Strict origin protection
    const reqId = String(e.data?.requestId);
    const pending = waiting.get(reqId);
    if (!pending) return;
    if (pending.replyType && e.data?.type !== pending.replyType) return;
    waiting.delete(reqId);
    clearTimeout(pending.timer);
    pending.resolve(e.data);
  });

  return ready;
}

async function ask(message, replyType = null) {
  await connect();
  return new Promise((resolve, reject) => {
    const requestId = String(nextId++);
    const timer = setTimeout(() => {
      waiting.delete(requestId);
      reject(new Error("start.ng did not answer"));
    }, TIMEOUT_MS);
    waiting.set(requestId, { resolve, timer, replyType });
    frame.contentWindow.postMessage({ ...message, requestId }, CONNECT_ORIGIN);
  });
}

/** Returns the signed-in player: { id, name, style, face }, or start.ng guest, or fallback TEST_USER */
export async function getPlayer() {
  if (!onStartng) {
    if (isGuest) return null;
    return TEST_USER;
  }
  try {
    const reply = await ask({ type: "startng:whoami" }, "startng:user");
    return reply?.user ?? reply?.guest ?? null;
  } catch (err) {
    console.warn("Failed to reach start.ng, falling back to guest mode", err);
    return null;
  }
}

const LOCAL_STORAGE_KEY = "circuit_racer:scores";

/** Save player score / time to start.ng or local fallback */
export async function saveScore(scoreOrPayload) {
  let payload = {};
  if (typeof scoreOrPayload === "number") {
    payload = { type: "startng:score", score: Math.floor(scoreOrPayload) };
  } else if (scoreOrPayload && typeof scoreOrPayload === "object") {
    if (scoreOrPayload.stats) {
      payload = { type: "startng:score", stats: scoreOrPayload.stats };
    } else if (typeof scoreOrPayload.score === "number") {
      payload = { type: "startng:score", score: Math.floor(scoreOrPayload.score) };
    }
  }

  if (!onStartng) {
    const scores = getLocalScores();
    const numericScore = payload.score ?? (payload.stats ? payload.stats.chips * 10 : 100);
    const prev = scores[TEST_USER.id]?.score ?? 0;
    const improved = numericScore > prev;
    const best = Math.max(prev, numericScore);
    scores[TEST_USER.id] = { score: best, name: TEST_USER.name, color: TEST_USER.style.primaryColor, stats: payload.stats };
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(scores));
      } catch {}
    }
    return { best, improved, rank: 1, local: true, stats: payload.stats };
  }

  const reply = await ask(payload, "startng:scoreSaved");
  if (!reply?.ok) throw new Error(reply?.error || "Could not save the score");
  return reply.result;
}

/** Top players for this game */
export async function getLeaderboard(limit = 10) {
  if (!onStartng) {
    const scores = getLocalScores();
    return Object.values(scores)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry, idx) => ({ rank: idx + 1, ...entry }));
  }

  const reply = await ask({ type: "startng:leaderboard", limit }, "startng:leaderboardData");
  if (!reply?.ok) throw new Error(reply?.error || "Could not load the leaderboard");
  return reply.entries;
}

function getLocalScores() {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

/** Redirect player to sign in on start.ng, returning back afterwards */
export function signInUrl() {
  if (!isBrowser) return CONNECT_ORIGIN;
  const back = new URL(location.href);
  back.searchParams.delete("guest");
  return `${CONNECT_ORIGIN}/?return_to=${encodeURIComponent(back.href)}`;
}

/** Re-checks player profile when player tabs back in after editing profile */
export function onUserChange(fn) {
  if (!isBrowser) return;
  const recheck = async () => {
    if (document.visibilityState !== "visible") return;
    const user = await getPlayer();
    if (user !== undefined) fn(user);
  };
  document.addEventListener("visibilitychange", recheck);
  window.addEventListener("focus", recheck);
}
