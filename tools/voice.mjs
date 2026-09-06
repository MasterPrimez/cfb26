// Synthesize the narration lines with Piper (offline neural TTS) → shots/voice/<key>.wav + durations.json.
// Usage: node tools/voice.mjs [model.onnx]   (default: $PIPER_VOICE or ~/tts/en-us-ryan-high.onnx)
import { spawnSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { NARR } from './narration.mjs';

const model = process.argv[2] || process.env.PIPER_VOICE || join(process.env.HOME || '', 'tts/en-us-ryan-high.onnx');
const out = 'shots/voice'; mkdirSync(out, { recursive: true });
const durations = {};
for (const [key, { say }] of Object.entries(NARR)) {
  const wav = join(out, key + '.wav');
  const r = spawnSync('piper', ['-m', model, '--length_scale', '1.04', '--sentence_silence', '0.35', '-f', wav], { input: say, encoding: 'utf8' });
  if (r.status !== 0) { console.error(key, r.stderr); process.exit(1); }
  const p = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav], { encoding: 'utf8' });
  durations[key] = Number(p.stdout.trim());
  console.log(key.padEnd(9), durations[key].toFixed(2) + 's');
}
writeFileSync(join(out, 'durations.json'), JSON.stringify(durations, null, 2));
console.log('total', Object.values(durations).reduce((a, b) => a + b, 0).toFixed(1) + 's');
