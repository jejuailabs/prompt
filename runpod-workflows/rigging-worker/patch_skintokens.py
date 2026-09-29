"""Fix duplicate child adjacency in the pinned SkinTokens Blender exporter.

Upstream issue: https://github.com/VAST-AI-Research/SkinTokens/issues/8
The second append makes every one-child bone appear to have two children,
so its tail misses the next joint. Fail the image build if upstream changes.
"""
from pathlib import Path


def patch_exporter(path: Path) -> None:
    source = path.read_text(encoding='utf-8')
    before = '''        for i in range(len(asset.parents)):
            p = asset.parents[i]
            if p == -1:
                continue
            sons[p].append(i)
            d = np.linalg.norm(joints[i] - joints[p])
'''
    after = before.replace('            sons[p].append(i)\n', '')
    if source.count(before) != 1:
        raise RuntimeError('SkinTokens exporter changed; review the bone-tail patch')
    path.write_text(source.replace(before, after, 1), encoding='utf-8')


if __name__ == '__main__':
    patch_exporter(Path('/opt/SkinTokens/src/rig_package/parser/bpy.py'))
