"""
Blender script to fix materials for GLTF/GLB export.

Run in Blender's Scripting tab. Output written to ~/Desktop/blender-gltf-fix.log
"""

import bpy
import os

LOG_PATH = os.path.expanduser("~/Desktop/blender-gltf-fix.log")
_log = []

def log(msg=""):
    print(msg)
    _log.append(msg)

def write_log():
    with open(LOG_PATH, 'w') as f:
        f.write('\n'.join(_log))


def find_texture_by_suffix(nodes, suffix):
    """Find an image texture node whose image name contains the suffix."""
    for n in nodes:
        if n.type == 'TEX_IMAGE' and n.image:
            name = n.image.name.lower()
            if suffix in name:
                return n
    return None


def fix_materials():
    log("=" * 60)
    log("GLTF Material Fix v2")
    log("=" * 60)

    fixed_count = 0

    for mat in bpy.data.materials:
        if not mat.use_nodes:
            continue
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        bsdf = next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if not bsdf:
            continue

        all_images = [n for n in nodes if n.type == 'TEX_IMAGE' and n.image]
        if not all_images:
            continue

        log(f"\n--- {mat.name} ---")
        log(f"    Images: {[n.image.name for n in all_images]}")

        # --- Base Color ---
        bc_input = bsdf.inputs['Base Color']
        bc_connected = bc_input.links and bc_input.links[0].from_node.type == 'TEX_IMAGE'

        if not bc_connected:
            # Find diffuse texture (_d suffix)
            diffuse = find_texture_by_suffix(nodes, '_d')
            if diffuse:
                links.new(diffuse.outputs['Color'], bc_input)
                log(f"    FIX Base Color -> {diffuse.image.name}")
                fixed_count += 1
            else:
                log(f"    SKIP Base Color: no _d texture found")
        else:
            log(f"    OK Base Color: already connected")

        # --- Roughness ---
        rough_input = bsdf.inputs['Roughness']
        rough_connected = rough_input.links and rough_input.links[0].from_node.type == 'TEX_IMAGE'

        if not rough_connected:
            roughness = find_texture_by_suffix(nodes, '_r')
            if roughness:
                links.new(roughness.outputs['Color'], rough_input)
                log(f"    FIX Roughness -> {roughness.image.name}")
                fixed_count += 1
            else:
                log(f"    SKIP Roughness: no _r texture found")
        else:
            log(f"    OK Roughness: already connected")

        # --- Normal ---
        normal_input = bsdf.inputs['Normal']
        if not normal_input.links:
            normal_tex = find_texture_by_suffix(nodes, '_n')
            if normal_tex:
                # Need a Normal Map node between texture and BSDF
                normal_map = nodes.new('ShaderNodeNormalMap')
                normal_tex.image.colorspace_settings.name = 'Non-Color'
                links.new(normal_tex.outputs['Color'], normal_map.inputs['Color'])
                links.new(normal_map.outputs['Normal'], normal_input)
                log(f"    FIX Normal -> {normal_tex.image.name}")
                fixed_count += 1
            else:
                log(f"    SKIP Normal: no _n texture found")
        else:
            log(f"    OK Normal: already connected")

    # --- Fix alpha modes for transparency materials ---
    alpha_mats = ['eyelash', 'cornea', 'lacrimal']
    for mat in bpy.data.materials:
        if mat.name in alpha_mats and mat.use_nodes:
            bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if bsdf:
                mat.blend_method = 'CLIP'  # Use alpha clip for clean edges
                mat.shadow_method = 'CLIP'
                # Set alpha cutoff via the BSDF Alpha input if not connected
                if not bsdf.inputs['Alpha'].links:
                    # Check if the base color texture has alpha
                    bc = bsdf.inputs['Base Color']
                    if bc.links and bc.links[0].from_node.type == 'TEX_IMAGE':
                        tex_node = bc.links[0].from_node
                        mat.node_tree.links.new(tex_node.outputs['Alpha'], bsdf.inputs['Alpha'])
                        log(f"    FIX Alpha: {mat.name} -> texture alpha channel")
                        fixed_count += 1

    log()
    log("=" * 60)
    log(f"Applied {fixed_count} fix(es). Re-export as GLB now.")
    log("=" * 60)
    write_log()


fix_materials()
