/* ====================================================
   WARZONE EXODUS — AUDIO ENGINE
   Web Audio API procedural sound system
   ==================================================== */

const AudioEngine = (() => {
    let ctx = null;
    let masterGain = null;
    let musicGain = null;
    let sfxGain = null;
    let musicSource = null;
    let heartbeatInterval = null;
    let initialized = false;

    // Procedural sound generators
    const sounds = {
        // --- Gunshots ---
        ak47() {
            return createGunshot({ frequency: 80, duration: 0.25, distortion: 0.9, rumble: 60 });
        },
        m4a1() {
            return createGunshot({ frequency: 100, duration: 0.20, distortion: 0.8, rumble: 70 });
        },
        awm() {
            return createGunshot({ frequency: 50, duration: 0.5, distortion: 1.0, rumble: 30, crack: true });
        },
        shotgun() {
            return createShotgunBlast();
        },
        pistol() {
            return createGunshot({ frequency: 120, duration: 0.15, distortion: 0.6, rumble: 90 });
        },
        smg() {
            return createGunshot({ frequency: 110, duration: 0.12, distortion: 0.7, rumble: 100 });
        },
        suppressed() {
            return createSuppressed();
        },
        rpg() {
            return createRPG();
        },

        // --- Explosions ---
        explosion(size = 1.0) {
            return createExplosion(size);
        },
        grenadeBounce() {
            return createTone(800, 0.05, 'sine', 0.1);
        },

        // --- Player ---
        footstep(surface = 'ground') {
            return createFootstep(surface);
        },
        jump() {
            return createTone(200, 0.08, 'sine', 0.15);
        },
        land() {
            return createImpact(0.3);
        },
        reload() {
            return createReload();
        },
        emptyClick() {
            return createTone(1200, 0.05, 'sine', 0.3);
        },

        // --- Hits ---
        bulletHit(material = 'flesh') {
            return createBulletHit(material);
        },
        armorHit() {
            return createImpact(0.2, 1500);
        },

        // --- UI ---
        uiClick() {
            return createTone(800, 0.05, 'sine', 0.1);
        },
        levelUp() {
            return createLevelUp();
        },
        pickup() {
            return createTone(600, 0.15, 'sine', 0.2);
        },
        questComplete() {
            return createFanfare();
        },

        // --- Environment ---
        thunder() {
            return createThunder();
        },
        wind(intensity = 0.5) {
            return createWind(intensity);
        }
    };

    function createGunshot({ frequency = 100, duration = 0.2, distortion = 0.8, rumble = 60, crack = false }) {
        if (!ctx) return;
        const now = ctx.currentTime;

        // Main shot noise
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * distortion * 0.3));
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        // Low pass for body
        const body = ctx.createBiquadFilter();
        body.type = 'lowpass';
        body.frequency.setValueAtTime(frequency * 3, now);
        body.frequency.exponentialRampToValueAtTime(frequency * 0.5, now + duration * 0.5);

        // Rumble oscillator
        const rumbleOsc = ctx.createOscillator();
        rumbleOsc.frequency.setValueAtTime(rumble, now);
        rumbleOsc.frequency.exponentialRampToValueAtTime(rumble * 0.3, now + duration);
        const rumbleGain = ctx.createGain();
        rumbleGain.gain.setValueAtTime(0.4, now);
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.6);

        // Crack for snipers
        if (crack) {
            const crackOsc = ctx.createOscillator();
            crackOsc.frequency.setValueAtTime(3000, now);
            crackOsc.frequency.exponentialRampToValueAtTime(500, now + 0.05);
            const crackGain = ctx.createGain();
            crackGain.gain.setValueAtTime(0.3, now);
            crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            crackOsc.connect(crackGain);
            crackGain.connect(sfxGain || masterGain);
            crackOsc.start(now);
            crackOsc.stop(now + 0.1);
        }

        const outGain = ctx.createGain();
        outGain.gain.setValueAtTime(0.5, now);

        source.connect(body);
        body.connect(outGain);
        rumbleOsc.connect(rumbleGain);
        rumbleGain.connect(outGain);
        outGain.connect(sfxGain || masterGain);

        source.start(now);
        rumbleOsc.start(now);
        rumbleOsc.stop(now + duration);
    }

    function createShotgunBlast() {
        if (!ctx) return;
        const now = ctx.currentTime;

        const bufferSize = Math.floor(ctx.sampleRate * 0.4);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 300;
        filter.Q.value = 0.5;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.8, now);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGain || masterGain);
        source.start(now);
    }

    function createSuppressed() {
        if (!ctx) return;
        const now = ctx.currentTime;

        const bufferSize = Math.floor(ctx.sampleRate * 0.1);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 500;

        const gain = ctx.createGain();
        gain.gain.value = 0.2;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGain || masterGain);
        source.start(now);
    }

    function createRPG() {
        if (!ctx) return;
        const now = ctx.currentTime;

        // Whoosh
        const bufferSize = Math.floor(ctx.sampleRate * 0.6);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (i / bufferSize);
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(100, now);
        filter.frequency.exponentialRampToValueAtTime(2000, now + 0.3);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.6, now);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGain || masterGain);
        source.start(now);
    }

    function createExplosion(size = 1.0) {
        if (!ctx) return;
        const now = ctx.currentTime;
        const dur = 0.5 * size;

        const bufferSize = Math.floor(ctx.sampleRate * dur);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(400 * size, now);
        lowpass.frequency.exponentialRampToValueAtTime(50, now + dur * 0.7);

        // Sub boom
        const osc = ctx.createOscillator();
        osc.frequency.setValueAtTime(30 * size, now);
        osc.frequency.exponentialRampToValueAtTime(5, now + dur);
        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(size, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        const gain = ctx.createGain();
        gain.gain.value = Math.min(size, 1.0);

        source.connect(lowpass);
        lowpass.connect(gain);
        osc.connect(oscGain);
        oscGain.connect(gain);
        gain.connect(sfxGain || masterGain);

        source.start(now);
        osc.start(now);
        osc.stop(now + dur);
    }

    function createTone(freq, duration, type = 'sine', volume = 0.3) {
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain);
        gain.connect(sfxGain || masterGain);
        osc.start(now);
        osc.stop(now + duration + 0.01);
    }

    function createFootstep(surface) {
        if (!ctx) return;
        const now = ctx.currentTime;
        const freq = surface === 'metal' ? 1200 : surface === 'snow' ? 300 : 400;
        const dur = 0.06;

        const bufferSize = Math.floor(ctx.sampleRate * dur);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = freq;
        filter.Q.value = 1;

        const gain = ctx.createGain();
        gain.gain.value = 0.15;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGain || masterGain);
        source.start(now);
    }

    function createImpact(volume = 0.3, freq = 200) {
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(sfxGain || masterGain);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    function createReload() {
        if (!ctx) return;
        const now = ctx.currentTime;
        // Magazine release
        createImpact(0.2, 800);
        // Magazine insert
        setTimeout(() => createImpact(0.25, 600), 400);
        // Charge handle
        setTimeout(() => createImpact(0.3, 900), 700);
    }

    function createBulletHit(material) {
        if (!ctx) return;
        const now = ctx.currentTime;
        if (material === 'flesh') {
            const bufferSize = Math.floor(ctx.sampleRate * 0.05);
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
            }
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            const gain = ctx.createGain();
            gain.gain.value = 0.25;
            source.connect(gain);
            gain.connect(sfxGain || masterGain);
            source.start(now);
        } else {
            createImpact(0.15, 1400);
        }
    }

    function createLevelUp() {
        if (!ctx) return;
        const notes = [523, 659, 784, 1047]; // C E G C
        notes.forEach((freq, i) => {
            setTimeout(() => createTone(freq, 0.3, 'sine', 0.2), i * 120);
        });
    }

    function createFanfare() {
        if (!ctx) return;
        const notes = [523, 659, 784, 659, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => createTone(freq, 0.4, 'triangle', 0.25), i * 150);
        });
    }

    function createThunder() {
        if (!ctx) return;
        const now = ctx.currentTime;
        const bufferSize = Math.floor(ctx.sampleRate * 2.0);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            const envelope = i < bufferSize * 0.1 ? (i / (bufferSize * 0.1)) : Math.exp(-(i - bufferSize * 0.1) / (bufferSize * 0.4));
            data[i] = (Math.random() * 2 - 1) * envelope;
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 150;
        const gain = ctx.createGain();
        gain.gain.value = 0.6;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGain || masterGain);
        source.start(now);
    }

    function createWind(intensity) {
        if (!ctx) return;
        const bufferSize = Math.floor(ctx.sampleRate * 2);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 600;
        filter.Q.value = 0.5;
        const gain = ctx.createGain();
        gain.gain.value = intensity * 0.15;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGain || masterGain);
        source.start();
        return source; // Return so it can be stopped
    }

    // Procedural combat music (simple generative)
    let musicNodes = [];
    function startCombatMusic() {
        if (!ctx || musicNodes.length > 0) return;

        const pattern = [
            [80, 0.5], [80, 0.25], [100, 0.25], [90, 0.5], [80, 0.5],
            [70, 0.25], [70, 0.25], [80, 1.0]
        ];

        let time = ctx.currentTime;
        const tempo = 140; // BPM
        const beatDur = 60 / tempo;

        function scheduleNote(freq, dur) {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            const gainNode = ctx.createGain();
            gainNode.gain.setValueAtTime(0.15, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + dur * beatDur * 0.9);
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 800;
            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(musicGain || masterGain);
            osc.start(time);
            osc.stop(time + dur * beatDur);
            time += dur * beatDur;
        }

        for (let loop = 0; loop < 4; loop++) {
            pattern.forEach(([freq, dur]) => scheduleNote(freq, dur));
        }
    }

    function startHeartbeat() {
        if (heartbeatInterval) return;
        heartbeatInterval = setInterval(() => {
            createTone(60, 0.1, 'sine', 0.3);
            setTimeout(() => createTone(55, 0.08, 'sine', 0.2), 150);
        }, 800);
    }

    function stopHeartbeat() {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
    }

    return {
        init() {
            try {
                ctx = new (window.AudioContext || window.webkitAudioContext)();
                masterGain = ctx.createGain();
                masterGain.gain.value = 0.8;
                musicGain = ctx.createGain();
                musicGain.gain.value = 0.6;
                sfxGain = ctx.createGain();
                sfxGain.gain.value = 0.9;
                masterGain.connect(ctx.destination);
                musicGain.connect(masterGain);
                sfxGain.connect(masterGain);
                initialized = true;
            } catch (e) {
                console.warn('AudioEngine: Web Audio API not supported');
            }
        },

        resume() {
            if (ctx && ctx.state === 'suspended') ctx.resume();
        },

        play(soundName, ...args) {
            if (!initialized || !ctx) return;
            if (sounds[soundName]) sounds[soundName](...args);
        },

        setMasterVolume(v) {
            if (masterGain) masterGain.gain.value = v / 100;
        },

        setMusicVolume(v) {
            if (musicGain) musicGain.gain.value = v / 100;
        },

        setSFXVolume(v) {
            if (sfxGain) sfxGain.gain.value = v / 100;
        },

        startCombatMusic,
        startHeartbeat,
        stopHeartbeat,

        playFootstepSequence: Utils.throttle(function (surface) {
            sounds.footstep(surface);
        }, 350),

        isInitialized: () => initialized
    };
})();
