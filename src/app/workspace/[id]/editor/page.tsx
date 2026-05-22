import { redirect } from 'next/navigation';
import type { AnnotationType } from '@/lib/api';
import { SessionExpiredError } from '@/lib/errors';
import { getWorkspaceById } from '@/lib/server/workspace';
import { isOneOf } from '@/lib/utils';
import CorefEditor from './coref-editor';
import NerEditor from './ner-editor';
import PosEditor from './pos-editor';
import WsdEditor from './wsd-editor';

const ANNOTATION_TYPES: readonly AnnotationType[] = ['COREF', 'NER', 'POS', 'WSD'];

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let annotationType: AnnotationType;
  let workspaceName: string;
  try {
    const workspace = await getWorkspaceById(id);
    if (!isOneOf(workspace.annotationType, ANNOTATION_TYPES)) {
      throw new Error(`Unknown annotation type from server: ${workspace.annotationType}`);
    }
    annotationType = workspace.annotationType;
    workspaceName = workspace.name;
  } catch (err) {
    if (err instanceof SessionExpiredError) {
      redirect('/api/auth/end-session');
    }
    throw err;
  }

  switch (annotationType) {
    case 'COREF':
      return <CorefEditor workspaceId={id} />;
    case 'NER':
      return <NerEditor workspaceId={id} />;
    case 'POS':
      return <PosEditor workspaceId={id} />;
    case 'WSD':
      return <WsdEditor workspaceId={id} workspaceName={workspaceName} />;
  }
}
