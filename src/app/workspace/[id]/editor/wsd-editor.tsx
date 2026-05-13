'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import {
  editorApi,
  wsdApi,
  workspaceApi,
  WorkspaceEditorResponse,
  DocumentContentResponse,
  TokenDto,
  WsdSense,
  WsdAnnotation,
} from '@/lib/api';

interface WsdEditorProps {
  workspaceId: string;
}

export default function WsdEditor({ workspaceId }: WsdEditorProps) {
  const router = useRouter();
  const { user } = useAuth();
  const currentUser = user?.username ?? null;

  const [editorData, setEditorData] = useState<WorkspaceEditorResponse | null>(null);
  const [documentContent, setDocumentContent] = useState<DocumentContentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [selectedToken, setSelectedToken] = useState<TokenDto | null>(null);
  const [senses, setSenses] = useState<WsdSense[]>([]);
  const [sensesLoading, setSensesLoading] = useState(false);
  const [senseFilter, setSenseFilter] = useState('');

  // tokenId → list of all annotations on that token, across annotators.
  const [annotationsByToken, setAnnotationsByToken] = useState<Record<string, WsdAnnotation[]>>({});

  // Load workspace + first document content.
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [docsRes, wsRes] = await Promise.all([
          editorApi.getWorkspaceDocuments(workspaceId),
          workspaceApi.getById(workspaceId),
        ]);
        const documents = docsRes.data;

        setEditorData({
          workspaceId,
          workspaceName: wsRes.data.name,
          annotationType: 'WSD',
          documents,
          session: null,
          totalDocuments: documents.length,
          totalTokens: documents.reduce((sum, d) => sum + (d.tokenCount || 0), 0),
          totalSentences: documents.reduce((sum, d) => sum + (d.sentenceCount || 0), 0),
        });

        if (documents.length > 0) {
          await loadDocumentAt(0, documents);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load workspace.');
      } finally {
        setLoading(false);
      }
    };

    if (workspaceId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const loadDocumentAt = async (idx: number, docs?: WorkspaceEditorResponse['documents']) => {
    const documents = docs ?? editorData?.documents ?? [];
    const doc = documents[idx];
    if (!doc || !doc.isTokenized || doc.tokenCount === 0) {
      setDocumentContent(null);
      return;
    }
    setCurrentDocIndex(idx);
    setSelectedToken(null);
    try {
      const contentRes = await editorApi.getDocumentContentWithOffset(workspaceId, doc.id);
      setDocumentContent(contentRes.data);
      setAnnotationsByToken({});
    } catch (err) {
      console.error(err);
      setError('Failed to load document content.');
    }
  };

  // Token click → load senses for token.form + existing annotations.
  const handleTokenClick = useCallback(async (token: TokenDto) => {
    setSelectedToken(token);
    setSenseFilter('');
    setSensesLoading(true);
    try {
      const [sensesRes, annsRes] = await Promise.all([
        wsdApi.listSenses(workspaceId, token.form),
        wsdApi.getAnnotationsForToken(workspaceId, token.id),
      ]);
      setSenses(sensesRes.data);
      setAnnotationsByToken(prev => ({ ...prev, [token.id]: annsRes.data }));
    } catch (err) {
      console.error(err);
    } finally {
      setSensesLoading(false);
    }
  }, [workspaceId]);

  const handlePickSense = async (sense: WsdSense) => {
    if (!selectedToken) return;
    try {
      const res = await wsdApi.upsertAnnotation(workspaceId, selectedToken.id, sense.id);
      setAnnotationsByToken(prev => {
        const others = (prev[selectedToken.id] ?? []).filter(a => a.annotatorId !== res.data.annotatorId);
        return { ...prev, [selectedToken.id]: [...others, res.data] };
      });
    } catch (err) {
      console.error(err);
    }
  };

  const getMyAnnotation = (tokenId: string): WsdAnnotation | undefined => {
    if (!currentUser) return undefined;
    return (annotationsByToken[tokenId] ?? []).find(a => a.annotatorId === currentUser);
  };

  const getSenseById = (senseId: string): WsdSense | undefined =>
    senses.find(s => s.id === senseId);

  const filteredSenses = senses.filter(s => {
    if (!senseFilter.trim()) return true;
    const q = senseFilter.toLowerCase();
    return s.word.toLowerCase().includes(q) || s.senseLabel.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading WSD editor…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!editorData || editorData.documents.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">No documents in this workspace.</p>
      </div>
    );
  }

  const currentDoc = editorData.documents[currentDocIndex];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/workspace/${workspaceId}`)}>
            ← Back
          </Button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            {editorData.workspaceName} <span className="text-slate-400">/ WSD</span>
          </h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push(`/workspace/${workspaceId}/wsd-senses`)}>
          Sense Inventory
        </Button>
      </header>

      <div className="flex flex-1 h-[calc(100vh-57px)]">
        <main className="flex-1 overflow-y-auto p-8">
          {editorData.documents.length > 1 && (
            <div className="flex gap-2 mb-4 flex-wrap">
              {editorData.documents.map((doc, idx) => (
                <Button
                  key={doc.id}
                  variant={currentDocIndex === idx ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => loadDocumentAt(idx)}
                >
                  {doc.name}
                </Button>
              ))}
            </div>
          )}

          <Card className="shadow-lg min-h-[600px]">
            <CardContent className="p-8">
              <div className="leading-relaxed text-slate-900 dark:text-white">
                {documentContent?.tokens?.map(token => {
                  const mine = getMyAnnotation(token.id);
                  const isSelected = selectedToken?.id === token.id;
                  return (
                    <span
                      key={token.id}
                      onClick={() => handleTokenClick(token)}
                      className={`inline-block px-1 cursor-pointer rounded transition ${
                        isSelected
                          ? 'bg-blue-200 dark:bg-blue-800'
                          : mine
                            ? 'bg-green-100 dark:bg-green-900/40 hover:bg-green-200'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={mine ? `sense: ${getSenseById(mine.senseId)?.senseLabel ?? mine.senseId}` : 'click to tag'}
                    >
                      {token.form}
                    </span>
                  );
                })}
                {(!documentContent || !documentContent.tokens?.length) && (
                  <p className="text-slate-500">
                    {currentDoc.isTokenized
                      ? 'Document has no tokens.'
                      : 'Document not yet tokenized.'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </main>

        {/* Right pane — sense picker */}
        <aside className="w-96 border-l border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {selectedToken ? `Senses for "${selectedToken.form}"` : 'Senses'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {selectedToken ? 'Pick a sense to tag this token.' : 'Click a token to start.'}
            </p>
            {selectedToken && (
              <Input
                placeholder="Search senses…"
                value={senseFilter}
                onChange={e => setSenseFilter(e.target.value)}
                className="mt-3"
              />
            )}
          </div>

          <div className="p-3 space-y-2">
            {!selectedToken && (
              <p className="text-sm text-slate-500 px-2 py-4">
                Select a word in the document to view its senses.
              </p>
            )}

            {selectedToken && sensesLoading && (
              <p className="text-sm text-slate-500 px-2 py-4">Loading senses…</p>
            )}

            {selectedToken && !sensesLoading && senses.length === 0 && (
              <div className="px-2 py-4 text-sm text-slate-500">
                <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">
                  No senses defined for this word.
                </p>
                <p>Ask your admin to add senses in workspace settings.</p>
              </div>
            )}

            {selectedToken && !sensesLoading && filteredSenses.map(sense => {
              const mine = getMyAnnotation(selectedToken.id);
              const isMine = mine?.senseId === sense.id;
              return (
                <button
                  key={sense.id}
                  onClick={() => handlePickSense(sense)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition border ${
                    isMine
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="font-semibold text-sm text-slate-900 dark:text-white">
                    {sense.senseLabel}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{sense.word}</div>
                  {sense.description && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {sense.description}
                    </div>
                  )}
                </button>
              );
            })}

            {selectedToken && !sensesLoading && senses.length > 0 && filteredSenses.length === 0 && (
              <p className="text-sm text-slate-500 px-2 py-4">No senses match the filter.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
