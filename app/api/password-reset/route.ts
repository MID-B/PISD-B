import { getClientIp } from '@/lib/get-client-ip';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

const EMAIL_REGEX = /^[^\s@]+@andima\.co\.id$/i;
const PASSWORD_STRONG_REGEX = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).+$/;
// Match the more camera-tolerant HRMS attendance matcher. We still require
// multiple supporting template samples (median of the nearest three), rather
// than accepting a match from a single best descriptor.
const FACE_MATCH_THRESHOLD = 0.66;
const TEMPLATE_TOP_MATCHES = 3;
const USERS_PER_PAGE = 1000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const rateLimits = new Map<string, { count: number; expiresAt: number }>();

type ResetAction = 'check-email' | 'check-password' | 'complete';
type RequestBody = {
  action?: unknown;
  email?: unknown;
  password?: unknown;
  embedding?: unknown;
  embeddings?: unknown;
};

function responseError(error: string, status: number, code?: string) {
  return Response.json({ error, ...(code ? { code } : {}) }, { status });
}

function withinRateLimit(request: Request, action: ResetAction) {
  const ip = getClientIp(request.headers) ?? 'unknown';
  const key = `${action}:${ip}`;
  const now = Date.now();
  for (const [storedKey, value] of rateLimits) {
    if (value.expiresAt <= now) rateLimits.delete(storedKey);
  }
  const current = rateLimits.get(key);
  const maxAttempts = action === 'check-email' ? 12 : 6;
  if (!current || current.expiresAt <= now) {
    rateLimits.set(key, { count: 1, expiresAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (current.count >= maxAttempts) return false;
  current.count += 1;
  return true;
}

async function findAuthUserByEmail(email: string) {
  const admin = getSupabaseAdmin();
  for (let page = 1; page <= 1000; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: USERS_PER_PAGE });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.email?.trim().toLowerCase() === email);
    if (user) return user;
    if (data.users.length < USERS_PER_PAGE) return null;
  }
  throw new Error('Auth user search exceeded the pagination safety limit.');
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value)
    && value.length > 0
    && value.every((item) => typeof item === 'number' && Number.isFinite(item));
}

function cosineSimilarity(first: number[], second: number[]) {
  if (first.length !== second.length || first.length === 0) return 0;
  let dot = 0;
  let firstMagnitude = 0;
  let secondMagnitude = 0;
  for (let index = 0; index < first.length; index += 1) {
    dot += first[index] * second[index];
    firstMagnitude += first[index] * first[index];
    secondMagnitude += second[index] * second[index];
  }
  if (firstMagnitude === 0 || secondMagnitude === 0) return 0;
  return Math.max(-1, Math.min(1, dot / (Math.sqrt(firstMagnitude) * Math.sqrt(secondMagnitude))));
}

function templateSimilarity(embedding: number[], descriptors: number[][]) {
  const scores = descriptors
    .filter((descriptor) => descriptor.length === embedding.length)
    .map((descriptor) => cosineSimilarity(embedding, descriptor))
    .sort((first, second) => second - first)
    .slice(0, TEMPLATE_TOP_MATCHES)
    .sort((first, second) => first - second);
  if (scores.length === 0) return 0;
  const middle = Math.floor(scores.length / 2);
  return scores.length % 2 === 0
    ? (scores[middle - 1] + scores[middle]) / 2
    : scores[middle];
}

