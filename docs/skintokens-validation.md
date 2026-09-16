# SkinTokens validation — 2026-09-17

## Current state

- Build `79da04cd496047026c298183e9491b104ac315ac` succeeded.
- Public image: `ghcr.io/jejuailabs/playlab-skintokens@sha256:664ba37b000bc1c0fbff5d04e6f7d44616b4f1f2db6e01a6fa44d5ed778bfdef`.
- A100 serverless endpoint: `jwvz3iksqwm6mb`.
- Single dwarf test: `99c7c459-186d-40ca-804e-cadddac06f4e-e1`.
- Result: FAILED, queue/start delay 181101 ms, execution 97577 ms.
- Root cause from worker logs: Blender Python import failed because `libSM.so.6` was absent. Model inference did not complete; no rigged character was produced.
- Test endpoint restored to min=0/max=0. H3 test `yuusogvb9kbzzb` restored to min=0/max=2.

## Fix prepared

`Dockerfile.runtime` adds Blender shared libraries to the built image and imports `bpy` during CI. Build-only commit: `f5b8fcd75d19dfa9e678fd380057d3457301624c`. Confirm remote branch and CI before treating this as deployed; the push required credential-manager authentication.

## Remaining validation

1. Build patched image and record immutable digest.
2. Reallocate one test worker temporarily and update its image.
3. Submit one dwarf GLB, inspect skeleton/weights and Blender FBX roundtrip report.
4. Verify textures and deformation visually. SkinTokens does not provide motion clips; do not claim animation completion or Unity certification.
5. Restore temporary allocation and configure the web endpoint only after success.

The website changes are local and unpushed. They route TRELLIS output to SkinTokens, then export through Blender inside the rigging worker. Guided mode currently pauses before rigging; separate pause after rigging, manual joint editing and animation retargeting remain unimplemented.
