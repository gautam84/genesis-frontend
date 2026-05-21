import { redirect } from 'next/navigation';
import { SessionExpiredError } from '@/lib/errors';
import { listWorkspaces } from '@/lib/server/workspace';
import { HomeClient } from './HomeClient';

export default async function HomePage() {
  try {
    const workspaces = await listWorkspaces();
    return <HomeClient initialWorkspaces={workspaces} />;
  } catch (err) {
    if (err instanceof SessionExpiredError) {
      redirect('/login');
    }
    throw err;
  }
}
