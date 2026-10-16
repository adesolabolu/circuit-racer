// Official start.ng platform connector bridge for Circuit Racer.
// Protocol reverse-engineered from production start.ng arcade titles (lanedash, suya-catcher).

const CONNECT_ORIGIN = "https://start.ng";
const CONNECT_URL = `${CONNECT_ORIGIN}/connect`;
const TIMEOUT_MS = 6000;

const isBrowser = typeof window !== "undefined" && typeof location !== "undefined";

export const onStartng = isBrowser && (
  location.hostname.endsWith(".start.ng") ||
  location.hostname.endsWith(".start.localhost")
);

export const isGuest = isBrowser && new URLSearchParams(location.search).has("guest");

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
    frame.addEventListener("load", () => resolve(), { once: true });
    frame.addEventListener("error", () => reject(new Error("Could not reach start.ng")), { once: true });
    document.body.appendChild(frame);
  });

  window.addEventListener("message", (e) => {
    if (e.origin !== CONNECT_ORIGIN) return; // Strict origin protection
    const pending = waiting.get(e.data?.requestId);
    if (!pending) return;
    waiting.delete(e.data.requestId);
    clearTimeout(pending.timer);
    pending.resolve(e.data);
  });

  return ready;
}

async function ask(message) {
  await connect();
  return new Promise((resolve, reject) => {
    const requestId = nextId++;
    const timer = setTimeout(() => {
      waiting.delete(requestId);
      reject(new Error("start.ng did not answer"));
    }, TIMEOUT_MS);
    waiting.set(requestId, { resolve, timer });
    frame.contentWindow.postMessage({ ...message, requestId }, CONNECT_ORIGIN);
  });
}

/** Returns the signed-in player: { id, name, style }, or fallback TEST_USER if offline */
export async function getPlayer() {
  if (!onStartng) {
    if (isGuest) return null;
    return TEST_USER;
  }
  try {
    const reply = await ask({ type: "startng:whoami" });
    return reply.user ?? null;
  } catch (err) {
    console.warn("Failed to reach start.ng, falling back to guest mode", err);
    return null;
  }
}

const LOCAL_STORAGE_KEY = "circuit_racer:scores";

/** Save player score / time to start.ng or local fallback */
export async function saveScore(score) {
  const rounded = Math.floor(score);
  if (!onStartng) {
    const scores = getLocalScores();
    const prev = scores[TEST_USER.id]?.score ?? 0;
    const improved = rounded > prev;
    const best = Math.max(prev, rounded);
    scores[TEST_USER.id] = { score: best, name: TEST_USER.name, color: TEST_USER.style.primaryColor };
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(scores));
    }
    return { best, improved, rank: 1, local: true };
  }

  const reply = await ask({ type: "startng:score", score: rounded });
  if (!reply.ok) throw new Error(reply.error || "Could not save the score");
  return reply.result;
}

/** Top players for this game */
export async function getLeaderboard(limit = 5) {
  if (!onStartng) {
    const scores = getLocalScores();
    return Object.values(scores)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry, idx) => ({ rank: idx + 1, ...entry }));
  }

  const reply = await ask({ type: "startng:leaderboard", limit });
  if (!reply.ok) throw new Error(reply.error || "Could not load the leaderboard");
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
