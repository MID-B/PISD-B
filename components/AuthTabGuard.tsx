'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthTabGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let active = true;

    const checkTabSession = async () => {
      const tabAuth = sessionStorage.getItem('tab-auth');

      if (tabAuth !== 'true') {
        await supabase.auth.signOut();

        if (active) {
          window.location.replace('/login');
        }

        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        sessionStorage.removeItem('tab-auth');

        if (active) {
          window.location.replace('/login');
        }

        return;
      }

      if (active) {
        setIsChecking(false);
      }
    };

    checkTabSession();

    return () => {
      active = false;
    };
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}