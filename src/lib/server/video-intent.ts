import { chatJson } from '@/lib/server/ai';

/**
 * This internal structure follows MiniMax H3's published I2VA guide:
 * first-frame alignment, integrated visual description, soundscape, music.
 */
export interface VideoIntent {
  openingFrame: string;
  actionProgression: string;
  cameraDirection: string;
  endingFrame: string;
  continuity: string[];
  overallSoundscape: string;
  nonDiegeticMusic: string;
}

/**
 * A versioned, persisted contract between PLAYLAB's intent compiler and a
 * video model.  The model only receives the final H3 prompt, while this
 * object preserves the reasoning-relevant production decisions needed to
 * reproduce, review, or later extend the shot with Ref2VA inputs.
 */
export const H3_CONTEXT_IR_VERSION = 'h3-context-ir/v1';

export interface H3ContextIR {
  schemaVersion: typeof H3_CONTEXT_IR_VERSION;
  sourcePrompt: string;
  durationSec: number;
  mode: 'text-to-video' | 'first-frame-to-video';
  reference: {
    firstFrame: 'none' | 'opening-frame-anchor';
    suppliedImageCount: number;
    preservation: string[];
  };
  shot: VideoIntent;
  validation: {
    passed: boolean;
    warnings: string[];
  };
}

function text(value: unknown, fallback: string, maxLength = 700) {
  if (typeof value !== 'string') return fallback;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, maxLength) : fallback;
}

function textList(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const values = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 5);
  return values.length ? values : fallback;
}

function fallbackIntent(prompt: string, hasReferenceImage: boolean): VideoIntent {
  const forward = /(앞으로|전진|다가가|접근|forward|dolly\s*in|push\s*in)/i.test(prompt);
  const backward = /(뒤로|후진|멀어지|backward|dolly\s*out|pull\s*back)/i.test(prompt);
  const left = /(왼쪽|좌측|left)/i.test(prompt);
  const right = /(오른쪽|우측|right)/i.test(prompt);
  const stabilized = /(짐벌|gimbal|stabili[sz])/i.test(prompt);
  const cameraDirection = forward
    ? `The viewer camera pushes in along one straight path with ${stabilized ? 'stabilized, ' : ''}small-amplitude motion at a slow, even speed.`
    : backward
      ? `The viewer camera pulls out along one straight path with ${stabilized ? 'stabilized, ' : ''}small-amplitude motion at a slow, even speed.`
      : left
        ? 'The viewer camera tracks left with small-amplitude, smooth motion at a slow, even speed.'
        : right
          ? 'The viewer camera tracks right with small-amplitude, smooth motion at a slow, even speed.'
          : 'The viewer camera holds the opening composition with subtle, stable natural motion.';

  return {
    openingFrame: hasReferenceImage
      ? 'The reference image establishes the exact opening subjects, objects, architecture, spatial layout, materials, lighting, and framing.'
      : text(prompt, 'The requested scene is established in a clear cinematic opening composition.'),
    actionProgression: hasReferenceImage
      ? 'Motion begins naturally from the opening frame and develops continuously through one clear visual beat.'
      : 'The requested visual action begins clearly and develops as one continuous cinematic beat.',
    cameraDirection,
    endingFrame: 'The shot settles into a coherent final composition that follows naturally from the opening frame.',
    continuity: hasReferenceImage
      ? ['Keep the visible subjects, geometry, materials, lighting, and spatial relationships consistent across the full shot.']
      : ['Keep the scene visually coherent and physically plausible across the full shot.'],
    overallSoundscape: 'N/A',
    nonDiegeticMusic: 'N/A',
  };
}

/**
 * Creates an auditable canonical shot record after either the model compiler
 * or the deterministic fallback has produced a VideoIntent. This deliberately
 * does not invent an extra "negative prompt" because H3's prompt guidance
 * favors positive, explicit continuity constraints.
 */
