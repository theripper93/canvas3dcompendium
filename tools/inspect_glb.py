import json, struct, sys, io
from PIL import Image
def read(path):
    b = open(path, 'rb').read()
    assert b[:4] == b'glTF'
    off = 12; js = None; binc = None
    while off < len(b):
        ln, typ = struct.unpack_from('<II', b, off); off += 8
        chunk = b[off:off+ln]; off += ln
        if typ == 0x4E4F534A: js = json.loads(chunk)
        else: binc = chunk
    return js, binc
for p in sys.argv[1:]:
    js, binc = read(p)
    imgs = []
    for im in js.get('images', []):
        bv = js['bufferViews'][im['bufferView']]
        data = binc[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']]
        imgs.append((im.get('mimeType'), Image.open(io.BytesIO(data)).size))
    mins=[];maxs=[]
    for m in js['meshes']:
        for pr in m['primitives']:
            a = js['accessors'][pr['attributes']['POSITION']]
            mins.append(a['min']); maxs.append(a['max'])
    mn=[min(v[i] for v in mins) for i in range(3)]; mx=[max(v[i] for v in maxs) for i in range(3)]
    nodes=[(n.get('name'), n.get('translation'), n.get('rotation'), n.get('scale')) for n in js['nodes']]
    print(p.split('/')[-1], 'draco' if 'KHR_draco_mesh_compression' in js.get('extensionsUsed',[]) else 'NO-DRACO', imgs, 'bbox', [round(x,3) for x in mn], [round(x,3) for x in mx], nodes[:2], 'mats', [m['name'] for m in js.get('materials',[])])
