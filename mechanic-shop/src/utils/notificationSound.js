const MUTE_KEY = "oficina-lima-notif-sound-muted";

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

let audioCtx = null;

function getAudioCtx() {
	if (!audioCtx) {
		audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	}
	return audioCtx;
}

// Chrome (and most browsers) will only let an AudioContext produce audible
// sound if it was created/resumed during a real user gesture — a
// notification poll firing minutes later doesn't count, so without this the
// context stays silently suspended forever and nothing plays, no error
// thrown either. Call this once from an actual click/key/touch handler as
// early as possible so the context is already running by the time a
// notification needs to play.
export function unlockNotificationSound() {
	try {
		const ctx = getAudioCtx();
		if (ctx.state === "suspended") ctx.resume();
	} catch {
		// Web Audio unsupported — playNotificationSound() will no-op too
	}
}

function playTone(ctx, freq, startTime, duration, peakGain) {
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();

	osc.type = "triangle";
	osc.frequency.setValueAtTime(freq, startTime);

	gain.gain.setValueAtTime(0, startTime);
	gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
	gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

	osc.connect(gain);
	gain.connect(ctx.destination);

	osc.start(startTime);
	osc.stop(startTime + duration);
}

// Two short, bright, ascending notes (a perfect-fifth "ding-dong") rather
// than one smooth tone — discrete notes cut through background music much
// better than a continuous sweep. Synthesized with the Web Audio API, no
// audio file to fetch/host.
export function playNotificationSound() {
	if (isNotificationSoundMuted()) return;

	try {
		const ctx = getAudioCtx();
		if (ctx.state === "suspended") ctx.resume();

		const now = ctx.currentTime;
		playTone(ctx, 1046.5, now, 0.18, 0.4); // C6
		playTone(ctx, 1568, now + 0.15, 0.28, 0.4); // G6
	} catch {
		// Autoplay blocked or Web Audio unsupported — fail silently, the
		// visual badge still updates regardless.
	}
}
