# Reconstruye en Blender el mapa de IsoWorldTest.jsx (mismos datos exportados) y lo renderiza.
# Uso: blender -b --python build_map.py -- <realista|pixel> <ruta de salida>
import sys, json, math, random
import bpy, bmesh
import numpy as np
from mathutils import Vector, Euler

argv = sys.argv[sys.argv.index("--") + 1:]
MODE, OUT = argv[0], argv[1]
GLB = argv[2] if len(argv) > 2 else None
PIXEL = MODE == "pixel"
import os
HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(HERE + r"\mapdata.json"))
N = D["N"]; SIZE = D["SIZE"]; HALF = SIZE / 2
H = np.array(D["heights"], dtype=np.float32).reshape(N, N)           # [j (z), i (x)]
C = np.array(D["colors"], dtype=np.float32).reshape(N, N, 3)         # sRGB
LAKE = D["lake"]
rng = random.Random(7)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def lin(c):
    return np.power(np.clip(c, 0, 1), 2.2)

def Hs(x, z):
    fx = (x + HALF) / SIZE * (N - 1); fz = (z + HALF) / SIZE * (N - 1)
    i0 = int(np.clip(math.floor(fx), 0, N - 2)); j0 = int(np.clip(math.floor(fz), 0, N - 2))
    tx = min(max(fx - i0, 0), 1); tz = min(max(fz - j0, 0), 1)
    a = H[j0, i0]; b = H[j0, i0 + 1]; c = H[j0 + 1, i0]; d = H[j0 + 1, i0 + 1]
    return float(a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz)

# ---------- materiales ----------
def principled(m):
    return next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")

