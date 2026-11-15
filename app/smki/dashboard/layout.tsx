import type { ReactNode } from 'react';
import ActivityTracker from '@/components/activity-tracker';
import SessionHeartbeat from '@/components/session-heartbeat';
import AuthTabGuard from '@/components/AuthTabGuard';   

export default function SmkiDashboardLayout({ children }: { children: ReactNode }) {
  return <AuthTabGuard><ActivityTracker /><SessionHeartbeat />{children}</AuthTabGuard>;
}