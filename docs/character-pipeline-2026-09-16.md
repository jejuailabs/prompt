# Character pipeline implementation — 2026-09-16

## Scope and verified status

Target: image → volumetric mesh → reviewed topology/materials → skeleton and
weights → game engine. A successful GLB transport is not a finished character.
The user will perform Unity import testing directly; local Unity attempted to
start but reported no valid Editor license. Do not mark Unity Ready.

Implemented locally (not pushed to main):
- Actual vertex-byte checks for TRELLIS GLB, rejecting flat/invalid geometry.
- Successful outputs explicitly labelled as meshes requiring game preparation.
- Worker delay/execution time retained and displayed.
- FBX download uses an actual link rather than a button without a handler.
- Unity Editor validation source, not yet compiled due to license restriction.

Dedicated Blender image built and pushed on `codex/3d-unity-pipeline`:
`ghcr.io/jejuailabs/playlab-character-blender@sha256:e5ca6de7fbeed4ab03b5370c88ad086321e1d65881adb89ba358c5a124d25e19`

Build commit: `7730fdf`; successful Actions run: 35073829367.
Main, existing architectural Blender endpoint, and Vercel were not changed.
This image is NOT yet connected to the public application or deployed on RunPod.

Blender 4.2.23 LTS, official archive SHA-256 verified. Initial bpy-wheel build
failed at import (missing library), then at interpreter shutdown after successful
exports. Replaced the wheel with the official Blender CLI; container smoke passed.
Local portable Blender also rejected the previous flat mascot in 2.378 seconds
(import/QC only), with no GPU charge.

## Deterministic handoff

The worker accepts GLB bytes plus validated `target: mobile|pc` and height in metres.
No AI-generated Python, shell commands or arbitrary download URLs are executed.
The input design is never silently replaced.

- Preserve source mesh separately.
- Inspect dimensions and triangles before expensive work.
- Transform all scene roots together; preserve multipart alignment and armatures.
- Preliminary triangle budgets: mobile 20k, PC 60k; these are initial policies,
  not measured optimum settings. Decimation is not deformation-ready retopology.
- Cap texture dimensions at 1k/2k without changing aspect.
- Preserve GLB PBR output; FBX is interchange, not guaranteed Unity PBR equivalence.
- Report skeleton, missing/invalid weights and per-stage timings.
- Never assert Unity Ready from a file extension or skeleton alone.

## Tests

- `node --test tests/asset3d-qc.test.cjs`: 5 passed, including the real flat model.
- `python -m unittest discover -s runpod-workflows/character-worker -p test_policy.py`: 4 passed.
- Container smoke: synthetic sphere GLB import → normalize → GLB/FBX export passed.
  This verifies software execution, not character quality.
- Targeted API/QC ESLint passed.
- Full TypeScript check has existing errors in unrelated example/seed/game-room,
  prompts, Stripe and UI files; no new 3D-file error reported.

## Pending actual generation and rigging

Prepared an official TRELLIS dwarf reference and a single-submit test runner.
User approved temporary LTX 2→1 / TRELLIS 0→1 allocation.
Submitted exactly one job: `5a25ebfe-7829-47e6-a6b0-06694567372b-e1`.
Result: FAILED, queue/startup 308,839 ms, execution 3,094 ms.
Error: `Inference failed: CUDA error: no kernel image is available for execution on the device`.
The worker was initially throttled, then running; no GLB was produced.
Existing public upstream Dockerfile uses CUDA 12.4 and `TORCH_CUDA_ARCH_LIST=8.0;9.0`
(A100/H100), which is not a validated Blackwell build. The exact failing CUDA
extension cannot be isolated from the handler's shortened error; worker log URL
returned 404. Do not attribute the failure to a specific extension without a stack.
Needs a Blackwell-compatible runtime AND rebuilt CUDA extensions, followed by a
new explicit bounded smoke/inference test; changing a CUDA label is insufficient.

### Blackwell runtime correction in progress

