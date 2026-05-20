'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AuthGuard } from '@/components/auth-guard';
import { workspaceApi, AnnotationType } from '@/lib/api';
import { isOneOf } from '@/lib/utils';
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
