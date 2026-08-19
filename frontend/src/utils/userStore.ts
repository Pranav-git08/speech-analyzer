import { Track } from '../types';

export interface RegisteredCandidate {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  isVerified: boolean;
  preferredTrack?: Track;
  targetRole?: string;
  registeredAt: string;
}

export interface RegisterCandidateInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

const USERS_STORAGE_KEY = 'SPEECH_ANALYZER_REGISTERED_USERS_V2';
const CURRENT_USER_KEY = 'SPEECH_ANALYZER_CURRENT_USER_V2';
const OTP_STORAGE_KEY = 'SPEECH_ANALYZER_PENDING_OTP';

// Simple client-side hash function for secure local persistence
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(16);
}

const DEFAULT_SEEDED_USERS: RegisteredCandidate[] = [
  {
    id: 'user-john-01',
    fullName: 'Johnathan Miller',
    email: 'john.miller@example.com',
    phone: '+1 (555) 234-5678',
    passwordHash: simpleHash('password123'),
    isVerified: true,
    preferredTrack: 'TJI',
    targetRole: 'Software Engineer',
    registeredAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'user-sarah-02',
    fullName: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    phone: '+1 (555) 876-5432',
    passwordHash: simpleHash('password123'),
    isVerified: true,
    preferredTrack: 'TJI',
    targetRole: 'Frontend Developer',
    registeredAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'user-alex-03',
    fullName: 'Alex Smith',
    email: 'alex.smith@example.com',
    phone: '+1 (555) 345-6789',
    passwordHash: simpleHash('password123'),
    isVerified: true,
    preferredTrack: 'NTJI',
    targetRole: 'Account Executive',
    registeredAt: new Date(Date.now() - 259200000).toISOString(),
  },
];

export function getAllRegisteredUsers(): RegisteredCandidate[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_SEEDED_USERS));
      return DEFAULT_SEEDED_USERS;
    }
    const parsed: RegisteredCandidate[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_SEEDED_USERS;
  } catch {
    return DEFAULT_SEEDED_USERS;
  }
}

export function isEmailRegistered(email: string): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  const users = getAllRegisteredUsers();
  return users.some((u) => u.email.toLowerCase().trim() === normalized);
}

// ── OTP System ─────────────────────────────────────────────────────────────
export interface PendingOTP {
  email: string;
  phone: string;
  code: string;
  expiresAt: number;
}

export function sendRegistrationOTP(email: string, phone: string): string {
  const normalized = email.toLowerCase().trim();
  // Generate random 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const pending: PendingOTP = {
    email: normalized,
    phone: phone.trim(),
    code,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes expiry
  };
  localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(pending));
  console.log(`[OTP] Generated verification code for ${normalized}: ${code}`);
  return code;
}

export function getPendingOTP(): PendingOTP | null {
  try {
    const raw = localStorage.getItem(OTP_STORAGE_KEY);
    if (!raw) return null;
    const parsed: PendingOTP = JSON.parse(raw);
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(OTP_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function verifyRegistrationOTP(email: string, userCode: string): { valid: boolean; error?: string } {
  const normalized = email.toLowerCase().trim();
  const pending = getPendingOTP();

  if (!pending) {
    return { valid: false, error: 'No active OTP found. Please request a new verification code.' };
  }
  if (pending.email !== normalized) {
    return { valid: false, error: 'OTP is for a different email address.' };
  }
  if (pending.code !== userCode.trim()) {
    return { valid: false, error: 'Invalid 6-digit OTP code. Please check and try again.' };
  }

  // Clear OTP after successful verification
  localStorage.removeItem(OTP_STORAGE_KEY);
  return { valid: true };
}

// ── Candidate Registration & Login ──────────────────────────────────────────
export function registerCandidate(input: RegisterCandidateInput): {
  success: boolean;
  user?: RegisteredCandidate;
  error?: string;
} {
  try {
    const normalizedEmail = input.email.toLowerCase().trim();
    if (!normalizedEmail) {
      return { success: false, error: 'Email address is required.' };
    }
    if (!input.fullName.trim()) {
      return { success: false, error: 'Full name is required.' };
    }
    if (!input.phone.trim()) {
      return { success: false, error: 'Phone number is required.' };
    }
    if (!input.password || input.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    // STRICT UNIQUE EMAIL VALIDATION
    if (isEmailRegistered(normalizedEmail)) {
      return {
        success: false,
        error: `An account with the email "${normalizedEmail}" is already registered. Please log in instead.`,
      };
    }

    const newUser: RegisteredCandidate = {
      id: `user-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: input.fullName.trim(),
      email: normalizedEmail,
      phone: input.phone.trim(),
      passwordHash: simpleHash(input.password),
      isVerified: true,
      preferredTrack: 'TJI',
      targetRole: 'Software Engineer',
      registeredAt: new Date().toISOString(),
    };

    const currentList = getAllRegisteredUsers();
    const updatedList = [newUser, ...currentList];
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedList));

    // Automatically set current session
    setCurrentUser(newUser);

    console.log('[UserStore] Successfully registered candidate:', newUser.fullName, newUser.email);
    return { success: true, user: newUser };
  } catch (err) {
    console.error('[UserStore] Registration failed:', err);
    return { success: false, error: 'An unexpected error occurred during registration. Please try again.' };
  }
}

export function loginCandidate(
  email: string,
  password: string
): { success: boolean; user?: RegisteredCandidate; error?: string } {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail) {
      return { success: false, error: 'Please provide your email address.' };
    }
    if (!password) {
      return { success: false, error: 'Please enter your password.' };
    }

    const users = getAllRegisteredUsers();
    const found = users.find((u) => u.email.toLowerCase().trim() === normalizedEmail);

    if (!found) {
      return {
        success: false,
        error: `No registered account found with email "${normalizedEmail}". Please register first.`,
      };
    }

    const hash = simpleHash(password);
    if (found.passwordHash !== hash) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    setCurrentUser(found);
    return { success: true, user: found };
  } catch (err) {
    console.error('[UserStore] Login failed:', err);
    return { success: false, error: 'Login encountered an error. Please try again.' };
  }
}

export function getCurrentUser(): RegisteredCandidate | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: RegisteredCandidate | null): void {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (err) {
    console.warn('[UserStore] Failed to set current user:', err);
  }
}

export function logoutUser(): void {
  try {
    localStorage.removeItem(CURRENT_USER_KEY);
  } catch (err) {
    console.warn('[UserStore] Failed to logout user:', err);
  }
}
