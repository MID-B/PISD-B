'use client';

import { createContext, useContext, useEffect, useSyncExternalStore, type ComponentProps, type ReactNode } from 'react';
import { requestTranslation } from '@/lib/i18n/request';
import { supabase } from '@/lib/supabaseClient';
import { isLanguage, localizeMonthLabel, translateUi, type Language } from '@/lib/i18n/messages';

const LANGUAGE_KEY = 'andima-language';
const languageEvent = 'andima-language-change';
let memoryLanguage: Language = 'id';
function subscribeLanguage(listener: () => void) {
  window.addEventListener(languageEvent, listener);
  window.addEventListener('storage', listener);
  return () => { window.removeEventListener(languageEvent, listener); window.removeEventListener('storage', listener); };
}
function storedLanguage(): Language {
  try { const language = localStorage.getItem(LANGUAGE_KEY); return isLanguage(language) ? language : memoryLanguage; } catch { return memoryLanguage; }
}
function setLanguage(next: Language) {
  resumeTranslation();
  memoryLanguage = next;
  try { localStorage.setItem(LANGUAGE_KEY, next); } catch { /* Storage can be disabled. */ }
  window.dispatchEvent(new Event(languageEvent));
}

const listeners = new Set<() => void>();
const cache = new Map<string, string>();
const queue = new Map<string, { text: string; target: Language; protectedTerms: string[] }>();
const pending = new Set<string>();
let timer: ReturnType<typeof setTimeout> | undefined;
let flushing = false;
let blocked = false;
let connection = 'CHECKING';
let userId: string | null = null;
let generation = 0;
const notify = () => listeners.forEach(listener => listener());
function resumeTranslation() {
  if (!blocked || !userId) return;
  blocked = false;
  connection = 'CHECKING';
  notify();
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const textKey = (text: string, target: Language, protectedTerms: string[]) => JSON.stringify([target, text, protectedTerms]);

async function flush() {
  timer = undefined;
  if (flushing || blocked || !queue.size) return;
  flushing = true;
  const version = generation;
  const first = queue.values().next().value!;
  const batch: [string, { text: string; target: Language; protectedTerms: string[] }][] = [];
  let characters = 0;
  for (const entry of queue) {
    if (entry[1].target !== first.target || batch.length >= 40 || characters + entry[1].text.length > 12_000) continue;
    batch.push(entry); characters += entry[1].text.length;
  }
  batch.forEach(([key]) => queue.delete(key));
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || session.user.id !== userId) { blocked = true; connection = 'SIGN_IN_REQUIRED'; return; }
    const protectedTerms = [...new Set(batch.flatMap(([, item]) => item.protectedTerms))].slice(0, 60);
    const { response, result } = await requestTranslation('/api/translate', {
      method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: first.target, texts: batch.map(([, item]) => item.text), protectedTerms }),
      signal: AbortSignal.timeout(15_000),
    });
    if (version !== generation) return;
    if (!response.ok || !Array.isArray(result.translations) || result.translations.length !== batch.length
      || !result.translations.every((value: unknown) => typeof value === 'string')) {
      blocked = true; connection = typeof result.code === 'string' ? result.code : 'TRANSLATOR_UNAVAILABLE';
      return;
    }
    batch.forEach(([key], index) => cache.set(key, result.translations[index]));
    while (cache.size > 2500) cache.delete(cache.keys().next().value!);
    connection = 'READY';
  } catch { if (version === generation) { blocked = true; connection = 'TRANSLATOR_UNAVAILABLE'; } }
  finally {
    batch.forEach(([key]) => pending.delete(key));
    flushing = false;
    if (blocked) { queue.clear(); pending.clear(); }
    notify();
    if (queue.size && !blocked) timer = setTimeout(() => { void flush(); }, 150);
  }
}

