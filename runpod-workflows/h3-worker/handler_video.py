"""Keep the official RunPod contract, including ComfyUI SaveVideo outputs."""
import subprocess
from pathlib import Path

import handler as upstream
import runpod


OUTPUT_DIR = Path('/comfyui/output').resolve()


def last_frame_descriptor(video):
    """Extract one real final frame beside a ComfyUI video output.

    The normal RunPod handler already serializes image descriptors as base64.
    Adding this descriptor lets the API save a continuity frame without trying
    to decode MP4 in a serverless web request.
    """
    filename = video.get('filename')
    subfolder = video.get('subfolder', '')
    if not isinstance(filename, str) or not filename.lower().endswith(('.mp4', '.webm', '.mov')):
        return None
    relative = Path(subfolder) / filename
    source = (OUTPUT_DIR / relative).resolve()
    if OUTPUT_DIR not in source.parents or not source.is_file():
        return None
    target_name = f'{Path(filename).stem}.last-frame.png'
    target = source.with_name(target_name)
    if not target.is_file():
        result = subprocess.run(['ffmpeg', '-y', '-sseof', '-0.001', '-i', str(source), '-frames:v', '1', str(target)], capture_output=True, timeout=45)
        if result.returncode != 0 or not target.is_file():
            return None
    return {'filename': target_name, 'subfolder': subfolder, 'type': video.get('type', 'output')}


def normalize_history(history):
    for prompt in history.values():
        for output in prompt.get('outputs', {}).values():
            images = list(output.get('images', []))
            seen = {(v.get('filename'), v.get('subfolder', ''), v.get('type')) for v in images}
            for key in ('videos', 'gifs'):
                for value in output.pop(key, []):
                    identity = (value.get('filename'), value.get('subfolder', ''), value.get('type'))
                    if identity not in seen:
                        images.append(value)
                        seen.add(identity)
                    frame = last_frame_descriptor(value)
                    if frame:
                        frame_identity = (frame['filename'], frame.get('subfolder', ''), frame['type'])
                        if frame_identity not in seen:
                            images.append(frame)
                            seen.add(frame_identity)
            if images:
                output['images'] = images
    return history


original_get_history = upstream.get_history


def video_history(prompt_id):
    return normalize_history(original_get_history(prompt_id))


if __name__ == '__main__':
    upstream.get_history = video_history
    # Default RunPod handler is sequential: one job and one GPU per worker.
    runpod.serverless.start({'handler': upstream.handler})
