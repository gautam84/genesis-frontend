'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth';
import {
  type WorkspaceEditorResponse,
  type DocumentContentResponse,
  type TokenDto,
  UNIVERSAL_NER_TAGS,
  type NerTag,
  type NerTagDefinition,
  type NerTagScope,
  type NerAnnotation,
} from '@/lib/api';
import {
  getDocumentContentAction,
  getEditorDocumentsAction,
  getEditorSessionAction,
  saveEditorSessionAction,
} from '@/lib/actions/editor';
import {
  createNerAnnotationAction,
  createNerTagAction,
  deleteNerAnnotationAction,
  listNerAnnotationsAction,
  listNerTagsAction,
} from '@/lib/actions/ner';
import { updateDocumentStatusAction } from '@/lib/actions/document';
import { useEditorSession } from '@/hooks/useEditorSession';
import { usePaginatedDocument, EDITOR_PAGE_SIZE } from '@/hooks/usePaginatedDocument';
import { EditorLoadMore } from '@/components/editor/EditorLoadMore';
import { FullScreenLoader } from '@/components/Spinner';
import { toast } from 'sonner';

const CUSTOM_TAG_PALETTE = [
  '#0ea5e9', '#22c55e', '#f97316', '#a855f7', '#eab308',
  '#ec4899', '#14b8a6', '#f43f5e', '#6366f1', '#84cc16',
];

function mergeTagDefinitions(defs: NerTagDefinition[]): NerTag[] {
  const builtinByTag = new Map(UNIVERSAL_NER_TAGS.map(t => [t.tag, t]));
  const merged: NerTag[] = UNIVERSAL_NER_TAGS.map(t => ({ ...t, builtin: true }));
  let customIdx = 0;
  for (const d of defs) {
    if (d.builtin || builtinByTag.has(d.tag)) continue;
    merged.push({
      tag: d.tag,
      label: d.tag,
      description: d.description ?? '',
      color: CUSTOM_TAG_PALETTE[customIdx++ % CUSTOM_TAG_PALETTE.length],
      builtin: false,
      definitionId: d.id,
      scope: d.scope,
    });
  }
  return merged;
}

interface NerEditorProps {
  workspaceId: string;
  workspaceName: string;
}