def flat_mat(name, rgb, rough=0.8, emit=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    bs = principled(m)
    bs.inputs["Base Color"].default_value = (*lin(np.array(rgb)).tolist(), 1)
    bs.inputs["Roughness"].default_value = rough
    if emit:
        bs.inputs["Emission Color"].default_value = (*lin(np.array(emit)).tolist(), 1)
        bs.inputs["Emission Strength"].default_value = 4.0
    return m

def vcol_mat(name, rough=0.85, detail=False):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree
    bs = principled(m)
    vc = nt.nodes.new("ShaderNodeVertexColor"); vc.layer_name = "Col"
    if detail and not PIXEL:
        # micro relieve y variación de color: ruido fino sobre el color de vértice
        tc = nt.nodes.new("ShaderNodeTexCoord")
        nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 3.2; nz.inputs["Detail"].default_value = 14; nz.inputs["Roughness"].default_value = 0.62
        nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
        mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"; mix.inputs["Factor"].default_value = 0.55
        ramp = nt.nodes.new("ShaderNodeMapRange"); ramp.inputs["From Min"].default_value = 0.3; ramp.inputs["From Max"].default_value = 0.7; ramp.inputs["To Min"].default_value = 0.62; ramp.inputs["To Max"].default_value = 1.22
        nt.links.new(nz.outputs["Fac"], ramp.inputs["Value"])
        g = nt.nodes.new("ShaderNodeCombineColor")
        for k in ("Red", "Green", "Blue"): nt.links.new(ramp.outputs["Result"], g.inputs[k])
        nt.links.new(vc.outputs["Color"], mix.inputs["A"]); nt.links.new(g.outputs["Color"], mix.inputs["B"])
        nt.links.new(mix.outputs["Result"], bs.inputs["Base Color"])
        bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.55; bump.inputs["Distance"].default_value = 0.4
        nz2 = nt.nodes.new("ShaderNodeTexNoise"); nz2.inputs["Scale"].default_value = 9.0; nz2.inputs["Detail"].default_value = 15; nz2.inputs["Roughness"].default_value = 0.7
        nt.links.new(tc.outputs["Object"], nz2.inputs["Vector"])
        nt.links.new(nz2.outputs["Fac"], bump.inputs["Height"])
        nt.links.new(bump.outputs["Normal"], bs.inputs["Normal"])
    else:
        nt.links.new(vc.outputs["Color"], bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = rough
    return m

# ---------- terreno ----------
def make_terrain(step):
    idx = list(range(0, N, step))
    if idx[-1] != N - 1: idx.append(N - 1)
    n = len(idx)
    xs = [-HALF + SIZE * i / (N - 1) for i in idx]
    verts = [(xs[a], -xs[b], float(H[idx[b], idx[a]])) for b in range(n) for a in range(n)]
    faces = []
    for b in range(n - 1):
        for a in range(n - 1):
            p = b * n + a
            faces.append((p, p + n, p + n + 1, p + 1))
    me = bpy.data.meshes.new("Terreno"); me.from_pydata(verts, [], faces); me.update()
    cols = np.array([lin(C[idx[b], idx[a]]) for b in range(n) for a in range(n)], dtype=np.float32)
    if PIXEL:
        # color por cara, repartido en pocos escalones; vértices no compartidos para que el color vaya por vértice
        nv, nf, ncol = [], [], []
        for (p0, p1, p2, p3) in faces:
            c = np.mean([C[idx[p // n], idx[p % n]] for p in (p0, p1, p2, p3)], axis=0)
            if c.max() - c.min() < 0.14: c = np.full(3, np.round(c.mean() * 5) / 5) + np.array([0.02, 0.0, -0.02])
            else: c = np.round(c * 5) / 5
            b = len(nv)
            nv += [verts[p0], verts[p1], verts[p2], verts[p3]]; nf.append((b, b + 1, b + 2, b + 3)); ncol += [lin(c)] * 4
        me = bpy.data.meshes.new("Terreno"); me.from_pydata(nv, [], nf); me.update()
        ncol = np.array(ncol, dtype=np.float32)
        at = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
        at.data.foreach_set("color", np.concatenate([ncol, np.ones((len(ncol), 1), dtype=np.float32)], axis=1).ravel())
        for pl in me.polygons: pl.use_smooth = False
    else:
        at = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
        at.data.foreach_set("color", np.concatenate([cols, np.ones((len(cols), 1), dtype=np.float32)], axis=1).ravel())
        for pl in me.polygons: pl.use_smooth = True
    ob = bpy.data.objects.new("Terreno", me); sc.collection.objects.link(ob)
    ob.data.materials.append(vcol_mat("MatTerreno", 0.9 if not PIXEL else 1.0, detail=True))
    return ob
terrain = make_terrain(2 if PIXEL else 1)

# ---------- borde del diorama ----------
sides = [lambda t: (-HALF + SIZE * t, -HALF), lambda t: (HALF, -HALF + SIZE * t), lambda t: (HALF - SIZE * t, HALF), lambda t: (-HALF, HALF - SIZE * t)]
sv, sf, scol = [], [], []
steps = 120
for f in sides:
    for k in range(steps):
        a = f(k / steps); b = f((k + 1) / steps)
        ha = Hs(*a); hb = Hs(*b)
        sea = (ha + hb) / 2 < 0.2
        ya = 0.0 if sea else ha; yb = 0.0 if sea else hb
        c = (0.07, 0.3, 0.5) if sea else (0.36, 0.25, 0.16)
        base = len(sv)
        sv += [(a[0], -a[1], ya), (b[0], -b[1], yb), (b[0], -b[1], -9.0), (a[0], -a[1], -9.0)]
        sf.append((base, base + 1, base + 2, base + 3))
        scol += [lin(np.array(c))] * 4
sme = bpy.data.meshes.new("Borde"); sme.from_pydata(sv, [], sf); sme.update()
at = sme.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
arr = np.array(scol, dtype=np.float32)
at.data.foreach_set("color", np.concatenate([arr, np.ones((arr.shape[0], 1), dtype=np.float32)], axis=1).ravel())
side = bpy.data.objects.new("Borde", sme); sc.collection.objects.link(side)
side.data.materials.append(vcol_mat("MatBorde", 0.95))

# ---------- agua: imagen con la profundidad, la espuma y las ondas ----------
R = 1024
gx = np.linspace(-HALF, HALF, R)
fx = (gx + HALF) / SIZE * (N - 1)
i0 = np.clip(np.floor(fx).astype(int), 0, N - 2); tx = fx - i0
rows = H[:, i0] * (1 - tx) + H[:, i0 + 1] * tx          # [N, R]
rowsf = np.empty((R, R), dtype=np.float32)
fz = (gx + HALF) / SIZE * (N - 1)
j0 = np.clip(np.floor(fz).astype(int), 0, N - 2); tz = (fz - j0)[:, None]
Hup = rows[j0] * (1 - tz) + rows[j0 + 1] * tz            # [R(z), R(x)]
X, Z = np.meshgrid(gx, gx)
d = np.maximum(0.0 - Hup, 0.0)
def sstep(a, b, v):
    t = np.clip((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
shallow = np.array([0.38, 0.82, 0.8]); mid = np.array([0.1, 0.52, 0.78]); deep = np.array([0.04, 0.24, 0.5])
t1 = sstep(0.2, 2.4, d)[..., None]; t2 = sstep(2.0, 8.0, d)[..., None]
wc = shallow * (1 - t1) + mid * t1
wc = wc * (1 - t2) + deep * t2
wave = np.sin(X * 0.9) * np.sin(Z * 0.8)
foam = sstep(0.55, 0.0, d + wave * 0.16 + np.sin(d * 3.0) * 0.1)
if PIXEL:
    wc = np.floor(wc * 5 + 0.5) / 5
    wc = wc + (wave * 0.5 + 0.5 > 0.55)[..., None] * 0.07
    foam = (foam > 0.5).astype(np.float32)
else:
    wc = wc + ((np.sin(X * 2.1) * np.sin(Z * 2.3) * 0.5 + 0.5) > 0.93)[..., None] * 0.1
wc = wc * (1 - foam[..., None] * 0.9) + np.array([0.97, 0.99, 1.0]) * foam[..., None] * 0.9
wimg = bpy.data.images.new("Agua", R, R, alpha=False, float_buffer=True)
wimg.colorspace_settings.name = "sRGB"
buf = np.concatenate([np.clip(wc, 0, 1), np.ones((R, R, 1))], axis=2).astype(np.float32)
wimg.pixels.foreach_set(np.ascontiguousarray(buf[::-1]).ravel()); wimg.update()     # Blender cuenta las filas desde abajo
print("AGUA stats", float(np.nanmin(wc)), float(np.nanmax(wc)), float(np.nanmean(wc)), "nan:", int(np.isnan(wc).sum()), "pix mean", float(np.array(wimg.pixels[:]).mean()), "d max", float(d.max()), "H", float(Hup.min()), float(Hup.max()))
import os
wimg.filepath_raw = os.path.join(HERE, "agua_" + MODE + ".png"); wimg.file_format = "PNG"; wimg.save()
wimg.pack()

def water_mat(rough, rippled):
    m = bpy.data.materials.new("MatAgua"); m.use_nodes = True
    nt = m.node_tree; bs = principled(m)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = wimg; tex.interpolation = "Closest" if PIXEL else "Linear"; tex.extension = "EXTEND"
    nt.links.new(tc.outputs["UV"], tex.inputs["Vector"])
    nt.links.new(tex.outputs["Color"], bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = rough
    try: bs.inputs["Specular IOR Level"].default_value = 0.35
    except Exception: pass
    if rippled:
        nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 1.1; nz.inputs["Detail"].default_value = 6
        nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
        bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.18
        nt.links.new(nz.outputs["Fac"], bump.inputs["Height"])
        nt.links.new(bump.outputs["Normal"], bs.inputs["Normal"])
    return m

bpy.ops.mesh.primitive_grid_add(x_subdivisions=2, y_subdivisions=2, size=SIZE, location=(0, 0, -0.01))
sea = bpy.context.active_object; sea.name = "Mar"
sea.data.materials.append(water_mat(0.55 if PIXEL else 0.05, not PIXEL))
# la cuadrícula trae UV de 0 a 1: ya cubre el plano completo

# lago (disco con degradado) y río (cinta)
bpy.ops.mesh.primitive_circle_add(vertices=48, radius=LAKE["r"] * 1.35, fill_type="TRIFAN", location=(LAKE["x"], -LAKE["z"], LAKE["y"]))
lake = bpy.context.active_object; lake.name = "Lago"
lake.data.materials.append(flat_mat("MatLago", (0.12, 0.5, 0.72), 0.55 if PIXEL else 0.05))
pts = D["river"]
rv, rf = [], []
for k, (x, y, z) in enumerate(pts):
    a = pts[max(0, k - 1)]; b = pts[min(len(pts) - 1, k + 1)]
    dx, dz = b[0] - a[0], b[2] - a[2]; l = math.hypot(dx, dz) or 1; dx /= l; dz /= l
    w = 1.5
    rv += [(x - dz * w, -(z + dx * w), y), (x + dz * w, -(z - dx * w), y)]
    if k < len(pts) - 1:
        q = k * 2; rf.append((q, q + 1, q + 3, q + 2))
rme = bpy.data.meshes.new("Rio"); rme.from_pydata(rv, [], rf); rme.update()
river = bpy.data.objects.new("Rio", rme); sc.collection.objects.link(river)
river.data.materials.append(flat_mat("MatRio", (0.18, 0.62, 0.82), 0.55 if PIXEL else 0.06))

# ---------- mallas básicas ----------
def mesh_from_bm(bm, name):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); return me
def box_mesh(w, d, h):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co.x *= w; v.co.y *= d; v.co.z = (v.co.z + 0.5) * h
    return mesh_from_bm(bm, "box")
def pyramid_mesh(w, d, h):
    bm = bmesh.new()
    v = [bm.verts.new(p) for p in [(-w / 2, -d / 2, 0), (w / 2, -d / 2, 0), (w / 2, d / 2, 0), (-w / 2, d / 2, 0), (0, 0, h)]]
    bm.faces.new((v[0], v[3], v[2], v[1]))
    for i in range(4): bm.faces.new((v[i], v[(i + 1) % 4], v[4]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_from_bm(bm, "pir")
def cone_mesh(r1, r2, h, seg):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r1, radius2=r2, depth=h)
    for v in bm.verts: v.co.z += h / 2
    return mesh_from_bm(bm, "cono")
def ico_mesh(r, sub):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r); return mesh_from_bm(bm, "ico")
def smooth(ob, flat=True):
    for p in ob.data.polygons: p.use_smooth = not flat

M = {
    "wall": flat_mat("wall", (0.89, 0.79, 0.63)), "wall2": flat_mat("wall2", (0.79, 0.69, 0.54)),
    "roof": flat_mat("roof", (0.7, 0.32, 0.17)), "roof2": flat_mat("roof2", (0.55, 0.25, 0.14)),
    "wood": flat_mat("wood", (0.48, 0.34, 0.21)), "stone": flat_mat("stone", (0.6, 0.59, 0.55), 0.95),
    "stone2": flat_mat("stone2", (0.49, 0.48, 0.45), 0.95), "white": flat_mat("white", (0.95, 0.93, 0.89)),
    "red": flat_mat("red", (0.76, 0.23, 0.18)), "sail": flat_mat("sail", (0.95, 0.9, 0.78)),
    "dark": flat_mat("dark", (0.03, 0.03, 0.05)), "lamp": flat_mat("lamp", (1.0, 0.88, 0.5), emit=(1.0, 0.88, 0.5)),
}
def parent_empty(x, z, rot, y0=None):
    e = bpy.data.objects.new("grupo", None); e.location = (x, -z, Hs(x, z) if y0 is None else y0); e.rotation_euler = (0, 0, rot)
    sc.collection.objects.link(e); return e
def part(parent, me, mat, x, y, z, rz=0.0, sx=1, sy=1, sz=1, flat=True):
    # coordenadas de tres.js (x, altura, z) -> Blender (x, -z, altura)
    ob = bpy.data.objects.new("p", me); ob.location = (x, -z, y); ob.rotation_euler = (0, 0, rz); ob.scale = (sx, sy, sz)
    ob.parent = parent; ob.data.materials.append(mat); sc.collection.objects.link(ob); smooth(ob, flat); return ob
def box(parent, w, h, d, mat, x=0, y=0, z=0): return part(parent, box_mesh(w, d, h), mat, x, y, z)
def roof(parent, w, d, h, mat, x=0, y=0, z=0): return part(parent, pyramid_mesh(w + 0.3, d + 0.3, h), mat, x, y, z)
def house(x, z, rot, w, d, h, wall, rf):
    g = parent_empty(x, z, rot)
    box(g, w, h, d, M[wall]); roof(g, w, d, h * 0.75, M[rf], 0, h, 0); box(g, 0.5, 0.9, 0.12, M["wood"], 0, 0, d / 2 + 0.02)

# ---------- edificios (mismas posiciones que en la versión en tiempo real) ----------
g = parent_empty(4, -4, -0.3)
box(g, 6.5, 2.6, 3.2, M["wall2"]); roof(g, 6.5, 3.2, 2.2, M["roof2"], 0, 2.6, 0)
box(g, 3.2, 2.4, 5.2, M["wall2"], -1.6, 0, 0.8); roof(g, 3.2, 5.2, 2.2, M["roof2"], -1.6, 2.4, 0.8)
box(g, 1.7, 5.2, 1.7, M["wall"], 2.6, 0, -0.8); roof(g, 1.7, 1.7, 2.1, M["roof"], 2.6, 5.2, -0.8)
g = parent_empty(-36, 11, 0.5)
box(g, 3.2, 2.6, 6, M["wall"]); roof(g, 3.2, 6, 1.9, M["roof2"], 0, 2.6, 0)
box(g, 2, 6.4, 2, M["stone"], 0, 0, 3.6); roof(g, 2, 2, 2.6, M["roof"], 0, 6.4, 3.6)
house(-41, 16, 0.2, 2.4, 2.4, 1.8, "wall", "roof"); house(-31, 17, -0.4, 2.6, 2.2, 1.7, "wall2", "roof2"); house(-43, 7, 0.9, 2.2, 2.2, 1.7, "wall", "roof")
# castillo en ruinas
cx, cz = 35, -26
g = parent_empty(cx, cz, 0.3)
Rr = 6.5
def hsh(a, b): return ((a * 374761393 + b * 668265263) & 0xffffffff) / 4294967295.0
for i in range(12):
    a = i / 12 * 6.283; hg = 2.6 + hsh(i, 7) * 2.2
    part(g, box_mesh(3.6, 1, hg), M["stone2"] if i % 4 == 0 else M["stone"], math.cos(a) * Rr, 0, math.sin(a) * Rr, rz=-a + math.pi / 2)
    if hsh(i, 3) > 0.35:
        part(g, box_mesh(0.7, 1.1, 0.6), M["stone"], math.cos(a) * Rr, hg, math.sin(a) * Rr, rz=-a + math.pi / 2)
for k, (dx, dz) in enumerate([(1, 0.8), (-0.7, 0.9), (0.1, -1)]):
    th = 5.5 + k * 1.3
    part(g, cone_mesh(1.7, 1.5, th, 12), M["stone2"], dx * Rr, 0, dz * Rr * 0.9, flat=False)
    part(g, cone_mesh(1.7, 1.5, 0.7, 12), M["stone"], dx * Rr, th, dz * Rr * 0.9, flat=False)
box(g, 4, 6.5, 4, M["stone"], -0.5, 0, -0.5); box(g, 1.4, 8, 1.4, M["stone2"], 1.2, 0, 0.8)
# puerto
for k, (x, z, r, w, dd) in enumerate([(27, 20, 0.3, 3, 2.6), (31, 17, -0.2, 2.6, 2.4), (35, 19, 0.6, 3, 2.6), (29, 25, 0.1, 2.4, 2.4), (34, 24, -0.5, 3.2, 2.8), (38, 22, 0.2, 2.4, 2.4), (25, 15, 0.5, 2.4, 2.2)]):
    house(x, z, r, w, dd, 1.9 + (k % 3) * 0.3, "wall2" if k % 2 else "wall", "roof" if k % 3 else "roof2")
pg = parent_empty(39, 17, 0.4, y0=0.55)
def deck(w, d, x, z):
    box(pg, w, 0.25, d, M["wood"], x, 0.1, z)
    for i in range(-int(d // 2.5), int(d // 2.5) + 1): box(pg, 0.3, 0.9, 0.3, M["wood"], x - w / 2, -0.5, z + i * 2.5)
deck(2.4, 17, 0, 8); deck(12, 2.2, 5, 15); deck(2.2, 8, 10.5, 19)
for k, (x, z, rot, s) in enumerate([(44, 22, 0.1, 1), (46, 27, -0.5, 0.9), (42, 31, 0.3, 1.1), (50, 16, 1.2, 0.8), (48, 38, -0.2, 1)]):
    bg = parent_empty(x, z, rot, y0=0.1); bg.scale = (s, s, s)
    box(bg, 1.5, 0.7, 4.4, M["wood"], 0, 0, 0)
    part(bg, cone_mesh(0.75, 0.0, 1.6, 4), M["wood"], 0, 0.35, 3.0, rz=math.pi / 4, sy=1).rotation_euler = (math.radians(90), 0, math.pi / 4)
    part(bg, cone_mesh(0.07, 0.07, 4.2, 6), M["wood"], 0, 0.5, 0)
    sl = box(bg, 0.04, 3.0, 2.1, M["sail"], 0, 1.2, 0.2)
# faro
fg = parent_empty(52, 31, 0)
for k, (r1, r2) in enumerate([(1.5, 1.2), (1.1, 1.0), (0.95, 0.85)]):
    part(fg, cone_mesh(r1 * 0.9, r2 * 0.8, 2.0, 12), M["red"] if k % 2 else M["white"], 0, k * 2, 0, flat=False)
part(fg, cone_mesh(0.8, 0.8, 1.0, 10), M["lamp"], 0, 6.0, 0, flat=False)
part(fg, cone_mesh(1.0, 0.0, 1.0, 10), M["red"], 0, 6.9, 0, flat=False)
# cueva
cave = bpy.data.objects.new("cueva", ico_mesh(2.6, 3)); cave.scale = (1.2, 0.8, 0.9); cave.location = (-4, 38.5, Hs(-4, -38.5) - 0.3)
cave.data.materials.append(M["dark"]); sc.collection.objects.link(cave); smooth(cave, False)
bm = bmesh.new(); bm.from_mesh(cave.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.2], context="VERTS"); bm.to_mesh(cave.data); bm.free()

# caminos
for pp in [[(-36, 11), (-24, 12), (-10, 6), (4, -3), (14, 6), (26, 16), (31, 21)], [(4, -4), (16, -14), (28, -22), (34, -26)], [(-36, 11), (-30, 22), (-26, 28)], [(4, -4), (-2, -16), (-8, -26)]]:
    pts2 = []
    for i in range(len(pp) - 1):
        for k in range(14):
            t = k / 14
            pts2.append((pp[i][0] + (pp[i + 1][0] - pp[i][0]) * t + math.sin((i * 14 + k) * 0.6) * 0.5, pp[i][1] + (pp[i + 1][1] - pp[i][1]) * t + math.cos((i * 14 + k) * 0.5) * 0.5))
    pts2.append(pp[-1])
    v2, f2 = [], []
    for k, (x, z) in enumerate(pts2):
        a = pts2[max(0, k - 1)]; b = pts2[min(len(pts2) - 1, k + 1)]
        dx, dz = b[0] - a[0], b[1] - a[1]; l = math.hypot(dx, dz) or 1; dx /= l; dz /= l
        y = Hs(x, z) + 0.07
        v2 += [(x - dz * 0.6, -(z + dx * 0.6), y), (x + dz * 0.6, -(z - dx * 0.6), y)]
        if k < len(pts2) - 1:
            q = k * 2; f2.append((q, q + 1, q + 3, q + 2))
    me = bpy.data.meshes.new("camino"); me.from_pydata(v2, [], f2); me.update()
    ob = bpy.data.objects.new("camino", me); ob.data.materials.append(flat_mat("camino", (0.77, 0.64, 0.42), 1.0)); sc.collection.objects.link(ob)

# ---------- árboles ----------
def tree_mats():
    ms = {}
    def objcol_mat(name, rough):
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; bs = principled(m)
        oi = nt.nodes.new("ShaderNodeObjectInfo"); nt.links.new(oi.outputs["Color"], bs.inputs["Base Color"]); bs.inputs["Roughness"].default_value = rough
        return m
    return objcol_mat("hojas", 0.9), flat_mat("tronco", (0.35, 0.23, 0.13), 1.0)
leaf_mat, trunk_mat = tree_mats()
if PIXEL:
    pine_me = cone_mesh(1.15, 0.0, 4.4, 6); round_me = ico_mesh(1.35, 1)
else:
    bm = bmesh.new()
    for k, (r, hh, z0) in enumerate([(1.45, 2.1, 0.5), (1.1, 1.9, 1.7), (0.75, 1.7, 2.8)]):
        tmp = bmesh.new(); bmesh.ops.create_cone(tmp, cap_ends=True, cap_tris=False, segments=9, radius1=r, radius2=0.0, depth=hh)
        for v in tmp.verts: v.co.z += hh / 2 + z0; v.co.x += rng.uniform(-0.03, 0.03)
        me_t = bpy.data.meshes.new("t"); tmp.to_mesh(me_t); tmp.free(); bm.from_mesh(me_t); bpy.data.meshes.remove(me_t)
    pine_me = mesh_from_bm(bm, "pino")
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.35)
    for v in bm.verts:
        n = 1 + 0.18 * math.sin(v.co.x * 4.1) * math.cos(v.co.y * 3.7 + v.co.z * 2.3)
        v.co *= n; v.co.z = v.co.z * 0.9 + 2.5
    round_me = mesh_from_bm(bm, "copa")
trunk_me = cone_mesh(0.2, 0.16, 1.4, 6)
smooth_leaf = not PIXEL
variants = {}
def tree_variant(kind, base_me, color):
    key = (kind, tuple(round(v, 2) for v in color))
    if key not in variants:
        me2 = base_me.copy(); me2.materials.clear(); me2.materials.append(flat_mat("hoja_%s_%d" % (kind, len(variants)), color, 0.9))
        for pl in me2.polygons: pl.use_smooth = not PIXEL if kind != "x" else True
        variants[key] = me2
    return variants[key]
def place_tree(me, x, h, z, s, color, extra=1.0, kind="p"):
    ob = bpy.data.objects.new("a", tree_variant(kind, me, color)); ob.location = (x, -z, h); ob.rotation_euler = (0, 0, rng.uniform(0, 6.28))
    ob.scale = (s, s, s * (0.9 + rng.random() * 0.5) * extra); sc.collection.objects.link(ob)
    return ob
pine_cols = [(0.12, 0.29, 0.16), (0.14, 0.33, 0.2), (0.1, 0.25, 0.15), (0.17, 0.36, 0.21)]
round_cols = [(0.37, 0.56, 0.18), (0.45, 0.63, 0.22), (0.31, 0.5, 0.16), (0.53, 0.66, 0.24)]
for (x, h, z, s, f) in D["pines"]:
    c = rng.choice(pine_cols)
    if h > 11: t = 0.45 if h < 14 else 0.75; c = tuple(c[k] * (1 - t) + 0.9 * t for k in range(3))
    place_tree(pine_me, x, h, z, s, c, 1.0, "p")
    tr = bpy.data.objects.new("tr", trunk_me); tr.location = (x, -z, h); tr.scale = (s, s, s); tr.data.materials.append(trunk_mat); sc.collection.objects.link(tr)
for (x, h, z, s, f) in D["rounds"]:
    place_tree(round_me, x, h, z, s, rng.choice(round_cols), 1.0, "r")
    tr = bpy.data.objects.new("tr", trunk_me); tr.location = (x, -z, h); tr.scale = (s, s, s * 1.6); tr.data.materials.append(trunk_mat); sc.collection.objects.link(tr)

# ---------- nubes (solo en el realista) ----------
if not PIXEL:
    cm = bpy.data.materials.new("nube"); cm.use_nodes = True; b = principled(cm)
    b.inputs["Base Color"].default_value = (1, 1, 1, 1); b.inputs["Roughness"].default_value = 1.0
    try: b.inputs["Emission Color"].default_value = (1, 1, 1, 1); b.inputs["Emission Strength"].default_value = 0.35
    except Exception: pass
    for (x, y, z, sz) in [(-48, 26, -26, 1.0), (-30, 30, -44, 1.2), (4, 33, -42, 1.1), (46, 28, -36, 1.0), (52, 22, 8, 0.8), (-52, 19, 10, 0.9), (-44, 16, 36, 0.8)]:
        for k in range(7):
            ob = bpy.data.objects.new("nube", ico_mesh(rng.uniform(3, 5.2) * sz, 2))
            ob.location = (x + rng.uniform(-8, 8) * sz, -z + rng.uniform(-3, 3), y + rng.uniform(-1.2, 1.4))
            ob.scale = (1.4, 1.0, 0.55); ob.data.materials.append(cm); sc.collection.objects.link(ob); smooth(ob, False)

# ---------- luz, mundo y cámara ----------
sun = bpy.data.lights.new("Sol", "SUN"); sun.energy = 4.6 if not PIXEL else 4.0; sun.angle = math.radians(1.2 if PIXEL else 2.5)
sun.color = (1.0, 0.94, 0.82) if not PIXEL else (1.0, 1.0, 1.0)
sob = bpy.data.objects.new("Sol", sun); sc.collection.objects.link(sob)
sob.location = (90, -40, 70); sob.rotation_euler = (Vector((0, 0, 0)) - sob.location).to_track_quat("-Z", "Y").to_euler()
world = bpy.data.worlds.new("Mundo"); sc.world = world; world.use_nodes = True
wn = world.node_tree; bgn = next(n for n in wn.nodes if n.type == "BACKGROUND")
if PIXEL:
    bgn.inputs["Color"].default_value = (*lin(np.array([0.82, 0.9, 0.95])).tolist(), 1); bgn.inputs["Strength"].default_value = 0.9
else:
    sky = wn.nodes.new("ShaderNodeTexSky"); sky.sky_type = "MULTIPLE_SCATTERING"; sky.sun_disc = False; sky.sun_elevation = math.radians(45); sky.sun_rotation = math.radians(145)
    # los rayos de cámara ven un fondo claro; el resto de rayos (luz y reflejos) usan el cielo
    lp = wn.nodes.new("ShaderNodeLightPath"); mixc = wn.nodes.new("ShaderNodeMix"); mixc.data_type = "RGBA"
    mixc.inputs["B"].default_value = (*lin(np.array([0.83, 0.9, 0.95])).tolist(), 1)
    wn.links.new(sky.outputs["Color"], mixc.inputs["A"]); wn.links.new(lp.outputs["Is Camera Ray"], mixc.inputs["Factor"])
    wn.links.new(mixc.outputs["Result"], bgn.inputs["Color"]); bgn.inputs["Strength"].default_value = 1.0

target = bpy.data.objects.new("objetivo", None); target.location = (0, -4, 0); sc.collection.objects.link(target)
cam = bpy.data.cameras.new("Camara"); cam.type = "ORTHO"; cam.ortho_scale = 210; cam.clip_start = 1; cam.clip_end = 700
cob = bpy.data.objects.new("Camara", cam); sc.collection.objects.link(cob)
cob.location = (-52, -100 - 4, 92)
con = cob.constraints.new("TRACK_TO"); con.target = target; con.track_axis = "TRACK_NEGATIVE_Z"; con.up_axis = "UP_Y"
sc.camera = cob

# ---------- exportación 3D ----------
if GLB:
    _orig_mat = terrain.data.materials[0]; terrain.data.materials[0] = vcol_mat("MatTerrenoGLB", 0.9)
    props = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
    want = dict(filepath=GLB, export_format="GLB", export_yup=True, export_cameras=False, export_lights=False, export_apply=False, export_materials="EXPORT", export_vertex_color="MATERIAL", export_image_format="AUTO", use_selection=False, export_extras=False)
    bpy.ops.export_scene.gltf(**{k: v for k, v in want.items() if k in props})
    import os
    print("GLB OK", GLB, os.path.getsize(GLB))
    terrain.data.materials[0] = _orig_mat

# ---------- render ----------
engines = [i.identifier for i in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
print("motores:", engines)
for e in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
    if e in engines: sc.render.engine = e; break
r = sc.render
if PIXEL:
    r.resolution_x, r.resolution_y = 640, 360
    sc.eevee.taa_render_samples = 1
    sc.view_settings.view_transform = "Standard"
    r.filter_size = 0.0
else:
    r.resolution_x, r.resolution_y = 1920, 1080
    sc.eevee.taa_render_samples = 96
    try: sc.view_settings.view_transform = "Khronos PBR Neutral"
    except Exception: sc.view_settings.view_transform = "AgX"
r.resolution_percentage = 100
for k, v in (("use_raytracing", True), ("use_shadows", True), ("shadow_ray_count", 3), ("shadow_step_count", 12), ("use_fast_gi", False)):
    try: setattr(sc.eevee, k, v)
    except Exception: pass
r.image_settings.file_format = "PNG" if PIXEL else "JPEG"
if not PIXEL: r.image_settings.quality = 90
r.filepath = OUT
bpy.ops.render.render(write_still=True)
print("RENDER OK", OUT)

if PIXEL:
    img = bpy.data.images.load(OUT)
    img.colorspace_settings.name = "Non-Color"
    px = np.array(img.pixels[:], dtype=np.float32).reshape(-1, 4)
    q = 6.0
    px[:, :3] = np.round(px[:, :3] * q) / q
    o = bpy.data.images.new("pix", img.size[0], img.size[1], alpha=False); o.colorspace_settings.name = "Non-Color"
    o.pixels.foreach_set(px.ravel()); o.filepath_raw = OUT; o.file_format = "PNG"; o.save()
    print("PIXEL POSTERIZADO")
