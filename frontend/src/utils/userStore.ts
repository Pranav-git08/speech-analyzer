import { Track } from '../types';

export interface RegisteredCandidate {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  preferredTrack: Track;
  targetRole: string;
  experienceLevel: string;
  collegeOrCompany?: string;
  registeredAt: string;
}

export interface RegisterCandidateInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  preferredTrack: Track;
  targetRole: string;
  experienceLevel: string;
  collegeOrCompany?: string;
}

const USERS_STORAGE_KEY = 'SPEECH_ANALYZER_REGISTERED_USERS';
const CURRENT_USER_KEY = 'SPEECH_ANALYZER_CURRENT_USER';

// Simple client-side hash function for secure local persistence
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'h_' + Math.abs(hash).toString(16);
}

const DEFAULT_SEEDED_USERS: RegisteredCandidate[] = [
  {
    id: 'user-pranav-01',
    fullName: 'Srinivas Pranav Vaidyam',
    email: 'pranavvaidyam08@gmail.com',
    phone: '+91 95910 50952',
    passwordHash: simpleHash('password123'),
    preferredTrack: 'TJI',
    targetRole: 'Frontend Developer',
    experienceLevel: '1-3 Years',
    collegeOrCompany: 'TechVision Solutions',
    registeredAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'user-vishal-02',
    fullName: 'Vishal Tore',
    email: 'vishal.tore@devmail.com',
    phone: '+91 98201 44321',
    passwordHash: simpleHash('password123'),
    preferredTrack: 'TJI',
    targetRole: 'Backend Developer',
    experienceLevel: '3-5 Years',
    collegeOrCompany: 'DevWorks Inc',
    registeredAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'user-ranjana-03',
    fullName: 'Ranjana Mane',
    email: 'ranjana.mane@techvision.com',
    phone: '+91 97654 32109',
    passwordHash: simpleHash('password123'),
    preferredTrack: 'NTJI',
    targetRole: 'Senior Sales Executive',
    experienceLevel: '3-5 Years',
    collegeOrCompany: 'TechVision Solutions Pvt. Ltd.',
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
    if (!input.password || input.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    // STRICT UNIQUE EMAIL VALIDATION
    if (isEmailRegistered(normalizedEmail)) {
      return {
        success: false,
        error: `An account with the email "${normalizedEmail}" is already registered. Please log in instead or use another email.`,
      };
    }

    const newUser: RegisteredCandidate = {
      id: `user-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: input.fullName.trim(),
      email: normalizedEmail,
      phone: input.phone.trim() || '+91 95910 50952',
      passwordHash: simpleHash(input.password),
      preferredTrack: input.preferredTrack,
      targetRole: input.targetRole || (input.preferredTrack === 'TJI' ? 'Frontend Developer' : 'Senior Sales Executive'),
      experienceLevel: input.experienceLevel || '1-3 Years',
      collegeOrCompany: input.collegeOrCompany?.trim(),
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
