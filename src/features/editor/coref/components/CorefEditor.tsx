'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { useAuth } from '@/features/auth/auth.provider';
import type {
  WorkspaceEditorResponse,
  DocumentContentResponse,
  TokenDto,
} from '@/features/editor/core/editor.contracts';
import type { MentionDto, ClusterDto } from '@/features/editor/coref/coref.contracts';
import {
  getDocumentContentAction,
  getEditorDocumentsAction,
  getEditorSessionAction,
  saveEditorSessionAction,
} from '@/features/editor/core/editor.actions';
import {
  assignToClusterAction,
  createClusterAction,
  createMentionAction,
  deleteClusterAction,
  deleteMentionAction,
  getClustersAction,
  getMentionsByWorkspaceAction,
  mergeClustersAction,
} from '@/features/editor/coref/coref.actions';
import { updateDocumentStatusAction } from '@/features/document/document.actions';
import { useEditorSession } from '@/features/editor/core/hooks/useEditorSession';
import { DocumentSwitcher } from '@/features/editor/core/components/DocumentSwitcher';
import { EditorHelpPanel } from '@/features/editor/core/components/EditorHelpPanel';
import { FullScreenLoader } from '@/components/Spinner';
import { buildEditorData } from '@/features/editor/core/editor.utils';
import { CLUSTER_COLORS, EDITOR_PAGE_SIZE as PAGE_SIZE } from '@/lib/constants';
import { toast } from 'sonner';

interface CorefEditorProps {
  workspaceId: string;
  workspaceName: string;
}

