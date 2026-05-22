import { redirect } from 'next/navigation';
import { SessionExpiredError } from '@/lib/errors';
import { listSenses } from '@/lib/server/wsd';
import { WsdSensesClient } from './WsdSensesClient';

export default async function WsdSensesAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const senses = await listSenses(id);
    return <WsdSensesClient workspaceId={id} initialSenses={senses} />;
  } catch (err) {
    if (err instanceof SessionExpiredError) {
      redirect('/api/auth/end-session');
    }
    throw err;
  }
}
