#!/usr/bin/env python3
"""Test-only bundler: inlines CSS + all ES modules into one classic-script HTML so the app can be
injected into a page on any origin for live testing. Not used in production (Vercel serves the modules)."""
import re, pathlib, json
root = pathlib.Path(__file__).resolve().parent.parent
order = ['js/api.js', 'js/networks.js', 'js/state.js', 'js/ui.js', 'js/views/panels.js', 'js/views/scores.js', 'js/views/tv.js',
         'js/views/rankings.js', 'js/views/playoff.js', 'js/views/teams.js', 'js/views/team.js', 'js/views/game.js', 'js/app.js']
js = []
for f in order:
    src = (root / f).read_text()
    src = re.sub(r'^import\s[^;]*;\s*$', '', src, flags=re.M)
    src = re.sub(r'^export\s+(async\s+)?function', r'\1function', src, flags=re.M)
    src = re.sub(r'^export\s+const', 'const', src, flags=re.M)
    js.append(f'// ---- {f}\n{src}')
bundle = '\n'.join(js)
html = (root / 'index.html').read_text()
css = (root / 'css/app.css').read_text()
html = html.replace('<link rel="stylesheet" href="css/app.css">', f'<style>{css}</style>')
html = html.replace('<script type="module" src="js/app.js"></script>', '')
body = re.search(r'<body>(.*)</body>', html, re.S).group(1)
head = re.search(r'<head>(.*)</head>', html, re.S).group(1)
out = root / 'dist'; out.mkdir(exist_ok=True)
(out / 'bundle.js').write_text(bundle)
(out / 'inject.json').write_text(json.dumps({'head': head, 'body': body, 'js': bundle}))
print('bundle', len(bundle), 'bytes; head', len(head), 'body', len(body))
