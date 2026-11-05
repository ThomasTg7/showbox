"""Convierte la foto recortada de un peleador (PNG con fondo transparente) en su sombra: un `path` SVG negro.

Uso (Python 3 con numpy, Pillow y scipy):
    python scripts/generate-fighter-silhouette.py foto.png salida.txt
Imprime el viewBox; el contenido de `salida.txt` va en el `d` de `src/features/fighters/components/fighter-silhouette.tsx`.
Solo se usa el contorno (el canal alfa): nada de la foto queda en el sitio.
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

K = 4  # se trabaja a 4x para que el contorno salga suave
SMOOTH = 1.2  # desenfoque (en píxeles de la foto) antes del umbral: quita el serrucho del recorte
SIMPLIFY = 0.6  # tolerancia de la simplificación (en píxeles de la foto)

photo = Image.open(sys.argv[1]).convert("RGBA")
W, H = photo.size
alpha = np.asarray(photo.resize((W * K, H * K), Image.BICUBIC), dtype=np.float32)[..., 3] / 255.0
soft = ndimage.gaussian_filter(alpha, sigma=SMOOTH * K)
mask = soft > 0.5
# El borde de abajo de la foto corta el cuerpo: se cierra un poco más abajo, fuera del viewBox, y se ve recto.
mask = np.vstack([mask, np.repeat(mask[-1:, :], 8 * K, axis=0), np.zeros((2, mask.shape[1]), dtype=bool)])

DIRS = [(1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1)]  # (dx, dy) en sentido horario


def trace(m, start):
    """Borde de la región que contiene `start` (su primer píxel en el barrido), con vecindad de Moore."""
    hh, ww = m.shape
    pts = [start]
    cur, back = start, 4
    for _ in range(500000):
        for k in range(8):
            dirn = (back + 1 + k) % 8
            nx, ny = cur[0] + DIRS[dirn][0], cur[1] + DIRS[dirn][1]
            if 0 <= nx < ww and 0 <= ny < hh and m[ny, nx]:
                back, cur = (dirn + 4) % 8, (nx, ny)
                break
        else:
            break
        if cur == start:
            break
        pts.append(cur)
    return pts


def first_pixel(region):
    ys, xs = np.nonzero(region)
    i = np.lexsort((xs, ys))[0]
    return int(xs[i]), int(ys[i])


labels, count = ndimage.label(mask)
largest = 1 + int(np.argmax(ndimage.sum(mask, labels, range(1, count + 1))))
body = labels == largest
loops = [trace(body, first_pixel(body))]
# Huecos (entre el brazo y el torso): se dibujan con `evenodd`; los muy chicos se ignoran.
holes, hole_count = ndimage.label(~body)
for lab in range(1, hole_count + 1):
    region = holes == lab
    touches_edge = region[0, :].any() or region[-1, :].any() or region[:, 0].any() or region[:, -1].any()
    if not touches_edge and region.sum() > (6 * K) ** 2:
        loops.append(trace(region, first_pixel(region)))


def rdp(points, eps):
    if len(points) < 3:
        return points
    (ax, ay), (bx, by) = points[0], points[-1]
    norm = np.hypot(bx - ax, by - ay) or 1.0
    dists = [abs((bx - ax) * (py - ay) - (by - ay) * (px - ax)) / norm for px, py in points[1:-1]]
    i = int(np.argmax(dists)) + 1
    if dists[i - 1] > eps:
        return rdp(points[: i + 1], eps)[:-1] + rdp(points[i:], eps)
    return [points[0], points[-1]]


def to_path(loop):
    half = len(loop) // 2
    pts = rdp(loop[: half + 1], SIMPLIFY * K)[:-1] + rdp(loop[half:] + [loop[0]], SIMPLIFY * K)[:-1]
    pts = [(x / K, y / K) for x, y in pts]
    n = len(pts)
    out = [f"M{pts[0][0]:.1f} {pts[0][1]:.1f}"]
    for i in range(n):  # Catmull-Rom -> Bézier: curvas que pasan por los puntos
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        out.append(f"C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}")
    return "".join(out) + "Z"


with open(sys.argv[2], "w") as out:
    out.write("".join(to_path(loop) for loop in loops))
print(f'viewBox="0 0 {W} {H}"', len(loops), "contornos")
