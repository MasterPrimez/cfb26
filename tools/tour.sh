#!/usr/bin/env bash
# Encode tour frames (from tools/tour.mjs) into an H.264 MP4.
# Usage: tools/tour.sh phone|desktop [out.mp4]
set -e
mode=${1:-phone}; out=${2:-shots/cfb26-tour-$mode.mp4}
dir=shots/tour-$mode
if [ "$mode" = phone ]; then size=1080:1920; else size=1920:1080; fi
ffmpeg -y -loglevel error -f concat -safe 0 -i "$dir/frames.txt" \
  -vf "scale=$size:flags=lanczos,format=yuv420p" -r 30 -c:v libx264 -preset slow -crf 20 -movflags +faststart "$out"
echo "→ $out ($(du -h "$out" | cut -f1))"
