'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuthGuard } from '@/components/auth-guard';

// Types
type Annotation = {
  id: string;
  start: number;
  end: number;
  text: string;
  labelId: number;
  labelName: string;
  color: string;
  layerId: number;
  layerName: string;
  documentId?: number;
};

type RenderElement = React.ReactElement;

type CoreferenceCluster = {
  id: string;
  mentions: Annotation[];
  color: string;
};

type Label = {
  id: number;
  name: string;
  color: string;
  shortcut: string;
};

type AnnotationLayer = {
  id: number;
  name: string;
  type: 'span' | 'coreference' | 'relation';
  description: string;
  labels: Label[];
};

type Document = {
  id: number;
  name: string;
  content: string;
  status: 'completed' | 'in-progress' | 'unannotated';
};

// Mock data
const mockWorkspaceData = {
  1: {
    name: 'Customer Sentiment Analysis',
    annotationLayers: [
      {
        id: 1,
        name: 'Coreference',
        type: 'coreference' as const,
        description: 'Link mentions that refer to the same entity',
        labels: [
          { id: 1, name: 'Entity', color: '#3b82f6', shortcut: 'E' },
        ],
      },
      {
        id: 2,
        name: 'Span',
        type: 'span' as const,
        description: 'Mark text spans with labels',
        labels: [
          { id: 6, name: 'Person', color: '#ec4899', shortcut: 'P' },
          { id: 7, name: 'Organization', color: '#14b8a6', shortcut: 'O' },
          { id: 8, name: 'Location', color: '#f97316', shortcut: 'L' },
          { id: 9, name: 'Date', color: '#06b6d4', shortcut: 'D' },
        ],
      },
      {
        id: 3,
        name: 'Sentiment',
        type: 'span' as const,
        description: 'Mark sentiment expressions',
        labels: [
          { id: 10, name: 'Positive', color: '#10b981', shortcut: '+' },
          { id: 11, name: 'Negative', color: '#ef4444', shortcut: '-' },
          { id: 12, name: 'Neutral', color: '#6b7280', shortcut: '0' },
        ],
      },
    ],
    documents: [
      {
        id: 1,
        name: 'customer_review_001.txt',
        content: 'I absolutely love this new smartphone! The camera quality is outstanding and the battery life exceeds my expectations. However, the price is a bit steep for what it offers. Overall, I am very satisfied with my purchase from TechCorp.',
        status: 'in-progress' as const,
      },
      {
        id: 2,
        name: 'customer_review_002.txt',
        content: 'The product arrived damaged and customer service was unhelpful. Very disappointed with this experience. Would not recommend buying from this company.',
        status: 'unannotated' as const,
      },
      {
        id: 3,
        name: 'customer_review_003.txt',
        content: 'The interface is intuitive and easy to navigate. Performance is solid, though not exceptional. Good value for money overall.',
        status: 'unannotated' as const,
      },
    ],
  },
};

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const workspace = mockWorkspaceData[1];

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [coreferenceeClusters, setCoreferenceeClusters] = useState<CoreferenceCluster[]>([]);
  const [selectedText, setSelectedText] = useState<{ start: number; end: number; text: string } | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<number>(workspace?.annotationLayers?.[0]?.id || 1);
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);
  const [linkingFromAnnotation, setLinkingFromAnnotation] = useState<Annotation | null>(null);
  const [selectedAnnotationForLink, setSelectedAnnotationForLink] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [lastCreatedAnnotation, setLastCreatedAnnotation] = useState<Annotation | null>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLayer = workspace?.annotationLayers?.find(layer => layer.id === selectedLayer);
  const allDocuments = workspace?.documents || [];

  // Combine all document texts
  const fullText = allDocuments.map(doc => doc.content).join('\n\n');

  // Get all annotations across all layers
  const allAnnotations = [
    ...annotations,
    ...coreferenceeClusters.flatMap(c => c.mentions),
  ];

  // Handle text selection (only for non-coreference layers)
  const handleTextSelection = useCallback(() => {
    if (currentLayer?.type === 'coreference') {
      // Don't handle text selection for coreference layer
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !textRef.current) {
      setSelectedText(null);
      return;
    }

    const range = selection.getRangeAt(0);

    // Calculate character offsets
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(textRef.current);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;
    const end = start + range.toString().length;

    setSelectedText({
      start,
      end,
      text: range.toString(),
    });
  }, [currentLayer]);

  // Get cluster for an annotation
  const getClusterForAnnotation = useCallback((annotationId: string) => {
    return coreferenceeClusters.find(c => c.mentions.some(m => m.id === annotationId));
  }, [coreferenceeClusters]);

  // Handle annotation creation
  const createAnnotation = useCallback((label: Label) => {
    if (!selectedText || !currentLayer) return;

    const newAnnotation: Annotation = {
      id: Math.random().toString(36).substring(2, 11),
      start: selectedText.start,
      end: selectedText.end,
      text: selectedText.text,
      labelId: label.id,
      labelName: label.name,
      color: label.color,
      layerId: currentLayer.id,
      layerName: currentLayer.name,
    };

    if (currentLayer.type === 'coreference') {
      // For coreference, create as standalone mention first
      setAnnotations(prev => [...prev, newAnnotation]);
    } else {
      setAnnotations(prev => [...prev, newAnnotation]);
    }

    setSelectedText(null);
    window.getSelection()?.removeAllRanges();
  }, [selectedText, currentLayer]);

  // Handle word click for auto-creating entity (coreference layer only)
  const handleWordClick = useCallback((e: React.MouseEvent) => {
    if (currentLayer?.type !== 'coreference' || !textRef.current) return;

    // Check if we clicked on an existing annotation
    const target = e.target as HTMLElement;
    if (target.hasAttribute('data-annotation-id')) {
      return; // Let handleAnnotationClick handle this
    }

    // Get the text node at click position
    let clickedNode: Node | null = null;
    let offset = 0;

    if (document.caretRangeFromPoint) {
      const range = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (range) {
        clickedNode = range.startContainer;
        offset = range.startOffset;
      }
    }

    if (!clickedNode || clickedNode.nodeType !== Node.TEXT_NODE) return;

    const textContent = clickedNode.textContent || '';

    // Find word boundaries
    let wordStart = offset;
    let wordEnd = offset;

    // Move backward to find start of word
    while (wordStart > 0 && /\S/.test(textContent[wordStart - 1])) {
      wordStart--;
    }

    // Move forward to find end of word
    while (wordEnd < textContent.length && /\S/.test(textContent[wordEnd])) {
      wordEnd++;
    }

    const word = textContent.substring(wordStart, wordEnd).trim();
    if (!word) return;

    // Calculate global offset in the entire text
    const range = document.createRange();
    range.setStart(textRef.current, 0);
    range.setEnd(clickedNode, wordStart);
    const globalStart = range.toString().length;
    const globalEnd = globalStart + word.length;

    // Get default label for coreference layer
    const label = currentLayer.labels[0];
    if (!label) return;

    // Create new entity annotation
    const newAnnotation: Annotation = {
      id: Math.random().toString(36).substring(2, 11),
      start: globalStart,
      end: globalEnd,
      text: word,
      labelId: label.id,
      labelName: label.name,
      color: label.color,
      layerId: currentLayer.id,
      layerName: currentLayer.name,
    };

    // Check if we should auto-link with the last created annotation
    const lastAnnotation = annotations.filter(a => a.layerId === currentLayer.id).slice(-1)[0];

    if (lastAnnotation && !getClusterForAnnotation(lastAnnotation.id)) {
      // Auto-create chain with the last annotation
      const newCluster: CoreferenceCluster = {
        id: Math.random().toString(36).substring(2, 11),
        mentions: [lastAnnotation, newAnnotation],
        color: label.color,
      };
      setCoreferenceeClusters(prev => [...prev, newCluster]);
      // Remove both from standalone annotations
      setAnnotations(prev => prev.filter(a => a.id !== lastAnnotation.id));
      setLastCreatedAnnotation(null); // Clear after creating chain
    } else {
      // Just add as standalone annotation
      setAnnotations(prev => [...prev, newAnnotation]);
      setLastCreatedAnnotation(newAnnotation); // Track for preview arrow
    }
  }, [currentLayer, annotations, getClusterForAnnotation]);

  // Handle linking annotations in INCEpTION style
  const handleAnnotationClick = useCallback((annotation: Annotation, e: React.MouseEvent) => {
    e.stopPropagation();

    if (currentLayer?.type !== 'coreference') return;

    // If we're already linking, complete the link
    if (linkingFromAnnotation && linkingFromAnnotation.id !== annotation.id) {
      // Find existing cluster for source annotation
      const sourceCluster = coreferenceeClusters.find(c =>
        c.mentions.some(m => m.id === linkingFromAnnotation.id)
      );

      // Find existing cluster for target annotation
      const targetCluster = coreferenceeClusters.find(c =>
        c.mentions.some(m => m.id === annotation.id)
      );

      if (sourceCluster && targetCluster && sourceCluster.id !== targetCluster.id) {
        // Merge clusters
        setCoreferenceeClusters(prev => {
          const merged = {
            ...sourceCluster,
            mentions: [...sourceCluster.mentions, ...targetCluster.mentions],
          };
          return prev
            .filter(c => c.id !== sourceCluster.id && c.id !== targetCluster.id)
            .concat(merged);
        });
      } else if (sourceCluster) {
        // Add target to source cluster
        setCoreferenceeClusters(prev => prev.map(c => {
          if (c.id === sourceCluster.id) {
            return { ...c, mentions: [...c.mentions, annotation] };
          }
          return c;
        }));
        // Remove from standalone annotations
        setAnnotations(prev => prev.filter(a => a.id !== annotation.id));
      } else if (targetCluster) {
        // Add source to target cluster
        setCoreferenceeClusters(prev => prev.map(c => {
          if (c.id === targetCluster.id) {
            return { ...c, mentions: [...c.mentions, linkingFromAnnotation] };
          }
          return c;
        }));
        // Remove from standalone annotations
        setAnnotations(prev => prev.filter(a => a.id !== linkingFromAnnotation.id));
      } else {
        // Create new cluster with both
        const newCluster: CoreferenceCluster = {
          id: Math.random().toString(36).substring(2, 11),
          mentions: [linkingFromAnnotation, annotation],
          color: linkingFromAnnotation.color,
        };
        setCoreferenceeClusters(prev => [...prev, newCluster]);
        // Remove both from standalone annotations
        setAnnotations(prev => prev.filter(a =>
          a.id !== linkingFromAnnotation.id && a.id !== annotation.id
        ));
      }

      setLinkingFromAnnotation(null);
      setSelectedAnnotationForLink(null);
    } else {
      // Start linking from this annotation
      setLinkingFromAnnotation(annotation);
      setSelectedAnnotationForLink(annotation.id);
    }
  }, [currentLayer, linkingFromAnnotation, coreferenceeClusters]);

  // Cancel linking
  const cancelLinking = useCallback(() => {
    setLinkingFromAnnotation(null);
    setSelectedAnnotationForLink(null);
    setMousePosition(null);
  }, []);

  // Track mouse movement for arrow drawing
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if ((linkingFromAnnotation || lastCreatedAnnotation) && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    } else if (!linkingFromAnnotation && !lastCreatedAnnotation) {
      setMousePosition(null);
    }
  }, [linkingFromAnnotation, lastCreatedAnnotation]);

  // Get position of annotation element
  const getAnnotationPosition = (annotationId: string) => {
    const element = document.querySelector(`[data-annotation-id="${annotationId}"]`) as HTMLElement;
    if (!element || !containerRef.current) return null;

    const containerRect = containerRef.current.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    return {
      x: elementRect.left - containerRect.left + elementRect.width / 2,
      y: elementRect.top - containerRect.top + elementRect.height / 2,
    };
  };

  // Draw arrow between two points
  const drawArrow = (from: { x: number; y: number }, to: { x: number; y: number }, color: string, dashed: boolean = false) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    const length = Math.sqrt(dx * dx + dy * dy);

    // Arrow head size
    const headLength = 10;
    const headAngle = Math.PI / 6;

    return (
      <g>
        <line
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          stroke={color}
          strokeWidth="2"
          strokeDasharray={dashed ? '5,5' : 'none'}
          markerEnd="url(#arrowhead)"
        />
        <path
          d={`M ${to.x} ${to.y} L ${to.x - headLength * Math.cos(angle - headAngle)} ${to.y - headLength * Math.sin(angle - headAngle)} M ${to.x} ${to.y} L ${to.x - headLength * Math.cos(angle + headAngle)} ${to.y - headLength * Math.sin(angle + headAngle)}`}
          stroke={color}
          strokeWidth="2"
          fill="none"
        />
      </g>
    );
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Escape to cancel linking
      if (e.key === 'Escape') {
        cancelLinking();
        return;
      }

      if (!selectedText || !currentLayer) return;

      const label = currentLayer.labels.find(l => l.shortcut.toLowerCase() === e.key.toLowerCase());
      if (label) {
        e.preventDefault();
        createAnnotation(label);
      }

      if ((e.key === 'Backspace' || e.key === 'Delete') && hoveredAnnotation) {
        e.preventDefault();
        deleteAnnotation(hoveredAnnotation);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedText, currentLayer, createAnnotation, hoveredAnnotation, cancelLinking]);

  // Delete annotation
  const deleteAnnotation = (annotationId: string) => {
    setCoreferenceeClusters(prev => {
      return prev.map(cluster => ({
        ...cluster,
        mentions: cluster.mentions.filter(m => m.id !== annotationId),
      })).filter(cluster => cluster.mentions.length > 1); // Keep only clusters with 2+ mentions
    });
    setAnnotations(prev => prev.filter(a => a.id !== annotationId));
    setHoveredAnnotation(null);
  };

  // Delete entire cluster
  const deleteCluster = (clusterId: string) => {
    const cluster = coreferenceeClusters.find(c => c.id === clusterId);
    if (cluster) {
      // Return mentions to standalone annotations
      setAnnotations(prev => [...prev, ...cluster.mentions]);
    }
    setCoreferenceeClusters(prev => prev.filter(c => c.id !== clusterId));
  };

  // Render annotated text
  const renderAnnotatedText = () => {
    const currentLayerAnnotations = currentLayer?.type === 'coreference'
      ? [...annotations.filter(a => a.layerId === selectedLayer), ...coreferenceeClusters.flatMap(c => c.mentions)]
      : annotations.filter(a => a.layerId === selectedLayer);

    const sortedAnnotations = [...currentLayerAnnotations].sort((a, b) => a.start - b.start);
    const elements: RenderElement[] = [];
    let lastIndex = 0;

    sortedAnnotations.forEach((annotation, idx) => {
      if (annotation.start > lastIndex) {
        elements.push(
          <span key={`text-${idx}`}>
            {fullText.substring(lastIndex, annotation.start)}
          </span>
        );
      }

      const cluster = getClusterForAnnotation(annotation.id);
      const clusterIndex = cluster ? coreferenceeClusters.indexOf(cluster) + 1 : null;
      const isLinking = selectedAnnotationForLink === annotation.id;
      const isLinkTarget = linkingFromAnnotation && linkingFromAnnotation.id !== annotation.id;

      elements.push(
        <span
          key={annotation.id}
          data-annotation-id={annotation.id}
          className={`relative px-1 py-0.5 rounded cursor-pointer transition-all ${
            isLinking
              ? 'ring-2 ring-blue-500 ring-offset-1 shadow-lg'
              : isLinkTarget && currentLayer?.type === 'coreference'
              ? 'ring-2 ring-green-400 ring-offset-1 hover:ring-green-500'
              : 'hover:shadow-md'
          }`}
          style={{
            backgroundColor: cluster ? `${cluster.color}30` : `${annotation.color}20`,
            borderBottom: `3px solid ${cluster ? cluster.color : annotation.color}`,
          }}
          onMouseEnter={() => setHoveredAnnotation(annotation.id)}
          onMouseLeave={() => setHoveredAnnotation(null)}
          onClick={(e) => handleAnnotationClick(annotation, e)}
          title={currentLayer?.type === 'coreference'
            ? (isLinking ? 'Select another mention to link' : 'Click to start linking')
            : annotation.labelName
          }
        >
          {annotation.text}
          {clusterIndex && (
            <sup className="ml-1 text-xs font-bold px-1 py-0.5 rounded"
                 style={{
                   backgroundColor: cluster?.color,
                   color: 'white'
                 }}>
              {clusterIndex}
            </sup>
          )}
        </span>
      );

      lastIndex = annotation.end;
    });

    if (lastIndex < fullText.length) {
      elements.push(
        <span key="text-end">
          {fullText.substring(lastIndex)}
        </span>
      );
    }

    return elements;
  };

  if (!workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Workspace not found</h1>
          <Button onClick={() => router.push('/home')}>Back to Home</Button>
        </div>
      </div>
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
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">{workspace.name}</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">Annotation Editor</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {linkingFromAnnotation && (
              <Badge variant="default" className="bg-blue-600 text-white animate-pulse">
                Linking mode - Click another mention or press ESC to cancel
              </Badge>
            )}
            <Badge variant="secondary" className="text-sm">
              {allDocuments.length} document{allDocuments.length !== 1 ? 's' : ''}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/workspace/${workspaceId}`)}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Workspace
            </Button>
            <Button size="sm" className="gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save
            </Button>
            <Avatar className="cursor-pointer ring-2 ring-white dark:ring-slate-800">
              <AvatarImage src="" alt="User avatar" />
              <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white font-bold">
                JD
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Pane - All Annotations */}
        <aside className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">All Annotations</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {allAnnotations.length} total
            </p>
          </div>

          <div className="p-4 space-y-3">
            {allAnnotations.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <p className="text-sm text-slate-500">No annotations yet</p>
                <p className="text-xs text-slate-400 mt-2">
                  Select text in the editor and choose a label to start annotating
                </p>
              </div>
            ) : (
              allAnnotations.map(annotation => {
                const cluster = getClusterForAnnotation(annotation.id);
                const clusterIndex = cluster ? coreferenceeClusters.indexOf(cluster) + 1 : null;

                return (
                  <div
                    key={annotation.id}
                    className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group cursor-pointer"
                    onMouseEnter={() => setHoveredAnnotation(annotation.id)}
                    onMouseLeave={() => setHoveredAnnotation(null)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: cluster?.color || annotation.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-900 dark:text-white">
                              {annotation.labelName}
                            </span>
                            {clusterIndex && (
                              <Badge variant="secondary" className="text-xs h-5">
                                Chain {clusterIndex}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {annotation.layerName}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAnnotation(annotation.id);
                        }}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 break-words">
                      "{annotation.text}"
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Middle Pane - Text Editor */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            <Card className="shadow-lg min-h-[600px]">
              <CardContent className="p-8 relative" ref={containerRef} onMouseMove={handleMouseMove}>
                <div
                  ref={textRef}
                  className="text-lg leading-relaxed text-slate-900 dark:text-white select-text cursor-text relative z-10"
                  onMouseUp={handleTextSelection}
                  onClick={currentLayer?.type === 'coreference' ? handleWordClick : cancelLinking}
                  style={{ userSelect: currentLayer?.type === 'coreference' ? 'none' : 'text' }}
                >
                  {renderAnnotatedText()}
                </div>

                {/* SVG Overlay for Arrows - Behind text */}
                <svg
                  className="absolute inset-0 pointer-events-none"
                  style={{ width: '100%', height: '100%', zIndex: 1 }}
                >
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="10"
                      markerHeight="10"
                      refX="9"
                      refY="3"
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
                    </marker>
                  </defs>

                  {/* Draw temporary arrow while linking */}
                  {linkingFromAnnotation && mousePosition && (() => {
                    const fromPos = getAnnotationPosition(linkingFromAnnotation.id);
                    if (fromPos) {
                      // Draw curved arrow below the text
                      const midY = Math.max(fromPos.y, mousePosition.y) + 40;
                      return (
                        <g>
                          <path
                            d={`M ${fromPos.x} ${fromPos.y + 15} Q ${(fromPos.x + mousePosition.x) / 2} ${midY} ${mousePosition.x} ${mousePosition.y + 15}`}
                            stroke="#3b82f6"
                            strokeWidth="2"
                            fill="none"
                            strokeDasharray="5,5"
                            opacity="0.7"
                          />
                        </g>
                      );
                    }
                    return null;
                  })()}

                  {/* Draw preview arrow from last created annotation */}
                  {lastCreatedAnnotation && mousePosition && !linkingFromAnnotation && (() => {
                    const fromPos = getAnnotationPosition(lastCreatedAnnotation.id);
                    if (fromPos) {
                      // Draw curved arrow below the text
                      const midY = Math.max(fromPos.y, mousePosition.y) + 40;
                      return (
                        <g>
                          <path
                            d={`M ${fromPos.x} ${fromPos.y + 15} Q ${(fromPos.x + mousePosition.x) / 2} ${midY} ${mousePosition.x} ${mousePosition.y}`}
                            stroke="#10b981"
                            strokeWidth="2"
                            fill="none"
                            strokeDasharray="5,5"
                            opacity="0.6"
                          />
                        </g>
                      );
                    }
                    return null;
                  })()}

                  {/* Draw permanent arrows for coreference chains */}
                  {currentLayer?.type === 'coreference' && coreferenceeClusters.map(cluster => {
                    const arrows: JSX.Element[] = [];
                    for (let i = 0; i < cluster.mentions.length - 1; i++) {
                      const fromPos = getAnnotationPosition(cluster.mentions[i].id);
                      const toPos = getAnnotationPosition(cluster.mentions[i + 1].id);
                      if (fromPos && toPos) {
                        // Draw curved arrow below the text
                        const midY = Math.max(fromPos.y, toPos.y) + 35;
                        arrows.push(
                          <g key={`${cluster.id}-${i}`}>
                            <path
                              d={`M ${fromPos.x} ${fromPos.y + 15} Q ${(fromPos.x + toPos.x) / 2} ${midY} ${toPos.x} ${toPos.y + 15}`}
                              stroke={cluster.color}
                              strokeWidth="2.5"
                              fill="none"
                              opacity="0.8"
                              markerEnd="url(#arrowhead)"
                            />
                          </g>
                        );
                      }
                    }
                    return arrows;
                  })}
                </svg>
              </CardContent>
            </Card>

            {/* Help Section */}
            <Card className="mt-6 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
              <CardContent className="p-6">
                <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Quick Tips - INCEpTION Style
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
                  <li>• <strong>Span layers:</strong> Select text and click a label (or use keyboard shortcut)</li>
                  <li>• <strong>Coreference:</strong> Click on any word to create a mention automatically</li>
                  <li>• <strong>Link mentions:</strong> Click one mention, then click another - arrow connects them</li>
                  <li>• <strong>Visual arrows:</strong> Dashed arrow follows cursor while linking, solid arrows show links</li>
                  <li>• <strong>Cancel linking:</strong> Press ESC to stop linking mode</li>
                  <li>• <strong>Chain numbers:</strong> Small badges show which coreference chain a mention belongs to</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </main>

        {/* Right Pane - Layers & Labels */}
        <aside className="w-96 border-l border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Layers</h2>
          </div>

          <Tabs value={selectedLayer.toString()} onValueChange={(v) => setSelectedLayer(parseInt(v))} className="p-4">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              {workspace.annotationLayers?.map(layer => (
                <TabsTrigger key={layer.id} value={layer.id.toString()} className="text-xs">
                  {layer.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {workspace.annotationLayers?.map(layer => (
              <TabsContent key={layer.id} value={layer.id.toString()} className="space-y-4 mt-0">
                {/* Layer Description */}
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">{layer.description}</p>
                  </CardContent>
                </Card>

                {/* Selection Info */}
                {selectedText && (
                  <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
                    <CardContent className="pt-4">
                      <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-2">
                        Selected Text:
                      </p>
                      <p className="text-sm text-blue-800 dark:text-blue-300 italic">
                        "{selectedText.text.substring(0, 100)}{selectedText.text.length > 100 ? '...' : ''}"
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Labels Section - Only show for non-coreference layers */}
                {layer.type !== 'coreference' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Labels</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {layer.labels.map(label => (
                        <button
                          key={label.id}
                          onClick={() => createAnnotation(label)}
                          disabled={!selectedText}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                            selectedText
                              ? 'hover:scale-[1.02] hover:shadow-md cursor-pointer'
                              : 'opacity-50 cursor-not-allowed'
                          }`}
                          style={{
                            backgroundColor: selectedText ? `${label.color}20` : 'transparent',
                            borderColor: selectedText ? label.color : '#e2e8f0',
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: label.color }}
                            />
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {label.name}
                            </span>
                          </div>
                          <kbd className="px-2 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded">
                            {label.shortcut}
                          </kbd>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Coreference Chains */}
                {layer.type === 'coreference' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span>Coreference Chains ({coreferenceeClusters.length})</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {coreferenceeClusters.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">
                          No chains yet. Create mentions first, then link them together.
                        </p>
                      ) : (
                        coreferenceeClusters.map((cluster, idx) => (
                          <div
                            key={cluster.id}
                            className="p-3 rounded-lg border-2 transition-all"
                            style={{
                              backgroundColor: `${cluster.color}10`,
                              borderColor: cluster.color,
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                  style={{ backgroundColor: cluster.color }}
                                >
                                  {idx + 1}
                                </div>
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                  Chain {idx + 1}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Badge variant="secondary" className="text-xs">
                                  {cluster.mentions.length} mentions
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteCluster(cluster.id);
                                  }}
                                  title="Unlink all mentions"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                  </svg>
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-1 text-xs">
                              {cluster.mentions.map((mention, mIdx) => (
                                <div
                                  key={mention.id}
                                  className="p-2 bg-white dark:bg-slate-800 rounded flex items-start gap-2"
                                >
                                  <span className="font-bold text-slate-500 dark:text-slate-400 flex-shrink-0">
                                    {mIdx + 1}.
                                  </span>
                                  <p className="text-slate-700 dark:text-slate-300 flex-1">
                                    "{mention.text}"
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </aside>
      </div>
      </div>
    </AuthGuard>
  );
}
