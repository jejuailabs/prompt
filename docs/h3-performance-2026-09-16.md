# H3 Blackwell performance investigation — 2026-09-16

## Same-machine comparison after connectivity recovered

Temporary Secure Pod `uu188b7kwq62ki`: RTX PRO 6000 Blackwell Server Edition,
driver 580.173.02, 600 W limit, CUDA driver compatibility 13.0. Ubuntu 24.04,
Python 3.12.3, ComfyUI v0.34.0 commit
`12d5279438bfefc058a269eae805ceab6047777f`. Fresh Comfy process and `--cache-none`
for each trial. Public checkpoints, no private user images or credentials sent.

| Trial | execution_success event | Sampler node interval | VAE interval | Peak VRAM |
| --- | ---: | ---: | ---: | ---: |
| torch 2.11.0+cu128 / INT8 / PyTorch attention | 175.924 s | 147.142 s | 6.545 s | 41,644 MiB |
| torch 2.11.0+cu130 / INT8 / PyTorch attention | 84.242 s | 56.875 s | 5.914 s | 39,901 MiB |
| cu130 / INT8 / SageAttention | 69.720 s | 44.458 s | 5.743 s | 39,903 MiB |
| cu130 / INT8 / SageAttention repeat | 70.159 s | 44.807 s | 5.710 s | 39,903 MiB |
| cu130 / FP8 / PyTorch attention | 85.353 s | 60.436 s | 5.649 s | 39,853 MiB |
| cu130 / INT8 / highvram / PyTorch attention | 78.008 s | 55.822 s | 6.674 s | 23,187 MiB |
| cu130 / INT8 / highvram + disable dynamic VRAM + disable async offload | 78.591 s | 55.874 s | 7.715 s | 23,187 MiB |
| cu130 / INT8 / highvram / SageAttention | **64.456 s** | **43.311 s** | 7.065 s | 23,733 MiB |

Preliminary single-run reduction: 52.1% in execution-success time, 61.3% in
sampler-node time. Cold resource/image startup and package installation excluded.
Terminal idle event arrives about 3.5 s after execution_success; do not mix the
two completion definitions. Sampler intervals include model setup, not just kernels.

cu130 logs verify `comfy_kitchen backend cuda` available=True, disabled=False;
cu128 logs available=True, disabled=True. This is actual activation, not merely
the CUDA version displayed by nvidia-smi. Steady steps about 7.3 s versus 2.6 s.
Text-conditioning node stayed approximately 10.9 s versus 10.8 s.

Both MP4 files were retrieved under `local-h3-benchmark/`. cu130 ffprobe confirms
832x480, 24 fps, 158 frames, 6.583333 s. Middle frames of both were inspected:
coherent portrait imagery, no obvious noise/corruption in the inspected frames.
Same seed does NOT give pixel-identical outputs across these precision kernels;
facial/background details changed. This is not a comprehensive temporal-quality
or perceptual-equivalence claim.

SageAttention initially failed compilation due to missing Python.h. Added
python3-dev, CUDA 13.0 compiler/development headers and retried the pinned source.
The next build identified missing cusparse.h. Adding cuda-libraries-dev-13-0
resolved this. Official SageAttention commit
`d1a57a546c3d395b1ffcbeecc66d81db76f3b4b5`, version 2.2.0, compiled with CUDA13,
TORCH_CUDA_ARCH_LIST=12.0 and torch2.11.0+cu130. A real sm120 BF16 GPU attention
call passed, then Comfy logged `Using sage attention` with no fallback in the
successful trial. The compiled cp312 Linux wheel was saved for reproducibility;
it is specific to the tested CUDA/PyTorch/architecture, not a universal wheel.

### Findings and next deployment boundary

- Strongest verified change: cu130 activates optimized CUDA quantization kernels.
  The same INT8 video model's sampler interval falls from 147.1 to 56.9 seconds.
- SageAttention adds a further reduction. Two independent fresh-process runs
  completed at 69.7 and 70.2 seconds, no workflow result cache.
- FP8 did not improve speed in this test: 85.4 seconds versus INT8 84.2 seconds.
  Do not switch quantization simply because its name sounds faster.
- highvram reduces setup overhead here; it does not materially change steady
  denoising speed. Explicitly disabling dynamic VRAM/async offload did not add
  an improvement over highvram alone. This is not a PCIe transfer-trace analysis.
- Fastest tested combination: **cu130 + existing INT8 + SageAttention + highvram**,
  64.456 seconds (~63.4% less elapsed time, ~2.73x throughput for this one clip).
  This combined result has one run, not a broad model/length/resolution guarantee.
- First/middle/last frames of cu128, cu130, Sage and FP8 were inspected without
  obvious corruption. Different precision/attention paths alter generated details;
  no claim of pixel identity or comprehensive perceptual equivalence is made.
- Production endpoints are **unchanged**. These results validate a diagnostic
  runtime, not the deployed studio/serverless pipeline. Bake pinned runtime and
  kernels into a versioned image before isolated serverless validation and rollout.
  Do not pip-install/compile on every production cold start.
- No Vercel changes or Git push were made.
- All eight completed trial videos, logs, GPU CSVs and the compiled wheel were
  recovered into `local-h3-benchmark/` (gitignored), including h3-results.tar.gz.
  Diagnostic Pod uu188b7kwq62ki was then deleted successfully; a fresh inventory
  confirmed no matching Pod remained. Earlier diagnostic Serverless endpoint
  xb29don34opcv1 remains workersMin=0/workersMax=0. No test GPU was left running.

## Approved continuation: network interruption