Inspected the actual pinned Docker registry config (not merely the current upstream
Dockerfile): CUDA_VERSION=12.4.1, TORCH_CUDA_ARCH_LIST=8.0;9.0. This runtime is not
built for the selected sm_120 GPU. The exact first failing old kernel remains unknown.

Dedicated build branch `codex/3d-unity-pipeline` now contains a separate TRELLIS
runtime: torch 2.11.0+cu130, xformers 0.0.35, sm_120 rebuilds of pinned CuMesh,
FlexGEMM, nvdiffrast, nvdiffrec and o-voxel. Main/Vercel were not changed.
Added actual matmul, dense/variable-length attention, tetrahedron normals and
sparse-convolution preflight checks before loading model weights. Inference errors
include full traceback and stage; successful output carries measured stage times.

Build diagnostics so far:
- 35077160201: uv selected the PyTorch index's obsolete requests package;
  ordinary application dependencies now resolve from PyPI while keeping installed
  torch/cu130 versions pinned.
- 35077701678: nvdiffrec compiled but failed to link `-lcuda` on GPU-less CI;
  set compile-time LIBRARY_PATH to CUDA stubs (not runtime LD_LIBRARY_PATH).
- 35078627469: all CUDA extensions compiled successfully; final CI import check
  failed because FlexGEMM queries a physical GPU at import time. Removed that
  GPU-dependent import from CPU-only validation (not from real GPU preflight).
- 35080360729 / commit `8bf79af`: SUCCESS, 34m58s. CPU build validation passed.

### Deployment and capacity check (2026-09-16)

Owner Chrome login confirmed as jejuailabs. The new package was already public;
no repository/package visibility mutation was needed. Anonymous registry manifest
access passed (7.64 GiB compressed, 18 layers).
Deployed immutable image
`ghcr.io/jejuailabs/playlab-trellis-blackwell@sha256:5350d7ca2be89085d5f430fb7e9687b2bc91ee3299287fd5d44f8e78dbd860b1`
using new private RunPod template `9e884o6s14` (previous `h7r4xiwgz7`).
Submitted one GPU diagnostic `23733e97-188b-46b6-ba49-97180ba9a052-e1`.
It remained queued. RunPod console explicitly reported no free GPU capacity for
the selected 96 GB Pro configuration, with zero running workers and $0.00 billed
in its displayed past-hour billing view. This is NOT a successful GPU validation.
Cancelled that diagnostic (API-confirmed CANCELLED); restored and confirmed
TRELLIS max0 / LTX max2. New runtime remains connected, disabled for generation.
Next: capacity available -> actual CUDA preflight -> one volumetric character ->
Blender export and visual QC. No character output was produced in this attempt.

### Bounded ordinary Pod attempt

User approved one Blackwell ordinary Pod, maximum 30 minutes, then deletion.
Pod `agpqwvnvvyoyrv` was created at 2026-09-16T10:36:12Z for $2.09/GPU-hour
(console total including disk approximately $2.10/hour), 100GB ephemeral disk.
The host repeatedly reported `create container: still fetching image` for roughly
15 minutes. No public IP/SSH mapping appeared; CUDA preflight and inference never
started. Stopped the attempt at the preparation cutoff rather than consume the
whole budget. Deleted the exact test Pod and confirmed it absent from the Pod list.
No model output existed to recover. This does not establish runtime compatibility.
Next alternative should separate image-delivery remediation (smaller runtime image,
validated registry/host pull) from A100/H100-compatible CUDA build and actual inference.

The user approved making only this new runtime image public, with no tokens,
member data or model weights included. The currently connected Chrome GitHub
session is `funjeju`, not package owner `jejuailabs`; requested the owner session
for package visibility configuration while the build continues.

These are build corrections, not a successful generation claim. Deployment and
GPU preflight remain required. No new GPU generation was submitted during these builds.

Restored and API-confirmed: TRELLIS min/max 0/0, LTX min/max 0/2.
No automatic retry, new scheduler, or persistent test worker was left behind.
Manifest: `local-character-test/trellis-dwarf/job.json` (local, ignored).

