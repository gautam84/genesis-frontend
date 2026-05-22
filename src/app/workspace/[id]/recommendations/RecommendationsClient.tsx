'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  recommendationsApi,
  type AnnotationType,
  type Recommendation,
  type RecommendationPriority,
} from '@/lib/api';
import {
  dismissRecommendationAction,
  issueShareTokenAction,
} from '@/lib/actions/recommendations';

const VISIBLE_BY_DEFAULT = 10;

function priorityColor(p: RecommendationPriority): string {
  if (p === 'HIGH') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  if (p === 'MEDIUM') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
}

function typeLabel(t: Recommendation['type']): string {
  switch (t) {
    case 'UNFINISHED_MENTION': return 'Unfinished mention';
    case 'DENSITY_GAP':        return 'Empty document';
    case 'STRING_MATCH':       return 'Repeated word';
    case 'COREF_CHAIN_GAP':    return 'Cluster gap';
  }
}

type Props = {
  workspaceId: string;
  initialRecommendations: Recommendation[];
  initialDocumentIds: string[];
  annotationType: AnnotationType | null;
};

export function RecommendationsClient({
  workspaceId,
  initialRecommendations,
  initialDocumentIds,
  annotationType,
}: Props) {
  const router = useRouter();

  const [recommendations, setRecommendations] = useState<Recommendation[]>(initialRecommendations);
  const liveDocumentIds = useMemo(() => new Set(initialDocumentIds), [initialDocumentIds]);

  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [shareToken, setShareToken] = useState<{ url: string; expiresInSeconds: number } | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const handleDismiss = async (rec: Recommendation, accepted: boolean) => {
    const prev = recommendations;
    setRecommendations((rs) => rs.filter((r) => r.hash !== rec.hash));
    const result = await dismissRecommendationAction(workspaceId, rec.hash, accepted);
    if (!result.ok) {
      setRecommendations(prev);
      setError(result.error);
    }
  };

  const handleShare = async () => {
    setShareLoading(true);
    setError(null);
    const result = await issueShareTokenAction(workspaceId);
    setShareLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const url = recommendationsApi.buildShareDownloadUrl(workspaceId, result.data.token);
    setShareToken({ url, expiresInSeconds: result.data.expiresInSeconds });
    setShareCopied(false);
  };

  const handleCopyShare = async () => {
    if (!shareToken) return;
    try {
      await navigator.clipboard.writeText(shareToken.url);
      setShareCopied(true);
    } catch {
      // user can copy manually from the input
    }
  };

  const visible = showAll ? recommendations : recommendations.slice(0, VISIBLE_BY_DEFAULT);
  const hiddenCount = recommendations.length - VISIBLE_BY_DEFAULT;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/workspace/${workspaceId}`)}>
            ← Back
          </Button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Suggestions</h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleShare} disabled={shareLoading}>
          {shareLoading ? 'Issuing…' : 'Create share link'}
        </Button>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-4">
        {error && (
          <Card className="border-red-300 bg-red-50 dark:bg-red-950/30">
            <CardContent className="p-4">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </CardContent>
          </Card>
        )}

        {shareToken && (
          <Card className="border-blue-300 bg-blue-50 dark:bg-blue-950/30">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                Share link (valid for {Math.round(shareToken.expiresInSeconds / 3600)}h)
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareToken.url}
                  className="flex-1 px-2 py-1 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                />
                <Button size="sm" variant="outline" onClick={handleCopyShare}>
                  {shareCopied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {recommendations.length === 0 && (() => {
          let title: string;
          let body: string;
          if (annotationType && annotationType !== 'COREF') {
            title = `Recommendations aren't available for ${annotationType} workspaces yet`;
            body = 'Suggestions are currently powered by coreference rules (unfinished mentions, density gaps, repeated forms, chain gaps). Rules for other annotation types are tracked separately.';
          } else if (liveDocumentIds.size === 0) {
            title = 'Upload a document to get started';
            body = 'Recommendations appear once this workspace has at least one document with annotations. Head to the workspace home to upload.';
          } else {
            title = 'No gaps detected';
            body = 'Every document has annotations and every mention has a cluster. Add new mentions or documents and suggestions reappear automatically.';
          }
          return (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
                  {title}
                </p>
                <p className="text-sm text-slate-500 mt-2">{body}</p>
              </CardContent>
            </Card>
          );
        })()}

        {visible.map(rec => {
          const isDeletedDoc = rec.documentId !== null && !liveDocumentIds.has(rec.documentId);
          return (
            <Card key={rec.hash} className={isDeletedDoc ? 'opacity-60' : ''}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={priorityColor(rec.priority)}>{rec.priority}</Badge>
                    <span className="text-xs text-slate-500">{typeLabel(rec.type)}</span>
                  </div>
                  <p className="text-sm text-slate-900 dark:text-white">{rec.reason}</p>
                  {isDeletedDoc && (
                    <p className="text-xs text-slate-500 mt-1 italic">Document removed</p>
                  )}
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  {rec.documentId && !isDeletedDoc && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/workspace/${workspaceId}/editor`)}
                    >
                      Go to
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-green-600 hover:text-green-700"
                    onClick={() => handleDismiss(rec, true)}
                    title="Mark as helpful"
                  >
                    ✓ Helpful
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-slate-500 hover:text-slate-700"
                    onClick={() => handleDismiss(rec, false)}
                    title="Dismiss"
                  >
                    ✕ Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {!showAll && hiddenCount > 0 && (
          <div className="text-center">
            <Button variant="outline" size="sm" onClick={() => setShowAll(true)}>
              Show {hiddenCount} more
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