The user explicitly approved transmitting benchmark-only code and the synthetic
fixed prompt to their diagnostic RunPod. The previous diagnostic Pod
`tu2b7a63vz139r` was deleted successfully before this continuation.

One new create request was attempted. It returned `fetch failed`; the follow-up
read-only Pod inventory returned `UND_ERR_CONNECT_TIMEOUT`. No duplicate create
was issued. No new Pod ID or successful creation was received. Its existence
cannot be conclusively checked until connectivity returns; reconcile the exact
diagnostic name before any further create or deletion.

Unauthenticated probes to both RunPod REST and GraphQL timed out; GitHub also
reported DNS resolution timeout. This is not a measured GPU performance result.
No cu130, SageAttention, or FP8 inference ran in this continuation.

Local preparation now starts from Ubuntu 24.04, pins the baseline CUDA wheels
even during requirements resolution, checks exact CUDA runtime versions, and
adds NVIDIA's CUDA development repository for SageAttention compilation.
Python AST checks and Node syntax checks passed. Remote compatibility and speed
remain unverified. Production endpoints and Vercel were not changed.

## Scope and controls

No production image, model, sampler or endpoint setting was changed.
Single fixed text prompt, seed 12345, standard 20 steps, 832×480, 24 fps.
The studio's six-second setting rounds to **158 frames / 6.583333 seconds**.
Keep this exact frame count for comparisons; do not silently reduce workload.

## Baseline — verified

- Endpoint: `pnskne8mgep2vw` (production Blackwell, one explicitly submitted test).
- Job: `f58ee563-4830-4f00-ab3d-2109a3c17213-e2` — COMPLETED.
- Worker: `2ga31rky4lpadg`, US-NE-1, RTX PRO 6000 Blackwell Server Edition, sm_120.
- Provider delay: **300.095 s** (resource availability/startup; NOT inference time).
- Provider execution: **160.308 s**.
- ComfyUI prompt execution: **158.60 s**.
- Sampler load request: 01:40:46.182 UTC; first step log: 01:40:54.213.
- VAE load request: 01:43:12.772; prompt completed: 01:43:20.384.
- Approximate sampler-related interval: **146.6 s**, including initial model loading.
- Approximate final VAE/file interval: **7.6 s**; not a separately instrumented kernel timer.
- MP4 and full workflow are in `tmp/h3-benchmark/`, not published or committed.
- ffprobe verified 832×480, 24 fps, 158 frames. A middle frame was visually inspected.

## Runtime evidence

- Image: `runpod/comfyui-wizard:kd77jbt8qjzp3h1zzdae7b0yz98ebrww`.
- Actual runtime: torch 2.11.0+cu128; CUDA runtime 12.8; driver reports 13.2.
- ComfyUI 0.34.0 in image build metadata.
- PyTorch Attention, NORMAL_VRAM, async offload with two streams, DynamicVRAM.
- After first step, resident text/model weights: 13,888 + 20,000 MB.
- Free VRAM approximately 54,604 MB. This does not support an OOM-driven
  offloading explanation for the sustained per-step time; transfer traces are
  still needed to rule out unnecessary movement.
- Explicit startup warning: optimized CUDA operations need torch cu130+.
- `comfy_kitchen` CUDA backend reports `available: True, disabled: True`.
- The main video checkpoint is INT8 convrot; only the text encoder is NVFP4 AWQ.
- Existing completed jobs on the previous worker reported 68.143, 154.827 and
  228.026 seconds execution, with 1.471, 0.964 and 0.972 seconds delay. Their
  exact preset inputs were not retrieved; do not treat them as controlled trials.

## Comparison matrix

1. Baseline cu128 / existing model / PyTorch Attention: completed above.
2. Same image + same torch versions from official cu130 wheels: submitted to
   isolated endpoint `xb29don34opcv1`, template `1wdmme7buz`, job
   `908ea099-27de-4d5b-94c5-99a4424b099b-e1`; **CANCELLED before execution**.
   The worker stayed INITIALIZING with repeated `image pull ... pending` logs
   for approximately ten minutes. No container/package-install logs appeared.
   US-NC-1 restriction did not resolve the stuck worker. Cancellation returned
   CANCELLED and the isolated endpoint was paused with min=0/max=0. No speedup
   claim can be made from this trial. Initialization charges have not been audited.
3. Memory residency change: not run. Compare only after a stable CUDA baseline.
4. Attention change: not run. Must verify actual backend use and absence of fallback.
5. Alternative FP8/NVFP4 video checkpoint: not run. Needs compatible checkpoint,
   runtime verification and visual comparison; quantization can change outputs.

New worker package-install/image-pull time must be reported separately, not
counted as faster or slower steady-state inference. One run is preliminary;
repeated identical workflows can hit ComfyUI's result cache, so any warm repeat
must explicitly force sampler execution before it is a valid benchmark.

## Safety and reproducibility

- Isolated comparison endpoint starts with min=0, max=1, idle=5s, no FlashBoot.
- `scripts/benchmark-h3.cjs` refuses submissions while endpoint queue is busy,
  records job IDs, uses a 10-minute execution cap and 15-minute request TTL.
- `scripts/h3-benchmark-worker.cjs pause` verifies the diagnostic endpoint name
  before setting min/max to zero. Never pause production for this experiment.
- REST API refused US-NE-1 as an unknown enum although a production worker used
  that region. A US-NC-1 restriction was accepted for the diagnostic endpoint.
- Image build history contains a plaintext Hugging Face credential. It was
  accidentally included in diagnostic output. Do not copy it into reports or
  reuse it. Revoke/rotate it and rebuild with build-time secret mounts; deleting
  it in a later Docker layer does not remove it from old image history.
