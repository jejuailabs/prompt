# Character motion integration

## Uploading Mixamo motions

Preferred: Admin → **애니메이션 업로드**. Select up to 1,000 FBX files,
choose a category, and start. Three files transfer concurrently directly to
private Storage using server-issued, non-overwriting signed upload tokens.
Each file is limited to 28,000,000 bytes to match the retarget worker limit.
Progress is file/stage based, not byte based. Stop finishes in-flight files and
pauses the waiting queue. Retry processes only waiting/failed files.

SHA-256 deduplication and server-side size/header/hash checks precede registration.
Successful entries are stored independently in private `motion_library` Artifact
records, avoiding concurrent edits to a shared JSON manifest. These entries merge
with the legacy manifest. No manual JSON editing is needed for admin uploads.
Reselecting identical files after refresh skips completed entries; filenames and
categories from first registration are retained. FBX header validation does not
prove a valid animated skeleton; worker validation remains mandatory.

Live Storage check: signed anonymous-token upload, size info and anonymous read
denial all passed. The unique temporary connectivity-test object was removed.
Bulk 1,000-file browser testing has not been performed. Application UI remains
unpublished until GitHub commit/push.

### Legacy manual registration

Create a **private** Supabase Storage bucket `character-motions`. Upload FBX motions
without mesh (Without Skin), with their skeleton and animation, in a consistent
rest pose and FPS. No anonymous download/list policies are needed: the authenticated
application server reads sources; only thumbnail signed URLs reach the browser.
Do not upload third-party source clips to the public `uploads` bucket.

Upload `library.json` at the bucket root using this structure (replace example
paths with real uploaded files; this example is not seeded into the UI):

```json
{"version":1,"motions":[{"id":"walk","name":"Walk","category":"Walk","file":"fbx/walk.fbx","thumbnail":"thumbnails/walk.png"}]}
```

Categories: Idle, Walk, Run, Jump, Attack, Hit, Death, Dance, Other.
IDs and paths must use ASCII letters/numbers, hyphens, underscores, and folders.
`thumbnail` is optional. `SUPABASE_MOTION_BUCKET` optionally overrides the bucket.
No new paid API credential is required.

`RUNPOD_RETARGET_ENABLED=true` enables **admin-only** paid test submissions after
deploying the extended rigging handler. Leave unset until a real character/motion
pair is visually verified. General-user billing and rollout remain disabled; the
test is not charged user credits but consumes RunPod runtime. One selection makes
one FBX+GLB pair; multi-clip bundling is not implemented yet.

The mapping panel accepts 15 named Humanoid roles. Exact standard names are
preselected; arbitrary SkinTokens names require manual mapping. This is a
retarget mapping, not a replacement skeleton or proof of Humanoid compatibility.

## Validation boundary

Storing an FBX is not retargeting. SkinTokens joints may not use Humanoid names.
Bone mapping and rest-pose correction must precede baking. A skeleton or Avatar
asset alone is not proof of usable skin weights. Web inspection plays actual GLB
clips; no synthetic animation or prerecorded movie is substituted.

Unity Humanoid import remains a separate validation step. Final GLB and FBX must
be exported from the same baked action, and FBX must be reimported to verify
weights, bones and animation. Never label untested output Unity-ready.

Third-party motion licensing must be verified before operating a redistribution
or download service. Keeping sources private does not by itself establish rights.

## Current implementation and verification (2026-09-17)

- Three.js GLB viewer: orbit, zoom, embedded clips, pause, speed, loop, skeleton.
- Authenticated catalog API: manifest validation, private sources, signed thumbnails.
- Admin test submission: explicit 15-role mapping, one motion per paid request,
  durable result records, provider cancellation, output GLB animation validation.
- Worker: rest-space rotation transfer, scaled root travel / in-place mode,
  same baked scene exported to GLB and FBX, FBX import checks for action and skin.
- Private `character-motions` bucket created; empty manifest read successfully;
  anonymous read denied. No sample/dummy motion is published.
- 12 Node tests + 4 mapping unit tests pass. These do NOT exercise Blender or GPU.
- Project-wide TypeScript still fails in unrelated pre-existing files. No current
  3D motion/viewer type errors. Browser/WebGL visual QA is not completed.

Pending: corrected worker image build/deployment, real SkinTokens rig success,
uploaded Mixamo FBX, visual retarget QA and Unity validation. Automatic arbitrary
bone semantic recognition/normalization, multi-clip bundle and general-user
pricing are not implemented. Web changes are not committed/pushed/deployed.
