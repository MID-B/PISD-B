import type { ReactNode } from 'react';
import ActivityTracker from '@/components/activity-tracker';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <><ActivityTracker />{children}</>;
}
