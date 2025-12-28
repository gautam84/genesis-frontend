'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { AuthGuard } from '@/components/auth-guard';
import { useAuth } from '@/lib/auth';
import {
  editorApi,
  corefApi,
  WorkspaceEditorResponse,
  DocumentContentResponse,
  TokenDto,
  MentionDto,
  ClusterDto,
} from '@/lib/api';

// Cluster colors palette
const CLUSTER_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
];

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const workspaceId = params.id as string;

  // API Data State
  const [editorData, setEditorData] = useState<WorkspaceEditorResponse | null>(null);
  const [documentContent, setDocumentContent] = useState<DocumentContentResponse | null>(null);
  const [mentions, setMentions] = useState<MentionDto[]>([]);
  const [clusters, setClusters] = useState<ClusterDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [selectedTokens, setSelectedTokens] = useState<TokenDto[]>([]);
  const [linkingFromMention, setLinkingFromMention] = useState<MentionDto | null>(null);
  const [selectedMention, setSelectedMention] = useState<MentionDto | null>(null); // For cluster assignment
  const [hoveredMention, setHoveredMention] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null); // For scroll tracking on main element
  const lastScrollRef = useRef(0); // Track last scroll position reliably for unmount saving
  const cardContentRef = useRef<HTMLDivElement>(null); // For arrow positioning

  // Load workspace data on mount
  useEffect(() => {
    const loadWorkspace = async () => {
      setLoading(true);
      setError(null);
      try {
        // Try to get documents list - this is more reliable than openWorkspace
        const docsRes = await editorApi.getWorkspaceDocuments(workspaceId);
        const documents = docsRes.data;

        // Load saved session if available
        let savedSession = null;
        let initialDocIndex = 0;
        try {
          const sessionRes = await editorApi.getSession(workspaceId);
          savedSession = sessionRes.data;
          console.log('Loaded session:', savedSession);
          if (savedSession && savedSession.lastDocumentIndex < documents.length) {
            initialDocIndex = savedSession.lastDocumentIndex;
            console.log('Restoring to document index:', initialDocIndex);
          }
        } catch (sessionErr: any) {
          console.warn('No saved session:', sessionErr);
        }

        // Create minimal editor data from documents
        setEditorData({
          workspaceId: workspaceId,
          workspaceName: 'Workspace',
          annotationType: 'COREF',
          documents: documents,
          session: savedSession,
          totalDocuments: documents.length,
          totalTokens: documents.reduce((sum, d) => sum + (d.tokenCount || 0), 0),
          totalSentences: documents.reduce((sum, d) => sum + (d.sentenceCount || 0), 0),
        });

        // Load document at saved index if available, otherwise first document
        if (documents.length > 0) {
          const docIndex = initialDocIndex;
          const doc = documents[docIndex];
          setCurrentDocIndex(docIndex);

          // Only load content if document is tokenized
          if (doc.isTokenized && doc.tokenCount > 0) {
            try {
              const contentRes = await editorApi.getDocumentContentWithOffset(workspaceId, doc.id);
              setDocumentContent(contentRes.data);

              // Restore scroll position after content loads (need delay for DOM to render)
              if (savedSession?.scrollPosition) {
                console.log('Will restore scroll to:', savedSession.scrollPosition);
                setTimeout(() => {
                  if (containerRef.current) {
                    containerRef.current.scrollTop = savedSession.scrollPosition;
                    lastScrollRef.current = savedSession.scrollPosition; // Sync ref
                    console.log('Restored scroll position');
                  }
                }, 500); // Longer delay to ensure DOM is rendered
              }
            } catch (contentErr: any) {
              console.warn('Document content not available:', contentErr);
            }
          }
        }

        // Load existing annotations
        try {
          const [mentionsRes, clustersRes] = await Promise.all([
            corefApi.getMentionsByWorkspace(workspaceId),
            corefApi.getClusters(workspaceId),
          ]);
          setMentions(mentionsRes.data);
          setClusters(clustersRes.data);
        } catch (annotErr: any) {
          console.warn('Annotations not available:', annotErr);
        }
      } catch (err: any) {
        console.error('Failed to load workspace:', err);
        if (err.message?.includes('Cannot connect')) {
          setError('Cannot connect to the backend server. Please ensure the Genesis backend is running on port 3003.');
        } else {
          setError(err.message || 'Failed to load editor. Make sure the backend is running and the workspace exists.');
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

    // Save current session state before switching
    try {
      const scrollPos = containerRef.current?.scrollTop || 0;
      await editorApi.saveSession({
        workspaceId: workspaceId,
        lastDocumentIndex: docIndex,
        scrollPosition: scrollPos,
      });
    } catch (saveErr: any) {
      console.warn('Failed to save session:', saveErr);
    }

    // Reset linking state when switching documents
    setLinkingFromMention(null);
    setMousePosition(null);
    setHoveredMention(null);
    setSelectedMention(null);

    try {
      const docId = editorData.documents[docIndex].id;
      const contentRes = await editorApi.getDocumentContentWithOffset(workspaceId, docId);
      setDocumentContent(contentRes.data);
      setCurrentDocIndex(docIndex);
      setSelectedTokens([]);
    } catch (err: any) {
      console.error('Failed to load document:', err);
    }
  };

  // Get cluster for a mention
  const getClusterForMention = useCallback((mentionId: string) => {
    const mention = mentions.find(m => m.id === mentionId);
    if (!mention?.clusterId) return null;
    return clusters.find(c => c.id === mention.clusterId) || null;
  }, [mentions, clusters]);

  // Get cluster color
  const getClusterColor = (clusterId: string | null) => {
    if (!clusterId) return '#6b7280';
    const cluster = clusters.find(c => c.id === clusterId);
    return cluster?.color || '#6b7280';
  };

  // Handle token click - create mention or select for multi-token
  const handleTokenClick = async (token: TokenDto, e: React.MouseEvent) => {
    e.stopPropagation();

    // Check if this token is already part of a mention
    const existingMention = mentions.find(
      m => m.documentId === documentContent?.documentId &&
        m.sentenceIndex === token.sentenceIndex &&
        token.tokenIndex >= m.startTokenIndex &&
        token.tokenIndex <= m.endTokenIndex
    );

    if (existingMention) {
      // Click on existing mention - handle linking
      handleMentionClick(existingMention, e);
      return;
    }

    // Create new mention for this token
    if (!documentContent) return;

    try {
      const res = await corefApi.createMention(workspaceId, {
        documentId: documentContent.documentId,
        sentenceIndex: token.sentenceIndex,
        startTokenIndex: token.tokenIndex,
        endTokenIndex: token.tokenIndex,
        text: token.form,
      });

      const newMention = res.data;
      setMentions(prev => [...prev, newMention]);

      // If we're in linking mode, link with the new mention and reset
      if (linkingFromMention) {
        await linkMentions(linkingFromMention, newMention);
        setLinkingFromMention(null);
        setSelectedMention(null);
      } else {
        // Set as selected - user can click a cluster to assign, or click another word to link
        setLinkingFromMention(newMention);
        setSelectedMention(newMention);
      }
    } catch (err: any) {
      console.error('Failed to create mention:', err);
    }
  };

  // Handle clicking on an existing mention
  const handleMentionClick = async (mention: MentionDto, e: React.MouseEvent) => {
    e.stopPropagation();

    if (linkingFromMention) {
      if (linkingFromMention.id !== mention.id) {
        // Complete the linking
        await linkMentions(linkingFromMention, mention);
      }
      setLinkingFromMention(null);
    } else {
      // Start linking from this mention
      setLinkingFromMention(mention);
    }
  };

  // Link two mentions together
  const linkMentions = async (mention1: MentionDto, mention2: MentionDto) => {
    try {
      let clusterId = mention1.clusterId || mention2.clusterId;

      if (!clusterId) {
        // Create new cluster
        const clusterRes = await corefApi.createCluster(workspaceId, {
          color: CLUSTER_COLORS[clusters.length % CLUSTER_COLORS.length],
        });
        clusterId = clusterRes.data.id;
        setClusters(prev => [...prev, clusterRes.data]);
      }

      // Assign both mentions to cluster
      if (!mention1.clusterId) {
        await corefApi.assignToCluster(mention1.id, clusterId);
      }
      if (!mention2.clusterId) {
        await corefApi.assignToCluster(mention2.id, clusterId);
      }

      // Refresh mentions
      const mentionsRes = await corefApi.getMentionsByWorkspace(workspaceId);
      setMentions(mentionsRes.data);

      // Refresh clusters
      const clustersRes = await corefApi.getClusters(workspaceId);
      setClusters(clustersRes.data);
    } catch (err: any) {
      console.error('Failed to link mentions:', err);
    }
  };

  // Delete mention
  const handleDeleteMention = async (mentionId: string) => {
    try {
      await corefApi.deleteMention(mentionId);
      setMentions(prev => prev.filter(m => m.id !== mentionId));
    } catch (err: any) {
      console.error('Failed to delete mention:', err);
    }
  };

  // Delete cluster (unassigns all mentions in this cluster)
  const handleDeleteCluster = async (clusterId: string) => {
    try {
      await corefApi.deleteCluster(clusterId);
      setClusters(prev => prev.filter(c => c.id !== clusterId));
      // Refresh mentions to update their cluster assignments
      const mentionsRes = await corefApi.getMentionsByWorkspace(workspaceId);
      setMentions(mentionsRes.data);
    } catch (err: any) {
      console.error('Failed to delete cluster:', err);
    }
  };

  // Assign selected mention to an existing cluster
  const handleAssignToCluster = async (clusterId: string) => {
    if (!selectedMention) return;

    try {
      await corefApi.assignToCluster(selectedMention.id, clusterId);
      // Refresh mentions and clusters
      const [mentionsRes, clustersRes] = await Promise.all([
        corefApi.getMentionsByWorkspace(workspaceId),
        corefApi.getClusters(workspaceId),
      ]);
      setMentions(mentionsRes.data);
      setClusters(clustersRes.data);
      setSelectedMention(null); // Clear selection after assignment
    } catch (err: any) {
      console.error('Failed to assign to cluster:', err);
    }
  };

  // Cancel linking and selection
  const cancelLinking = useCallback(() => {
    setLinkingFromMention(null);
    setSelectedMention(null);
    setMousePosition(null);
  }, []);

  // Track mouse for arrow drawing
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (linkingFromMention && cardContentRef.current) {
      const rect = cardContentRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, [linkingFromMention]);

  // Get position of mention element for arrow drawing
  const getMentionPosition = (mentionId: string) => {
    const element = document.querySelector(`[data-mention-id="${mentionId}"]`) as HTMLElement;
    if (!element || !cardContentRef.current) return null;

    const containerRect = cardContentRef.current.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    return {
      x: elementRect.left - containerRect.left + elementRect.width / 2,
      y: elementRect.top - containerRect.top + elementRect.height / 2,
    };
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelLinking();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelLinking]);

  // Save session helper
  const saveSession = useCallback(async () => {
    if (!workspaceId || isSaving || loading || !editorData) return;

    try {
      setIsSaving(true);
      // Use lastScrollRef if containerRef is null (e.g. during unmount)
      const scrollPos = containerRef.current ? containerRef.current.scrollTop : lastScrollRef.current;

      // Update ref if we have the element
      if (containerRef.current) {
        lastScrollRef.current = scrollPos;
      }

      await editorApi.saveSession({
        workspaceId: workspaceId,
        lastDocumentIndex: currentDocIndex,
        scrollPosition: scrollPos,
      });
      console.log('Session saved:', { docIndex: currentDocIndex, scroll: scrollPos });
    } catch (err: any) {
      console.warn('Failed to save session:', err);
    } finally {
      setIsSaving(false);
    }
  }, [workspaceId, currentDocIndex, isSaving]);

  // Save on unmount only
  useEffect(() => {
    return () => {
      saveSession();
    };
  }, [saveSession]);

  // Debounced scroll save
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    lastScrollRef.current = scrollTop;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      saveSession();
    }, 1000); // Debounce save 1s after scroll stops
  };

  // Render tokens with annotations
  const renderTokenizedText = () => {
    if (!documentContent?.tokens?.length) {
      return <p className="text-slate-500">No tokens available. Document may not be tokenized yet.</p>;
    }

    // Group tokens by sentence
    const sentences = documentContent.sentences || [];
    const processedMentions = new Set<string>(); // Track which mentions we've rendered

    return sentences.map((sentence, sentIdx) => {
      // Get tokens for this sentence
      const sentenceTokens = documentContent.tokens.filter(t => t.sentenceIndex === sentIdx);

      return (
        <div key={`sentence-${sentIdx}`} className="mb-2">
          {sentenceTokens.map((token, tokenIdx) => {
            // Find if this token is part of a mention
            const mention = mentions.find(
              m => m.documentId === documentContent.documentId &&
                m.sentenceIndex === token.sentenceIndex &&
                token.tokenIndex >= m.startTokenIndex &&
                token.tokenIndex <= m.endTokenIndex
            );

            const cluster = mention?.clusterId ? clusters.find(c => c.id === mention.clusterId) : null;
            const isFirstTokenOfMention = mention && token.tokenIndex === mention.startTokenIndex;
            const isLinking = linkingFromMention?.id === mention?.id;
            const isLinkTarget = linkingFromMention && mention && linkingFromMention.id !== mention.id;

            if (mention && isFirstTokenOfMention && !processedMentions.has(mention.id)) {
              // Mark this mention as processed
              processedMentions.add(mention.id);

              // Render entire mention span
              const mentionTokens = sentenceTokens.filter(
                t => t.tokenIndex >= mention.startTokenIndex && t.tokenIndex <= mention.endTokenIndex
              );
              const mentionText = mentionTokens.map(t => t.form).join(' ');

              return (
                <span
                  key={`mention-${sentIdx}-${mention.id}`}
                  data-mention-id={mention.id}
                  className={`relative px-1 py-0.5 rounded cursor-pointer transition-all inline ${isLinking
                    ? 'ring-2 ring-blue-500 ring-offset-1 shadow-lg'
                    : isLinkTarget
                      ? 'ring-2 ring-green-400 ring-offset-1 hover:ring-green-500'
                      : 'hover:shadow-md'
                    }`}
                  style={{
                    backgroundColor: cluster ? `${cluster.color}30` : '#3b82f620',
                    borderBottom: `3px solid ${cluster?.color || '#3b82f6'}`,
                  }}
                  onMouseEnter={() => setHoveredMention(mention.id)}
                  onMouseLeave={() => setHoveredMention(null)}
                  onClick={(e) => handleMentionClick(mention, e)}
                  title={isLinking ? 'Select another mention to link' : 'Click to start linking'}
                >
                  {mentionText}
                  {cluster && (
                    <sup
                      className="ml-1 text-xs font-bold px-1 py-0.5 rounded"
                      style={{ backgroundColor: cluster.color, color: 'white' }}
                    >
                      {cluster.clusterNumber}
                    </sup>
                  )}
                </span>
              );
            } else if (mention) {
              // Skip tokens that are part of a mention but not the first token
              return null;
            }

            // Regular token
            return (
              <span
                key={`token-${sentIdx}-${tokenIdx}`}
                className="cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded px-0.5 transition-colors"
                onClick={(e) => handleTokenClick(token, e)}
              >
                {token.form}{' '}
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
          <span className="text-lg text-slate-600 dark:text-slate-400">Loading Editor...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          <div className="text-center max-w-md p-8">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">Cannot Load Editor</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-left mb-6">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">To fix this:</p>
              <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-1 list-decimal list-inside">
                <li>Start the backend: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">genesis.bat run</code></li>
                <li>Ensure a document is uploaded to the workspace</li>
                <li>Wait for document tokenization to complete</li>
              </ol>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
              <Button onClick={() => router.push(`/workspace/${workspaceId}`)}>Back to Workspace</Button>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (!editorData) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">No workspace data</h1>
            <Button onClick={() => router.push('/home')}>Back to Home</Button>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
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
                <p className="text-sm text-slate-600 dark:text-slate-400">Coreference Annotation Editor</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {linkingFromMention && (
                <Badge variant="default" className="bg-blue-600 text-white animate-pulse">
                  Linking mode - Click another mention or press ESC
                </Badge>
              )}
              <Badge variant="secondary" className="text-sm">
                {editorData.totalTokens} tokens
              </Badge>
              <Badge variant="secondary" className="text-sm">
                {mentions.length} mentions
              </Badge>
              <Badge variant="secondary" className="text-sm">
                {clusters.length} clusters
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
          {/* Left Pane - Mentions & Clusters */}
          <aside className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Annotations</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {mentions.length} mentions · {clusters.length} clusters
              </p>
            </div>

            <div className="p-4 space-y-3">
              {/* Selected mention indicator */}
              {selectedMention && !selectedMention.clusterId && (
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-400">
                    <strong>"{selectedMention.text}"</strong> selected
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                    Click a cluster below to add this mention, or click another word to link them
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 text-xs"
                    onClick={cancelLinking}
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {/* Clusters */}
              {clusters.map((cluster) => {
                const clusterMentions = mentions.filter(m => m.clusterId === cluster.id);
                const canAssign = selectedMention && !selectedMention.clusterId;
                return (
                  <div
                    key={cluster.id}
                    className={`p-3 rounded-lg bg-slate-50 dark:bg-slate-800 ${canAssign ? 'cursor-pointer ring-2 ring-green-400 hover:ring-green-500 transition-all' : ''}`}
                    onClick={() => canAssign && handleAssignToCluster(cluster.id)}
                    title={canAssign ? `Click to add "${selectedMention.text}" to this cluster` : ''}
                  >
                    <div className="flex items-center gap-2 mb-2 group">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: cluster.color }}
                      />
                      <span className="font-semibold text-slate-900 dark:text-white">
                        Cluster {cluster.clusterNumber}
                      </span>
                      <Badge variant="secondary" className="text-xs ml-auto">
                        {clusterMentions.length} mentions
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteCluster(cluster.id)}
                        title="Delete cluster"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>
                    <div className="space-y-1 ml-6">
                      {clusterMentions.map((mention) => (
                        <div
                          key={mention.id}
                          className="text-sm text-slate-600 dark:text-slate-400 flex items-center justify-between group"
                        >
                          <span className="truncate">"{mention.text}"</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                            onClick={() => handleDeleteMention(mention.id)}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Unassigned Mentions */}
              {mentions.filter(m => !m.clusterId).length > 0 && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 rounded-full bg-gray-400" />
                    <span className="font-semibold text-slate-900 dark:text-white">Unassigned</span>
                    <Badge variant="secondary" className="text-xs ml-auto">
                      {mentions.filter(m => !m.clusterId).length}
                    </Badge>
                  </div>
                  <div className="space-y-1 ml-6">
                    {mentions.filter(m => !m.clusterId).map((mention) => (
                      <div
                        key={mention.id}
                        className="text-sm text-slate-600 dark:text-slate-400 flex items-center justify-between group"
                      >
                        <span className="truncate">"{mention.text}"</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                          onClick={() => handleDeleteMention(mention.id)}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mentions.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-500">No annotations yet</p>
                  <p className="text-xs text-slate-400 mt-2">
                    Click on words in the text to create mentions
                  </p>
                </div>
              )}
            </div>
          </aside>

          {/* Middle - Text Editor */}
          <main
            className="flex-1 overflow-y-auto"
            ref={containerRef}
            onScroll={handleScroll}
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
                <CardContent
                  className="p-8 relative"
                  ref={cardContentRef}
                  onMouseMove={handleMouseMove}
                  onClick={cancelLinking}
                >
                  <div className="text-lg leading-relaxed text-slate-900 dark:text-white relative z-10">
                    {renderTokenizedText()}
                  </div>

                  {/* SVG Overlay for linking arrows */}
                  <svg
                    className="absolute inset-0 pointer-events-none"
                    style={{ width: '100%', height: '100%', zIndex: 5 }}
                  >
                    {/* Draw arrow while linking */}
                    {linkingFromMention && mousePosition && (() => {
                      const fromPos = getMentionPosition(linkingFromMention.id);
                      if (fromPos) {
                        const midY = Math.max(fromPos.y, mousePosition.y) + 40;
                        return (
                          <path
                            d={`M ${fromPos.x} ${fromPos.y + 15} Q ${(fromPos.x + mousePosition.x) / 2} ${midY} ${mousePosition.x} ${mousePosition.y}`}
                            stroke="#3b82f6"
                            strokeWidth="2"
                            fill="none"
                            strokeDasharray="5,5"
                            opacity="0.7"
                          />
                        );
                      }
                      return null;
                    })()}

                    {/* Draw permanent arrows for clusters - only for current document */}
                    {clusters.map((cluster) => {
                      // Only show arrows for mentions in the current document
                      const clusterMentions = mentions
                        .filter(m => m.clusterId === cluster.id && m.documentId === documentContent?.documentId)
                        .sort((a, b) => a.startTokenIndex - b.startTokenIndex);

                      return clusterMentions.slice(0, -1).map((mention, idx) => {
                        const fromPos = getMentionPosition(mention.id);
                        const toPos = getMentionPosition(clusterMentions[idx + 1].id);

                        if (fromPos && toPos) {
                          const midY = Math.max(fromPos.y, toPos.y) + 35;
                          return (
                            <path
                              key={`${cluster.id}-${idx}`}
                              d={`M ${fromPos.x} ${fromPos.y + 15} Q ${(fromPos.x + toPos.x) / 2} ${midY} ${toPos.x} ${toPos.y + 15}`}
                              stroke={cluster.color}
                              strokeWidth="2"
                              fill="none"
                              opacity="0.6"
                            />
                          );
                        }
                        return null;
                      });
                    })}
                  </svg>
                </CardContent>
              </Card>
            </div>
          </main>

          {/* Right Pane - Instructions */}
          <aside className="w-72 border-l border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm p-4">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">How to Annotate</h3>
            <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-600">1</span>
                </div>
                <p><strong>Click a word</strong> to create a mention (entity reference)</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-600">2</span>
                </div>
                <p><strong>Click another word</strong> to automatically link them in a coreference chain</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-600">3</span>
                </div>
                <p><strong>Click existing mentions</strong> to link them together</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-gray-600">ESC</span>
                </div>
                <p>Press <strong>ESC</strong> to cancel linking mode</p>
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
                <span className="font-bold">{editorData.totalTokens}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Mentions</span>
                <span className="font-bold">{mentions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Clusters</span>
                <span className="font-bold">{clusters.length}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AuthGuard>
  );
}
