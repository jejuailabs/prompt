# Blackwell test rollout — 2026-09-16

## Applied RunPod configuration

| Workload | Endpoint | GPU | Min / max |
| --- | --- | --- | --- |
| H3 legacy | yuusogvb9kbzzb | RTX 5090 32GB | 0 / 2 |
| H3 Blackwell | pnskne8mgep2vw | RTX PRO 6000 Blackwell Server Edition 96GB | 0 / 1 |
| TRELLIS | fmxxi8wa0gxkcm | RTX PRO 6000 Blackwell Server Edition 96GB | 0 / 0 |

RunPod GraphQL GPU metadata reports `secureCloud: true` for the selected Server Edition. REST endpoint configuration has no separate Secure Cloud selector; this is GPU catalog evidence, not an attestation about an individual allocated host.

H3 Blackwell uses template oo850gyigd cloned from the existing H3 template (endpoint-bound templates cannot be shared), preserving its image and environment. CUDA minimum 12.8. `.env.local` has RUNPOD_H3_BLACKWELL_ENDPOINT_ID. Server code contains the non-secret endpoint ID fallback for existing production environments; API key remains server-only.

## Application routing

`h3Gpu` is `5090` or `blackwell`, saved on both project and render metadata. Queue, polling and cancellation use the same selection. Legacy jobs without a selection continue to use the original 5090 endpoint. Rerender retains the previous selection. Other engines ignore H3 GPU selection.

Quick-start exposes a GPU test selector when H3 is selected. Generation and inspector labels identify the saved GPU. Unit routing test and targeted ESLint pass. Production deployment and a paid Blackwell video generation test have NOT been performed in this change.

## TRELLIS is NOT enabled yet

The pinned worker image was built with CUDA 12.4 and TORCH_CUDA_ARCH_LIST=8.0;9.0. Blackwell requires rebuilding the CUDA runtime and native extensions for sm_120. Merely selecting the new GPU is not sufficient. No compatible image has been built or validated. Local Docker/gh binaries are unavailable. Keep workersMax=0 and TRELLIS_GENERATION_VERIFIED disabled until a compatible image and non-flat 3D output are verified. Do not claim the GPU change fixes the previously observed flat mesh output.
