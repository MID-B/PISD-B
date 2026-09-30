// Local demo authentication only; replace with server authentication for production.
export const DEMO_EMAIL = 'smki@andima.co.id';
export const DEMO_PASSWORD = 'Smki123!@#';
const ACCOUNTS_KEY = 'andima.demo.accounts.v1';
const SESSION_KEY = 'andima.demo.session.v1';

type Profile = {
  fullName: string;
  email: string;
  phone: string;
  employmentStatus: string;
  positionId: string;
  departementId: string;
};
type Account = Profile & { employeeId: string; passwordHash: string };

function readAccounts(): Account[] {
  return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
}

async function hashPassword(password: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function registerDummyAccount(profile: Profile, password: string) {
  const email = profile.email.trim().toLowerCase();
  const accounts = readAccounts();
  if ([DEMO_EMAIL, 'manajemen@andima.co.id'].includes(email) || accounts.some(account => account.email === email)) {
    throw new Error('Email sudah terdaftar. Gunakan email lain atau masuk melalui login.');
  }
  const account: Account = {
    ...profile, email,
    employeeId: `DEMO-${crypto.randomUUID()}`,
    passwordHash: await hashPassword(password),
  };
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, account]));
  return account.employeeId;
}

export async function loginDummyAccount(emailInput: string, password: string) {
  const email = emailInput.trim().toLowerCase();
  let fullName = 'Admin SMKI';
  const isDemo = (email === DEMO_EMAIL && password === DEMO_PASSWORD) ||
    (email === 'manajemen@andima.co.id' && password === 'Manajemen123!@#');
  if (!isDemo) {
    const account = readAccounts().find(account => account.email === email);
    if (!account || account.passwordHash !== await hashPassword(password)) return false;
    fullName = account.fullName;
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email, fullName, role: 'SMKI' }));
  return true;
}

export function logoutDummyAccount() {
  sessionStorage.removeItem(SESSION_KEY);
}
