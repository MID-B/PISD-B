import type { ReactNode } from 'react';
import ActivityTracker from '@/components/activity-tracker';
import SessionHeartbeat from '@/components/session-heartbeat';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <><ActivityTracker /><SessionHeartbeat />{children}</>;
}
