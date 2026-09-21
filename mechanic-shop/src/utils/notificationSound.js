const MUTE_KEY = "oficina-lima-notif-sound-muted";
const SHARED_ID_KEY_PREFIX = "oficina-lima-notif-last-dinged-id:";
const SOUND_URL = "/sounds/notification-ding.wav";
const SOUND_DURATION_MS = 810; // matches the generated file's actual length

export function isNotificationSoundMuted() {
	try {
		return localStorage.getItem(MUTE_KEY) === "true";
	} catch {
		return false;
	}
}

export function setNotificationSoundMuted(muted) {
	try {
		localStorage.setItem(MUTE_KEY, muted ? "true" : "false");
	} catch {
		// localStorage unavailable (private mode, etc.) — mute preference just won't persist
	}
}

// A real sampled WAV instead of live-synthesized tones — a plain <audio>
// element doesn't get auto-suspended after idle the way a Web Audio
// AudioContext does, which was the cause of the "sometimes silent" bug.
const baseAudio = new Audio(SOUND_URL);
baseAudio.preload = "auto";
baseAudio.volume = 0.9;

// Browsers only allow audio playback after a real user gesture on the page.
// Priming it once during an actual click/key/touch (even though it's
// immediately paused) establishes that permission well before a real
// notification needs to play.
export function unlockNotificationSound() {
	baseAudio.play()
		.then(() => {
			baseAudio.pause();
			baseAudio.currentTime = 0;
		})
		.catch(() => {
			// Still locked down (e.g. no gesture yet) — next real attempt will retry
		});
}

// Identity-based, not count-based: the caller passes the id of the most
// recent unread notification (ids only ever increase) rather than a total
// count. Counts are ambiguous — if a notification gets marked read at the
// same moment a new one arrives, the count can stay flat and a real new
// notification silently never dings. An id that's higher than anything
// dinged before is unambiguous no matter what else happened concurrently.
//
// scopeKey identifies which set of notification types this check is for
// (e.g. "3,5" for Geral+Oficina) — two tabs watching the same view share a
// key and dedupe each other; a tab on a different view (different scopeKey)
// is unaffected, so switching views never causes a false ding or suppresses
// a real one for the other view.
//
// Two tabs open to the site each poll independently, so both would
// otherwise notice the same real notification and each play their own
// sound, landing at unsynchronized moments — sounds like a random stray
// beep rather than one clean ding. localStorage is shared across
// same-origin tabs, so whichever tab notices a given id first "claims" it
// here; the other sees it's already handled and stays quiet.
export function claimNotificationDing(scopeKey, latestId) {
	const storageKey = SHARED_ID_KEY_PREFIX + scopeKey;

	try {
		const stored = localStorage.getItem(storageKey);
		const alreadyDingedFor = stored === null ? null : Number(stored);

		if (alreadyDingedFor !== null && latestId <= alreadyDingedFor) {
			return false;
		}

		localStorage.setItem(storageKey, String(latestId));
		return true;
	} catch {
		return true; // localStorage unavailable — fall back to per-tab behavior
	}
}

// Tracks when the last scheduled ding finishes, across calls — otherwise two
// notifications landing close together would each start playing immediately
// and independently, overlapping and muddying each other instead of playing
// as two clean, sequential dings.
let nextAvailableAt = 0;

export function playNotificationSound() {
	if (isNotificationSoundMuted()) return;

	const now = Date.now();
	const startAt = Math.max(now, nextAvailableAt);
	const delay = startAt - now;

	nextAvailableAt = startAt + SOUND_DURATION_MS;

	setTimeout(() => {
		if (isNotificationSoundMuted()) return;

		try {
			// A fresh clone per play so overlapping/queued dings never fight
			// over the same element's playback position.
			const instance = baseAudio.cloneNode();
			instance.volume = baseAudio.volume;
			instance.play().catch(() => {
				// Autoplay blocked — fail silently, the visual badge still
				// updates regardless.
			});
		} catch {
			// Audio unsupported — fail silently
		}
	}, delay);
}
