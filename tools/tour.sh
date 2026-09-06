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
  python3 - "$dir" "$out" <<'EOF'
import json, subprocess, sys
d, out = sys.argv[1], sys.argv[2]
cues = json.load(open(f'{d}/cues.json'))
inputs, chains = ['-i', f'{d}/video.mp4'], []
for i, c in enumerate(cues):
    inputs += ['-i', f'shots/voice/{c["key"]}.wav']
    chains.append(f'[{i+1}:a]aformat=sample_rates=48000:channel_layouts=mono,adelay={int(c["t"]*1000)}|{int(c["t"]*1000)}[a{i}]')
mix = ''.join(f'[a{i}]' for i in range(len(cues))) + f'amix=inputs={len(cues)}:normalize=0:dropout_transition=0,loudnorm=I=-17:TP=-1.5:LRA=9,aformat=channel_layouts=stereo[mix]'
fc = ';'.join(chains + [mix])
cmd = ['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', fc, '-map', '0:v', '-map', '[mix]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out]
subprocess.run(cmd, check=True)
EOF
else
  cp "$dir/video.mp4" "$out"
fi
echo "→ $out ($(du -h "$out" | cut -f1))"
