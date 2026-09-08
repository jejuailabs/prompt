// GET /api/prompts/trees — prompt fork trees for wiki view
// Returns root prompts (no forkedFromId) with their fork descendants and artifact counts
import { supaAdmin } from '@/lib/supabase/admin';
import { fail, ok } from '@/lib/server/handler';

export interface PromptTreeNode {
  id: string;
  title: string;
  body: string;
  category: string;
  thumbnailUrl: string | null;
  ownerId: string;
  ownerName: string;
  ownerAvatar: string | null;
  forkedFromId: string | null;
  likeCount: number;
  forkCount: number;
  commentCount: number;
  artifactCount: number;
  createdAt: string;
  children: PromptTreeNode[];
}

export async function GET() {
  try {
    const { data: rows, error } = await supaAdmin
      .from('Prompt')
      .select('id, title, body, category, thumbnailUrl, ownerId, forkedFromId, likeCount, forkCount, commentCount, artifactCount, createdAt, owner:Profile!Prompt_ownerId_fkey(username, avatarUrl)')
      .eq('status', 'active')
      .order('likeCount', { ascending: false });

    if (error) throw new Error(error.message);
    if (!rows?.length) return ok([]);

    type RawRow = Record<string, unknown> & { owner: Record<string, unknown> | null };

    const nodeMap = new Map<string, PromptTreeNode>();
    const allNodes: PromptTreeNode[] = [];

    for (const r of rows as RawRow[]) {
      const node: PromptTreeNode = {
        id: r.id as string,
        title: r.title as string,
        body: (r.body as string).slice(0, 200),
        category: r.category as string,
        thumbnailUrl: (r.thumbnailUrl as string) ?? null,
        ownerId: r.ownerId as string,
        ownerName: (r.owner?.username as string) ?? '',
        ownerAvatar: (r.owner?.avatarUrl as string) ?? null,
        forkedFromId: (r.forkedFromId as string) ?? null,
        likeCount: (r.likeCount as number) ?? 0,
        forkCount: (r.forkCount as number) ?? 0,
        commentCount: (r.commentCount as number) ?? 0,
        artifactCount: (r.artifactCount as number) ?? 0,
        createdAt: r.createdAt as string,
        children: [],
      };
      nodeMap.set(node.id, node);
      allNodes.push(node);
    }

    // Build tree
    const roots: PromptTreeNode[] = [];
    for (const node of allNodes) {
      if (node.forkedFromId && nodeMap.has(node.forkedFromId)) {
        nodeMap.get(node.forkedFromId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Sort roots by total engagement (likes + forks)
    roots.sort((a, b) => (b.likeCount + b.forkCount) - (a.likeCount + a.forkCount));

    return ok(roots);
  } catch (e) {
    return fail(e);
  }
}