export default function NerEditor({ workspaceId, workspaceName }: NerEditorProps) {
  const router = useRouter();
  const { user } = useAuth();

  // API data
  const [editorData, setEditorData] = useState<WorkspaceEditorResponse | null>(null);
  const [documentContent, setDocumentContent] = useState<DocumentContentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [annotations, setAnnotations] = useState<NerAnnotation[]>([]);

  // Span selection: clicking a token sets the anchor (first end of span). Clicking
  // a second token resolves to [min, max] as a pending span; the user then picks a
  // label from the palette to commit it.
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null);
  const [pendingRange, setPendingRange] = useState<{ start: number; end: number } | null>(null);

  // Hovered span (for highlight + delete affordance)
  const [hoveredSpanId, setHoveredSpanId] = useState<string | null>(null);

  // Effective tag set for this workspace
  const [availableTags, setAvailableTags] = useState<NerTag[]>(() =>
    UNIVERSAL_NER_TAGS.map(t => ({ ...t, builtin: true })));

  // Add-tag dialog
  const [showAddTagDialog, setShowAddTagDialog] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagDescription, setNewTagDescription] = useState('');
  const [newTagScope, setNewTagScope] = useState<NerTagScope>('WORKSPACE');
  const [addTagError, setAddTagError] = useState<string | null>(null);
  const [addingTag, setAddingTag] = useState(false);

  const refreshTags = useCallback(async () => {
    const result = await listNerTagsAction(workspaceId);
    if (result.ok) {
      setAvailableTags(mergeTagDefinitions(result.data || []));
    }
    // On failure, fall back to universal tags — already initialised in state.
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) refreshTags();
  }, [workspaceId, refreshTags]);

  const currentUserId = user?.id ?? null;

  const { saveSession, containerRef, lastScrollRef, handleScroll } = useEditorSession({
    workspaceId,
    currentDocIndex,
    editorData,
    loading,
  });

  // Load workspace + first document on mount
  useEffect(() => {
    const loadWorkspace = async () => {
      setLoading(true);
      setError(null);

      const docsResult = await getEditorDocumentsAction(workspaceId);
      if (!docsResult.ok) {
        setError(docsResult.error);
        setLoading(false);
        return;
      }
      const documents = docsResult.data;

      let savedSession = null;
      let initialDocIndex = 0;
      const sessionResult = await getEditorSessionAction(workspaceId);
      if (sessionResult.ok && sessionResult.data) {
        savedSession = sessionResult.data;
        if (savedSession.lastDocumentIndex < documents.length) {
          initialDocIndex = savedSession.lastDocumentIndex;
        }
      }

      setEditorData({
        workspaceId,
        workspaceName,
        annotationType: 'NER',
        documents,
        session: savedSession,
        totalDocuments: documents.length,
        totalTokens: documents.reduce((sum, d) => sum + (d.tokenCount || 0), 0),
        totalSentences: documents.reduce((sum, d) => sum + (d.sentenceCount || 0), 0),
      });

      if (documents.length > 0) {
        const doc = documents[initialDocIndex];
        setCurrentDocIndex(initialDocIndex);

        if (doc.isTokenized && doc.tokenCount > 0) {
          const contentResult = await getDocumentContentAction(workspaceId, doc.id, 0, EDITOR_PAGE_SIZE);
          if (contentResult.ok) {
            setDocumentContent(contentResult.data);

            const annResult = await listNerAnnotationsAction(doc.id);
            setAnnotations(annResult.ok ? annResult.data : []);

            if (savedSession?.scrollPosition) {
              setTimeout(() => {
                if (containerRef.current) {
                  containerRef.current.scrollTop = savedSession.scrollPosition;
                  lastScrollRef.current = savedSession.scrollPosition;
                }
              }, 500);
            }
          }
        }
      }

      setLoading(false);
    };

    if (workspaceId) {
      loadWorkspace();
    }
  }, [workspaceId, workspaceName, containerRef, lastScrollRef]);

  const loadDocumentContent = async (docIndex: number) => {
    if (!editorData || docIndex >= editorData.documents.length) return;

    const scrollPos = containerRef.current?.scrollTop || 0;
    // Session save is best-effort; ignore its result.
    await saveEditorSessionAction({
      workspaceId,
      lastDocumentIndex: docIndex,
      scrollPosition: scrollPos,
    });

    setAnchorIndex(null);
    setPendingRange(null);
    setAnnotations([]);

    const docId = editorData.documents[docIndex].id;
    const contentResult = await getDocumentContentAction(workspaceId, docId, 0, EDITOR_PAGE_SIZE);
    if (!contentResult.ok) {
      console.error('Failed to load document:', contentResult.error);
      return;
    }
    setDocumentContent(contentResult.data);
    setCurrentDocIndex(docIndex);

    const annResult = await listNerAnnotationsAction(docId);
    setAnnotations(annResult.ok ? annResult.data : []);
  };

  const pagination = usePaginatedDocument({
    workspaceId,
    documentContent,
    setDocumentContent,
    scrollRootRef: containerRef,
  });

  // Token click handler — drives span selection
  const handleTokenClick = (globalIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (anchorIndex === null) {
      setAnchorIndex(globalIdx);
      setPendingRange({ start: globalIdx, end: globalIdx });
      return;
    }
    // Second click: resolve to ordered range
    const start = Math.min(anchorIndex, globalIdx);
    const end = Math.max(anchorIndex, globalIdx);
    setPendingRange({ start, end });
    setAnchorIndex(start);
  };

  const clearPending = () => {
    setAnchorIndex(null);
    setPendingRange(null);
  };

  // Commit pending range with chosen label
  const commitSpan = async (tag: NerTag) => {
    if (!pendingRange || !documentContent) return;
    const result = await createNerAnnotationAction({
      documentId: documentContent.documentId,
      startTokenIndex: pendingRange.start,
      endTokenIndex: pendingRange.end,
      label: tag.tag,
    });
    if (!result.ok) {
      console.error('Failed to create NER span:', result.error);
      toast.error(result.error);
      return;
    }
    setAnnotations(prev => [...prev, result.data]);
    clearPending();
  };

  const deleteSpan = async (id: string) => {
    const result = await deleteNerAnnotationAction(id);
    if (!result.ok) {
      console.error('Failed to delete span:', result.error);
      return;
    }
    setAnnotations(prev => prev.filter(a => a.id !== id));
  };

  // Build per-token layer map for nested span rendering. Longer spans are placed
  // at lower depths so nested entities stack above their containers visually.
  type TokenSpanInfo = { span: NerAnnotation; depth: number };
  const tokenSpanMap = (() => {
    const map = new Map<number, TokenSpanInfo[]>();
    const sorted = [...annotations].sort((a, b) => {
      const lenA = a.endTokenIndex - a.startTokenIndex;
      const lenB = b.endTokenIndex - b.startTokenIndex;
      return lenB - lenA;
    });
    const usedDepthsPerToken = new Map<number, Set<number>>();
    for (const span of sorted) {
      let depth = 0;
      while (true) {
        let conflict = false;
        for (let i = span.startTokenIndex; i <= span.endTokenIndex; i++) {
          if (usedDepthsPerToken.get(i)?.has(depth)) {
            conflict = true;
            break;
          }
        }
        if (!conflict) break;
        depth++;
        if (depth > 4) break; // cap rendering at 5 stacked layers
      }
      for (let i = span.startTokenIndex; i <= span.endTokenIndex; i++) {
        if (!map.has(i)) map.set(i, []);
        map.get(i)!.push({ span, depth });
        if (!usedDepthsPerToken.has(i)) usedDepthsPerToken.set(i, new Set());
        usedDepthsPerToken.get(i)!.add(depth);
      }
    }
    return map;
  })();

  const getTagInfo = (label: string): NerTag | undefined =>
    availableTags.find(t => t.tag === label);

  // Keyboard: Esc cancels pending range
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') {
        clearPending();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openAddTagDialog = () => {
    setNewTagName('');
    setNewTagDescription('');
    setNewTagScope('WORKSPACE');
    setAddTagError(null);
    setShowAddTagDialog(true);
  };

  const handleCreateTag = async () => {
    setAddTagError(null);
    const tag = newTagName.trim().toUpperCase();
    if (!tag) {
      setAddTagError('Tag is required');
      return;
    }
    if (!/^[A-Z][A-Z0-9_]{0,19}$/.test(tag)) {
      setAddTagError('Tag must start with a letter and contain only A-Z, 0-9, underscore (max 20 chars)');
      return;
    }
    setAddingTag(true);
    const result = await createNerTagAction({
      tag,
      description: newTagDescription.trim() || null,
      scope: newTagScope,
      workspaceId: newTagScope === 'WORKSPACE' ? workspaceId : null,
    });
    setAddingTag(false);
    if (!result.ok) {
      setAddTagError(result.error);
      return;
    }
    setShowAddTagDialog(false);
    await refreshTags();
  };

  const renderTokenizedText = () => {
    if (!documentContent?.tokens?.length) {
      return <p className="text-slate-500">No tokens available. Document may not be tokenized yet.</p>;
    }
    const sentences = documentContent.sentences || [];

    return sentences.map((_, sentIdx) => {
      const sentenceTokens = documentContent.tokens.filter(t => t.sentenceIndex === sentIdx);
      return (
        <div key={`sentence-${sentIdx}`} className="mb-4">
          {sentenceTokens.map((token: TokenDto) => {
            const gIdx = token.globalIndex;
            const layers = tokenSpanMap.get(gIdx) || [];
            const isAnchor = anchorIndex === gIdx;
            const inPending = pendingRange && gIdx >= pendingRange.start && gIdx <= pendingRange.end;
            const isHovered = hoveredSpanId !== null && layers.some(l => l.span.id === hoveredSpanId);

            const underlineHeight = 3;
            const underlineGap = 2;
            const totalUnderlineHeight = layers.length > 0
              ? layers.length * underlineHeight + Math.max(0, layers.length - 1) * underlineGap
              : 0;

            return (
              <span
                key={token.id}
                className={`inline-flex flex-col items-center mx-0.5 mb-1 cursor-pointer rounded-md px-1 py-0.5 transition-colors ${
                  isAnchor
                    ? 'ring-2 ring-[var(--primary)] ring-offset-1 bg-indigo-50 dark:bg-indigo-950/40'
                    : inPending
                      ? 'bg-indigo-50/60 dark:bg-indigo-950/30'
                      : isHovered
                        ? 'bg-amber-50 dark:bg-amber-950/30'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
                onClick={(e) => handleTokenClick(gIdx, e)}
                title={layers.length > 0
                  ? layers.map(l => `${l.span.label} (${l.span.startTokenIndex}..${l.span.endTokenIndex})`).join('\n')
                  : 'Click to set span start; click again for span end'}
              >
                <span className="text-lg text-slate-900 dark:text-white leading-tight">
                  {token.form}
                </span>
                {totalUnderlineHeight > 0 ? (
                  <span
                    className="flex flex-col mt-0.5"
                    style={{ height: `${totalUnderlineHeight}px`, gap: `${underlineGap}px` }}
                  >
                    {layers.map(({ span, depth }) => {
                      const info = getTagInfo(span.label);
                      const color = info?.color || '#9ca3af';
                      return (
                        <span
                          key={`${token.id}-${span.id}-${depth}`}
                          className="block w-full rounded-sm cursor-pointer"
                          style={{ height: `${underlineHeight}px`, backgroundColor: color }}
                          onMouseEnter={() => setHoveredSpanId(span.id)}
                          onMouseLeave={() => setHoveredSpanId(null)}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete ${span.label} span?`)) deleteSpan(span.id);
                          }}
                          title={`${info?.label || span.label} — click to delete`}
                        />
                      );
                    })}
                  </span>
                ) : (
                  <span className="block mt-0.5" style={{ height: '3px' }} />
                )}
              </span>
            );
          })}
        </div>
      );
    });
  };

  if (loading) {
    return <FullScreenLoader label="Loading NER Editor..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">Cannot Load Editor</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
            <Button onClick={() => router.push(`/workspace/${workspaceId}`)}>Back to Workspace</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!editorData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No workspace data</h1>
          <Button onClick={() => router.push('/home')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  const myAnnotations = currentUserId
    ? annotations.filter(a => a.annotatorId === currentUserId)
    : annotations;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="max-w-full mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Image
              src="/genesis-logo.svg"
              alt="Genesis Logo"
              width={120}
              height={55}
              priority
              className="h-10 w-auto cursor-pointer"
              onClick={() => router.push('/home')}
            />
            <Separator orientation="vertical" className="h-10" />
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">{editorData.workspaceName}</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">Named Entity Recognition Editor</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {pendingRange && (
              <Badge variant="default" className="text-white bg-indigo-600 animate-pulse">
                Span [{pendingRange.start}..{pendingRange.end}] — pick a tag
              </Badge>
            )}
            <Badge variant="secondary" className="text-sm">
              {annotations.length} span{annotations.length === 1 ? '' : 's'}{currentUserId ? '' : ' total'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await saveSession();
                router.push(`/workspace/${workspaceId}`);
              }}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Workspace
            </Button>
            <Button
              variant={editorData.documents[currentDocIndex]?.status === 'COMPLETE' ? 'default' : 'outline'}
              size="sm"
              className={editorData.documents[currentDocIndex]?.status === 'COMPLETE' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
              onClick={async () => {
                const doc = editorData.documents[currentDocIndex];
                const newStatus = doc.status === 'COMPLETE' ? 'ANNOTATING' : 'COMPLETE';
                const result = await updateDocumentStatusAction(doc.id, newStatus);
                if (!result.ok) {
                  console.error('Failed to update status:', result.error);
                  return;
                }
                const newDocs = [...editorData.documents];
                newDocs[currentDocIndex] = { ...doc, status: newStatus };
                setEditorData({ ...editorData, documents: newDocs });
              }}
            >
              {editorData.documents[currentDocIndex]?.status === 'COMPLETE' ? 'Completed' : 'Mark Complete'}
            </Button>
            <Avatar className="cursor-pointer ring-2 ring-white dark:ring-slate-800">
              <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white font-bold">
                {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Left pane: tag palette */}
        <aside className="w-72 border-r border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">NER Tags</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {pendingRange ? 'Click a tag to label the selected span.' : 'Click tokens to select a span first.'}
            </p>
          </div>

          <div className="p-3 space-y-1">
            {availableTags.map((tag) => (
              <button
                key={tag.tag}
                onClick={() => pendingRange ? commitSpan(tag) : undefined}
                disabled={!pendingRange}
                className={`w-full text-left rounded-md px-3 py-2 transition-all flex items-center gap-2 border ${
                  pendingRange
                    ? 'hover:scale-[1.02] hover:shadow-sm border-slate-200 dark:border-slate-700 cursor-pointer'
                    : 'opacity-60 cursor-not-allowed border-slate-100 dark:border-slate-800'
                }`}
                style={pendingRange ? { backgroundColor: `${tag.color}10`, borderLeft: `4px solid ${tag.color}` } : undefined}
                title={tag.description}
              >
                <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: tag.color }} />
                <span className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{tag.label}</span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {tag.tag}{tag.builtin === false ? ' · custom' : ''}
                  </span>
                </span>
              </button>
            ))}
            <button
              onClick={openAddTagDialog}
              className="w-full mt-3 rounded-md border border-dashed border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              + Add custom tag
            </button>
            {pendingRange && (
              <button
                onClick={clearPending}
                className="w-full mt-2 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                Cancel selection (Esc)
              </button>
            )}
          </div>
        </aside>

        {/* Center: tokenised text */}
        <main
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-auto px-12 py-8"
        >
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editorData.documents[currentDocIndex]?.name || 'Document'}
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentDocIndex === 0}
                    onClick={() => loadDocumentContent(currentDocIndex - 1)}
                  >
                    ← Previous
                  </Button>
                  <span className="text-sm text-slate-500 dark:text-slate-400 px-2">
                    {currentDocIndex + 1} / {editorData.documents.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentDocIndex >= editorData.documents.length - 1}
                    onClick={() => loadDocumentContent(currentDocIndex + 1)}
                  >
                    Next →
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
              <div className="text-slate-900 dark:text-white" style={{ lineHeight: '2.5' }}>
                {renderTokenizedText()}
              </div>
            </div>

            <EditorLoadMore {...pagination} />

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
              Click a token to anchor the span start, then click another to set the end. Pick a tag from the left.
              Nested and overlapping spans are allowed. Hover any colored underline to highlight; click to delete.
            </p>
          </div>
        </main>

        {/* Right pane: spans for this document */}
        <aside className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {currentUserId ? 'Your Spans' : 'All Spans'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {myAnnotations.length} in this document
            </p>
          </div>
          <div className="p-3 space-y-2">
            {myAnnotations.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                No spans yet. Click two tokens and pick a tag to create one.
              </p>
            )}
            {myAnnotations.map((span) => {
              const info = getTagInfo(span.label);
              const color = info?.color || '#9ca3af';
              const tokens = documentContent?.tokens || [];
              const surface = tokens
                .filter(t => t.globalIndex >= span.startTokenIndex && t.globalIndex <= span.endTokenIndex)
                .map(t => t.form)
                .join(' ');
              return (
                <div
                  key={span.id}
                  className="rounded-md border border-slate-200 dark:border-slate-700 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  onMouseEnter={() => setHoveredSpanId(span.id)}
                  onMouseLeave={() => setHoveredSpanId(null)}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Badge style={{ backgroundColor: color }} className="text-white text-xs">
                      {info?.label || span.label}
                    </Badge>
                    <button
                      onClick={() => { if (confirm(`Delete ${span.label} span?`)) deleteSpan(span.id); }}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                  <p className="text-sm text-slate-900 dark:text-white truncate" title={surface}>
                    {surface || `[${span.startTokenIndex}..${span.endTokenIndex}]`}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    tokens {span.startTokenIndex}..{span.endTokenIndex}
                  </p>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Add-tag dialog */}
      <Dialog open={showAddTagDialog} onOpenChange={setShowAddTagDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add custom NER tag</DialogTitle>
            <DialogDescription>
              Workspace tags are usable only inside this workspace. Global tags are visible to everyone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="ner-tag-name">Tag</Label>
              <Input
                id="ner-tag-name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value.toUpperCase())}
                placeholder="WIZARD"
                maxLength={20}
              />
              <p className="text-xs text-slate-500 mt-1">A–Z, 0–9, underscore. Max 20 chars.</p>
            </div>
            <div>
              <Label htmlFor="ner-tag-desc">Description (optional)</Label>
              <Textarea
                id="ner-tag-desc"
                value={newTagDescription}
                onChange={(e) => setNewTagDescription(e.target.value)}
                placeholder="Fictional spellcasters"
                rows={2}
                maxLength={200}
              />
            </div>
            <div>
              <Label>Scope</Label>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setNewTagScope('WORKSPACE')}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                    newTagScope === 'WORKSPACE'
                      ? 'border-[var(--primary)] bg-indigo-50 dark:bg-indigo-950/40 text-slate-900 dark:text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Workspace
                </button>
                <button
                  onClick={() => setNewTagScope('GLOBAL')}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                    newTagScope === 'GLOBAL'
                      ? 'border-[var(--primary)] bg-indigo-50 dark:bg-indigo-950/40 text-slate-900 dark:text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Global
                </button>
              </div>
            </div>
            {addTagError && (
              <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30 p-2 text-sm text-red-700 dark:text-red-300">
                {addTagError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTagDialog(false)} disabled={addingTag}>
              Cancel
            </Button>
            <Button onClick={handleCreateTag} disabled={addingTag}>
              {addingTag ? 'Creating…' : 'Create tag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
