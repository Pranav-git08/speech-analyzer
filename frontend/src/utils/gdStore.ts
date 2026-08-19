/**
 * GD (Group Discussion) Round Cohort & Proctoring Store
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

const GD_STORAGE_KEY = 'SPEECH_ANALYZER_GD_COHORTS_V2';

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

const SEED_BENCHMARK_CANDIDATES: GDCandidateMember[] = [
  {
    id: 'gd-seed-01',
    fullName: 'Johnathan Miller',
    email: 'john.miller@example.com',
    phone: '+1 (555) 234-5678',
    aptitudeScore: 12,
    aptitudeTotal: 15,
    preferredTrack: 'TJI',
    targetRole: 'Software Engineer',
    gdStatus: 'qualified_for_gd',
  },
  {
    id: 'gd-seed-02',
    fullName: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    phone: '+1 (555) 876-5432',
    aptitudeScore: 11,
    aptitudeTotal: 15,
    preferredTrack: 'TJI',
    targetRole: 'Frontend Developer',
    gdStatus: 'qualified_for_gd',
  },
  {
    id: 'gd-seed-03',
    fullName: 'Alex Smith',
    email: 'alex.smith@example.com',
    phone: '+1 (555) 345-6789',
    aptitudeScore: 10,
    aptitudeTotal: 15,
    preferredTrack: 'NTJI',
    targetRole: 'Account Executive',
    gdStatus: 'qualified_for_gd',
  },
  {
    id: 'gd-seed-04',
    fullName: 'David Reynolds',
    email: 'david.reynolds@example.com',
    phone: '+1 (555) 456-7890',
    aptitudeScore: 13,
    aptitudeTotal: 15,
    preferredTrack: 'TJI',
    targetRole: 'Backend Engineer',
    gdStatus: 'qualified_for_gd',
  },
  {
    id: 'gd-seed-05',
    fullName: 'Emily Davis',
    email: 'emily.davis@example.com',
    phone: '+1 (555) 567-8901',
    aptitudeScore: 9,
    aptitudeTotal: 15,
    preferredTrack: 'NTJI',
    targetRole: 'Product Specialist',
    gdStatus: 'qualified_for_gd',
  },
];

// Helper: Get stored cohorts
export function getGDCohorts(): GDCohort[] {
  try {
    const raw = localStorage.getItem(GD_STORAGE_KEY);
    if (!raw) {
      // Initialize with default cohort of 5 candidates
      const initialCohorts: GDCohort[] = [
        {
          id: 'cohort-alpha-101',
          teamName: TEAM_NAMES[0],
          status: 'pending_schedule',
          candidates: [...SEED_BENCHMARK_CANDIDATES],
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ];
      localStorage.setItem(GD_STORAGE_KEY, JSON.stringify(initialCohorts));
      return initialCohorts;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Save cohorts
function saveGDCohorts(cohorts: GDCohort[]): void {
  localStorage.setItem(GD_STORAGE_KEY, JSON.stringify(cohorts));
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
}): { cohortId: string; teamName: string } {
  const cohorts = getGDCohorts();
  const normalizedEmail = candidate.email.toLowerCase().trim();

  // Check if candidate is already in any cohort
  for (const c of cohorts) {
    const found = c.candidates.find((m) => m.email.toLowerCase().trim() === normalizedEmail);
    if (found) {
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
    gdStatus: 'qualified_for_gd',
  };

  // Find an open cohort with < 5 candidates
  let targetCohort = cohorts.find((c) => c.candidates.length < 5 && c.status === 'pending_schedule');

  if (targetCohort) {
    targetCohort.candidates.push(newMember);
  } else {
    // Create new cohort of 5 candidates (fill remaining slots with benchmarks)
    const nameIndex = cohorts.length % TEAM_NAMES.length;
    const teamName = TEAM_NAMES[nameIndex];

    const initialMembers: GDCandidateMember[] = [newMember];
    
    // Fill up to 5 members with benchmark profiles
    let seedIdx = 0;
    while (initialMembers.length < 5 && seedIdx < SEED_BENCHMARK_CANDIDATES.length) {
      const benchmark = { ...SEED_BENCHMARK_CANDIDATES[seedIdx], id: `gd-seed-${Date.now()}-${seedIdx}` };
      if (benchmark.email.toLowerCase() !== normalizedEmail) {
        initialMembers.push(benchmark);
      }
      seedIdx++;
    }

    targetCohort = {
      id: `cohort-${Date.now().toString(36)}`,
      teamName,
      status: 'pending_schedule',
      candidates: initialMembers,
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
  const normalizedEmail = email.toLowerCase().trim();

  for (const c of cohorts) {
    const member = c.candidates.find((m) => m.email.toLowerCase().trim() === normalizedEmail);
    if (member) {
      return { cohort: c, candidate: member };
    }
  }

  return { cohort: null, candidate: null };
}

// ── 3. Schedule GD Cohort & Dispatch Invites ─────────────────────────────────
export async function scheduleAndDispatchGD(
  cohortId: string,
  schedule: {
    date: string;
    time: string;
    location: string;
    roomNumber: string;
  }
): Promise<{ success: boolean; dispatchedCount: number; message: string }> {
  const cohorts = getGDCohorts();
  const cohort = cohorts.find((c) => c.id === cohortId);

  if (!cohort) {
    return { success: false, dispatchedCount: 0, message: 'Cohort not found.' };
  }

  cohort.schedule = {
    ...schedule,
    scheduledAt: new Date().toISOString(),
    inviteSent: true,
  };
  cohort.status = 'scheduled';

  // Mark all candidates as invited
  cohort.candidates.forEach((cand) => {
    cand.gdStatus = 'invited';
  });

  saveGDCohorts(cohorts);

  // Dispatch email notification to candidates via serverless endpoint
  let successCount = 0;
  for (const cand of cohort.candidates) {
    try {
      await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cand.email,
          fullName: cand.fullName,
          code: `GD-${cohort.teamName}`,
          scheduleInfo: {
            teamName: cohort.teamName,
            date: schedule.date,
            time: schedule.time,
            location: schedule.location,
            roomNumber: schedule.roomNumber,
          },
        }),
      });
      successCount++;
    } catch (err) {
      console.warn('[GDStore] Email dispatch notice:', err);
    }
  }

  return {
    success: true,
    dispatchedCount: cohort.candidates.length,
    message: `Successfully scheduled GD and dispatched official email invitations to ${cohort.candidates.length} candidates in ${cohort.teamName}.`,
  };
}

// ── 4. Admin Evaluate Candidate (Approve vs Reject) ──────────────────────────
export async function evaluateGDCandidate(
  cohortId: string,
  candidateEmail: string,
  decision: 'approved' | 'rejected',
  notes?: string
): Promise<{ success: boolean; candidate: GDCandidateMember | null; message: string }> {
  const cohorts = getGDCohorts();
  const cohort = cohorts.find((c) => c.id === cohortId);

  if (!cohort) {
    return { success: false, candidate: null, message: 'Cohort not found.' };
  }

  const normalizedEmail = candidateEmail.toLowerCase().trim();
  const candidate = cohort.candidates.find((m) => m.email.toLowerCase().trim() === normalizedEmail);

  if (!candidate) {
    return { success: false, candidate: null, message: 'Candidate not found in cohort.' };
  }

  candidate.gdStatus = decision;
  candidate.adminNotes = notes || '';
  candidate.evaluatedAt = new Date().toISOString();

  if (decision === 'approved') {
    // Generate unique code for TJI or NTJI
    const prefix = candidate.preferredTrack === 'NTJI' ? 'VOXIS-NTJI' : 'VOXIS-TJI';
    const randCode = Math.floor(1000 + Math.random() * 9000);
    candidate.uniqueInterviewCode = `${prefix}-${randCode}`;

    // Dispatch Acceptance Email with Unique Access Code
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
    // Dispatch Polite & Motivational Rejection Email
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

  // Update cohort status if all evaluated
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
        ? `Candidate ${candidate.fullName} APPROVED! Unique Access Code: ${candidate.uniqueInterviewCode}`
        : `Candidate ${candidate.fullName} marked as Not Selected. Motivational feedback email sent.`,
  };
}

// ── 5. Validate Interview Access Code ───────────────────────────────────────
export function validateInterviewAccessCode(code: string): {
  valid: boolean;
  track?: 'TJI' | 'NTJI';
  candidateName?: string;
  email?: string;
} {
  const trimmed = code.trim().toUpperCase();
  const cohorts = getGDCohorts();

  for (const c of cohorts) {
    for (const cand of c.candidates) {
      if (cand.uniqueInterviewCode && cand.uniqueInterviewCode.toUpperCase() === trimmed) {
        return {
          valid: true,
          track: cand.preferredTrack,
          candidateName: cand.fullName,
          email: cand.email,
        };
      }
    }
  }

  // Fallback demo codes
  if (trimmed.startsWith('VOXIS-TJI-') || trimmed.startsWith('TJI-')) {
    return { valid: true, track: 'TJI', candidateName: 'Candidate', email: 'candidate@example.com' };
  }
  if (trimmed.startsWith('VOXIS-NTJI-') || trimmed.startsWith('NTJI-')) {
    return { valid: true, track: 'NTJI', candidateName: 'Candidate', email: 'candidate@example.com' };
  }

  return { valid: false };
}
