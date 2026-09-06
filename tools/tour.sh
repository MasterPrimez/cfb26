#!/usr/bin/env bash
# Encode tour frames (from tools/tour.mjs) into an H.264 MP4, with the Piper narration (tools/voice.mjs) if present.
# Usage: tools/tour.sh phone|desktop [out.mp4]
set -e
mode=${1:-phone}; out=${2:-shots/cfb26-tour-$mode.mp4}
dir=shots/tour-$mode
if [ "$mode" = phone ]; then size=1080:1920; else size=1920:1080; fi
ffmpeg -y -loglevel error -f concat -safe 0 -i "$dir/frames.txt" \
  -vf "scale=$size:flags=lanczos,format=yuv420p" -r 30 -c:v libx264 -preset slow -crf 20 -movflags +faststart "$dir/video.mp4"

if [ -f "$dir/cues.json" ] && [ -d shots/voice ]; then
  # Build one narration track: each cue's wav delayed to its start time, mixed, lightly normalized.
  # Music bed: generated to the video's length, then ducked under the narration (sidechain).
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$dir/video.mp4")
  python3 tools/music.py "$dur" "$dir/music.wav" >/dev/null
  python3 - "$dir" "$out" <<'EOF'
import json, subprocess, sys
d, out = sys.argv[1], sys.argv[2]
cues = json.load(open(f'{d}/cues.json'))
inputs, chains = ['-i', f'{d}/video.mp4', '-i', f'{d}/music.wav'], []
for i, c in enumerate(cues):
    inputs += ['-i', f'shots/voice/{c["key"]}.wav']
    chains.append(f'[{i+2}:a]aformat=sample_rates=48000:channel_layouts=mono,adelay={int(c["t"]*1000)}|{int(c["t"]*1000)}[a{i}]')
voice = ''.join(f'[a{i}]' for i in range(len(cues))) + f'amix=inputs={len(cues)}:normalize=0:dropout_transition=0,loudnorm=I=-16:TP=-1.5:LRA=9,aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[v1][v2]'
music = '[1:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.55[m]'
duck = '[m][v1]sidechaincompress=threshold=0.02:ratio=6:attack=40:release=900:makeup=1[md]'
final = '[md][v2]amix=inputs=2:normalize=0:dropout_transition=0,alimiter=limit=0.95[mix]'
fc = ';'.join(chains + [voice, music, duck, final])
cmd = ['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', fc, '-map', '0:v', '-map', '[mix]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]
subprocess.run(cmd, check=True)
EOF
else
  cp "$dir/video.mp4" "$out"
fi
echo "→ $out ($(du -h "$out" | cut -f1))"
