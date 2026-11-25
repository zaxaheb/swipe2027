# Construit index.html (données intégrées) et data/base.json (base pour l'IA côté serveur).
# Usage : python3 build.py <dossier data>   (par défaut ../data/)
import json, sys, os
D = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "data") + "/"
H = os.path.dirname(os.path.abspath(__file__))
p = json.load(open(D + 'programme/aec_programme_2027.json'))
secs = p['sections']; idx = {s['url']: i for i, s in enumerate(secs)}
S = [{**{k: s[k] for k in ('partie', 'chapitre', 'section', 'intro', 'url')}, 'prog': 'LFI'} for s in secs]
Mz = [{'id': m['id'], 's': idx[m['sec']], 'cle': m['cle'], 't': m['texte'], 'sous': m['sous'], 'page': m['page']} for m in p['mesures']]
for f in ('rn_programme.json', 'autres_candidats.json'):
    x = json.load(open(D + 'programme/' + f)); off = len(S)
    S += x['sections']; Mz += [{**m, 's': m['s'] + off} for m in x['mesures']]
progs = json.load(open(D + 'programme/autres_candidats.json'))['progs']
v = json.load(open(D + 'assemblee/scrutins_17e_cles.json'))
for s in v['scrutins']: s.pop('cle', None)
from build_cond import build as build_cond
c = build_cond(D)   # Casier Politique + Poligraph (voir build_cond.py)
fi = json.load(open(D + 'fiches.json'))
if os.path.exists(D + 'fiches_auto.json'):   # fiches générées par scripts/generer-fiches.mjs (les fiches écrites à la main restent prioritaires)
    auto = json.load(open(D + 'fiches_auto.json')); fi = {**{k: v for k, v in auto.items() if k in {m['id'] for m in Mz}}, **fi}
if os.path.exists(D + 'fiches_cowork.json'):  # fiches rédigées par les agents Claude (sourcées via pages lues) : au-dessus des fiches auto
    cw = {k: v for k, v in json.load(open(D + 'fiches_cowork.json')).items() if k in {m['id'] for m in Mz}}
    main = json.load(open(D + 'fiches.json'))
    for k, fv in cw.items():
        if k in main:
            if not main[k].get("logique") and fv.get("logique"): fi[k] = {**main[k], "logique": fv["logique"]}
        else: fi[k] = fv
ids = {m['id'] for m in Mz}; assert all(k in ids for k in fi)
print(len(fi), 'fiches au total')
J = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
h = open(os.path.join(H, 'template.html')).read()
for k, o in [('PROG', {'progs': progs, 'sections': S, 'mesures': Mz}), ('VOTES', v), ('COND', c), ('FICHES', fi)]:
    h = h.replace(f'/*__{k}__*/null', J(o))
open(os.path.join(H, 'index.html'), 'w').write(h)
# base serveur
cand = {'LFI': {'nom': 'LFI', 'cand': 'Jean-Luc Mélenchon'}, 'RN': {'nom': 'RN', 'cand': 'Marine Le Pen'}}
cand.update({k: {'nom': x['nom'], 'cand': x['cand'] + (' (' + x['retrait']['texte'] + ')' if x.get('retrait') else '')} for k, x in progs.items()})
base = {'candidats': cand,
        'mesures': [{'id': m['id'], 'P': S[m['s']]['prog'], 't': m['t'] + (' (' + ' ; '.join(m['sous']) + ')' if m['sous'] else ''),
                     'section': S[m['s']]['section'], 'intro': S[m['s']]['intro'][:900],
                     'url': m.get('src') or (S[m['s']]['url'] + ('#' + m['id'] if S[m['s']]['prog'] == 'LFI' else ''))} for m in Mz],
        'fiches': fi, 'scrutins': v['scrutins'], 'condamnations': c['condamnations']}
os.makedirs(os.path.join(H, 'data'), exist_ok=True)
json.dump(base, open(os.path.join(H, 'data', 'base.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('index.html', len(h), '| base.json', len(base['mesures']), 'mesures')

# Version 2 (exploration UX sans swipe) : v2.html
from build_v2 import build as build_v2
build_v2(H, progs, S, Mz, fi, c)
