'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RESET_CONFIRM_PASSWORD_KEY, RESET_EMAIL_KEY, RESET_NEW_PASSWORD_KEY, RESET_PASSWORD_MAX_LENGTH, RESET_PASSWORD_MIN_LENGTH, RESET_PASSWORD_STRONG_REGEX } from '../resetFlow';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [greeting, setGreeting] = useState('Good Morning');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isContinuing, setIsContinuing] = useState(false);

  useEffect(() => {
    if (!window.localStorage.getItem(RESET_EMAIL_KEY)) {
      router.replace('/forgot-password');
      return;
    }
    setNewPassword(window.sessionStorage.getItem(RESET_NEW_PASSWORD_KEY) ?? '');
    setConfirmPassword(window.sessionStorage.getItem(RESET_CONFIRM_PASSWORD_KEY) ?? '');
    const hour = new Date().getHours();
    if (hour >= 3 && hour < 12) setGreeting('Good Morning');
    else if (hour >= 12 && hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    const passwordForPolicy = newPassword.trim();
    if (!newPassword) {
      setErrorMessage('New password are required.');
      return;
    }
    if (!confirmPassword) {
      setErrorMessage('Confirm password are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('The confirmed password does not match the new password.');
      return;
    }
    if (passwordForPolicy.length < RESET_PASSWORD_MIN_LENGTH) {
      setErrorMessage('The password must be at least 8 characters long.');
      return;
    }
    if (passwordForPolicy.length > RESET_PASSWORD_MAX_LENGTH) {
      setErrorMessage('Password cannot exceed 15 characters.');
      return;
    }
    if (!RESET_PASSWORD_STRONG_REGEX.test(passwordForPolicy)) {
      setErrorMessage('The password must contain a combination of letters, numbers, and special characters.');
      return;
    }

    setIsContinuing(true);
    try {
      const email = window.localStorage.getItem(RESET_EMAIL_KEY)?.trim();
      if (!email) {
        router.replace('/forgot-password');
        return;
      }

      const response = await fetch('/api/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check-password', email, password: newPassword }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setErrorMessage(result.error || 'Password could not be checked. Please try again.');
        return;
      }

      window.sessionStorage.setItem(RESET_NEW_PASSWORD_KEY, newPassword);
      window.sessionStorage.setItem(RESET_CONFIRM_PASSWORD_KEY, confirmPassword);
      router.push('/forgot-password/update-password/face-verification');
    } catch {
      setErrorMessage('Password could not be checked. Please try again.');
    } finally {
      setIsContinuing(false);
    }
  }

  return (
    <main className="fixed inset-0 h-screen w-screen overflow-hidden bg-[#07111F] text-[#0D1B2A] selection:bg-[#3B6FF5] selection:text-white font-[family-name:var(--font-inter)]">
      {/* Latar belakang yang sama dengan halaman login */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=1600&auto=format&fit=crop"
          alt="Cargo Ship Logistics"
          className="h-full w-full object-cover object-right opacity-60"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0D1B2A] via-[#0D1B2A]/85 via-40% to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07111F] via-transparent to-transparent" />
      </div>

      {/* Cahaya latar */}
      <div className="pointer-events-none absolute -left-20 -top-20 z-0 h-96 w-96 rounded-full bg-[#18C7C0]/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 z-0 h-96 w-96 rounded-full bg-[#3B6FF5]/30 blur-3xl" />

      {/* Logo dan nama perusahaan */}
      <div className="pointer-events-none absolute right-8 top-1/2 z-20 hidden max-w-lg -translate-y-1/2 flex-col items-end text-right md:flex lg:right-16 xl:right-24">
        <div className="mb-4 w-32 sm:w-40 lg:w-48">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-ANDIMA-wzx4gpZx20EFE5IYcH3jqabixELIo3.png"
            alt="Logo ANDIMA"
            width={400}
            height={246}
            className="h-auto w-full object-contain drop-shadow-lg"
          />
        </div>
        <h1 className="font-[family-name:var(--font-poppins)] text-2xl font-extrabold leading-tight tracking-wider text-white drop-shadow-md sm:text-3xl lg:text-4xl">
          PT. ANDIMA<br />
          TRANSPORTINDO
        </h1>
      </div>

      {/* Formulir password baru */}
      <div className="relative z-10 flex min-h-screen w-full items-center justify-start px-6 py-8 sm:px-12 lg:px-20">
        <div className="w-full max-w-xl">
          <section className="relative max-h-[92vh] overflow-y-auto rounded-3xl border border-white/80 bg-gradient-to-b from-white/85 via-white/70 to-white/60 p-5 shadow-[0_20px_50px_rgba(7,17,31,0.5),inset_0_2px_4px_rgba(255,255,255,0.9)] backdrop-blur-2xl [scrollbar-width:none] sm:p-7">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-32 w-3/4 -translate-x-1/2 rounded-full bg-gradient-to-b from-white/80 to-transparent blur-md" />

            <div className="relative z-10 mb-7 text-left">
              <h2 className="font-[family-name:var(--font-poppins)] text-xl font-bold tracking-tight text-[#0D1B2A] sm:text-2xl">
                {greeting},
              </h2>
              <p className="mt-1.5 font-[family-name:var(--font-poppins)] text-sm font-medium text-[#334155]">
                Please enter and confirm your new password.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="relative z-10 space-y-6 font-[family-name:var(--font-inter)]">
              <div>
                <label htmlFor="new-password" className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    name="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••••••"
                    value={newPassword}
                    onChange={(event) => {
                      setNewPassword(event.target.value);
                      window.sessionStorage.setItem(RESET_NEW_PASSWORD_KEY, event.target.value);
                      setErrorMessage('');
                    }}
                    className="w-full rounded-xl border border-white/90 bg-white/85 py-4 pl-4 pr-12 text-sm font-medium text-[#0D1B2A] shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] backdrop-blur-md transition-all focus:border-[#3B6FF5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3B6FF5]/30"
                  />
                  <button
                    type="button"
                    onMouseDown={() => setShowNewPassword(true)}
                    onMouseUp={() => setShowNewPassword(false)}
                    onMouseLeave={() => setShowNewPassword(false)}
                    onTouchStart={() => setShowNewPassword(true)}
                    onTouchEnd={() => setShowNewPassword(false)}
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                    tabIndex={-1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#3B6FF5]"
                  >
                    {showNewPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908A8.982 8.982 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      window.sessionStorage.setItem(RESET_CONFIRM_PASSWORD_KEY, event.target.value);
                      setErrorMessage('');
                    }}
                    className="w-full rounded-xl border border-white/90 bg-white/85 py-4 pl-4 pr-12 text-sm font-medium text-[#0D1B2A] shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] backdrop-blur-md transition-all focus:border-[#3B6FF5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3B6FF5]/30"
                  />
                  <button
                    type="button"
                    onMouseDown={() => setShowConfirmPassword(true)}
                    onMouseUp={() => setShowConfirmPassword(false)}
                    onMouseLeave={() => setShowConfirmPassword(false)}
                    onTouchStart={() => setShowConfirmPassword(true)}
                    onTouchEnd={() => setShowConfirmPassword(false)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    tabIndex={-1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#3B6FF5]"
                  >
                    {showConfirmPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908A8.982 8.982 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div role="alert" className="flex items-center gap-2.5 rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/10 p-4 text-xs font-semibold text-[#DC2626] backdrop-blur-md sm:text-sm">
                  <svg aria-hidden="true" className="h-5 w-5 shrink-0 fill-current" viewBox="0 0 20 20">
                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
                  </svg>
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-5 pt-1 sm:gap-8">
                <Link
                  href="/forgot-password"
                  onClick={() => {
                    window.sessionStorage.removeItem(RESET_NEW_PASSWORD_KEY);
                    window.sessionStorage.removeItem(RESET_CONFIRM_PASSWORD_KEY);
                  }}
                  className="flex w-full items-center justify-center rounded-xl bg-[#31005B] px-5 py-4 text-sm font-extrabold tracking-wider text-white shadow-[0_8px_25px_rgba(49,0,91,0.3)] transition-all active:scale-[0.99]"
                >
                  BACK
                </Link>
                <button
                  type="submit"
                  disabled={isContinuing}
                  className="w-full cursor-pointer rounded-xl bg-[#3B6FF5] px-5 py-4 text-sm font-extrabold tracking-wider text-white shadow-[0_8px_25px_rgba(59,111,245,0.4)] transition-all hover:bg-[#2B5CE5] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  NEXT
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
