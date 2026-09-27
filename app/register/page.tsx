'use client';

import React, { useState, FormEvent, ChangeEvent } from 'react';
import Link from 'next/link';

interface FieldErrors {
  fullName?: string;
  email?: string;
  username?: string;
  password?: string;
  phoneNumber?: string;
}

export default function RegisterPage() {
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // States untuk Error UI
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError('');
    setSuccessMessage('');

    const errors: FieldErrors = {};

    // 1. Validate Full Name (Letters and spaces only)
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!fullName.trim()) {
      errors.fullName = 'Full name is required.';
    } else if (!nameRegex.test(fullName.trim())) {
      errors.fullName = 'Full name must contain letters and spaces only.';
    }

    // 2. Validate Email Domain (@andima.co.id)
    const emailLower = email.trim().toLowerCase();
    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!emailLower.endsWith('@andima.co.id') || emailLower === '@andima.co.id') {
      errors.email = 'Email address must use the domain @andima.co.id';
    }

    // 3. Validate Username
    if (!username.trim()) {
      errors.username = 'Username is required.';
    } else if (!nameRegex.test(username.trim())) {
      errors.username = 'Username must correspond to a valid full name format.';
    }

    // 4. Validate Password Strength (Min 10 chars, letters, numbers, special character)
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 10) {
      errors.password = 'Password must be at least 10 characters long.';
    } else if (!hasLetter || !hasNumber || !hasSpecialChar) {
      errors.password = 'Password must include letters, numbers, and special characters.';
    }

    // 5. Validate Phone Number (Digits only, max 12 digits)
    const phoneDigitsOnly = /^\d+$/;
    if (!phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required.';
    } else if (!phoneDigitsOnly.test(phoneNumber.trim())) {
      errors.phoneNumber = 'Phone number must contain numbers only.';
    } else if (phoneNumber.trim().length > 12) {
      errors.phoneNumber = 'Phone number cannot exceed 12 digits.';
    }

    // If there are field errors, update state and stop submission
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setGeneralError('Please fix the errors below before submitting.');
      return;
    }

    // If all validation passes
    setSuccessMessage('Registration successful! Redirecting to login page...');

    setTimeout(() => {
      window.location.href = '/login';
    }, 1500);
  };

  return (
    <main className="min-h-screen w-screen bg-[#07111F] text-[#172033] flex overflow-hidden">
      {/* KIRI: CONTAINER FORM REGISTRASI */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-4 sm:p-8 lg:p-10 relative z-10 overflow-y-auto">
        
        {/* FRAME FORM LIQUID GLASS */}
        <div className="w-full max-w-2xl mx-auto lg:ml-auto lg:mr-8 my-auto p-8 sm:p-11 rounded-3xl bg-gradient-to-b from-white/85 via-white/70 to-white/60 backdrop-blur-2xl border border-white/80 shadow-[0_20px_50px_rgba(7,17,31,0.5),inset_0_2px_4px_rgba(255,255,255,0.9)] relative overflow-hidden">
          
          {/* Header Atas */}
          <div className="mb-6 sm:mb-8 relative z-10">
            <span className="text-xs sm:text-sm text-[#172033] uppercase tracking-widest block mb-1.5 font-bold">
              Register Account
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-wide text-[#172033] uppercase leading-tight">
              PT ANDIMA TRANSPORTINDO
            </h1>
          </div>

          {/* Form Isi Data (noValidate mencegah popup panah/tooltip bawaan browser) */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-5 w-full relative z-10">
            
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#172033] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setFullName(e.target.value);
                  if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
                }}
                className={`w-full px-5 py-3.5 rounded-2xl bg-white/90 text-[#172033] placeholder-[#172033]/50 text-sm sm:text-base focus:outline-none border shadow-sm transition-all ${
                  fieldErrors.fullName
                    ? 'border-red-500 focus:ring-2 focus:ring-red-500/30'
                    : 'border-[#172033]/15 focus:border-[#3B6FF5] focus:ring-2 focus:ring-[#3B6FF5]/30'
                }`}
              />
              {fieldErrors.fullName && (
                <p className="text-red-600 text-xs font-semibold mt-1.5 ml-1">
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#172033] mb-1.5">
                Email Address
              </label>
              <input
                type="text"
                placeholder="username@andima.co.id"
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                className={`w-full px-5 py-3.5 rounded-2xl bg-white/90 text-[#172033] placeholder-[#172033]/50 text-sm sm:text-base focus:outline-none border shadow-sm transition-all ${
                  fieldErrors.email
                    ? 'border-red-500 focus:ring-2 focus:ring-red-500/30'
                    : 'border-[#172033]/15 focus:border-[#3B6FF5] focus:ring-2 focus:ring-[#3B6FF5]/30'
                }`}
              />
              {fieldErrors.email && (
                <p className="text-red-600 text-xs font-semibold mt-1.5 ml-1">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#172033] mb-1.5">
                Username
              </label>
              <input
                type="text"
                placeholder="Enter your registered username"
                value={username}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setUsername(e.target.value);
                  if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: undefined }));
                }}
                className={`w-full px-5 py-3.5 rounded-2xl bg-white/90 text-[#172033] placeholder-[#172033]/50 text-sm sm:text-base focus:outline-none border shadow-sm transition-all ${
                  fieldErrors.username
                    ? 'border-red-500 focus:ring-2 focus:ring-red-500/30'
                    : 'border-[#172033]/15 focus:border-[#3B6FF5] focus:ring-2 focus:ring-[#3B6FF5]/30'
                }`}
              />
              {fieldErrors.username && (
                <p className="text-red-600 text-xs font-semibold mt-1.5 ml-1">
                  {fieldErrors.username}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#172033] mb-1.5">
                Password
              </label>
              <div className="relative w-full">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 10 chars (letters, numbers, symbols)"
                  value={password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  className={`w-full pl-5 pr-12 py-3.5 rounded-2xl bg-white/90 text-[#172033] placeholder-[#172033]/50 text-sm sm:text-base focus:outline-none border shadow-sm transition-all ${
                    fieldErrors.password
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500/30'
                      : 'border-[#172033]/15 focus:border-[#3B6FF5] focus:ring-2 focus:ring-[#3B6FF5]/30'
                  }`}
                />
                
                {/* Toggle Mata Password */}
                <button
                  type="button"
                  onMouseDown={() => setShowPassword(true)}
                  onMouseUp={() => setShowPassword(false)}
                  onMouseLeave={() => setShowPassword(false)}
                  onTouchStart={() => setShowPassword(true)}
                  onTouchEnd={() => setShowPassword(false)}
                  tabIndex={-1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#172033]/60 hover:text-[#172033] p-1 transition-colors focus:outline-none select-none cursor-pointer"
                  aria-label="Hold to show password"
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.8}
                      stroke="currentColor"
                      className="w-5 h-5 text-[#172033]"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.573 16.49 16.638 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.8}
                      stroke="currentColor"
                      className="w-5 h-5 text-[#172033]"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-red-600 text-xs font-semibold mt-1.5 ml-1">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#172033] mb-1.5">
                Phone Number
              </label>
              <input
                type="text"
                placeholder="Max. 12 digits (e.g. 08123456789)"
                value={phoneNumber}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setPhoneNumber(e.target.value);
                  if (fieldErrors.phoneNumber) setFieldErrors((prev) => ({ ...prev, phoneNumber: undefined }));
                }}
                className={`w-full px-5 py-3.5 rounded-2xl bg-white/90 text-[#172033] placeholder-[#172033]/50 text-sm sm:text-base focus:outline-none border shadow-sm transition-all ${
                  fieldErrors.phoneNumber
                    ? 'border-red-500 focus:ring-2 focus:ring-red-500/30'
                    : 'border-[#172033]/15 focus:border-[#3B6FF5] focus:ring-2 focus:ring-[#3B6FF5]/30'
                }`}
              />
              {fieldErrors.phoneNumber && (
                <p className="text-red-600 text-xs font-semibold mt-1.5 ml-1">
                  {fieldErrors.phoneNumber}
                </p>
              )}
            </div>

            {/* General Banner Error & Sukses */}
            {generalError && (
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs sm:text-sm font-semibold">
                {generalError}
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-2xl bg-[#16A37A]/15 border border-[#16A37A]/30 text-[#16A37A] text-xs sm:text-sm font-semibold">
                {successMessage}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-4 px-6 text-[#172033] font-extrabold rounded-2xl text-sm sm:text-base tracking-wider uppercase transition-all mt-6 bg-[#3B6FF5] hover:bg-[#2B5CE5] active:scale-[0.99] shadow-[0_6px_24px_rgba(59,111,245,0.4)] cursor-pointer"
            >
              Register
            </button>
          </form>

          {/* Login Link */}
          <div className="text-center text-xs sm:text-sm text-[#172033] pt-6 relative z-10 font-medium">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-bold text-[#172033] hover:opacity-80 underline transition-opacity"
            >
              Login
            </Link>
          </div>
        </div>
      </div>

      {/* KANAN: BACKGROUND LOGISTICS IMAGE */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=1600&auto=format&fit=crop"
          alt="Cargo Ship Logistics"
          className="w-full h-full object-cover object-right opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0D1B2A] via-[#0D1B2A]/85 via-40% to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07111F] via-transparent to-transparent pointer-events-none" />
      </div>
    </main>
  );
}