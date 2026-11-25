'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const HEARTBEAT_INTERVAL_MS = 20_000;

export default function SessionHeartbeat() {
  const pathname = usePathname();
  const shouldResumeSession = pathname !== '/landing-page'
    && pathname !== '/login'
    && pathname !== '/register'
    && !pathname.startsWith('/forgot-password');

  useEffect(() => {
    let stopped = false;
    let sending = false;

    const sendHeartbeat = async (resumeSession = false) => {
      if (stopped || sending) return;
      sending = true;

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session || stopped) return;

        const response = await fetch('/api/login-log/heartbeat', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'X-Resume-Login-Session': resumeSession ? 'true' : 'false',
          },
          cache: 'no-store',
        });

        if (!response.ok) {
          console.error('Gagal memperbarui heartbeat Log Login:', response.status);
        }
      } catch {
        console.error('Gagal mengirim heartbeat Log Login.');
      } finally {
        sending = false;
      }
    };

    // A fresh dashboard mount means the user has re-entered the application.
    void sendHeartbeat(shouldResumeSession);
    const interval = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    const resumeOnFocus = () => { void sendHeartbeat(shouldResumeSession); };
    window.addEventListener('focus', resumeOnFocus);

    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', resumeOnFocus);
    };
  }, [shouldResumeSession, pathname]);

  return null;
}
