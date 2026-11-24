'use client';

import { Text, LanguageInput } from '@/components/language';
import React, { useState, useEffect, FormEvent, ChangeEvent, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getLoginDestination } from '@/lib/loginDestination';
import { recordLogin } from '@/query/tracklog';
import { trackActivity } from '@/query/activity';


function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [loginAttempts, setLoginAttempts] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isPermanentlyBlocked, setIsPermanentlyBlocked] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [greeting, setGreeting] = useState<string>('Good Morning');
  const [showPopup, setShowPopup] = useState<boolean>(false);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'unauthorized') {
      setShowPopup(true);

      // Otomatis tutup pop-up setelah 5 detik (opsional)
      const timer = setTimeout(() => {
        setShowPopup(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 3 && hour < 12) setGreeting('Good Morning');
    else if (hour >= 12 && hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'day_changed') {
      alert('Hari telah berganti. Sesi Anda telah berakhir, silakan login kembali.');
    }
  }, [searchParams]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (isLocked && countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    } else if (countdown === 0 && isLocked && !isPermanentlyBlocked) {
      setIsLocked(false);
      setErrorMessage('');
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isLocked, countdown, isPermanentlyBlocked]);

  const validateEmailFormat = (emailVal: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailVal);
  };

  const validatePasswordStrength = (passVal: string): boolean => {
    const trimmed = passVal.trim();

    // Cek panjang 8 - 15 karakter
    if (trimmed.length < 8 || trimmed.length > 15) {
      return false;
    }

    // Cek apakah sudah memenuhi semua syarat (huruf, angka, dan simbol lengkap)
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/;
    return passwordRegex.test(trimmed);
  };

  const handleFailedAttempt = (customMessage: string) => {
    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);

    if (newAttempts >= 5) {
      setIsLocked(true);
      setIsPermanentlyBlocked(true);
      setErrorMessage('Your account has been blocked. Please contact the IT administrator.');
    } else if (newAttempts === 4) {
      setErrorMessage(
        `${customMessage} Warning: 1 more failed attempt will block your account!`
      );
    } else if (newAttempts === 3) {
      setIsLocked(true);
      setCountdown(30);
      setErrorMessage(
        'Too many failed login attempts (3/5). Please wait 30 seconds before trying again.'
      );
    } else {
      setErrorMessage(`${customMessage} (Remaining attempts: ${5 - newAttempts})`);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (isLocked || isPermanentlyBlocked) return;

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Email and Password are required.');
      return;
    }

    if (!validateEmailFormat(email)) {
      setErrorMessage('Invalid email format (example: name@andima.co.id).');
      return;
    }

    const cleanPassword = password.trim();
    if (cleanPassword.length < 8) {
      setErrorMessage('The password must be at least 8 characters long.');
      return;
    }
    if (cleanPassword.length > 15) {
      setErrorMessage('Password cannot exceed 15 characters.');
      return;
    }
    if (!validatePasswordStrength(password)) {
      setErrorMessage(
        'The password must contain a combination of letters, numbers, and special characters.'
      );
      return;
    }

    // Authenticate first, then route using the position stored in the profile.
    setIsSigningIn(true);
    try {
      // 1. Autentikasi dengan Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (authError) {
        const message = authError.message.toLowerCase().includes('email not confirmed')
          ? 'Email belum dikonfirmasi. Selesaikan konfirmasi melalui email terlebih dahulu.'
          : 'Email atau password salah.';
        handleFailedAttempt(message);
        return;
      }

      // 2. Ambil Profil User dari b2_register
      const { data: profileData, error: profileError } = await supabase
        .from('b2_register')
        .select('position_id, full_name, is_active')
        .eq('id', authData.user.id)
        .maybeSingle();

      // Jika ada error dari Supabase (misal masalah RLS / query)
      if (profileError) {
        console.error('Error Database Supabase:', profileError.message);
        setErrorMessage('Gagal mengambil data profil dari server.');
        return;
      }

      // Jika query sukses tapi datanya tidak ditemukan di tabel b2_register
      if (!profileData) {
        setErrorMessage('Email Anda terautentikasi, namun data profil belum terdaftar di database.');
        return;
      }

      // 3. Cek apakah akun dinonaktifkan oleh Admin
      if (profileData.is_active === false) {
        setErrorMessage('Akun Anda telah dinonaktifkan. Silakan hubungi IT / HR Admin.');
        return;
      }

      const targetRoute = getLoginDestination(profileData.position_id);

      try {
        await recordLogin();
      } catch (logError) {
        console.error('Gagal mencatat riwayat login:', logError);
        setErrorMessage('Login berhasil, tetapi riwayat login tidak berhasil disimpan.');
      }

      setLoginAttempts(0);
      sessionStorage.setItem('tab-auth', 'true');
      trackActivity('Login', 'Berhasil login ke aplikasi.');
      setSuccessMessage(`Login berhasil! Selamat datang, ${profileData.full_name || 'User'}. Mengalihkan...`);

      // Mengarahkan langsung ke landing page modular setelah login berhasil
      window.setTimeout(() => {
        router.replace('/landing-page');
      }, 1200);

    } catch (err) {
      setErrorMessage('Tidak dapat menghubungi server login. Silakan coba lagi.');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <main className="relative min-h-dvh w-full overflow-x-hidden bg-[#07111F] text-[#0D1B2A] selection:bg-[#3B6FF5] selection:text-white font-[family-name:var(--font-inter)]">

      {/* POP-UP NOTIFIKASI DI TENGAH ATAS LAYAR */}
      {showPopup && (
        <div className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 sm:gap-4 bg-[#D9364F]/95 backdrop-blur-md text-white px-4 py-3 sm:px-6 sm:py-4 rounded-2xl shadow-[0_20px_50px_rgba(217,54,79,0.5)] border border-[#D9364F]/60 transition-all w-[calc(100%-2rem)] max-w-md">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-xs tracking-wide uppercase font-[family-name:var(--font-poppins)]"><Text>Akses Ditolak</Text></h4>
            <p className="text-xs text-rose-100 font-medium mt-0.5"><Text>Silakan login terlebih dahulu untuk mengakses Dashboard.</Text></p>
          </div>
          <button
            type="button"
            onClick={() => setShowPopup(false)}
            aria-label="Tutup"
            className="ml-1 shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-rose-200 hover:text-white hover:bg-white/10 font-bold text-lg leading-none transition-colors"
          >
            &times;
          </button>
        </div>
      )}

      {/* 1. BACKGROUND GAMBAR LOGISTIK FULL SCREEN */}
      <div className="fixed inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=1600&auto=format&fit=crop"
          alt="Cargo Ship Logistics"
          className="w-full h-full object-cover object-center lg:object-right opacity-60"
        />
        {/* Soft Blending Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0D1B2A]/95 via-[#0D1B2A]/80 to-[#07111F] lg:bg-gradient-to-r lg:from-[#0D1B2A] lg:via-[#0D1B2A]/85 lg:via-40% lg:to-transparent pointer-events-none" />
        <div className="hidden lg:block absolute inset-0 bg-gradient-to-t from-[#07111F] via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Ambient Light Glows */}
      <div className="fixed -top-16 -left-16 sm:-top-20 sm:-left-20 w-56 h-56 sm:w-96 sm:h-96 bg-[#18C7C0]/30 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed -bottom-16 left-1/3 sm:-bottom-20 w-56 h-56 sm:w-96 sm:h-96 bg-[#3B6FF5]/30 rounded-full blur-3xl pointer-events-none z-0" />

      {/* 2. WRAPPER UTAMA: brand + form ada di DALAM satu wrapper ini */}
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[1800px] flex-col items-center justify-center gap-6 px-4 py-6 sm:gap-8 sm:px-8 sm:py-10 lg:flex-row lg:justify-between lg:gap-12 lg:px-12 xl:px-20 2xl:px-28">

        {/* BRAND (LOGO + TITLE): di HP tampil di atas, di laptop tampil di kanan */}
        <div className="pointer-events-none order-first flex w-full flex-col items-center text-center lg:order-last lg:max-w-md lg:flex-1 lg:items-end lg:text-right xl:max-w-lg">

          {/* Logo ANDIMA di Luar Frame */}
          <div className="mb-3 w-28 sm:mb-4 sm:w-36 lg:w-44 xl:w-48 2xl:w-56">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-ANDIMA-wzx4gpZx20EFE5IYcH3jqabixELIo3.png"
              alt="Logo ANDIMA"
              width={400}
              height={246}
              className="w-full h-auto object-contain drop-shadow-lg"
            />
          </div>
          <h1 className="font-[family-name:var(--font-poppins)] text-xl sm:text-3xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-extrabold tracking-wider text-white drop-shadow-md leading-tight">
            <Text>PT. ANDIMA</Text><br />
            <span className="font-[family-name:var(--font-poppins)] font-extrabold tracking-wider text-white drop-shadow-md leading-tight">
              <Text>TRANSPORTINDO</Text>
            </span>
          </h1>
        </div>

        {/* 3. FORM LOGIN CONTAINER */}
        <div className="w-full max-w-md sm:max-w-lg lg:max-w-lg lg:flex-1 xl:max-w-xl 2xl:max-w-2xl">

          {/* FRAME LIQUID GLASS */}
          <div className="relative overflow-hidden p-5 sm:p-7 2xl:p-9 rounded-3xl bg-gradient-to-b from-white/85 via-white/70 to-white/60 backdrop-blur-2xl border border-white/80 shadow-[0_20px_50px_rgba(7,17,31,0.5),inset_0_2px_4px_rgba(255,255,255,0.9)]">

            {/* Top Liquid Highlight Specular Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-gradient-to-b from-white/80 to-transparent blur-md pointer-events-none rounded-full" />

            {/* Greeting */}
            <div className="mb-5 sm:mb-7 text-left relative z-10">
              <h2 className="font-[family-name:var(--font-poppins)] text-xl sm:text-2xl 2xl:text-3xl font-bold text-[#0D1B2A] tracking-tight">
                <Text dynamic>{greeting}</Text>,
              </h2>
              <p className="font-[family-name:var(--font-poppins)] text-sm 2xl:text-base text-[#334155] mt-1.5 font-medium">
                <Text>Please sign in with your registered account to access the dashboard.</Text>
              </p>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 font-[family-name:var(--font-inter)] relative z-10" noValidate>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#0F172A] mb-2 sm:mb-2.5">
                  <Text>Email</Text>
                </label>
                <LanguageInput
                  type="email"
                  placeholder="name@andima.co.id"
                  value={email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  disabled={isLocked || isPermanentlyBlocked}
                  className="w-full px-4 py-3 sm:py-3.5 rounded-xl bg-white/70 backdrop-blur-md text-[#0D1B2A] placeholder-[#64748B] text-base sm:text-sm focus:outline-none transition-all disabled:opacity-50 border border-white/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] focus:bg-white focus:border-[#3B6FF5] focus:ring-2 focus:ring-[#3B6FF5]/30 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#0F172A] mb-2 sm:mb-2.5">
                  <Text>Password</Text>
                </label>
                <div className="relative">
                  <LanguageInput
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    disabled={isLocked || isPermanentlyBlocked}
                    className="w-full pl-4 pr-12 py-3 sm:py-3.5 rounded-xl bg-white/70 backdrop-blur-md text-[#0D1B2A] placeholder-[#64748B] text-base sm:text-sm focus:outline-none transition-all disabled:opacity-50 border border-white/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] focus:bg-white focus:border-[#3B6FF5] focus:ring-2 focus:ring-[#3B6FF5]/30 font-medium"
                  />

                  <button
                    type="button"
                    onMouseDown={() => setShowPassword(true)}
                    onMouseUp={() => setShowPassword(false)}
                    onMouseLeave={() => setShowPassword(false)}
                    onTouchStart={() => setShowPassword(true)}
                    onTouchEnd={() => setShowPassword(false)}
                    onTouchCancel={() => setShowPassword(false)}
                    disabled={isLocked || isPermanentlyBlocked}
                    tabIndex={-1}
                    aria-label="Tahan untuk melihat password"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#3B6FF5] p-2 select-none touch-manipulation transition-colors disabled:opacity-50"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908A8.982 8.982 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 sm:p-4 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] text-xs sm:text-sm flex items-center gap-2.5 font-semibold backdrop-blur-md">
                  <svg className="w-5 h-5 shrink-0 fill-current" viewBox="0 0 20 20">
                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
                  </svg>
                  <span className="min-w-0 break-words"><Text dynamic>{errorMessage}</Text></span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 sm:p-4 rounded-xl bg-[#059669]/10 border border-[#059669]/30 text-[#059669] text-xs sm:text-sm flex items-center gap-2.5 font-semibold backdrop-blur-md">
                  <svg className="w-5 h-5 shrink-0 fill-current" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="min-w-0 break-words"><Text dynamic>{successMessage}</Text></span>
                </div>
              )}

              {/* Tombol Login */}
              <button
                type="submit"
                disabled={isLocked || isPermanentlyBlocked || isSigningIn}
                className="w-full py-3.5 sm:py-4 px-5 text-white font-extrabold rounded-xl text-sm tracking-wider uppercase transition-all mt-1 sm:mt-2 disabled:opacity-50 bg-[#3B6FF5] hover:bg-[#2B5CE5] shadow-[0_8px_25px_rgba(59,111,245,0.4)] active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed font-[family-name:var(--font-poppins)]"
              >
                <Text dynamic>{isPermanentlyBlocked
                  ? 'ACCOUNT BLOCKED'
                  : isLocked
                    ? `Please wait ${countdown}s`
                    : isSigningIn ? 'SIGNING IN…' : 'LOGIN'}</Text>
              </button>

              <Link
                href="/forgot-password"
                className="inline-block py-1 text-sm font-medium text-[#008CFF] hover:underline"
              >
                <Text>Forgot password?</Text>
              </Link>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#07111F]" />}>
      <LoginContent />
    </Suspense>
  );
}