"""Keep the official RunPod contract, including ComfyUI SaveVideo outputs."""
import handler as upstream
import runpod


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
