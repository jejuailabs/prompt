# TRELLIS Blackwell worker

Dedicated CUDA 13 / sm_120 runtime. This is not the H3 runtime and does not change
the architecture Blender worker. All CUDA extension source revisions are pinned
in the Dockerfile. The model weights are downloaded at runtime using the existing
Hugging Face authorization; no credentials belong in the image.

## Acceptance sequence

1. Build the image on `codex/3d-unity-pipeline`; record the immutable digest.
2. Configure a stopped TRELLIS endpoint with this image and `python -u /app/handler.py`.
   Do not retain the old Hub bootstrap command. Preserve HF_TOKEN/HF_HOME privately.
3. Temporarily allocate the user-approved single Blackwell GPU worker, minimum zero.
4. Submit `{"action":"diagnose"}`. Require actual matmul, xformers dense/variable
   attention, CuMesh normal calculation, and FlexGEMM sparse convolution success.
   Import success alone is not a GPU compatibility test.
5. Submit one reference character at 512 / texture 1024 / seed 42; do not duplicate
   an uncertain submission. Execution timeout and queue TTL must be bounded.
6. Inspect actual GLB geometry, then use Blender to inspect front/side/back and
   export a local delivery file. A completed RunPod status is not quality approval.
7. Restore the temporary worker allocation after terminal job state.

`CUDA_LAUNCH_BLOCKING=1` is for diagnostic attribution, not a performance benchmark.
Remove it only after correcting any kernel failures and record that change.

## Output contract

`model` is base64 GLB. `metadata.timings_ms` separates model load, inference and
mesh export. RunPod delay/execution times remain separate provider measurements.
`metadata.unity_ready` is always false: this worker does not auto-rig characters.
Errors carry `error`, `stage`, and full `traceback`; never treat them as a model.

HTTPS input is restricted to the official test origin and the configured
`IMAGE_STORAGE_HOST`. Production storage host must be deliberately configured;
arbitrary URL fetches and redirects are disallowed. Data-URI input is also accepted.
