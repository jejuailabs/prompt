# Qwen-Image-2512 / FLUX.2 Klein 4B comparison

## Deployment and safety

- Qwen endpoint: `50ix6zz1yiywxl`, `playlab-qwen-image-2512-test`.
- Installed through RunPod's official Model / vLLM-Omni 0.1.4 deployment flow (not a GitHub deployment).
- Model: `Qwen/Qwen-Image-2512`. No editing model or Lightning adapter was installed.
- Worker image observed: `registry.runpod.net/runpod-workers-worker-vllm-omni-main-dockerfile:0dd4acb2f`, digest `sha256:439eeea46c4cf225afe4d0f10c30ddac34150c88e4ef7ff77e53427d7a4b04ec`.
- One NVIDIA RTX PRO 6000 Blackwell Server Edition, minimum 0, maximum 1 during test, idle timeout 5 seconds, execution timeout 600 seconds.
- Model uses the official runtime's HF cache/model mounting mechanism; this is not a custom image with embedded Qwen weights.
- User approved temporarily reducing LTX endpoint `cc4ev49nha1sdl` maximum workers from 2 to 1. After all four jobs completed, Qwen maximum was set to 0 and LTX restored to 2. Both readbacks confirmed.
- Qwen endpoint is retained but cannot accept executable work until a worker slot is assigned again. This is deliberate, not production UI integration.
- `.env.local` contains `RUNPOD_QWEN_IMAGE_ENDPOINT_ID`; no secret was exposed or committed.
- Account limit upgrade UI requires a minimum balance of $200 for 10 -> 20 workers; observed balance before tests was $14.10. No top-up or limit upgrade performed.

## Method

Two subjects (portrait and Jeju architecture), identical English prompt per pair, 1024x1024, seed 12345. A shared numeric seed does not imply matching composition across unrelated model families.

Qwen request: `num_inference_steps=50`, `guidance_scale=4`, OpenAI-style image body. Returned metrics do not echo sampler/step settings, so this report records requested settings, not independently logged actual steps. FLUX uses the existing production Klein distilled 4-step ComfyUI workflow. FLUX GPU configuration was unchanged (A5000/L4/3090 pool); Qwen uses Blackwell 96GB. This is a quality/usability comparison, not an equal-hardware speed benchmark.

| Subject | Model | RunPod job | Delay s | Execution s | Delay + execution s |
|---|---|---|---:|---:|---:|
| Portrait | Qwen | 10a4ed3e-6d7a-4390-97e4-222728c69e14-e2 | 66.103 | 15.804 | 81.907 |
| Portrait | FLUX | 4e05f02e-bba7-4c1f-8722-08a887ec7f35-e2 | 30.870 | 13.579 | 44.449 |
| Architecture | Qwen | 54167094-d07d-4974-a700-3daa7b437e24-e1 | 94.561 | 15.531 | 110.092 |
| Architecture | FLUX | 11fdc394-272e-47d7-82fd-7a716c6056c7-e2 | 12.469 | 11.306 | 23.775 |

All jobs COMPLETED and produced visually inspected 1024x1024 PNGs. Qwen portrait response reports `peak_memory_mb=58696` and `stage_0_gen_ms=15315.495`. Execution time is not the full billed worker lifetime. Delay is not proof that the GPU was billed for all of that time.

## Artifacts and interpretation

Full prompts, exact requests, statuses, original output JSON and decoded PNGs are in git-ignored `local-image-comparison/`. Runner: `scripts/benchmark-images.cjs`; duplicate subject submissions are blocked by a durable pre-submit record and there are no paid automatic retries.

Visual interpretation (only two examples): Qwen portrait has a more subdued photographic light and visible skin irregularities; FLUX is brighter and more polished. Qwen architecture crops tightly toward the entrance; FLUX shows the requested two-story building more fully. These results do NOT establish that Qwen is universally better. Both are usable; selection should reflect desired style and composition fidelity.

No application model default changed, no production frontend integration, no commit/push, no Vercel action, no scheduled automation.
