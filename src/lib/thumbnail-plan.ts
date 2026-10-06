import { z } from 'zod';

export const thumbnailPlanSchema = z.object({
  analysis: z.object({
    genre: z.string().optional(), content_type: z.string().optional(), emotion: z.string().optional(), hook: z.string().optional(), season_time: z.string().optional(),
    visual_keywords: z.array(z.string()).default([]), color_palette: z.array(z.string()).default([]), ctr_elements: z.array(z.string()).default([]), concept: z.string().trim().min(1),
  }),
  prompts: z.object({ midjourney: z.string().trim().min(1), flux: z.string().trim().min(1), ideogram: z.string().trim().min(1), gpt_image: z.string().trim().min(1) }),
  text_overlay: z.object({ main: z.string().trim().min(1), sub: z.string().optional() }),
  branding_tip: z.string(),
});
export type ThumbnailPlan = z.infer<typeof thumbnailPlanSchema>;

export function thumbnailPlanText(result: ThumbnailPlan) {
  const optional = [['장르 / 유형', result.analysis.genre || result.analysis.content_type], ['감정', result.analysis.emotion], ['클릭 포인트', result.analysis.hook], ['계절 / 시간대', result.analysis.season_time]].filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`);
  return [
    `콘셉트\n${result.analysis.concept}`, ...optional,
    `메인 문구\n${result.text_overlay.main}`, result.text_overlay.sub ? `서브 문구\n${result.text_overlay.sub}` : '',
    `Midjourney\n${result.prompts.midjourney}`, `Flux / Stable Diffusion\n${result.prompts.flux}`, `Ideogram\n${result.prompts.ideogram}`, `GPT Image\n${result.prompts.gpt_image}`,
    `시각 키워드: ${result.analysis.visual_keywords.join(', ')}`, `색상 팔레트: ${result.analysis.color_palette.join(', ')}`, `클릭 유도 요소: ${result.analysis.ctr_elements.join(', ')}`, `브랜딩 노트\n${result.branding_tip}`,
  ].filter(Boolean).join('\n\n');
}