export default function CorefEditor({ workspaceId, workspaceName }: CorefEditorProps) {
  const router = useRouter();
  const { user } = useAuth();

  // API Data State
  const [editorData, setEditorData] = useState<WorkspaceEditorResponse | null>(null);
  const [documentContent, setDocumentContent] = useState<DocumentContentResponse | null>(null);
  const [mentions, setMentions] = useState<MentionDto[]>([]);
  const [clusters, setClusters] = useState<ClusterDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [linkingFromMention, setLinkingFromMention] = useState<MentionDto | null>(null);
  const [selectedMention, setSelectedMention] = useState<MentionDto | null>(null); // For cluster assignment
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);

  // Cluster merge state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedClusterIds, setSelectedClusterIds] = useState<Set<string>>(new Set());
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);

  // Guards against firing duplicate mutations while one is in flight
  // (e.g. a fast double-click creating two mentions / racing a refetch).
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  // Cluster delete confirmation (deleting a cluster unassigns all its mentions)
  const [clusterToDelete, setClusterToDelete] = useState<ClusterDto | null>(null);
  const [deletingCluster, setDeletingCluster] = useState(false);

  // Mention currently under the cursor — target for the Delete shortcut.
  const [hoveredMentionId, setHoveredMentionId] = useState<string | null>(null);

  // Undo stack for keyboard undo (Cmd/Ctrl+Z). Only the cleanly-reversible
  // actions are recorded: a created mention (undo = delete it) and a link that
  // created a brand-new cluster (undo = delete that cluster, which unassigns
  // its members). Linking into an existing cluster has no clean inverse — the
  // backend exposes no "unassign" — so it is intentionally not undoable here.
  type UndoEntry =
    | { type: 'mention'; mentionId: string }
    | { type: 'cluster'; clusterId: string };
  const undoStackRef = useRef<UndoEntry[]>([]);

  const cardContentRef = useRef<HTMLDivElement>(null); // For arrow positioning
  // Sentinel as state so the IntersectionObserver effect re-runs when the
  // sentinel mounts/unmounts. A plain useRef wouldn't trigger the effect.
  const [sentinelEl, setSentinelEl] = useState<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false); // Guards re-entry into loadNextPage
  const [loadingMore, setLoadingMore] = useState(false);

  const { saveSession, containerRef, lastScrollRef, handleScroll } = useEditorSession({
    workspaceId,
    currentDocIndex,
    editorData,
    loading,
  });


  // Load workspace data on mount
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

      setEditorData(buildEditorData(workspaceId, workspaceName, 'COREF', documents, savedSession));

      if (documents.length > 0) {
        const docIndex = initialDocIndex;
        const doc = documents[docIndex];
        setCurrentDocIndex(docIndex);

        if (doc.isTokenized && doc.tokenCount > 0) {
          const contentResult = await getDocumentContentAction(workspaceId, doc.id, 0, PAGE_SIZE);
          if (contentResult.ok) {
            setDocumentContent(contentResult.data);

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

      const [mentionsResult, clustersResult] = await Promise.all([
        getMentionsByWorkspaceAction(workspaceId),
        getClustersAction(workspaceId),
      ]);
      if (mentionsResult.ok) setMentions(mentionsResult.data);
      if (clustersResult.ok) setClusters(clustersResult.data);

      setLoading(false);
    };

    if (workspaceId) {
      loadWorkspace();
    }
  }, [workspaceId, workspaceName, containerRef, lastScrollRef]);

  // Load document content when switching documents
  const loadDocumentContent = useCallback(async (docIndex: number) => {
    if (!editorData || docIndex < 0 || docIndex >= editorData.documents.length) return;

    const scrollPos = containerRef.current?.scrollTop || 0;
    // Session save is best-effort; ignore its result.
    await saveEditorSessionAction({
      workspaceId,
      lastDocumentIndex: docIndex,
      scrollPosition: scrollPos,
    });

    // Reset linking state when switching documents
    setLinkingFromMention(null);
    setMousePosition(null);
    setSelectedMention(null);

    const docId = editorData.documents[docIndex].id;
    const contentResult = await getDocumentContentAction(workspaceId, docId, 0, PAGE_SIZE);
    if (!contentResult.ok) {
      toast.error(contentResult.error || 'Failed to load document');
      return;
    }
    setDocumentContent(contentResult.data);
    setCurrentDocIndex(docIndex);
  }, [editorData, workspaceId, containerRef]);



  // Selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<TokenDto | null>(null);
  const [selectionCurrent, setSelectionCurrent] = useState<TokenDto | null>(null);

  // Handle token mouse down - start selection
  const handleTokenMouseDown = (token: TokenDto, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSelecting(true);
    setSelectionStart(token);
    setSelectionCurrent(token);
  };

  // Handle token mouse enter - update selection
  const handleTokenMouseEnter = (token: TokenDto) => {
    if (isSelecting && selectionStart) {
      // Only allow selection within the same sentence
      if (token.sentenceIndex === selectionStart.sentenceIndex) {
        setSelectionCurrent(token);
      }
    }
  };

  // Handle token mouse up - finalize selection
  const handleTokenMouseUp = async (token: TokenDto, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isSelecting || !selectionStart || !documentContent) {
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionCurrent(null);
      return;
    }

    // Ensure we ended in the same sentence (if not, use the current token if it matches, or cancel)
    let endToken = token;
    if (token.sentenceIndex !== selectionStart.sentenceIndex) {
      // If user dragged out of sentence, we could either cancel or just use the last valid selectionCurrent.
      // For simplicity, if they release on a different sentence, we abort or just use the start token.
      // Let's abort to avoid confusion.
      if (selectionCurrent && selectionCurrent.sentenceIndex === selectionStart.sentenceIndex) {
        endToken = selectionCurrent;
      } else {
        // Fallback to just the start token
        endToken = selectionStart;
      }
    }

    // Determine start and end indices
    const startIdx = Math.min(selectionStart.tokenIndex, endToken.tokenIndex);
    const endIdx = Math.max(selectionStart.tokenIndex, endToken.tokenIndex);

    const sentenceIndex = selectionStart.sentenceIndex;

    // Reset selection state immediately
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionCurrent(null);

    // Check overlaps
    const existingOverlaps = mentions.filter(
      m => m.documentId === documentContent.documentId &&
        m.sentenceIndex === sentenceIndex &&
        Math.max(startIdx, m.startTokenIndex) <= Math.min(endIdx, m.endTokenIndex)
    );

    if (existingOverlaps.length > 0) {
      // If we clicked on a single existing mention, handle linking (click-like behavior)
      if (startIdx === endIdx && existingOverlaps.length === 1) {
        handleMentionClick(existingOverlaps[0], e);
        return;
      }

      // Otherwise, overlapping selection - notify the user instead of failing silently
      toast.info('That selection overlaps an existing mention.');
      return;
    }

    // Guard against duplicate creates from a fast double-click / drag race
    if (busyRef.current) return;

    // Construct text from tokens (simple join, could be improved with actual text offset slicing if available)
    const tokens = documentContent.tokens.filter(
      t => t.sentenceIndex === sentenceIndex && t.tokenIndex >= startIdx && t.tokenIndex <= endIdx
    );
    const text = tokens.map(t => t.form).join(' ');

    busyRef.current = true;
    setBusy(true);
    try {
      const mentionResult = await createMentionAction(workspaceId, {
        documentId: documentContent.documentId,
        sentenceIndex: sentenceIndex,
        startTokenIndex: startIdx,
        endTokenIndex: endIdx,
        text: text,
      });
      if (!mentionResult.ok) {
        toast.error(mentionResult.error || 'Failed to create mention');
        return;
      }
      const newMention = mentionResult.data;
      setMentions(prev => [...prev, newMention]);
      undoStackRef.current.push({ type: 'mention', mentionId: newMention.id });

      // If we're in linking mode, link the new mention into the current chain
      // and STAY in linking mode — re-anchored to the JUST-LINKED mention so the
      // dotted line grows from the latest link, until the user presses Esc.
      if (linkingFromMention) {
        const clusterId = await linkMentions(linkingFromMention, newMention);
        if (clusterId) {
          setLinkingFromMention({ ...newMention, clusterId });
        }
        setSelectedMention(null);
      } else {
        // First mention of a chain: anchor linking here. User can click a
        // cluster to assign, or click more words to keep linking.
        setLinkingFromMention(newMention);
        setSelectedMention(newMention);
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  // Handle clicking on an existing mention
  const handleMentionClick = async (mention: MentionDto, e: React.MouseEvent) => {
    e.stopPropagation();

    if (linkingFromMention) {
      if (linkingFromMention.id !== mention.id) {
        // Add this mention to the chain and re-anchor to it, so the dotted line
        // grows from the latest link. Linking continues until the user hits Esc.
        const clusterId = await linkMentions(linkingFromMention, mention);
        if (clusterId) {
          setLinkingFromMention({ ...mention, clusterId });
        }
      }
    } else {
      // Start linking from this mention
      setLinkingFromMention(mention);
    }
  };

  // Link two mentions together. Returns the cluster id they ended up in (or
  // null on failure) so the caller can keep the linking session anchored to it.
  const linkMentions = async (
    mention1: MentionDto,
    mention2: MentionDto,
  ): Promise<string | null> => {
    let clusterId = mention1.clusterId || mention2.clusterId;

    if (!clusterId) {
      const clusterResult = await createClusterAction(workspaceId, {
        color: CLUSTER_COLORS[clusters.length % CLUSTER_COLORS.length],
      });
      if (!clusterResult.ok) {
        toast.error(clusterResult.error || 'Failed to create cluster');
        return null;
      }
      clusterId = clusterResult.data.id;
      setClusters(prev => [...prev, clusterResult.data]);
      // A link that creates a fresh cluster is cleanly undoable: deleting the
      // cluster unassigns both mentions back to their pre-link state.
      undoStackRef.current.push({ type: 'cluster', clusterId });
    }

    // Assign both mentions to cluster
    if (!mention1.clusterId) {
      const r = await assignToClusterAction(mention1.id, clusterId);
      if (!r.ok) {
        toast.error(r.error || 'Failed to link mention');
        return null;
      }
    }
    if (!mention2.clusterId) {
      const r = await assignToClusterAction(mention2.id, clusterId);
      if (!r.ok) {
        toast.error(r.error || 'Failed to link mention');
        return null;
      }
    }

    const [mentionsResult, clustersResult] = await Promise.all([
      getMentionsByWorkspaceAction(workspaceId),
      getClustersAction(workspaceId),
    ]);
    if (mentionsResult.ok) setMentions(mentionsResult.data);
    if (clustersResult.ok) setClusters(clustersResult.data);
    return clusterId;
  };

  // Delete mention
  const handleDeleteMention = async (mentionId: string) => {
    const result = await deleteMentionAction(mentionId);
    if (!result.ok) {
      toast.error(result.error || 'Failed to delete mention');
      return;
    }
    setMentions(prev => prev.filter(m => m.id !== mentionId));
  };

  // Delete cluster (unassigns all mentions in this cluster).
  // Destructive, so it runs behind a confirmation dialog (clusterToDelete).
  // Backend compacts cluster numbers after delete, so re-fetch BOTH clusters
  // (to pick up renumbered cluster_number values) AND mentions (mentions carry
  // cached clusterNumber too).
  const handleDeleteClusterConfirmed = async () => {
    if (!clusterToDelete) return;
    setDeletingCluster(true);
    const deleteResult = await deleteClusterAction(clusterToDelete.id);
    if (!deleteResult.ok) {
      toast.error(deleteResult.error || 'Failed to delete cluster');
      setDeletingCluster(false);
      return;
    }
    const [clustersResult, mentionsResult] = await Promise.all([
      getClustersAction(workspaceId),
      getMentionsByWorkspaceAction(workspaceId),
    ]);
    if (clustersResult.ok) setClusters(clustersResult.data);
    if (mentionsResult.ok) setMentions(mentionsResult.data);
    setDeletingCluster(false);
    setClusterToDelete(null);
  };

  // ==================== Cluster Merge Handlers ====================

  // Toggle a cluster's membership in the merge selection set
  const toggleClusterSelection = (clusterId: string) => {
    setSelectedClusterIds(prev => {
      const next = new Set(prev);
      if (next.has(clusterId)) {
        next.delete(clusterId);
      } else {
        next.add(clusterId);
      }
      return next;
    });
  };

  // Enter select mode (resets any prior selection)
  const enterSelectMode = () => {
    setSelectedClusterIds(new Set());
    setSelectMode(true);
    // Cancel any in-progress mention linking — modes don't mix
    setLinkingFromMention(null);
    setSelectedMention(null);
  };

  // Exit select mode (cancel)
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedClusterIds(new Set());
    setShowMergeConfirm(false);
    setMergeError(null);
  };

  // Compute target = lowest clusterNumber among selected; sources = the rest.
  const computeMergePlan = () => {
    const selected = clusters.filter(c => selectedClusterIds.has(c.id));
    if (selected.length < 2) return null;
    const sorted = [...selected].sort((a, b) => a.clusterNumber - b.clusterNumber);
    const target = sorted[0];
    const sources = sorted.slice(1);
    const mentionsToMove = sources.reduce((sum, c) => sum + (c.mentionCount || 0), 0);
    return { target, sources, mentionsToMove };
  };

  // Confirm + execute merge
  const handleMergeConfirm = async () => {
    const plan = computeMergePlan();
    if (!plan) return;

    setMerging(true);
    setMergeError(null);
    const mergeResult = await mergeClustersAction(
      workspaceId,
      plan.sources.map(s => s.id),
      plan.target.id,
    );
    if (!mergeResult.ok) {
      console.error('Failed to merge clusters:', mergeResult.error);
      setMergeError(mergeResult.error);
      setMerging(false);
      return;
    }

    // Backend compacts cluster numbers after merge — refetch BOTH clusters
    // and mentions so cluster_number values everywhere are consistent.
    const [clustersResult, mentionsResult] = await Promise.all([
      getClustersAction(workspaceId),
      getMentionsByWorkspaceAction(workspaceId),
    ]);
    if (clustersResult.ok) setClusters(clustersResult.data);
    if (mentionsResult.ok) setMentions(mentionsResult.data);

    // Reset merge UI
    setSelectedClusterIds(new Set());
    setSelectMode(false);
    setShowMergeConfirm(false);
    setMerging(false);
  };

  // Assign selected mention to an existing cluster
  const handleAssignToCluster = async (clusterId: string) => {
    if (!selectedMention) return;

    const assignResult = await assignToClusterAction(selectedMention.id, clusterId);
    if (!assignResult.ok) {
      toast.error(assignResult.error || 'Failed to assign to cluster');
      return;
    }
    const [mentionsResult, clustersResult] = await Promise.all([
      getMentionsByWorkspaceAction(workspaceId),
      getClustersAction(workspaceId),
    ]);
    if (mentionsResult.ok) setMentions(mentionsResult.data);
    if (clustersResult.ok) setClusters(clustersResult.data);
    // Assigning via the cluster panel completes the action — exit linking mode.
    cancelLinking();
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

  // Get position of mention element for arrow drawing (relative to the card,
  // so it is scroll-independent: the SVG overlay scrolls with the content).
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


  // Undo the most recent reversible action (Cmd/Ctrl+Z)
  const performUndo = useCallback(async () => {
    const entry = undoStackRef.current.pop();
    if (!entry) {
      toast.info('Nothing to undo');
      return;
    }
    if (entry.type === 'mention') {
      const r = await deleteMentionAction(entry.mentionId);
      if (!r.ok) {
        toast.error(r.error || 'Undo failed');
        return;
      }
      setMentions(prev => prev.filter(m => m.id !== entry.mentionId));
      toast.success('Removed mention');
    } else {
      const r = await deleteClusterAction(entry.clusterId);
      if (!r.ok) {
        toast.error(r.error || 'Undo failed');
        return;
      }
      const [clustersResult, mentionsResult] = await Promise.all([
        getClustersAction(workspaceId),
        getMentionsByWorkspaceAction(workspaceId),
      ]);
      if (clustersResult.ok) setClusters(clustersResult.data);
      if (mentionsResult.ok) setMentions(mentionsResult.data);
      toast.success('Undid link');
    }
  }, [workspaceId]);

  // Delete the mention under the cursor (Delete / Backspace)
  const deleteFocusedMention = useCallback(async () => {
    const targetId = hoveredMentionId ?? selectedMention?.id;
    if (!targetId) return;
    const result = await deleteMentionAction(targetId);
    if (!result.ok) {
      toast.error(result.error || 'Failed to delete mention');
      return;
    }
    setMentions(prev => prev.filter(m => m.id !== targetId));
    if (selectedMention?.id === targetId) setSelectedMention(null);
    if (linkingFromMention?.id === targetId) setLinkingFromMention(null);
    setHoveredMentionId(null);
  }, [hoveredMentionId, selectedMention, linkingFromMention]);

  // Toggle the current document's complete status, auto-advancing to the next
  // document when marking complete (Cmd/Ctrl+Enter, or the header button).
  const toggleComplete = useCallback(async () => {
    if (!editorData) return;
    const doc = editorData.documents[currentDocIndex];
    if (!doc) return;
    const newStatus = doc.status === 'COMPLETE' ? 'ANNOTATING' : 'COMPLETE';
    const result = await updateDocumentStatusAction(doc.id, newStatus);
    if (!result.ok) {
      toast.error(result.error || 'Failed to update document status');
      return;
    }
    const newDocs = [...editorData.documents];
    newDocs[currentDocIndex] = { ...doc, status: newStatus };
    setEditorData({ ...editorData, documents: newDocs });

    if (newStatus === 'COMPLETE') {
      if (currentDocIndex < editorData.documents.length - 1) {
        loadDocumentContent(currentDocIndex + 1);
      } else {
        toast.success('All documents complete 🎉');
      }
    }
  }, [editorData, currentDocIndex, loadDocumentContent]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Let modal dialogs own the keyboard while they're open
      if (clusterToDelete || showMergeConfirm) return;

      // Ignore shortcuts while typing in a field
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return;
      }

      if (e.key === 'Escape') {
        cancelLinking();
        return;
      }

      // Undo — Cmd/Ctrl+Z (ignore redo: Shift+Cmd/Ctrl+Z)
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        performUndo();
        return;
      }

      // Mark complete & advance — Cmd/Ctrl+Enter
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        toggleComplete();
        return;
      }

      // The remaining shortcuts are bare keys — skip if a modifier is held
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (hoveredMentionId || selectedMention) {
          e.preventDefault();
          deleteFocusedMention();
        }
        return;
      }

      if (e.key === '[') {
        e.preventDefault();
        loadDocumentContent(currentDocIndex - 1);
        return;
      }
      if (e.key === ']') {
        e.preventDefault();
        loadDocumentContent(currentDocIndex + 1);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cancelLinking,
    performUndo,
    toggleComplete,
    deleteFocusedMention,
    loadDocumentContent,
    currentDocIndex,
    hoveredMentionId,
    selectedMention,
    clusterToDelete,
    showMergeConfirm,
  ]);

  // Cross-highlight: clicking a mention in the left pane reveals it in the text.
  // If the mention lives in another document, switch to that document first.
  const revealMentionInText = (mention: MentionDto) => {
    if (documentContent && mention.documentId !== documentContent.documentId) {
      const idx = editorData?.documents.findIndex(d => d.id === mention.documentId) ?? -1;
      if (idx >= 0) loadDocumentContent(idx);
      return;
    }
    setHoveredMentionId(mention.id);
    document
      .querySelector(`[data-mention-id="${mention.id}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Append next page of sentences/tokens to current document content
  const loadNextPage = useCallback(async () => {
    if (loadingMoreRef.current) return;
    if (!documentContent) return;
    const cur = documentContent.currentPage ?? 0;
    const total = documentContent.totalPages ?? 1;
    if (cur + 1 >= total) return; // No more pages

    loadingMoreRef.current = true;
    setLoadingMore(true);
    const nextResult = await getDocumentContentAction(
      workspaceId,
      documentContent.documentId,
      cur + 1,
      documentContent.pageSize ?? PAGE_SIZE,
    );
    if (nextResult.ok) {
      const nextData = nextResult.data;
      setDocumentContent(prev => {
        if (!prev) return nextData;
        if (prev.documentId !== nextData.documentId) return prev; // Doc switched mid-flight
        return {
          ...prev,
          sentences: [...prev.sentences, ...nextData.sentences],
          tokens: [...prev.tokens, ...nextData.tokens],
          currentPage: nextData.currentPage,
          totalPages: nextData.totalPages,
          pageSize: nextData.pageSize,
        };
      });
    } else {
      console.warn('Failed to load next page:', nextResult.error);
    }
    loadingMoreRef.current = false;
    setLoadingMore(false);
  }, [documentContent, workspaceId]);

  // IntersectionObserver: load next page when sentinel enters viewport.
  // Depends on sentinelEl (state, not ref) so the effect runs reactively
  // when the sentinel actually mounts — a ref-only dep would capture null
  // on first run because refs don't trigger effect re-runs.
  useEffect(() => {
    if (!sentinelEl || !documentContent) return;
    const cur = documentContent.currentPage ?? 0;
    const total = documentContent.totalPages ?? 1;
    if (cur + 1 >= total) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          loadNextPage();
        }
      },
      { root: containerRef.current, rootMargin: '200px', threshold: 0 },
    );
    observer.observe(sentinelEl);
    return () => observer.disconnect();
  }, [sentinelEl, documentContent, loadNextPage, containerRef]);

  // ---- Memoized render lookups -------------------------------------------
  // The token render loop used to do a mentions.find + clusters.find for every
  // token and a tokens.filter for every sentence (O(tokens²) overall). Precompute
  // O(1) lookups so rendering a large document scales linearly.
  const clusterById = useMemo(() => {
    const map = new Map<string, ClusterDto>();
    for (const c of clusters) map.set(c.id, c);
    return map;
  }, [clusters]);

  // Key "sentenceIndex:tokenIndex" -> the mention covering that token, for the
  // current document only. Overlapping mentions are prevented at creation, so
  // each token maps to at most one mention.
  const tokenMentionMap = useMemo(() => {
    const map = new Map<string, MentionDto>();
    const docId = documentContent?.documentId;
    if (!docId) return map;
    for (const m of mentions) {
      if (m.documentId !== docId) continue;
      for (let ti = m.startTokenIndex; ti <= m.endTokenIndex; ti++) {
        map.set(`${m.sentenceIndex}:${ti}`, m);
      }
    }
    return map;
  }, [mentions, documentContent?.documentId]);

  const tokensBySentence = useMemo(() => {
    const map = new Map<number, TokenDto[]>();
    for (const t of documentContent?.tokens ?? []) {
      const arr = map.get(t.sentenceIndex);
      if (arr) arr.push(t);
      else map.set(t.sentenceIndex, [t]);
    }
    return map;
  }, [documentContent?.tokens]);

  // Render tokens with annotations
  const renderTokenizedText = () => {
    if (!documentContent?.tokens?.length) {
      return <p className="text-slate-500">No tokens available. Document may not be tokenized yet.</p>;
    }

    // Group tokens by sentence
    const sentences = documentContent.sentences || [];
    const processedMentions = new Set<string>(); // Track which mentions we've rendered

    const cur = documentContent.currentPage ?? 0;
    const total = documentContent.totalPages ?? 1;
    const hasMore = cur + 1 < total;

    const sentenceNodes = sentences.map((sentence, sentIdx) => {
      // Get tokens for this sentence (precomputed group, not a per-sentence filter)
      const sentenceTokens = tokensBySentence.get(sentIdx) ?? [];

      return (
        <div key={`sentence-${sentIdx}`} className="mb-2">
          {sentenceTokens.map((token, tokenIdx) => {
            // O(1) lookup: is this token part of a mention?
            const mention = tokenMentionMap.get(`${token.sentenceIndex}:${token.tokenIndex}`);

            const cluster = mention?.clusterId ? clusterById.get(mention.clusterId) ?? null : null;
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

              const isHovered = hoveredMentionId === mention.id;

              return (
                <span
                  key={`mention-${sentIdx}-${mention.id}`}
                  data-mention-id={mention.id}
                  className={`relative px-1 py-0.5 rounded cursor-pointer transition-all inline ${isLinking
                    ? 'ring-2 ring-blue-500 ring-offset-1 shadow-lg'
                    : isLinkTarget
                      ? 'ring-2 ring-green-400 ring-offset-1 hover:ring-green-500'
                      : isHovered
                        ? 'ring-2 ring-amber-400 ring-offset-1 shadow-md'
                        : 'hover:shadow-md'
                    }`}
                  style={{
                    backgroundColor: cluster ? `${cluster.color}30` : '#3b82f620',
                    borderBottom: `3px solid ${cluster?.color || '#3b82f6'}`,
                  }}

                  role="button"
                  tabIndex={0}
                  aria-label={`Mention "${mentionText}"${cluster ? `, cluster ${cluster.clusterNumber}` : ', unassigned'}. Activate to link, Delete to remove.`}
                  onClick={(e) => handleMentionClick(mention, e)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleMentionClick(mention, e as unknown as React.MouseEvent);
                    }
                  }}
                  onFocus={() => setHoveredMentionId(mention.id)}
                  onBlur={() => setHoveredMentionId(prev => (prev === mention.id ? null : prev))}
                  onMouseEnter={() => setHoveredMentionId(mention.id)}
                  onMouseLeave={() => setHoveredMentionId(prev => (prev === mention.id ? null : prev))}
                  title={isLinking ? 'Select another mention to link' : 'Click to link · Del to delete'}
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
            const isSelected = isSelecting && selectionStart && selectionCurrent &&
              token.sentenceIndex === selectionStart.sentenceIndex &&
              token.tokenIndex >= Math.min(selectionStart.tokenIndex, selectionCurrent.tokenIndex) &&
              token.tokenIndex <= Math.max(selectionStart.tokenIndex, selectionCurrent.tokenIndex);

            return (
              <span
                key={`token-${sentIdx}-${tokenIdx}`}
                className={`cursor-pointer rounded px-0.5 transition-all ${isSelected
                  ? 'bg-blue-300 dark:bg-blue-700'
                  : 'hover:bg-blue-100 dark:hover:bg-blue-900/30'
                  } ${linkingFromMention ? 'opacity-40' : ''}`}
                onMouseDown={(e) => handleTokenMouseDown(token, e)}
                onMouseEnter={() => handleTokenMouseEnter(token)}
                onMouseUp={(e) => handleTokenMouseUp(token, e)}
              >
                {token.form}{' '}
              </span>
            );
          })}
        </div>
      );
    });

    return (
      <>
        {sentenceNodes}
        {hasMore && (
          <div ref={setSentinelEl} className="h-12 flex items-center justify-center text-xs text-slate-400">
            {loadingMore ? 'Loading more...' : 'Scroll to load more'}
          </div>
        )}
        {!hasMore && total > 1 && (
          <div className="h-8 flex items-center justify-center text-xs text-slate-400">
            End of document
          </div>
        )}
      </>
    );
  };

  // Loading state
  if (loading) {
    return <FullScreenLoader label="Loading Editor..." />;
  }

  // Error state
  if (error) {
    return (
      <>
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
      </>
    );
  }

  if (!editorData) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">No workspace data</h1>
            <Button onClick={() => router.push('/home')}>Back to Home</Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="h-screen overflow-hidden flex flex-col bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
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

            <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-end">
              {linkingFromMention && (
                <Badge variant="default" className="bg-blue-600 text-white animate-pulse">
                  Linking mode - Click another mention or press ESC
                </Badge>
              )}
              {/* Stat badges duplicate the left-pane summary; show only on wide screens */}
              <div className="hidden xl:flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {editorData.totalTokens} tokens
                </Badge>
                <Badge variant="secondary" className="text-sm">
                  {mentions.length} mentions
                </Badge>
                <Badge variant="secondary" className="text-sm">
                  {clusters.length} clusters
                </Badge>
              </div>
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
                title="Mark complete & advance (⌘/Ctrl+Enter)"
                onClick={toggleComplete}
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
                <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white font-bold">
                  {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        <div className="flex flex-1 min-h-0">
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
                    <strong>&quot;{selectedMention.text}&quot;</strong> selected
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

              {/* Cluster merge controls — only show when there are >= 2 clusters */}
              {clusters.length >= 2 && (
                <div className="flex items-center gap-2">
                  {!selectMode ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={enterSelectMode}
                      title="Select two or more clusters to merge"
                    >
                      <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Select clusters to merge
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={exitSelectMode}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="ml-auto text-xs bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white"
                        disabled={selectedClusterIds.size < 2}
                        onClick={() => setShowMergeConfirm(true)}
                      >
                        Merge {selectedClusterIds.size} cluster{selectedClusterIds.size === 1 ? '' : 's'}
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Clusters */}
              {clusters.map((cluster) => {
                const clusterMentions = mentions.filter(m => m.clusterId === cluster.id);
                const canAssign = !selectMode && selectedMention && !selectedMention.clusterId;
                const isSelectedForMerge = selectMode && selectedClusterIds.has(cluster.id);
                return (
                  <div
                    key={cluster.id}
                    className={`p-3 rounded-lg bg-slate-50 dark:bg-slate-800 transition-all ${
                      selectMode
                        ? `cursor-pointer ${
                            isSelectedForMerge
                              ? 'ring-2 ring-[var(--primary)] shadow-md'
                              : 'hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-600'
                          }`
                        : canAssign
                          ? 'cursor-pointer ring-2 ring-green-400 hover:ring-green-500'
                          : ''
                    }`}
                    onClick={() => {
                      if (selectMode) {
                        toggleClusterSelection(cluster.id);
                      } else if (canAssign) {
                        handleAssignToCluster(cluster.id);
                      }
                    }}
                    title={
                      selectMode
                        ? isSelectedForMerge
                          ? 'Click to deselect'
                          : 'Click to select for merge'
                        : canAssign
                          ? `Click to add "${selectedMention?.text ?? ''}" to this cluster`
                          : ''
                    }
                  >
                    <div className="flex items-center gap-2 mb-2 group">
                      {selectMode && (
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelectedForMerge
                              ? 'bg-[var(--primary)] border-[var(--primary)]'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                          }`}
                        >
                          {isSelectedForMerge && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      )}
                      {/* Numbered color chip — a colorblind-safe cue pairing the
                          cluster color with its number (matches the in-text sup). */}
                      <span
                        className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded text-[11px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: cluster.color }}
                      >
                        {cluster.clusterNumber}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        Cluster {cluster.clusterNumber}
                      </span>
                      <Badge variant="secondary" className="text-xs ml-auto">
                        {clusterMentions.length} mentions
                      </Badge>
                      {!selectMode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            setClusterToDelete(cluster);
                          }}
                          title="Delete cluster"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      )}
                    </div>
                    <div className="space-y-1 ml-6">
                      {clusterMentions.map((mention) => (
                        <div
                          key={mention.id}
                          className={`text-sm text-slate-600 dark:text-slate-400 flex items-center justify-between group rounded px-1 -mx-1 cursor-pointer ${
                            hoveredMentionId === mention.id ? 'bg-amber-100 dark:bg-amber-900/30' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            revealMentionInText(mention);
                          }}
                          onMouseEnter={() => setHoveredMentionId(mention.id)}
                          onMouseLeave={() => setHoveredMentionId(prev => (prev === mention.id ? null : prev))}
                          title="Click to find in text"
                        >
                          <span className="truncate">&quot;{mention.text}&quot;</span>
                          {!selectMode && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMention(mention.id);
                              }}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </Button>
                          )}
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
                        className={`text-sm text-slate-600 dark:text-slate-400 flex items-center justify-between group rounded px-1 -mx-1 cursor-pointer ${
                          hoveredMentionId === mention.id ? 'bg-amber-100 dark:bg-amber-900/30' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'
                        }`}
                        onClick={() => revealMentionInText(mention)}
                        onMouseEnter={() => setHoveredMentionId(mention.id)}
                        onMouseLeave={() => setHoveredMentionId(prev => (prev === mention.id ? null : prev))}
                        title="Click to find in text"
                      >
                        <span className="truncate">&quot;{mention.text}&quot;</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMention(mention.id);
                          }}
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
              {/* Document switcher: scrollable strip + prev/next + progress */}
              <DocumentSwitcher
                documents={editorData.documents}
                currentDocIndex={currentDocIndex}
                onSelect={loadDocumentContent}
              />

              <Card className="shadow-lg min-h-[600px]">
                <CardContent
                  className={`p-8 relative ${busy ? 'cursor-wait' : ''}`}
                  ref={cardContentRef}
                  onMouseMove={handleMouseMove}
                >
                  <div className="text-lg leading-relaxed text-slate-900 dark:text-white relative z-10 select-none">
                    {renderTokenizedText()}
                  </div>

                  {/* SVG Overlay for linking arrows */}
                  <svg
                    className="absolute inset-0 pointer-events-none"
                    style={{ width: '100%', height: '100%', zIndex: 5 }}
                  >
                    {/* Draw arrow while linking — tinted with the source mention's
                        cluster color when it already belongs to one. */}
                    {linkingFromMention && mousePosition && (() => {
                      const fromPos = getMentionPosition(linkingFromMention.id);
                      if (fromPos) {
                        const sourceCluster = linkingFromMention.clusterId
                          ? clusters.find(c => c.id === linkingFromMention.clusterId)
                          : null;
                        const midY = Math.max(fromPos.y, mousePosition.y) + 40;
                        return (
                          <path
                            d={`M ${fromPos.x} ${fromPos.y + 15} Q ${(fromPos.x + mousePosition.x) / 2} ${midY} ${mousePosition.x} ${mousePosition.y}`}
                            stroke={sourceCluster?.color || '#3b82f6'}
                            strokeWidth="2"
                            fill="none"
                            strokeDasharray="5,5"
                            opacity="0.7"
                          />
                        );
                      }
                      return null;
                    })()}
                  </svg>

                  {/* Cursor-following hint while linking, so the mode is unmissable */}
                  {linkingFromMention && mousePosition && (
                    <div
                      className="absolute z-20 pointer-events-none -translate-y-full -translate-x-1/2 whitespace-nowrap rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-lg"
                      style={{ left: mousePosition.x, top: mousePosition.y - 12 }}
                    >
                      Click a mention to link · ESC to cancel
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>

          {/* Right Pane - Instructions */}
          <aside className="w-72 border-l border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <EditorHelpPanel
              accent="blue"
              steps={[
                { badge: '1', body: <><strong>Click a word</strong> to create a mention (entity reference)</> },
                { badge: '2', body: <><strong>Click another word</strong> to automatically link them in a coreference chain</> },
                { badge: '3', body: <><strong>Click existing mentions</strong> to link them together</> },
                { badge: 'ESC', body: <>Press <strong>ESC</strong> to cancel linking mode</> },
              ]}
              shortcuts={[
                { keys: ['Del'], label: 'Delete mention under cursor' },
                { keys: ['⌘/Ctrl', 'Z'], label: 'Undo last mention / link' },
                { keys: ['[', ']'], label: 'Previous / next document' },
                { keys: ['⌘/Ctrl', '↵'], label: 'Mark complete & advance' },
                { keys: ['Esc'], label: 'Cancel linking' },
              ]}
            />
          </aside>
        </div>
      </div>

      {/* Merge confirmation dialog */}
      <Dialog
        open={showMergeConfirm}
        onOpenChange={(open) => {
          if (!open && !merging) {
            setShowMergeConfirm(false);
            setMergeError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Merge clusters?</DialogTitle>
            <DialogDescription>
              {(() => {
                const plan = computeMergePlan();
                if (!plan) return 'Select at least two clusters to merge.';
                const sourceList = plan.sources
                  .map(s => `Cluster ${s.clusterNumber}`)
                  .join(', ');
                return (
                  <>
                    Merge {sourceList} into{' '}
                    <strong>Cluster {plan.target.clusterNumber}</strong>?{' '}
                    {plan.mentionsToMove} mention
                    {plan.mentionsToMove === 1 ? '' : 's'} will be reassigned.
                    Cluster numbers will be renumbered to stay sequential.
                  </>
                );
              })()}
            </DialogDescription>
          </DialogHeader>

          {mergeError && (
            <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
              {mergeError}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowMergeConfirm(false);
                setMergeError(null);
              }}
              disabled={merging}
            >
              Cancel
            </Button>
            <Button
              className="bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white"
              onClick={handleMergeConfirm}
              disabled={merging || !computeMergePlan()}
            >
              {merging ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Merging...
                </>
              ) : (
                'Confirm merge'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete cluster confirmation dialog */}
      <Dialog
        open={clusterToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deletingCluster) setClusterToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete cluster?</DialogTitle>
            <DialogDescription>
              {clusterToDelete && (() => {
                const count = mentions.filter(m => m.clusterId === clusterToDelete.id).length;
                return (
                  <>
                    Delete <strong>Cluster {clusterToDelete.clusterNumber}</strong>?{' '}
                    {count} mention{count === 1 ? '' : 's'} will be unassigned (the
                    mentions themselves are kept). Cluster numbers will be renumbered to
                    stay sequential.
                  </>
                );
              })()}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setClusterToDelete(null)}
              disabled={deletingCluster}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeleteClusterConfirmed}
              disabled={deletingCluster}
            >
              {deletingCluster ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                'Delete cluster'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
