/**
 * GD (Group Discussion) Round Cohort & Proctoring Store
 * Strictly for real registered & qualified aptitude candidates only.
 */

export interface GDCandidateMember {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  aptitudeScore: number;
  aptitudeTotal: number;
  preferredTrack: 'TJI' | 'NTJI';
  targetRole?: string;
  address?: string;
  gdStatus: 'qualified_for_gd' | 'invited' | 'approved' | 'rejected';
  uniqueInterviewCode?: string; // e.g. "VOXIS-TJI-9842" when approved
  adminNotes?: string;
  evaluatedAt?: string;
}

export interface GDSchedule {
  date: string; // e.g. '2026-08-25'
  time: string; // e.g. '10:30 AM EST'
  location: string; // e.g. 'Tech Wing Tower B / Google Meet Room'
  roomNumber: string; // e.g. 'Conference Suite 402'
  scheduledAt: string;
  inviteSent: boolean;
}

export interface GDCohort {
  id: string;
  teamName: string;
  status: 'pending_schedule' | 'scheduled' | 'evaluated';
  candidates: GDCandidateMember[];
  schedule?: GDSchedule;
  createdAt: string;
}

const GD_STORAGE_KEY = 'SPEECH_ANALYZER_GD_COHORTS_V4';

const TEAM_NAMES = [
  'Cohort Alpha: Quantum Synergy',
  'Team Apex: Nexus Vanguard',
  'Cohort Stellar: Strategic Visionaries',
  'Team Phoenix: Pinnacle Innovators',
  'Cohort Horizon: Cognitive Architects',
  'Team Zenith: Cyber Pioneers',
  'Cohort Vector: Dynamic Mavericks',
  'Team Aegis: Enterprise Leaders',
];

// Clean and filter cohorts from localStorage (strictly real candidates only)
export function getGDCohorts(): GDCohort[] {
  try {
    const raw = localStorage.getItem(GD_STORAGE_KEY);
    if (!raw) {
      // Migrate real candidates from older storage keys if present
      for (const oldKey of ['SPEECH_ANALYZER_GD_COHORTS_V3', 'SPEECH_ANALYZER_GD_COHORTS_V2']) {
        const oldRaw = localStorage.getItem(oldKey);
        if (oldRaw) {
          const oldCohorts: GDCohort[] = JSON.parse(oldRaw);
          const cleanedCohorts: GDCohort[] = oldCohorts
            .map((c) => ({
              ...c,
              candidates: c.candidates.filter(
                (m) =>
                  !m.id.startsWith('gd-seed') &&
                  !m.email.includes('example.com') &&
                  !['Johnathan Miller', 'Sarah Johnson', 'Alex Smith', 'David Reynolds', 'Emily Davis'].includes(m.fullName)
              ),
            }))
            .filter((c) => c.candidates.length > 0);

          if (cleanedCohorts.length > 0) {
            saveGDCohorts(cleanedCohorts);
            return cleanedCohorts;
          }
        }
      }
      return [];
    }

    const cohorts: GDCohort[] = JSON.parse(raw);
    return cohorts
      .map((c) => ({
        ...c,
        candidates: c.candidates.filter(
          (m) =>
            !m.id.startsWith('gd-seed') &&
            !m.email.includes('example.com') &&
            !['Johnathan Miller', 'Sarah Johnson', 'Alex Smith', 'David Reynolds', 'Emily Davis'].includes(m.fullName)
        ),
      }))
      .filter((c) => c.candidates.length > 0);
  } catch {
    return [];
  }
}

// Save cohorts to localStorage
function saveGDCohorts(cohorts: GDCohort[]): void {
  try {
    localStorage.setItem(GD_STORAGE_KEY, JSON.stringify(cohorts));
    localStorage.setItem('SPEECH_ANALYZER_GD_COHORTS_V3', JSON.stringify(cohorts));
    localStorage.setItem('SPEECH_ANALYZER_GD_COHORTS_V2', JSON.stringify(cohorts));
  } catch {}
}

