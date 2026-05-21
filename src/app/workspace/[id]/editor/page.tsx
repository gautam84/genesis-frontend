'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AuthGuard } from '@/components/auth-guard';
import { workspaceApi, AnnotationType } from '@/lib/api';
import { isOneOf } from '@/lib/utils';
import { FullScreenLoader } from '@/components/Spinner';
import CorefEditor from './coref-editor';
import PosEditor from './pos-editor';
import WsdEditor from './wsd-editor';
import NerEditor from './ner-editor';

const ANNOTATION_TYPES: readonly AnnotationType[] = ['COREF', 'NER', 'POS', 'WSD'];

export default function EditorPage() {
  const { id: workspaceId } = useParams<{ id: string }>();

  const [annotationType, setAnnotationType] = useState<AnnotationType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnnotationType = async () => {
      try {
        const res = await workspaceApi.getById(workspaceId);
        if (isOneOf(res.data.annotationType, ANNOTATION_TYPES)) {
          setAnnotationType(res.data.annotationType);
        } else {
          throw new Error(`Unknown annotation type from server: ${res.data.annotationType}`);
        }
      } catch (err) {
        console.error('Failed to load workspace:', err);
        setError('Failed to determine annotation type for this workspace.');
      } finally {
        setLoading(false);
      }
    };

    if (workspaceId) {
      loadAnnotationType();
    }
  }, [workspaceId]);

  if (loading) {
    return <FullScreenLoader label="Loading Editor..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <AuthGuard>
      {annotationType === 'POS' && <PosEditor workspaceId={workspaceId} />}
      {annotationType === 'COREF' && <CorefEditor workspaceId={workspaceId} />}
      {annotationType === 'WSD' && <WsdEditor workspaceId={workspaceId} />}
      {annotationType === 'NER' && <NerEditor workspaceId={workspaceId} />}
    </AuthGuard>
  );
}
