import type { ReactNode } from 'react';
import ActivityTracker from '@/components/activity-tracker';

export default function SmkiDashboardLayout({ children }: { children: ReactNode }) {
  return <><ActivityTracker />{children}</>;
}