function requestText(text: string, target: Language, protectedTerms: string[]) {
  if (blocked || !userId || text.length > 3000 || !/[\p{L}]/u.test(text)
    || /^(?:Rp|IDR|USD)?\s*[\d.,+%\s–—\-/():]+(?:\s*(?:jt|M|K|rb|WIB))?$/i.test(text.trim())) return;
  const key = textKey(text, target, protectedTerms);
  if (cache.has(key) || pending.has(key)) return;
  pending.add(key); queue.set(key, { text, target, protectedTerms });
  if (!timer && !flushing) timer = setTimeout(() => { void flush(); }, 80);
}

const LanguageContext = createContext<Language>('id');
export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(subscribeLanguage, storedLanguage, () => 'id' as Language);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  useEffect(() => {
    window.addEventListener('online', resumeTranslation);
    return () => window.removeEventListener('online', resumeTranslation);
  }, []);
  useEffect(() => {
    let active = true;
    const reset = (id: string | null) => {
      if (!active || id === userId) return;
      userId = id; generation++; cache.clear(); queue.clear(); pending.clear();
      blocked = !id; connection = id ? 'CHECKING' : 'SIGN_IN_REQUIRED'; notify();
    };
    void supabase.auth.getSession().then(({ data }) => { if (active) reset(data.session?.user.id ?? null); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { reset(session?.user.id ?? null); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>;
}

export function useLanguage() { return useContext(LanguageContext); }
export function useUiText() {
  const language = useLanguage();
  return (text: string) => translateUi(text, language) ?? text;
}

export function Text({ children, dynamic = false, protect = [] }: { children: ReactNode; dynamic?: boolean; protect?: string[] }) {
  const language = useLanguage();
  const source = typeof children === 'string' || typeof children === 'number' ? String(children) : null;
  const dictionary = source === null ? undefined : translateUi(source, language);
  const protectedTerms = JSON.stringify(protect);
  const key = source === null ? '' : textKey(source, language, protect);
  const value = useSyncExternalStore(subscribe, () => cache.get(key), () => undefined);
  const state = useSyncExternalStore(subscribe, () => `${userId}:${connection}`, () => '');
  useEffect(() => {
    if (dynamic && source !== null && dictionary === undefined) requestText(source, language, JSON.parse(protectedTerms));
  }, [dynamic, source, dictionary, language, protectedTerms, state]);
  if (source === null) return children;
  if (/^(?:(?:Jan|Feb|Mar|Apr|Mei|May|Jun|Jul|Agu|Aug|Sep|Okt|Oct|Nov|Des|Dec)\s+\d{4})(?:\s*[–—-]\s*(?:Jan|Feb|Mar|Apr|Mei|May|Jun|Jul|Agu|Aug|Sep|Okt|Oct|Nov|Des|Dec)\s+\d{4})?$/.test(source)) return localizeMonthLabel(source, language);
  return dictionary ?? value ?? source;
}

// Attribute-only localization; values, handlers and refs remain owned by the original form.
export function LanguageInput(props: ComponentProps<'input'>) {
  const t = useUiText();
  return <input {...props} placeholder={props.placeholder ? t(props.placeholder) : undefined} aria-label={props['aria-label'] ? t(props['aria-label']) : undefined} title={props.title ? t(props.title) : undefined} />;
}

export function DateText({ value, time = false }: { value: string | null | undefined; time?: boolean }) {
  const language = useLanguage();
  if (!value) return '-';
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00+07:00` : value);
  if (!Number.isFinite(date.getTime())) return '-';
  return new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-GB', {
    timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric',
    ...(time && !dateOnly ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const } : {}),
  }).format(date) + (time && !dateOnly ? ' WIB' : '');
}

export function LanguageSwitcher() {
  const language = useLanguage();
  return <div className="relative flex shrink-0 items-center gap-1" translate="no">
    <div role="group" aria-label={language === 'id' ? 'Bahasa tampilan' : 'Display language'} className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 shadow-2xs">
      {(['en', 'id'] as const).map(item => <button key={item} type="button" lang={item} aria-label={item === 'en' ? 'English' : 'Bahasa Indonesia'} aria-pressed={language === item} onClick={() => setLanguage(item)} className={`h-7 min-w-10 cursor-pointer rounded-lg px-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${language === item ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}>{item.toUpperCase()}</button>)}
    </div>

  </div>;
}
