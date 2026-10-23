#!/usr/bin/env python3
# Ganzglastür der EVEREST XL als eigene Ebene: aus dem Studio-Keyframe k1_xl.png werden
#   k1_door_base.png  Keyframe ohne Griff, Logo-Druck und Riegel (Tür "weg")
#   door_pane.png     Glasscheibe mit Griff, Logo-Druck und Riegel (RGBA)
#   door.json         Lage der Scheibe im Keyframe (für composition.js)
# composition.js dreht die Scheibe um ihre rechte Kante (Scharniere) -> echte Drehtür.
# Die Türteile sind relativ zum Freisteller xl_front.png angegeben und werden über
# placement.json (studio_keyframes.py) auf jedes Format umgerechnet.
#   python3 -I scripts/door_assets.py projects/everest-tour/keyframes
import sys, os, json
import numpy as np
from PIL import Image, ImageFilter

D = sys.argv[1]
k = np.asarray(Image.open(os.path.join(D, 'k1_xl.png')).convert('RGB')).astype(float)
P = json.load(open(os.path.join(D, 'placement.json')))['k1_xl']['xl_front']
# x0, y0, x1, y1 in Freisteller-px (xl_front.png, 769 x 734)
REL = {
    'DOOR': (271.02, 19.2, 496.86, 717.06),     # Scheibe
    'HANDLE': (294.73, 238.27, 325.22, 493.47), # Griff inkl. Schatten
    'LATCH': (298.12, 19.2, 320.7, 32.75),      # Riegel oben links an der Tür
    'GRIP': (300.38, 241.66, 315.06, 490.09),   # Griffstange selbst
    'LOGO': (329.74, 53.07, 442.66, 123.09),    # Logo-Druck auf dem Glas
}
def to_key(r):
    s = P['scale']
    return (round(P['x0'] + r[0] * s), round(P['y0'] + r[1] * s), round(P['x0'] + r[2] * s), round(P['y0'] + r[3] * s))
DOOR, HANDLE, LATCH, GRIP, LOGO = (to_key(REL[n]) for n in ('DOOR', 'HANDLE', 'LATCH', 'GRIP', 'LOGO'))

base = k.copy()
pane = np.zeros((DOOR[3] - DOOR[1], DOOR[2] - DOOR[0], 4))

def fill_rows(box, rng):
    """Fläche zeilenweise zwischen linkem und rechtem Rand interpolieren (Lamellen laufen waagerecht),
    mit etwas Holzmaserung aus der Nachbarschaft."""
    x0, y0, x1, y1 = box
    L = k[y0:y1, x0 - 3:x0].mean(1); R = k[y0:y1, x1:x1 + 3].mean(1)
    t = np.linspace(0, 1, x1 - x0)[None, :, None]
    fill = L[:, None, :] * (1 - t) + R[:, None, :] * t
    grain = k[y0:y1, x0 - (x1 - x0) - 4:x0 - 4] if x0 - (x1 - x0) - 4 > 0 else 0
    detail = (grain - np.asarray(Image.fromarray(np.clip(grain, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))).astype(float)) if not np.isscalar(grain) else 0
    base[y0:y1, x0:x1] = fill + 0.6 * detail

def lift_rect(box):
    x0, y0, x1, y1 = box
    px, py = x0 - DOOR[0], y0 - DOOR[1]
    pane[py:py + (y1 - y0), px:px + (x1 - x0), :3] = k[y0:y1, x0:x1]
    pane[py:py + (y1 - y0), px:px + (x1 - x0), 3] = 255

def lift(box, mask_fn):
    """Element aus dem Keyframe in die Scheibe übernehmen (Alpha aus mask_fn)."""
    x0, y0, x1, y1 = box
    region = k[y0:y1, x0:x1]
    a = mask_fn(region, base[y0:y1, x0:x1])
    px, py = x0 - DOOR[0], y0 - DOOR[1]
    pane[py:py + (y1 - y0), px:px + (x1 - x0), :3] = region
    pane[py:py + (y1 - y0), px:px + (x1 - x0), 3] = np.maximum(pane[py:py + (y1 - y0), px:px + (x1 - x0), 3], a)

# 1) Basis ohne Türelemente
for box in (HANDLE, LATCH, LOGO):
    fill_rows(box, None)
Image.fromarray(np.clip(base, 0, 255).astype(np.uint8)).save(os.path.join(D, 'k1_door_base.png'))

# 2) Scheibe: Griff und Riegel als feste Teile, Logo-Druck als helle Maske
lift_rect(GRIP)
lift_rect(LATCH)
lift(LOGO, lambda r, b: np.clip((r.mean(2) - b.mean(2) - 6) / 30, 0, 1) * 255)
Image.fromarray(np.clip(pane, 0, 255).astype(np.uint8), 'RGBA').save(os.path.join(D, 'door_pane.png'))
json.dump({'left': DOOR[0], 'top': DOOR[1], 'width': DOOR[2] - DOOR[0], 'height': DOOR[3] - DOOR[1]}, open(os.path.join(D, 'door.json'), 'w'))
print('door', DOOR)
