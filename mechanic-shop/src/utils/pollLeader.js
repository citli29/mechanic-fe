import { useEffect, useState } from "react";

// With several tabs of the app open in one browser, only one of them — the
// "leader" — runs the background polls (notifications, Encomendas badge)
// and plays the notification sound; it shares what it fetched with the
// other tabs (see publishPollResult), so every tab's badges stay current
// without each one hitting the server every 5 s.
//
// A visible tab always takes over (a hidden leader is throttled by the
// browser to about one poll a minute after a few minutes). With every tab
// hidden, the current leader keeps going. When the leader closes it hands
// over straight away; if it's killed without closing, another tab takes
// over once its heartbeat is LEADER_STALE_MS old.
//
// The Web Locks API would do this in a few lines, but it only exists on
// HTTPS (or localhost), and the app runs over plain HTTP on the LAN — hence
// localStorage + BroadcastChannel, which work on HTTP too.

const LEADER_KEY = "oficina-lima-poll-leader";
const CHANNEL_NAME = "oficina-lima-poll";
const HEARTBEAT_MS = 2000;
// Longer than the ~1 min a hidden tab's timers can be delayed by.
const LEADER_STALE_MS = 75000;

const tabId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;

function readLeader() {
	try {
		return JSON.parse(localStorage.getItem(LEADER_KEY));
	} catch {
		return null;
	}
}

function writeLeader() {
	localStorage.setItem(LEADER_KEY, JSON.stringify({ id: tabId, ts: Date.now(), visible: !document.hidden }));
}

// Runs every HEARTBEAT_MS and whenever visibility or the leader changes.
// Returns whether this tab is the leader now.
function checkLeadership() {
	try {
		const leader = readLeader();
		const isMine = leader?.id === tabId;
		const isStale = !leader || Date.now() - leader.ts > LEADER_STALE_MS;
		const shouldTakeOver = !document.hidden && !leader?.visible;

		if (isMine || isStale || shouldTakeOver) writeLeader();

		// Read back: if two tabs claimed at the same moment, the last write
		// wins and the other one stands down on this same check.
		return readLeader()?.id === tabId;
	} catch {
		return true; // localStorage unavailable: every tab polls, as before
	}
}

// Without BroadcastChannel a follower would never get the leader's results,
// so in that (old browser) case every tab stays a leader, as before.
const canShare = channel !== null;

const listeners = new Set();
let isLeader = canShare ? checkLeadership() : true;

function update() {
	const next = canShare ? checkLeadership() : true;
	if (next !== isLeader) {
		isLeader = next;
		listeners.forEach((listener) => listener(isLeader));
	}
}

// Closing (or reloading) the leader tab frees the spot right away.
function release() {
	try {
		if (readLeader()?.id === tabId) localStorage.removeItem(LEADER_KEY);
	} catch {
		// nothing to free
	}
}

const handleStorage = (e) => { if (e.key === LEADER_KEY) update(); };

if (canShare) {
	const heartbeatId = setInterval(update, HEARTBEAT_MS);
	document.addEventListener("visibilitychange", update);
	window.addEventListener("storage", handleStorage);
	window.addEventListener("pagehide", release);

	// Dev only: when Vite hot-reloads this file, the old copy would keep its
	// timer and listeners running (and could hold on to the leadership
	// under an id nobody uses any more).
	import.meta.hot?.dispose(() => {
		clearInterval(heartbeatId);
		document.removeEventListener("visibilitychange", update);
		window.removeEventListener("storage", handleStorage);
		window.removeEventListener("pagehide", release);
		channel.close();
		release();
	});
}

// true while this tab should run the background polls.
export function usePollLeader() {
	const [leader, setLeader] = useState(isLeader);

	useEffect(() => {
		listeners.add(setLeader);
		setLeader(isLeader);
		return () => listeners.delete(setLeader);
	}, []);

	return leader;
}

// The leader shares each poll's result with the other tabs.
export function publishPollResult(type, data) {
	channel?.postMessage({ type, data });
}

// Results the leader shared; returns an unsubscribe function.
export function onPollResult(type, callback) {
	if (!channel) return () => {};

	const handler = (e) => {
		if (e.data?.type === type) callback(e.data.data);
	};
	channel.addEventListener("message", handler);
	return () => channel.removeEventListener("message", handler);
}
