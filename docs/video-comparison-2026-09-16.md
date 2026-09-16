# Blackwell deployment and administrator comparison — 2026-09-16

## Applied infrastructure

- H3 endpoints `yuusogvb9kbzzb` and `pnskne8mgep2vw`: template `09gho5ro3r`, each min 0 / max 2, GPU count 1, RTX PRO 6000 Blackwell Server Edition 96 GB, minimum CUDA 13.0.
- Immutable H3 image: `ghcr.io/jejuailabs/playlab-h3-cu130@sha256:50df183567281793c53ecb19b8557f05ea89022bdbba13a2c76376eb1c9cb7c0`.
- Verified runtime logs: torch 2.11.0+cu130, SageAttention, HIGH_VRAM, comfy_kitchen CUDA available and **not disabled**.
- LTX endpoint `cc4ev49nha1sdl`: Blackwell, GPU count 1, min 0 / max 2. Existing LTX-Video 2B 0.9.6 distilled workflow, not LTX 2.5. Runtime not upgraded to cu130/Sage in this change.
- Wan endpoint `tyd2qlqfg4aveg`: Blackwell, GPU count 1, min 0 / max 1. Existing Wan 2.2 TI2V 5B workflow, not Wan 2.6. Runtime not upgraded to cu130/Sage in this change.
- Diagnostic H3 endpoint `xb29don34opcv1`: min 0 / max 0 after successful promotion. No recurring automation created.

## Real job evidence

Common synthetic adult portrait prompt, seed 12345, 832×480, 24fps, requested duration 6s. Jobs were submitted separately for compatibility validation, not a simultaneous controlled cold-start benchmark.

| Model/path | Job | RunPod execution | RunPod delay | Actual duration |
|---|---|---:|---:|---:|
| H3 standard 20, text | b4a1051b-56b4-464f-a370-55396e0a9edc-e2 | 64.802s | 4.763s | 6.583333s |
| H3 turbo 8, image | 6f874a56-40f1-4b53-9932-b0be69b5ffdd-e2 | 44.503s | 0.920s | 6.583333s |
| LTX 2B distilled 8 | f3a4b54d-0283-4596-b1db-3bb57c17daac-e2 | 40.872s | 17.757s | 6.041667s |
| Wan 2.2 20 | a22a065d-d72a-4fbe-b781-4c1e76e38779-e1 | 51.509s | 262.976s | 6.041667s |

All results returned MP4/base64 through the existing images response contract. ffprobe verified H.264, 832×480 and 24fps. Representative frames of the three text-to-video results were visually inspected. Outputs are local, ignored files in `tmp/h3-benchmark/`; these infrastructure tests were not inserted into administrator project history.

The initial H3 job `5dbf529a-7e5a-4f14-bfdd-63c07694c631-e1` expired while the new image was downloading, before generation. Its 15-minute TTL was insufficient for the first uncached pull. The model layer alone is approximately 36.68 GiB compressed; total image ~40.26 GiB. Download took roughly 26 minutes on this host. Above H3 job timings **exclude that first image installation**. An uncached production host may incur a similar delay; do not promise these job totals for every cold start. Production rollout happened only after the image was downloaded and both H3 paths passed.

## Administrator comparison UI

- Admin → Video engine → Video model comparison.
- Exact installed model names, shared prompt compiled once, fixed seed, 832×480, 24fps, 6-second request, selectable H3 turbo8/standard20/standard30.
- Server checks all three endpoints have exactly one allowed Blackwell GPU and H3 has the approved optimized image; otherwise blocks the test with an explanation.
- Creates three private saved video projects in one transaction, then submits independent render calls concurrently. Each request retains existing credit metering (80 + 50 + 55 = 185 credits).
- Three players, independent progress/errors/cancellation, execution and delay timing, actual playback duration, configured GPU/image snapshot, previous comparison history (latest 90 projects).
- No claimed real percentage: RunPod queue/running states are displayed. Lost submission responses are reconciled, not automatically resubmitted. Repeated polling errors stop automatic refresh and expose manual status checking.
- Models use different samplers/frame-count constraints/runtimes; equal seed values do not produce equivalent latent noise across models. GPU allowlist is a configuration snapshot, not per-job physical host telemetry.
- UI/API changes remain uncommitted for the user to commit/push. No Vercel settings or deployment changes made.

## Verification

- Production Next.js build passed (network-enabled retry required for Google Fonts).
- Comparison workflow/authentication/SSR tests and existing H3 preset/routing tests passed.
- New comparison files passed ESLint. Whole-repository type check still reports unrelated pre-existing errors; build configuration already skips TypeScript validation.
