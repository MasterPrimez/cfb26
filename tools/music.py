#!/usr/bin/env python3
"""Generate a royalty-free background bed for the tour video: a slow, warm lo-fi loop
(soft pads over an Am–F–C–G progression, gentle kick/hat, vinyl-ish noise).
Usage: python3 tools/music.py <seconds> <out.wav>
"""
import sys, math
import numpy as np
from scipy.io import wavfile

SR = 44100
secs = float(sys.argv[1]) if len(sys.argv) > 1 else 180
out = sys.argv[2] if len(sys.argv) > 2 else 'shots/voice/music.wav'
BPM = 76
beat = 60 / BPM
bar = beat * 4
rng = np.random.default_rng(7)

def note(freq, dur, kind='pad', vel=1.0):
    t = np.arange(int(SR * dur)) / SR
    if kind == 'pad':
        # detuned saw-ish pad: a few sines with slow vibrato, soft low-pass feel via harmonic rolloff
        sig = np.zeros_like(t)
        for k, amp in [(1, 1.0), (2, 0.35), (3, 0.18), (4, 0.08)]:
            for det in (-0.4, 0, 0.4):
                sig += amp * np.sin(2 * math.pi * (freq * k + det) * t + 0.3 * np.sin(2 * math.pi * 0.2 * t))
        env = np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.9)
        return sig / 6 * env * vel
    if kind == 'bass':
        sig = np.sin(2 * math.pi * freq * t) + 0.3 * np.sin(2 * math.pi * freq * 2 * t)
        env = np.exp(-t * 1.2) * np.minimum(1, t / 0.01)
        return sig * env * vel
    if kind == 'pluck':
        sig = np.sin(2 * math.pi * freq * t) + 0.5 * np.sin(2 * math.pi * freq * 2 * t) * np.exp(-t * 6)
        env = np.exp(-t * 3.5) * np.minimum(1, t / 0.005)
        return sig * env * vel

def kick(dur=0.35):
    t = np.arange(int(SR * dur)) / SR
    f = 55 + 80 * np.exp(-t * 30)
    return np.sin(2 * math.pi * np.cumsum(f) / SR) * np.exp(-t * 9)

def hat(dur=0.08):
    t = np.arange(int(SR * dur)) / SR
    return rng.normal(0, 1, t.size) * np.exp(-t * 60) * 0.25

def midi(m): return 440 * 2 ** ((m - 69) / 12)

# Am – F – C – G (two bars each), voiced low and soft
CHORDS = [[57, 60, 64, 67], [53, 57, 60, 65], [48, 52, 55, 60], [55, 59, 62, 67]]
BASS = [45, 41, 36, 43]
MELODY = [76, 79, 81, 79, 76, 74, 72, 74]  # E G A G E D C D — sparse, one per bar

total = int(SR * secs)
mix = np.zeros(total)
def add(sig, at):
    i = int(at * SR); n = min(sig.size, total - i)
    if n > 0: mix[i:i + n] += sig[:n]

t0 = 0.0; b = 0
while t0 < secs:
    ch = CHORDS[(b // 2) % 4]; bass = BASS[(b // 2) % 4]
    for m in ch: add(note(midi(m), bar * 1.05, 'pad', 0.22), t0)
    add(note(midi(bass), bar, 'bass', 0.5), t0)
    add(note(midi(bass), beat, 'bass', 0.3), t0 + beat * 2.5)
    # drums: soft kick 1 & 3-and, hats on 8ths with swing
    add(kick() * 0.6, t0); add(kick() * 0.45, t0 + beat * 2.5)
    for e in range(8):
        add(hat() * (0.9 if e % 2 == 0 else 0.5), t0 + e * beat / 2 + (0.02 if e % 2 else 0))
    # melody: one note per bar, sometimes rests
    if b % 8 in (0, 1, 2, 4, 5, 6):
        add(note(midi(MELODY[b % 8]), beat * 2, 'pluck', 0.18), t0 + beat * (1 if b % 2 else 2))
    t0 += bar; b += 1

# vinyl-ish air + gentle low-pass (one-pole) + soft clip
mix += rng.normal(0, 1, total) * 0.004
y = np.zeros_like(mix); a = 0.15
for i in range(1, total): y[i] = y[i - 1] + a * (mix[i] - y[i - 1])
y = np.tanh(y * 1.4)
# fade in/out
fade = int(SR * 2.5); y[:fade] *= np.linspace(0, 1, fade); y[-fade:] *= np.linspace(1, 0, fade)
y = y / np.max(np.abs(y)) * 0.8
wavfile.write(out, SR, (y * 32767).astype(np.int16))
print('wrote', out, f'{secs:.0f}s')
