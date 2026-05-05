'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth';
import {
  editorApi,
  posApi,
  documentApi,
  workspaceApi,
  WorkspaceEditorResponse,
  DocumentContentResponse,
  TokenDto,
  UNIVERSAL_POS_TAGS,
  PosTag,
  PosAnnotation,
} from '@/lib/api';

interface PosEditorProps {
  workspaceId: string;
}

export default function PosEditor({ workspaceId }: PosEditorProps) {
  const router = useRouter();
  const { user } = useAuth();

  // API Data State
  const [editorData, setEditorData] = useState<WorkspaceEditorResponse | null>(null);
  const [documentContent, setDocumentContent] = useState<DocumentContentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [selectedPosTag, setSelectedPosTag] = useState<PosTag | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Track local POS overrides (optimistic updates before API confirms)
  const [localPosMap, setLocalPosMap] = useState<Record<string, string | null>>({});

  // All annotators' POS tags for the current document, keyed by tokenId.
  const [annotationsByToken, setAnnotationsByToken] = useState<Record<string, PosAnnotation[]>>({});

  const currentUser = user?.username ?? null;

  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollRef = useRef(0);

  // Load workspace data on mount
  useEffect(() => {
    const loadWorkspace = async () => {
      setLoading(true);
      setError(null);
      try {
        const [docsRes, wsRes] = await Promise.all([
          editorApi.getWorkspaceDocuments(workspaceId),
          workspaceApi.getById(workspaceId),
        ]);
        const documents = docsRes.data;

        let savedSession = null;
        let initialDocIndex = 0;
        try {
          const sessionRes = await editorApi.getSession(workspaceId);
          savedSession = sessionRes.data;
          if (savedSession && savedSession.lastDocumentIndex < documents.length) {
            initialDocIndex = savedSession.lastDocumentIndex;
          }
        } catch {
          // No saved session
        }

        setEditorData({
          workspaceId,
          workspaceName: wsRes.data.name,
          annotationType: 'POS',
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
            try {
              const contentRes = await editorApi.getDocumentContentWithOffset(workspaceId, doc.id);
              setDocumentContent(contentRes.data);

              try {
                const annRes = await posApi.getAnnotationsForDocument(doc.id);
                setAnnotationsByToken(groupAnnotationsByToken(annRes.data || []));
              } catch {
                setAnnotationsByToken({});
              }

              if (savedSession?.scrollPosition) {
                setTimeout(() => {
                  if (containerRef.current) {
                    containerRef.current.scrollTop = savedSession.scrollPosition;
                    lastScrollRef.current = savedSession.scrollPosition;
                  }
                }, 500);
              }
            } catch {
              // Document content not available
            }
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load editor';
        if (message.includes('Cannot connect')) {
          setError('Cannot connect to the backend server. Please ensure the Genesis backend is running.');
        } else {
          setError(message);
        }
      } finally {
        setLoading(false);
      }
    };

    if (workspaceId) {
      loadWorkspace();
    }
  }, [workspaceId]);

  // Load document content when switching documents
  const loadDocumentContent = async (docIndex: number) => {
    if (!editorData || docIndex >= editorData.documents.length) return;

    try {
      const scrollPos = containerRef.current?.scrollTop || 0;
      await editorApi.saveSession({
        workspaceId,
        lastDocumentIndex: docIndex,
        scrollPosition: scrollPos,
      });
    } catch {
      // Failed to save session
    }

    setSelectedTokenId(null);
    setLocalPosMap({});
    setAnnotationsByToken({});

    try {
      const docId = editorData.documents[docIndex].id;
      const contentRes = await editorApi.getDocumentContentWithOffset(workspaceId, docId);
      setDocumentContent(contentRes.data);
      setCurrentDocIndex(docIndex);

      try {
        const annRes = await posApi.getAnnotationsForDocument(docId);
        setAnnotationsByToken(groupAnnotationsByToken(annRes.data || []));
      } catch {
        setAnnotationsByToken({});
      }
    } catch (err) {
      console.error('Failed to load document:', err);
    }
  };

  // Helper: group flat annotations into Record<tokenId, PosAnnotation[]>
  function groupAnnotationsByToken(annotations: PosAnnotation[]): Record<string, PosAnnotation[]> {
    const out: Record<string, PosAnnotation[]> = {};
    for (const a of annotations) {
      if (!out[a.tokenId]) out[a.tokenId] = [];
      out[a.tokenId].push(a);
    }
    return out;
  }

  // Handle token click - select it for tagging
  const handleTokenClick = (token: TokenDto, e: React.MouseEvent) => {
    e.stopPropagation();

    if (selectedTokenId === token.id) {
      // Clicking same token deselects
      setSelectedTokenId(null);
      return;
    }

    setSelectedTokenId(token.id);

    // If a POS tag is already selected in the palette, apply it immediately
    if (selectedPosTag) {
      applyPosTag(token.id, selectedPosTag.tag);
    }
  };

  // Apply POS tag to a token
  const applyPosTag = useCallback(async (tokenId: string, posTag: string | null) => {
    // Optimistic update
    setLocalPosMap(prev => ({ ...prev, [tokenId]: posTag }));

    try {
      const res = await posApi.updateTokenPos(tokenId, posTag);
      // Refresh annotations cache: insert/replace current-user entry, or remove on null.
      setAnnotationsByToken(prev => {
        const next = { ...prev };
        const existing = next[tokenId] ? [...next[tokenId]] : [];
        const filtered = currentUser
          ? existing.filter(a => a.annotatorId !== currentUser)
          : existing;
        if (posTag !== null && res.data) {
          filtered.push(res.data);
        }
        if (filtered.length === 0) {
          delete next[tokenId];
        } else {
          next[tokenId] = filtered;
        }
        return next;
      });
    } catch (err) {
      console.error('Failed to update POS tag:', err);
      // Revert on error
      setLocalPosMap(prev => {
        const next = { ...prev };
        delete next[tokenId];
        return next;
      });
    }
  }, [currentUser]);

  // Handle POS tag selection from palette
  const handlePosTagSelect = (tag: PosTag) => {
    if (selectedPosTag?.tag === tag.tag) {
      // Deselect
      setSelectedPosTag(null);
      return;
    }

    setSelectedPosTag(tag);

    // If a token is selected, apply immediately
    if (selectedTokenId) {
      applyPosTag(selectedTokenId, tag.tag);
      // Advance to next token
      advanceToNextToken();
    }
  };

  // Advance selection to the next token
  const advanceToNextToken = useCallback(() => {
    if (!selectedTokenId || !documentContent?.tokens) return;

    const tokens = documentContent.tokens;
    const currentIdx = tokens.findIndex(t => t.id === selectedTokenId);
    if (currentIdx >= 0 && currentIdx < tokens.length - 1) {
      setSelectedTokenId(tokens[currentIdx + 1].id);
    } else {
      setSelectedTokenId(null);
    }
  }, [selectedTokenId, documentContent]);

  // Move to previous token
  const moveToPrevToken = useCallback(() => {
    if (!selectedTokenId || !documentContent?.tokens) return;

    const tokens = documentContent.tokens;
    const currentIdx = tokens.findIndex(t => t.id === selectedTokenId);
    if (currentIdx > 0) {
      setSelectedTokenId(tokens[currentIdx - 1].id);
    }
  }, [selectedTokenId, documentContent]);

  // Get effective POS for a token: local optimistic write > current user's
  // annotation > most-recent annotation > legacy token.pos column.
  const getTokenPos = (token: TokenDto): string | null => {
    if (token.id in localPosMap) return localPosMap[token.id];
    const annotations = annotationsByToken[token.id];
    if (annotations && annotations.length > 0) {
      if (currentUser) {
        const mine = annotations.find(a => a.annotatorId === currentUser);
        if (mine) return mine.posTag;
      }
      const sorted = [...annotations].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      return sorted[0].posTag;
    }
    return token.pos;
  };

  // Annotations from OTHER annotators (not current user) for disagreement display.
  const getOtherAnnotations = (tokenId: string): PosAnnotation[] => {
    const all = annotationsByToken[tokenId] || [];
    if (!currentUser) return [];
    return all.filter(a => a.annotatorId !== currentUser);
  };

  // Get PosTag object for a given tag string
  const getPosTagInfo = (tag: string | null): PosTag | undefined => {
    if (!tag) return undefined;
    return UNIVERSAL_POS_TAGS.find(t => t.tag === tag);
  };

  // Remove POS tag from selected token
  const clearSelectedTokenPos = useCallback(() => {
    if (selectedTokenId) {
      applyPosTag(selectedTokenId, null);
    }
  }, [selectedTokenId, applyPosTag]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        setSelectedTokenId(null);
        setSelectedPosTag(null);
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'Tab') {
        e.preventDefault();
        advanceToNextToken();
        return;
      }

      if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        moveToPrevToken();
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        clearSelectedTokenPos();
        return;
      }

      // POS tag shortcuts
      const tag = UNIVERSAL_POS_TAGS.find(t => t.shortcut === e.key.toLowerCase());
      if (tag) {
        e.preventDefault();
        if (selectedTokenId) {
          applyPosTag(selectedTokenId, tag.tag);
          advanceToNextToken();
        } else {
          // Just select the tag in palette
          setSelectedPosTag(prev => prev?.tag === tag.tag ? null : tag);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [advanceToNextToken, moveToPrevToken, clearSelectedTokenPos, selectedTokenId]);

  // Save session helper
  const saveSession = useCallback(async () => {
    if (!workspaceId || isSaving || loading || !editorData) return;
    try {
      setIsSaving(true);
      const scrollPos = containerRef.current ? containerRef.current.scrollTop : lastScrollRef.current;
      if (containerRef.current) lastScrollRef.current = scrollPos;

      await editorApi.saveSession({
        workspaceId,
        lastDocumentIndex: currentDocIndex,
        scrollPosition: scrollPos,
      });
    } catch {
      // Failed to save session
    } finally {
      setIsSaving(false);
    }
  }, [workspaceId, currentDocIndex, isSaving, editorData, loading]);

  useEffect(() => {
    return () => { saveSession(); };
  }, [saveSession]);

  // Debounced scroll save
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    lastScrollRef.current = scrollTop;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => { saveSession(); }, 1000);
  };

  // Compute statistics
  const getStats = () => {
    if (!documentContent?.tokens) return { total: 0, tagged: 0, untagged: 0 };
    const tokens = documentContent.tokens;
    let tagged = 0;
    for (const token of tokens) {
      if (getTokenPos(token)) tagged++;
    }
    return { total: tokens.length, tagged, untagged: tokens.length - tagged };
  };

  // Render tokens with POS annotations
  const renderTokenizedText = () => {
    if (!documentContent?.tokens?.length) {
      return <p className="text-slate-500">No tokens available. Document may not be tokenized yet.</p>;
    }

    const sentences = documentContent.sentences || [];

    return sentences.map((_, sentIdx) => {
      const sentenceTokens = documentContent.tokens.filter(t => t.sentenceIndex === sentIdx);

      return (
        <div key={`sentence-${sentIdx}`} className="mb-4">
          {sentenceTokens.map((token) => {
            const pos = getTokenPos(token);
            const tagInfo = getPosTagInfo(pos);
            const isSelected = selectedTokenId === token.id;
            const others = getOtherAnnotations(token.id).filter(a => a.posTag !== pos);
            const disagreementTitle = others.length > 0
              ? others.map(a => `${a.annotatorId}: ${a.posTag}`).join('\n')
              : undefined;

            return (
              <span
                key={token.id}
                className={`inline-flex flex-col items-center mx-0.5 mb-1 cursor-pointer rounded-lg px-1.5 py-1 transition-all ${
                  isSelected
                    ? 'ring-2 ring-[var(--primary)] ring-offset-1 bg-indigo-50 dark:bg-indigo-950/40 shadow-md'
                    : pos
                      ? 'hover:shadow-md hover:scale-105'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
                style={pos && tagInfo ? {
                  backgroundColor: `${tagInfo.color}15`,
                  borderBottom: `3px solid ${tagInfo.color}`,
                } : undefined}
                onClick={(e) => handleTokenClick(token, e)}
                title={tagInfo ? `${tagInfo.label}: ${tagInfo.description}` : 'Click to tag'}
              >
                <span className="text-lg text-slate-900 dark:text-white leading-tight">
                  {token.form}
                </span>
                {pos && tagInfo ? (
                  <span
                    className="text-[10px] font-bold mt-0.5 leading-none"
                    style={{ color: tagInfo.color }}
                  >
                    {pos}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5 leading-none">
                    &mdash;
                  </span>
                )}
                {others.length > 0 && (
                  <span
                    className="flex gap-0.5 mt-0.5 leading-none"
                    title={disagreementTitle}
                  >
                    {others.slice(0, 5).map((a) => {
                      const otherInfo = getPosTagInfo(a.posTag);
                      return (
                        <span
                          key={a.id}
                          className="w-1 h-1 rounded-full"
                          style={{ backgroundColor: otherInfo?.color || '#9ca3af' }}
                        />
                      );
                    })}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      );
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-[var(--primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-lg text-slate-600 dark:text-slate-400">Loading POS Editor...</span>
        </div>
      </div>
    );
  }

  // Error state
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

  const stats = getStats();

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
              <p className="text-sm text-slate-600 dark:text-slate-400">Part-of-Speech Tagging Editor</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {selectedPosTag && (
              <Badge variant="default" className="text-white animate-pulse" style={{ backgroundColor: selectedPosTag.color }}>
                Tagging: {selectedPosTag.label} ({selectedPosTag.tag})
              </Badge>
            )}
            <Badge variant="secondary" className="text-sm">
              {stats.tagged}/{stats.total} tagged{currentUser ? ' by you' : ''}
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
                try {
                  await documentApi.updateStatus(doc.id, newStatus);
                  const newDocs = [...editorData.documents];
                  newDocs[currentDocIndex] = { ...doc, status: newStatus };
                  setEditorData({ ...editorData, documents: newDocs });
                } catch (err) {
                  console.error('Failed to update status:', err);
                }
              }}
            >
              {editorData.documents[currentDocIndex]?.status === 'COMPLETE' ? (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Completed
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Mark Complete
                </>
              )}
            </Button>
            <Avatar className="cursor-pointer ring-2 ring-white dark:ring-slate-800">
              <AvatarImage src="" alt="User avatar" />
              <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white font-bold">
                {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Pane - POS Tag Palette */}
        <aside className="w-72 border-r border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">POS Tags</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Select a tag, then click tokens
            </p>
          </div>

          <div className="p-3 space-y-1">
            {UNIVERSAL_POS_TAGS.map((tag) => {
              const isActive = selectedPosTag?.tag === tag.tag;
              return (
                <button
                  key={tag.tag}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    isActive
                      ? 'ring-2 ring-offset-1 shadow-md'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                  style={isActive ? {
                    backgroundColor: `${tag.color}15`,
                    outlineColor: tag.color,
                    outline: `2px solid ${tag.color}`,
                    outlineOffset: '1px',
                  } : undefined}
                  onClick={() => handlePosTagSelect(tag)}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">{tag.tag}</span>
                      <span className="text-xs text-slate-500 truncate">{tag.label}</span>
                    </div>
                  </div>
                  {tag.shortcut && (
                    <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono flex-shrink-0">
                      {tag.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })}

            <Separator className="my-2" />

            <button
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              onClick={() => {
                setSelectedPosTag(null);
                if (selectedTokenId) clearSelectedTokenPos();
              }}
            >
              <svg className="w-3 h-3 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-sm text-red-600 dark:text-red-400 font-medium">Clear Tag</span>
              <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono ml-auto flex-shrink-0">
                Del
              </kbd>
            </button>
          </div>
        </aside>

        {/* Middle - Text Editor */}
        <main
          className="flex-1 overflow-y-auto"
          ref={containerRef}
          onScroll={handleScroll}
          onClick={() => { setSelectedTokenId(null); }}
        >
          <div className="p-8">
            {/* Document Tabs */}
            {editorData.documents.length > 1 && (
              <div className="flex gap-2 mb-4 flex-wrap">
                {editorData.documents.map((doc, idx) => (
                  <Button
                    key={doc.id}
                    variant={currentDocIndex === idx ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => loadDocumentContent(idx)}
                  >
                    {doc.name}
                  </Button>
                ))}
              </div>
            )}

            <Card className="shadow-lg min-h-[600px]">
              <CardContent className="p-8" onClick={(e) => e.stopPropagation()}>
                <div className="leading-relaxed text-slate-900 dark:text-white select-none">
                  {renderTokenizedText()}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        {/* Right Pane - Instructions & Statistics */}
        <aside className="w-72 border-l border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">How to Annotate</h3>
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-blue-600">1</span>
              </div>
              <p><strong>Select a POS tag</strong> from the left palette</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-blue-600">2</span>
              </div>
              <p><strong>Click tokens</strong> in the text to apply the tag</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-blue-600">3</span>
              </div>
              <p>Use <strong>keyboard shortcuts</strong> for quick tagging</p>
            </div>
          </div>

          <Separator className="my-6" />

          <h3 className="font-bold text-slate-900 dark:text-white mb-4">Shortcuts</h3>
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex justify-between">
              <span>Next token</span>
              <div className="flex gap-1">
                <kbd className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">Tab</kbd>
                <kbd className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">&rarr;</kbd>
              </div>
            </div>
            <div className="flex justify-between">
              <span>Prev token</span>
              <div className="flex gap-1">
                <kbd className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">&larr;</kbd>
              </div>
            </div>
            <div className="flex justify-between">
              <span>Clear tag</span>
              <kbd className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">Del</kbd>
            </div>
            <div className="flex justify-between">
              <span>Cancel</span>
              <kbd className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">Esc</kbd>
            </div>
          </div>

          <Separator className="my-6" />

          <h3 className="font-bold text-slate-900 dark:text-white mb-4">Statistics</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Documents</span>
              <span className="font-bold">{editorData.totalDocuments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Total Tokens</span>
              <span className="font-bold">{stats.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Tagged</span>
              <span className="font-bold text-green-600">{stats.tagged}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Untagged</span>
              <span className="font-bold text-orange-500">{stats.untagged}</span>
            </div>
          </div>

          {/* Progress bar */}
          {stats.total > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Progress</span>
                <span>{Math.round((stats.tagged / stats.total) * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--primary)] to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${(stats.tagged / stats.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <Separator className="my-6" />

          {/* Tag distribution */}
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">Tag Distribution</h3>
          <div className="space-y-1.5 text-sm">
            {(() => {
              if (!documentContent?.tokens) return null;
              const counts: Record<string, number> = {};
              for (const token of documentContent.tokens) {
                const pos = getTokenPos(token);
                if (pos) counts[pos] = (counts[pos] || 0) + 1;
              }
              const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
              if (entries.length === 0) {
                return <p className="text-xs text-slate-400">No tags assigned yet</p>;
              }
              return entries.map(([tag, count]) => {
                const tagInfo = getPosTagInfo(tag);
                return (
                  <div key={tag} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tagInfo?.color || '#9ca3af' }}
                    />
                    <span className="font-mono text-xs text-slate-600 dark:text-slate-400 w-12">{tag}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(count / stats.total) * 100}%`,
                          backgroundColor: tagInfo?.color || '#9ca3af',
                        }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-6 text-right">{count}</span>
                  </div>
                );
              });
            })()}
          </div>
        </aside>
      </div>
    </div>
  );
}
