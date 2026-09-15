import { chatJson } from '@/lib/server/ai';

export interface VideoIntent {
  subject: string;
  sceneAction: string;
  cameraMovement: string;
  cameraConstraints: string[];
  visualConstraints: string[];
}

const defaultConstraints = [
  'no unintended pan, tilt, orbit, roll, or lateral drift',
  'no camera, gimbal, tripod, crew, camera operator, or filming equipment visible unless explicitly requested',
  'no subtitles, captions, logos, signs, watermarks, or readable text unless explicitly requested',
];

function text(value: unknown, fallback: string, maxLength = 500) {
  if (typeof value !== 'string') return fallback;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, maxLength) : fallback;
}

function textList(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const values = value.filter((item): item is string => typeof item === 'string').map((item) => item.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 8);
  return values.length ? values : fallback;
}

function fallbackIntent(prompt: string, hasReferenceImage: boolean): VideoIntent {
  const forward = /(앞으로|전진|다가가|접근|forward|dolly\s*in|push\s*in)/i.test(prompt);
  const backward = /(뒤로|후진|멀어지|backward|dolly\s*out|pull\s*back)/i.test(prompt);
  const left = /(왼쪽|좌측|left)/i.test(prompt);
  const right = /(오른쪽|우측|right)/i.test(prompt);
  const gimbal = /(짐벌|gimbal|stabili[sz])/i.test(prompt);
  const cameraMovement = forward
    ? `A ${gimbal ? 'stabilized ' : ''}slow, straight dolly-in toward the primary subject.`
    : backward
      ? `A ${gimbal ? 'stabilized ' : ''}slow, straight dolly-out away from the primary subject.`
      : left ? 'A smooth, controlled lateral track to the left.'
        : right ? 'A smooth, controlled lateral track to the right.'
          : 'A subtle, stable camera move that preserves the original composition.';

  return {
    subject: hasReferenceImage
      ? 'Preserve the subjects, architecture, objects, and composition from the reference image.'
      : text(prompt, 'Create the scene requested by the user.'),
    sceneAction: hasReferenceImage ? 'Use only natural, physically plausible motion that follows the camera direction.' : 'Show only the requested visual action.',
    cameraMovement,
    cameraConstraints: defaultConstraints,
    visualConstraints: ['preserve identity, geometry, lighting, and materials when a reference image is supplied'],
  };
}

/**
 * Converts a creator's natural-language direction into a model-facing production brief.
 * This intentionally separates what appears on screen from camera language, so words
 * such as "gimbal" are not hallucinated as props, people, spoken dialogue, or captions.
 */
export async function compileVideoIntent(prompt: string, hasReferenceImage: boolean): Promise<VideoIntent> {
  const fallback = fallbackIntent(prompt, hasReferenceImage);
  if (!process.env.GEMINI_API_KEY) return fallback;

  try {
    const compiled = await chatJson<Partial<VideoIntent>>(
      `You compile natural-language video directions into an English production brief for an image-to-video model. Return JSON only with exactly these keys: subject, sceneAction, cameraMovement, cameraConstraints, visualConstraints.

Rules:
- The creator may write Korean, English, or both. Translate their intended visual direction into concise English. Never copy Korean words into the output.
- Separate screen content from filming instructions. Words such as camera, lens, gimbal, dolly, crane, pan, tilt, orbit, and handheld normally describe how the viewer camera moves; do NOT show those items, an operator, or a crew unless the creator explicitly says they must be visible.
- For a supplied reference image, preserve its visible people, objects, architecture, geometry, layout, lighting, and composition unless the creator explicitly asks to alter them.
- Resolve ambiguous motion as viewer-camera motion, not as a person moving with a camera. Example: Korean "짐벌과 카메라를 들고 앞으로 걸어간다" means a stabilized camera moves straight forward; it does not mean a gimbal, camera, or Korean text appears in frame.
- State exact movement constraints. If the request is forward movement, forbid panning, orbiting, lateral drift, roll, and rotation unless requested.
- Default to a silent visual clip. Never add dialogue, spoken words, narration, music, subtitles, captions, logos, watermarks, or readable text unless explicitly requested.
- Do not invent people, vehicles, objects, actions, or text.
- Keep each string short. cameraConstraints and visualConstraints must be arrays of short English strings.`,
      JSON.stringify({ creatorPrompt: prompt, hasReferenceImage }),
    );

    return {
      subject: text(compiled.subject, fallback.subject),
      sceneAction: text(compiled.sceneAction, fallback.sceneAction),
      cameraMovement: text(compiled.cameraMovement, fallback.cameraMovement),
      cameraConstraints: textList(compiled.cameraConstraints, fallback.cameraConstraints),
      visualConstraints: textList(compiled.visualConstraints, fallback.visualConstraints),
    };
  } catch {
    // A render must remain available if the intent compiler is temporarily unavailable.
    return fallback;
  }
}

export function buildVideoModelPrompt(intent: VideoIntent, hasReferenceImage: boolean) {
  return [
    'VIDEO PRODUCTION INSTRUCTION. Follow these as visual direction, not as dialogue or on-screen text.',
    hasReferenceImage ? 'REFERENCE IMAGE: Treat the supplied image as the exact first frame and preserve its visual identity.' : 'REFERENCE IMAGE: None.',
    `SUBJECT: ${intent.subject}`,
    `SCENE ACTION: ${intent.sceneAction}`,
    `CAMERA MOVEMENT: ${intent.cameraMovement}`,
    `CAMERA CONSTRAINTS: ${intent.cameraConstraints.join('; ')}.`,
    `VISUAL CONSTRAINTS: ${intent.visualConstraints.join('; ')}.`,
    'AUDIO: silent. Do not generate speech, voices, narration, music, or sound effects.',
    'ON-SCREEN TEXT: none.',
  ].join('\n');
}