UniRig is the candidate for real skeleton + skin-weight inference. Its upstream
commands separate skeleton, skinning and merging; merging skeleton-only output
does NOT produce a skinned asset. Code/checkpoint cards declare MIT, but checkpoint
availability and Blackwell sparse/CUDA dependencies still need runtime verification.
Do not present this as an installed/validated rigging service.

Remaining: real volumetric generation acceptance, texture/shape visual review,
rigging runtime deployment, skin/motion quality testing, production orchestration,
measured speed/cost comparison. AI intent/image analysis is also still pending;
the present handoff is validated settings, not an implemented vision planner.

Sources:
- https://github.com/microsoft/TRELLIS.2
- https://github.com/VAST-AI-Research/UniRig
- https://huggingface.co/VAST-AI/UniRig
- https://download.blender.org/release/Blender4.2/blender-4.2.23.sha256

## A100 actual generation acceptance — 2026-09-16

Actual TRELLIS.2 generation succeeded on an A100-SXM4-80GB temporary Pod.
The R570 host driver initially rejected cu130. Installing NVIDIA cuda-compat-13-0
inside the container and using its compatibility library resolved initialization;
the host driver was not modified. The Dockerfile fix is local, not yet deployed.

- Test: official TRELLIS humanoid dwarf image, 512 resolution, 1024 texture,
  20 steps, seed 42. Runtime torch 2.11.0+cu130, xformers CUDA checks passed.
- Successful invocation: 324.884 seconds, including diagnostics 71.968 seconds,
  model load 132.694 seconds, inference 111.561 seconds, export 8.344 seconds.
  Image pull/debug time is excluded; this is not a warm latency measurement.
- Recovered original.glb: 6,119,032 bytes, 98,210 triangles.
- Local Blender preparation: 3.796 seconds; 60,000 triangles, 1.7 m height;
  prepared.glb and prepared.fbx exported successfully.
- Front, side and rear renders visually inspected: volumetric textured character,
  not a flat image plane. Hands and deformation topology still require review.
- No skeleton or skin weights. Not animation-ready or Unity-validated.
- Temporary Pod g0nrzipwye8r7q deleted after file recovery; REST list confirmed absent.
- Artifacts: local-character-test/pod-a100/{original.glb,result.json,prepared/,preview/}.

Production serverless deployment, rigging, motion QA and end-to-end application
integration remain unverified. Do not label this successful isolated test as a
completed production or Unity-ready pipeline.

## A100 serverless acceptance

- Build 720d02b, Actions 35094719799 succeeded. Compatibility overlay image:
  ghcr.io/jejuailabs/playlab-trellis-blackwell@sha256:38a14f7163d3225a06134295f0c851a745d1a83dbda541e7fb2302b4e7912a72
- TRELLIS endpoint fmxxi8wa0gxkcm now uses template 7ln0a5gk1p, A100 80GB
  SXM/PCIe only, one GPU per worker, min 0 / max 1. User approved LTX max 2→1
  as an ongoing allocation. CUDA_LAUNCH_BLOCKING=0.
- Actual serverless job c2634b9d-6933-4447-be8c-65813ebd84dc-e2 COMPLETED.
  Delay 101.141 s, execution 371.714 s = provider total 472.855 s.
  Diagnostics 80.926 s, model load 168.305 s, inference 111.831 s, export 9.591 s.
  Actual GPU NVIDIA A100-SXM4-80GB. GLB 6,236,784 bytes recovered.
- Local Blender exported GLB/FBX in 2.306 s, 59,999 triangles. Still no skeleton.
- This verifies serverless TRELLIS followed by LOCAL Blender. Hosted character
  Blender orchestration, website activation and Unity/rigging are NOT verified.
- At post-test health check: no queued or running jobs; one idle worker remained.
  Minimum 0 and idle timeout 5 configured; do not infer zero billing from ready/idle.
- Files: local-character-test/trellis-a100-serverless/{job.json,original.glb,prepared/}.