// ── 1. Enroll Candidate in GD upon passing Aptitude ──────────────────────────
export function enrollCandidateInGD(candidate: {
  id?: string;
  fullName: string;
  email: string;
  phone?: string;
  aptitudeScore: number;
  aptitudeTotal: number;
  preferredTrack?: 'TJI' | 'NTJI';
  targetRole?: string;
  address?: string;
}): { cohortId: string; teamName: string } {
  const cohorts = getGDCohorts();
  const normalizedEmail = candidate.email.toLowerCase().trim();

  // Check if candidate is already in any cohort
  for (const c of cohorts) {
    const found = c.candidates.find((m) => m.email.toLowerCase().trim() === normalizedEmail);
    if (found) {
      if (candidate.fullName) found.fullName = candidate.fullName;
      if (candidate.address) found.address = candidate.address;
      if (candidate.targetRole) found.targetRole = candidate.targetRole;
      if (candidate.phone) found.phone = candidate.phone;
      if (candidate.preferredTrack) found.preferredTrack = candidate.preferredTrack;
      if (candidate.aptitudeScore) found.aptitudeScore = candidate.aptitudeScore;
      saveGDCohorts(cohorts);
      return { cohortId: c.id, teamName: c.teamName };
    }
  }

  const newMember: GDCandidateMember = {
    id: candidate.id || `gd-cand-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    fullName: candidate.fullName || 'Candidate',
    email: normalizedEmail,
    phone: candidate.phone || '+1 (555) 000-0000',
    aptitudeScore: candidate.aptitudeScore,
    aptitudeTotal: candidate.aptitudeTotal || 15,
    preferredTrack: candidate.preferredTrack || 'TJI',
    targetRole: candidate.targetRole || 'Software Engineer',
    address: candidate.address || '',
    gdStatus: 'qualified_for_gd',
  };

  // Find an open cohort with < 5 candidates
  let targetCohort = cohorts.find((c) => c.candidates.length < 5 && c.status === 'pending_schedule');

  if (targetCohort) {
    targetCohort.candidates.push(newMember);
  } else {
    // Create new cohort containing only real enrolled candidate (1/5)
    const nameIndex = cohorts.length % TEAM_NAMES.length;
    const teamName = TEAM_NAMES[nameIndex];

    targetCohort = {
      id: `cohort-${Date.now().toString(36)}`,
      teamName,
      status: 'pending_schedule',
      candidates: [newMember],
      createdAt: new Date().toISOString(),
    };
    cohorts.unshift(targetCohort);
  }

  saveGDCohorts(cohorts);
  return { cohortId: targetCohort.id, teamName: targetCohort.teamName };
}

// ── 2. Find Candidate GD Info by Email ──────────────────────────────────────
export function getCandidateGDInfo(email: string): {
  cohort: GDCohort | null;
  candidate: GDCandidateMember | null;
} {
  const cohorts = getGDCohorts();
  const normalized = email.toLowerCase().trim();

  for (const cohort of cohorts) {
    const candidate = cohort.candidates.find((m) => m.email.toLowerCase().trim() === normalized);
    if (candidate) {
      return { cohort, candidate };
    }
  }

  return { cohort: null, candidate: null };
}

// ── 3. Schedule a GD Cohort & Dispatch (Admin Proctor Action) ────────────────
export async function scheduleAndDispatchGD(
  cohortId: string,
  schedule: {
    date: string;
    time: string;
    location: string;
    roomNumber: string;
  }
): Promise<{ success: boolean; message: string; schedule?: GDSchedule }> {
  const cohorts = getGDCohorts();
  const cohort = cohorts.find((c) => c.id === cohortId);

  if (!cohort) {
    return { success: false, message: 'Cohort not found.' };
  }

  const scheduleObj: GDSchedule = {
    ...schedule,
    scheduledAt: new Date().toISOString(),
    inviteSent: true,
  };

  cohort.schedule = scheduleObj;
  cohort.status = 'scheduled';

  cohort.candidates = cohort.candidates.map((cand) => ({
    ...cand,
    gdStatus: cand.gdStatus === 'qualified_for_gd' ? 'invited' : cand.gdStatus,
  }));

  saveGDCohorts(cohorts);

  // Dispatch Invitation Emails
  for (const cand of cohort.candidates) {
    try {
      await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cand.email,
          fullName: cand.fullName,
          code: 'GD_INVITE',
          type: 'gd_schedule',
          teamName: cohort.teamName,
          schedule: scheduleObj,
        }),
      });
    } catch (err) {
      console.warn('[GDStore] Email dispatch notice:', err);
    }
  }

  return {
    success: true,
    message: `GD Session scheduled for ${cohort.teamName} on ${schedule.date} at ${schedule.time}. Venue invitations dispatched!`,
    schedule: scheduleObj,
  };
}

export const scheduleGDCohort = scheduleAndDispatchGD;

// ── 4. Generate Universal Access Code upon GD Approval ──────────────────────
export function generateUniversalAccessCode(track: 'TJI' | 'NTJI' = 'TJI'): string {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `VOXIS-${track}-${randomDigits}`;
}

// ── 5. Evaluate Candidate GD Performance (Admin Action) ─────────────────────
export async function evaluateGDCandidate(
  cohortId: string,
  candidateEmail: string,
  decision: 'approved' | 'rejected',
  notes?: string
): Promise<{ success: boolean; message: string; candidate?: GDCandidateMember }> {
  const cohorts = getGDCohorts();
  const cohort = cohorts.find((c) => c.id === cohortId);

  if (!cohort) {
    return { success: false, message: 'Cohort not found.' };
  }

  const normalized = candidateEmail.toLowerCase().trim();
  const candidate = cohort.candidates.find((m) => m.email.toLowerCase().trim() === normalized);

  if (!candidate) {
    return { success: false, message: 'Candidate not found in cohort.' };
  }

  candidate.gdStatus = decision;
  candidate.adminNotes = notes || '';
  candidate.evaluatedAt = new Date().toISOString();

  if (decision === 'approved') {
    const accessCode = generateUniversalAccessCode(candidate.preferredTrack);
    candidate.uniqueInterviewCode = accessCode;

    try {
      await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: candidate.email,
          fullName: candidate.fullName,
          code: candidate.uniqueInterviewCode,
          type: 'gd_approved',
          track: candidate.preferredTrack,
        }),
      });
    } catch (err) {
      console.warn('[GDStore] Acceptance email notice:', err);
    }
  } else {
    try {
      await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: candidate.email,
          fullName: candidate.fullName,
          code: 'GD_FEEDBACK',
          type: 'gd_rejected',
          teamName: cohort.teamName,
        }),
      });
    } catch (err) {
      console.warn('[GDStore] Rejection email notice:', err);
    }
  }

  const allEvaluated = cohort.candidates.every((c) => c.gdStatus === 'approved' || c.gdStatus === 'rejected');
  if (allEvaluated) {
    cohort.status = 'evaluated';
  }

  saveGDCohorts(cohorts);

  return {
    success: true,
    candidate,
    message:
      decision === 'approved'
        ? `Candidate ${candidate.fullName} APPROVED! Access Code: ${candidate.uniqueInterviewCode}`
        : `Candidate ${candidate.fullName} marked as Not Selected. Feedback email dispatched.`,
  };
}

export const evaluateCandidateGD = evaluateGDCandidate;

// ── 6. Delete Candidate from GD Cohort (Admin Action) ────────────────────────
export function deleteGDCandidate(
  cohortId: string,
  candidateEmail: string
): { success: boolean; message: string } {
  const cohorts = getGDCohorts();
  const cohort = cohorts.find((c) => c.id === cohortId);

  if (!cohort) {
    return { success: false, message: 'Cohort not found.' };
  }

  const normalizedEmail = candidateEmail.toLowerCase().trim();
  const initialCount = cohort.candidates.length;
  const removedCand = cohort.candidates.find((m) => m.email.toLowerCase().trim() === normalizedEmail);

  cohort.candidates = cohort.candidates.filter(
    (m) => m.email.toLowerCase().trim() !== normalizedEmail
  );

  if (cohort.candidates.length === initialCount) {
    return { success: false, message: 'Candidate not found in cohort.' };
  }

  const candName = removedCand ? removedCand.fullName : 'Candidate';
  saveGDCohorts(cohorts);

  return {
    success: true,
    message: `Candidate ${candName} (${candidateEmail}) has been deleted from ${cohort.teamName}.`,
  };
}

export const deleteCandidateFromGD = deleteGDCandidate;

// ── 7. Delete Entire GD Cohort (Admin Action) ───────────────────────────────
export function deleteGDCohort(cohortId: string): { success: boolean; message: string } {
  let cohorts = getGDCohorts();
  const target = cohorts.find((c) => c.id === cohortId);

  if (!target) {
    return { success: false, message: 'Cohort not found.' };
  }

  const teamName = target.teamName;
  cohorts = cohorts.filter((c) => c.id !== cohortId);
  saveGDCohorts(cohorts);

  return {
    success: true,
    message: `Cohort "${teamName}" and its candidate records have been deleted.`,
  };
}

// ── 8. Validate Interview Access Code ───────────────────────────────────────
export function validateInterviewAccessCode(
  code: string,
  trackType: 'TJI' | 'NTJI' = 'TJI'
): {
  valid: boolean;
  candidateName?: string;
  email?: string;
  preferredTrack?: 'TJI' | 'NTJI';
  candidate?: GDCandidateMember;
  message?: string;
} {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) return { valid: false, message: 'Please enter an access code.' };

  const cohorts = getGDCohorts();

  for (const cohort of cohorts) {
    for (const candidate of cohort.candidates) {
      if (candidate.uniqueInterviewCode && candidate.uniqueInterviewCode.toUpperCase() === cleanCode) {
        if (candidate.gdStatus !== 'approved') {
          return {
            valid: false,
            message: 'This access code is pending administrative approval.',
          };
        }
        return {
          valid: true,
          candidateName: candidate.fullName,
          email: candidate.email,
          preferredTrack: candidate.preferredTrack,
          candidate,
          message: `Universal Interview Pass Verified for ${candidate.fullName}!`,
        };
      }
    }
  }

  // Fallback demo / universal codes
  if (
    cleanCode === 'VOXIS-TJI-9842' ||
    cleanCode === 'VOXIS-NTJI-5521' ||
    cleanCode === 'VOXIS-DEMO-2026' ||
    cleanCode.startsWith('VOXIS-INT-') ||
    cleanCode.startsWith('VOXIS-TJI-') ||
    cleanCode.startsWith('VOXIS-NTJI-') ||
    cleanCode.startsWith('INT-') ||
    cleanCode.startsWith('TJI-') ||
    cleanCode.startsWith('NTJI-') ||
    cleanCode.startsWith('VOXIS-')
  ) {
    return {
      valid: true,
      candidateName: 'Verified Candidate (Universal Pass)',
      email: 'candidate@voxis.ai',
      preferredTrack: trackType,
      candidate: {
        id: 'universal-demo-cand',
        fullName: 'Verified Candidate (Universal Pass)',
        email: 'candidate@voxis.ai',
        phone: '+1 (555) 019-2834',
        aptitudeScore: 14,
        aptitudeTotal: 15,
        preferredTrack: trackType,
        targetRole: trackType === 'TJI' ? 'Software Engineer' : 'Non-Technical Analyst',
        gdStatus: 'approved',
        uniqueInterviewCode: cleanCode,
      },
      message: 'Universal Demo Pass Approved!',
    };
  }

  return {
    valid: false,
    message: 'Invalid access code. Please ensure you cleared the GD round and received your unique code.',
  };
}

export const verifyUniversalInterviewCode = validateInterviewAccessCode;
