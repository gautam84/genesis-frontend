import { redirect } from 'next/navigation';
import type { AnnotationType } from '@/lib/api';
import { SessionExpiredError } from '@/lib/errors';
import { getWorkspaceDocuments } from '@/lib/server/editor';
import { listRecommendations } from '@/features/recommendations/recommendations.gateway';
import { getWorkspaceById } from '@/features/workspace/workspace.gateway';
import { RecommendationsClient } from './RecommendationsClient';

export default async function RecommendationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const [recommendations, documents, workspace] = await Promise.all([
      listRecommendations(id),
      getWorkspaceDocuments(id),
      getWorkspaceById(id),
    ]);
    return (
      <RecommendationsClient
        workspaceId={id}
        initialRecommendations={recommendations}
        initialDocumentIds={documents.map((d) => d.id)}
        annotationType={workspace.annotationType as AnnotationType}
      />
    );
  } catch (err) {
    if (err instanceof SessionExpiredError) {
      redirect('/api/auth/end-session');
    }
    throw err;
  }
}
