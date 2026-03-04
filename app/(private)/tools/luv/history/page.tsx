import { getRecentChassisChangesServer } from '@/lib/luv-chassis-server';
import { ChangeLog } from '../components/change-log';

export default async function ChassisHistoryPage() {
  const changes = await getRecentChassisChangesServer(100);

  return (
    <div className="container px-4 py-8 max-w-xl">
      <h2 className="text-sm font-semibold mb-4">Chassis Change History</h2>
      <ChangeLog entries={changes} />
    </div>
  );
}
