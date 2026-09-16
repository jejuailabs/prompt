# TRELLIS.2 verification — 2026-09-16

## Fixed infrastructure failure

- Endpoint: `fmxxi8wa0gxkcm`, template: `h7r4xiwgz7`.
- DINOv3 access works with the account's fine-grained HF token (kept outside Git).
- Upstream pipeline selected gated `briaai/RMBG-2.0`, resulting in HTTP 403.
- `runpod-workflows/trellis-bootstrap.py` replaces that component with
  `ZhengPeng7/BiRefNet`, revision `e2bf8e4460fc8fa32bba5ea4d94b3233d367b0e4`.
  The model card declares MIT. No gated weights are bypassed or redistributed.
- RunPod template CMD is `python3 -u -c <bootstrap contents>`. Image digest remains
  `wearebravelabs/trellis2-runpod@sha256:2b991cc8c13de504affa7581be1a8fc10c4643b2d4476a206ef1c157241f7e8a`.

## Actual test (not just queue acceptance)

Job `c88bfe16-8da2-4f22-acf3-68632de5e848-e2` completed:

- Input: existing failed character image; seed 42, resolution 512, texture 1024.
- Queue/startup delay: 269,901 ms; execution: 187,710 ms.
- GLB 2.0, 2,886,636 bytes; one mesh, one material, two embedded images.
- Upload to the existing Supabase uploads bucket explicitly approved by user.
- Downloaded bytes matched the generated file exactly.
- Browser model-viewer loaded and rotated the GLB successfully.

## Quality failure — do not represent as a finished character

Visual rotation revealed a rectangular, nearly planar mesh, not a volumetric
character. Bounds: X/Y approximately 1.003, Z approximately 0.00396. Thus file
generation/transport success is **not** acceptance of the character output.
The input already has meaningful alpha (57.6% transparent, nonrectangular
foreground), so a missing alpha channel is not the explanation for this input.

Official issue https://github.com/microsoft/TRELLIS.2/issues/45 describes the
same limitation. The maintainer suggests transforming planar artwork toward
a 3D-render-like reference; this must preserve the user's design and be validated,
not silently substitute a different character or repeatedly retry random seeds.

Public generation remains gated by `TRELLIS_GENERATION_VERIFIED=true` (not enabled).
Endpoint workersMin/workersMax reset to 0/0 after this test. No queued test remains.
No production deployment was performed for the unverified 3D implementation.

## Reproducible checks

`python tests/trellis-bootstrap.test.py` tests that the gated argument cannot
override the pinned public background-remover.

`node --env-file=.env.local scripts/verify-trellis-result.cjs JOB_ID` reads an
existing result and validates it locally; it never creates a GPU job. Optional
`--upload` uploads to the public uploads bucket and needs explicit approval.

Sources: https://huggingface.co/ZhengPeng7/BiRefNet and
https://huggingface.co/microsoft/TRELLIS.2-4B/blob/main/pipeline.json .