export function createH3ContextIR(
  sourcePrompt: string,
  intent: VideoIntent,
  options: { hasReferenceImage: boolean; durationSec: number },
): H3ContextIR {
  const normalizedPrompt = sourcePrompt.replace(/\s+/g, ' ').trim().slice(0, 4000);
  const warnings: string[] = [];
  const asksForward = /(앞으로|전진|다가가|접근|forward|dolly\s*in|push\s*in)/i.test(normalizedPrompt);
  const asksBackward = /(뒤로|후진|멀어지|backward|dolly\s*out|pull\s*back)/i.test(normalizedPrompt);
  const asksOrbit = /(오빗|orbit|빙글|돌아|회전|rotate)/i.test(normalizedPrompt);
  if (asksForward && asksBackward) warnings.push('카메라 전진과 후진이 함께 요청되었습니다. 하나의 주 동작으로 정리해 확인하세요.');
  if ((asksForward || asksBackward) && asksOrbit) warnings.push('직선 이동과 오빗/회전이 함께 요청되었습니다. 의도한 카메라 동작인지 확인하세요.');
  if (!normalizedPrompt) warnings.push('원본 프롬프트가 비어 있습니다.');

  return {
    schemaVersion: H3_CONTEXT_IR_VERSION,
    sourcePrompt: normalizedPrompt,
    durationSec: Math.max(4, Math.min(15, Math.round(options.durationSec))),
    mode: options.hasReferenceImage ? 'first-frame-to-video' : 'text-to-video',
    reference: {
      firstFrame: options.hasReferenceImage ? 'opening-frame-anchor' : 'none',
      suppliedImageCount: options.hasReferenceImage ? 1 : 0,
      preservation: options.hasReferenceImage
        ? ['visible subject identity', 'spatial layout', 'materials and lighting', 'opening framing']
        : [],
    },
    shot: intent,
    validation: { passed: warnings.length === 0, warnings },
  };
}

/**
 * Turns imprecise creator language into a small, chronological production
 * specification. Camera words remain cinematography instructions, never props
 * or dialogue. Positive continuity direction avoids conditioning on unwanted
 * objects by repeating them in a negative prompt.
 */
export async function compileVideoIntent(
  prompt: string,
  options: { hasReferenceImage: boolean; durationSec: number },
): Promise<VideoIntent> {
  const fallback = fallbackIntent(prompt, options.hasReferenceImage);
  if (!process.env.GEMINI_API_KEY) return fallback;

  try {
    const compiled = await chatJson<Partial<VideoIntent>>(
      `You are a senior video director compiling a creator's Korean or English request for MiniMax H3 image-to-video generation. Return JSON only with exactly these keys: openingFrame, actionProgression, cameraDirection, endingFrame, continuity, overallSoundscape, nonDiegeticMusic.

Rules:
- Write concise, natural English only. Translate intent; never copy Korean into the output.
- Build one chronological shot: opening frame anchor -> action onset -> continuous development -> resolved ending frame. Do not invent a second scene or cut.
- When hasReferenceImage is true, the supplied image is the exact visual state at 0.00 seconds. Preserve its visible subject identity, objects, architecture, layout, lighting, materials, and framing unless the creator explicitly asks for a change.
- Separate what is visible from cinematography. Camera, lens, gimbal, dolly, crane, pan, tilt, orbit, and handheld normally describe viewer-camera motion. Do not make them visible props, people, dialogue, or text unless explicitly requested.
- Express one dominant camera motion as a complete natural sentence using a standard motion term (for example Push In, Pull Out, Pan, Track) plus direction, amplitude, and speed. If the creator asks to move forward, use a straight Push In; do not reinterpret it as orbiting or a lateral move.
- continuity is an array of at most three short, positive visual-consistency directions. Do not list forbidden items or use negative prompts.
- Default to a silent clip: overallSoundscape and nonDiegeticMusic must be "N/A" unless audio is explicitly requested. Do not add dialogue, narration, subtitles, captions, logos, watermarks, signs, or readable text unless explicitly requested.
- Do not invent people, vehicles, objects, actions, text, or sound.
- Keep every string under 700 characters.`,
      JSON.stringify({ creatorPrompt: prompt, ...options }),
    );

    return {
      openingFrame: text(compiled.openingFrame, fallback.openingFrame),
      actionProgression: text(compiled.actionProgression, fallback.actionProgression),
      cameraDirection: text(compiled.cameraDirection, fallback.cameraDirection),
      endingFrame: text(compiled.endingFrame, fallback.endingFrame),
      continuity: textList(compiled.continuity, fallback.continuity),
      overallSoundscape: text(compiled.overallSoundscape, fallback.overallSoundscape, 300),
      nonDiegeticMusic: text(compiled.nonDiegeticMusic, fallback.nonDiegeticMusic, 300),
    };
  } catch {
    // Rendering remains available if the intent compiler is temporarily unavailable.
    return fallback;
  }
}

/** Builds the literal field order recommended by the public H3 I2VA guide. */
export function buildVideoModelPrompt(intent: VideoIntent, hasReferenceImage: boolean) {
  const alignment = hasReferenceImage
    ? 'For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.'
    : 'For the target video, establish the described opening composition at 0.00 seconds.';
  const visual = [
    intent.openingFrame,
    intent.actionProgression,
    intent.cameraDirection,
    intent.endingFrame,
    ...intent.continuity,
  ].join(' ');

  return [
    alignment,
    `integrated_multimodal_description: ${visual}`,
    `overall_soundscape: ${intent.overallSoundscape}`,
    `non_diegetic_music: ${intent.nonDiegeticMusic}`,
  ].join('\n\n');
}
