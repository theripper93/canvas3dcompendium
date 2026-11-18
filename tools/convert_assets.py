import bpy
import sys
import json
import math
import os
import traceback
from mathutils import Vector

MAX_TEX = 512
THUMB = 512


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_any(path):
    ext = path.lower().rsplit(".", 1)[-1]
    if ext in ("gltf", "glb"):
        bpy.ops.import_scene.gltf(filepath=path)
    elif ext == "fbx":
        bpy.ops.import_scene.fbx(filepath=path)
    elif ext == "obj":
        bpy.ops.wm.obj_import(filepath=path)
    else:
        raise ValueError("unsupported " + path)


def relink_images(texdir):
    if not texdir:
        return
    for img in list(bpy.data.images):
        if img.type == "IMAGE" and img.size[0] == 0:
            candidate = os.path.join(texdir, os.path.basename(img.filepath))
            if os.path.exists(candidate):
                img.filepath = candidate
                img.reload()


def shrink_images():
    for img in list(bpy.data.images):
        if img.type != "IMAGE" or not img.has_data and img.size[0] == 0:
            try:
                img.reload()
            except Exception:
                pass
        w, h = img.size
        if w == 0 or h == 0:
            continue
        s = max(w, h)
        if s > MAX_TEX:
            img.scale(max(1, int(w * MAX_TEX / s)), max(1, int(h * MAX_TEX / s)))
        try:
            img.pack()
        except Exception:
            pass


def export_glb(out):
    os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=out,
        export_format="GLB",
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_draco_position_quantization=14,
        export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=12,
        export_image_format="WEBP",
        export_apply=True,
        export_yup=True,
        export_animations=True,
    )


def scene_bounds():
    pts = []
    for ob in bpy.context.scene.objects:
        if ob.type != "MESH":
            continue
        for c in ob.bound_box:
            pts.append(ob.matrix_world @ Vector(c))
    if not pts:
        return Vector((0, 0, 0)), 1.0
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return (mn + mx) / 2, max((mx - mn).length / 2, 0.001)


def render_thumb(path, engine="WORKBENCH"):
    scene = bpy.context.scene
    center, radius = scene_bounds()
    cam_data = bpy.data.cameras.new("ThumbCam")
    cam_data.lens = 50
    cam = bpy.data.objects.new("ThumbCam", cam_data)
    scene.collection.objects.link(cam)
    fov = 2 * math.atan(36 / (2 * cam_data.lens))
    dist = radius / math.sin(fov / 2) * 1.05
    direction = Vector((1.0, -1.25, 0.85)).normalized()
    cam.location = center + direction * dist
    cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam_data.clip_end = dist * 10
    scene.camera = cam
    if engine == "CYCLES":
        scene.render.engine = "CYCLES"
        scene.cycles.device = "CPU"
        scene.cycles.samples = 16
        scene.cycles.use_denoising = False
        scene.cycles.transparent_max_bounces = 128
        scene.cycles.max_bounces = 6
        world = bpy.data.worlds.new("ThumbWorld")
        world.use_nodes = True
        world.node_tree.nodes["Background"].inputs[1].default_value = 2.5
        scene.world = world
        sun = bpy.data.objects.new("ThumbSun", bpy.data.lights.new("ThumbSun", "SUN"))
        sun.data.energy = 3
        sun.rotation_euler = (math.radians(50), 0, math.radians(30))
        scene.collection.objects.link(sun)
        scene.view_settings.view_transform = "Standard"
    else:
        scene.render.engine = "BLENDER_WORKBENCH"
        shading = scene.display.shading
        shading.light = "STUDIO"
        shading.color_type = "TEXTURE"
        shading.show_shadows = False
        shading.show_cavity = True
        shading.cavity_type = "WORLD"
    scene.render.film_transparent = True
    scene.render.resolution_x = THUMB
    scene.render.resolution_y = THUMB
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.quality = 85
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def main():
    argv = sys.argv[sys.argv.index("--") + 1 :]
    jobs = json.load(open(argv[0], encoding="utf-8"))
    ok = 0
    for job in jobs:
        try:
            reset()
            import_any(job["src"])
            relink_images(job.get("texdir"))
            shrink_images()
            export_glb(job["out"])
            if job.get("thumb"):
                render_thumb(job["thumb"], job.get("thumbEngine", "WORKBENCH"))
            ok += 1
            print("MM_OK", job["out"], flush=True)
        except Exception:
            print("MM_FAIL", job["src"], traceback.format_exc(), flush=True)
    print("MM_DONE", ok, "/", len(jobs), flush=True)


main()