function validPassword(password: string) {
  const passwordForPolicy = password.trim();
  if (passwordForPolicy.length < 8) return 'The password must be at least 8 characters long.';
  if (passwordForPolicy.length > 15) return 'Password cannot exceed 15 characters.';
  if (!PASSWORD_STRONG_REGEX.test(passwordForPolicy)) {
    return 'The password must contain a combination of letters, numbers, and special characters.';
  }
  return null;
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 100_000) return responseError('Request is too large.', 413);

  let body: RequestBody;
  try {
    body = await request.json() as RequestBody;
  } catch {
    return responseError('Request body must be valid JSON.', 400);
  }

  if (body.action !== 'check-email' && body.action !== 'check-password' && body.action !== 'complete') {
    return responseError('Invalid reset action.', 400);
  }
  const action = body.action as ResetAction;
  if (!withinRateLimit(request, action)) {
    return responseError('Too many attempts. Please wait a few minutes and try again.', 429, 'RATE_LIMITED');
  }

  if (typeof body.email !== 'string') return responseError('Email are required.', 400);
  const email = body.email.trim().toLowerCase();
  if (!email) return responseError('Email are required.', 400);
  if (!EMAIL_REGEX.test(email)) return responseError('Invalid email format (example: name@andima.co.id).', 400);

  try {
    const admin = getSupabaseAdmin();
    const authUser = await findAuthUserByEmail(email);
    if (!authUser) return responseError('Email not found', 404, 'EMAIL_NOT_FOUND');

    if (action === 'check-email') return Response.json({ ok: true });

    if (action === 'check-password') {
      if (typeof body.password !== 'string' || !body.password) {
        return responseError('New password are required.', 400, 'NEW_PASSWORD_REQUIRED');
      }
      const { data: register, error: registerError } = await admin
        .from('b2_register')
        .select('password, auth_user_id')
        .eq('id', authUser.id)
        .eq('email', email)
        .maybeSingle();
      if (registerError) {
        console.error('Password reuse check failed.', { code: registerError.code });
        return responseError('Password could not be checked. Please try again.', 500, 'PASSWORD_CHECK_FAILED');
      }
      if (!register || (register.auth_user_id && register.auth_user_id !== authUser.id)) {
        return responseError('No matching PISD-B account was found for this email.', 404, 'REGISTER_NOT_FOUND');
      }
      if (register.password === body.password) {
        return responseError('You used this password recently, Try a different password', 409, 'PASSWORD_REUSED');
      }
      return Response.json({ ok: true });
    }

    if (typeof body.password !== 'string' || !body.password) {
      return responseError('New password are required.', 400, 'NEW_PASSWORD_REQUIRED');
    }
    const passwordError = validPassword(body.password);
    if (passwordError) return responseError(passwordError, 400, 'PASSWORD_INVALID');
    const embeddings = Array.isArray(body.embeddings)
      ? body.embeddings.every(isNumberArray) ? body.embeddings as number[][] : []
      : isNumberArray(body.embedding) ? [body.embedding] : [];
    if (
      embeddings.length === 0
      || embeddings.length > 8
      || embeddings.some((embedding) => embedding.length > 2048)
    ) {
      return responseError('Live face data is invalid. Please scan again.', 400, 'EMBEDDING_INVALID');
    }

    const { data: template, error: templateError } = await admin
      .from('d3_face_biometric_templates')
      .select('auth_user_id, embedding_model, descriptors')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();
    if (templateError) {
      console.error('Password reset template lookup failed.', { code: templateError.code });
      return responseError('Face template could not be checked. Please try again.', 500, 'TEMPLATE_LOOKUP_FAILED');
    }
    if (!template || template.auth_user_id !== authUser.id) {
      return responseError('Face template is not registered for this email.', 404, 'TEMPLATE_NOT_FOUND');
    }
    if (template.embedding_model !== 'insightface-mobilenet-swish' || !Array.isArray(template.descriptors)) {
      return responseError('The saved face template is not compatible with this scanner.', 409, 'TEMPLATE_INCOMPATIBLE');
    }
    const descriptors = template.descriptors.filter(isNumberArray);
    if (descriptors.length < 5 || descriptors.length > 30) {
      return responseError('The saved face template is incomplete. Contact HR Admin.', 409, 'TEMPLATE_INVALID');
    }

    const frameSimilarities = embeddings.map((embedding) => templateSimilarity(embedding, descriptors));
    frameSimilarities.sort((first, second) => first - second);
    const middle = Math.floor(frameSimilarities.length / 2);
    const similarity = frameSimilarities.length % 2 === 0
      ? (frameSimilarities[middle - 1] + frameSimilarities[middle]) / 2
      : frameSimilarities[middle];
    if (similarity < FACE_MATCH_THRESHOLD) {
      return responseError('Your face does not match the email, please rescan or enter the correct email.', 422, 'FACE_MISMATCH');
    }

    // Registration creates b2_register.id with the Auth UUID. The existing
    // trigger_sync_password trigger also uses NEW.id to update auth.users.
    const { data: register, error: registerLookupError } = await admin
      .from('b2_register')
      .select('id, auth_user_id, email, is_active, password')
      .eq('id', authUser.id)
      .eq('email', email)
      .maybeSingle();
    if (registerLookupError) {
      console.error('Password reset B2 lookup failed.', { code: registerLookupError.code });
      return responseError('Account profile could not be checked. Please try again.', 500, 'REGISTER_LOOKUP_FAILED');
    }
    if (!register || (register.auth_user_id && register.auth_user_id !== authUser.id)) {
      return responseError('No matching PISD-B account was found for this email.', 404, 'REGISTER_NOT_FOUND');
    }
    if (register.is_active === false) {
      return responseError('This account is inactive. Contact HR Admin.', 403, 'ACCOUNT_INACTIVE');
    }
    if (register.password === body.password) {
      return responseError('You used this password recently, Try a different password', 409, 'PASSWORD_REUSED');
    }

    const { data: updatedRegister, error: updateError } = await admin
      .from('b2_register')
      .update({ password: body.password })
      .eq('id', authUser.id)
      .eq('email', email)
      .select('id')
      .maybeSingle();
    if (updateError || !updatedRegister) {
      console.error('Password reset B2 update failed.', { code: updateError?.code });
      return responseError('Password could not be updated. Please try again.', 500, 'PASSWORD_UPDATE_FAILED');
    }

    return Response.json({ ok: true });
  } catch {
    console.error('Password reset API configuration or Auth lookup failed.');
    return responseError('Password reset service is unavailable. Please try again later.', 500, 'RESET_SERVICE_UNAVAILABLE');
  }
}
