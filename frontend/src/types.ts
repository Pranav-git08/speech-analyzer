export type Track = 'TJI' | 'NTJI';
export type QuestionType = 'oral' | 'code_snippet';
export type RoundType = 'technical' | 'qualifying' | 'hr';

export interface JobRole {
  id: string;
  name: string;
  track: Track;
  requiredSkills: string[];
}

export interface ResumeData {
  name: string;
  phone: string;
  email: string;
  skills: string[];
  experience: { company: string; role: string; duration: string; description: string }[];
  projects: { title: string; description: string; technologies: string[] }[];
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  skill: string;
  codeTemplate?: string;
  language?: string;
}

export interface EvaluationResult {
  questionId: string;
  grade: 'pass' | 'poor';
  score: number;
  matchedKeywords: string[];
  feedback: string;
}
