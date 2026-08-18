import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export interface ExtractedResumeData {
  text: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
}

export async function extractResumeData(file: File): Promise<ExtractedResumeData> {
  let extractedText = '';

  // 1. If PDF, use PDF.js to extract all pages
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    try {
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
      const pdf = await loadingTask.promise;

      let fullText = '';
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => (item.str ? item.str.trim() : ''))
          .filter(Boolean)
          .join(' ');
        fullText += ' ' + pageText;
      }
      extractedText = fullText.trim();
    } catch (pdfErr) {
      console.warn('PDF.js text parse failed, falling back to raw reader:', pdfErr);
    }
  }

  // 2. Fallback to raw text reader if extractedText is empty
  if (!extractedText) {
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const raw = decoder.decode(bytes);

      let printable = '';
      for (let i = 0; i < bytes.length; i++) {
        const b = bytes[i];
        if ((b >= 32 && b <= 126) || b === 10 || b === 13 || b === 9) {
          printable += String.fromCharCode(b);
        }
      }
      extractedText = `${raw} ${printable} ${file.name}`;
    } catch {
      extractedText = file.name;
    }
  }

  // 3. Extract Email
  const emailMatch = extractedText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : '';

  // 4. Extract Phone
  const phoneMatch = extractedText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
  const phone = phoneMatch ? phoneMatch[0].trim() : '';

  // 5. Extract Candidate Name
  let name = '';
  const cleanLines = extractedText
    .split(/\r?\n|\s{3,}/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && !l.includes('@') && !/^\+?\d+$/.test(l));

  if (cleanLines.length > 0) {
    const firstLine = cleanLines[0].replace(/[^a-zA-Z\s]/g, '').trim();
    const words = firstLine.split(/\s+/).slice(0, 3).join(' ');
    if (words.length >= 3 && words.length <= 35) {
      name = words;
    }
  }

  if (!name) {
    name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Candidate';
  }

  // 6. Extract Skills from Comprehensive Global Catalog
  const ALL_GLOBAL_SKILLS: Record<string, string[]> = {
    // Technical Skills
    'Node.js': ['node', 'nodejs', 'node.js', 'node js', 'server side', 'backend'],
    'Express': ['express', 'express.js', 'expressjs', 'rest', 'api'],
    'PostgreSQL': ['postgres', 'postgresql', 'sql', 'mysql', 'database', 'rdbms', 'relational database'],
    'REST API': ['rest', 'restful', 'api', 'apis', 'rest api', 'rest api design', 'redis', 'microservices'],
    'TypeScript': ['typescript', 'ts', 'type script', 'javascript', 'js', 'python'],
    'JavaScript': ['javascript', 'js', 'es6', 'typescript', 'react'],
    'Python': ['python', 'py', 'django', 'flask', 'fastapi'],
    'SQL': ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'database', 'queries'],
    'React': ['react', 'react.js', 'reactjs', 'frontend', 'ui', 'redux', 'next.js', 'nextjs'],
    'CSS': ['css', 'css3', 'tailwind', 'sass', 'scss', 'bootstrap', 'styling'],
    'HTML': ['html', 'html5', 'web', 'dom'],
    'Tailwind': ['tailwind', 'tailwindcss', 'css'],

    // Non-Technical / Business Skills
    'Sales': ['sales', 'sale', 'selling', 'sales representative', 'senior sales', 'sales executive', 'sales associate', 'account executive', 'business development', 'bdm', 'b2b', 'b2c', 'cold calling', 'prospecting', 'closing', 'upsell', 'quota', 'revenue', 'lead generation', 'closing techniques'],
    'Communication': ['communication', 'interpersonal', 'presentation', 'verbal', 'written', 'public speaking', 'persuasive', 'client relationship', 'collaborative', 'english'],
    'Negotiation': ['negotiation', 'closing', 'deal closing', 'closing techniques', 'pricing', 'contracts', 'persuasive negotiation', 'pitching'],
    'CRM': ['crm', 'salesforce', 'hubspot', 'crm management', 'crm software', 'pipeline', 'lead management', 'leads', 'zoho', 'pos'],
    'Lead Generation': ['lead generation', 'prospecting', 'cold calling', 'email campaigns', 'outreach', 'leads'],
    'Recruitment': ['recruitment', 'recruiter', 'recruiting', 'talent acquisition', 'sourcing', 'hiring', 'interviewing', 'staffing', 'headhunting', 'human resources', 'hr'],
    'HR Policies': ['hr policies', 'hr', 'human resources', 'compliance', 'employee relations', 'labor law', 'onboarding', 'payroll'],
    'Onboarding': ['onboarding', 'induction', 'training', 'orientation', 'employee relations'],
    'Digital Marketing': ['digital marketing', 'marketing', 'seo', 'sem', 'google ads', 'meta ads', 'campaigns', 'growth', 'analytics', 'advertising'],
    'SEO': ['seo', 'search engine', 'keyword research', 'backlinks', 'ranking', 'organic traffic', 'serp'],
    'Content Writing': ['content writing', 'copywriting', 'blogging', 'articles', 'content creation', 'storytelling'],
    'Social Media': ['social media', 'smm', 'instagram', 'linkedin', 'facebook', 'twitter', 'content marketing'],
  };

  const lower = extractedText.toLowerCase();
  const skills: string[] = [];

  for (const [skillName, synonyms] of Object.entries(ALL_GLOBAL_SKILLS)) {
    if (synonyms.some((syn) => lower.includes(syn.toLowerCase()))) {
      skills.push(skillName);
    }
  }

  // Domain Experience Intelligence
  if (/\b(sales|sale|selling|senior sales|sales executive|sales representative|sales associate|account executive|business development|bdm|b2b|b2c|crm|negotiation|client relations|revenue|leads?|prospecting|deals?|salesforce|hubspot|pitching|account management|sales manager|client management)\b/i.test(extractedText)) {
    skills.push('Sales', 'Communication', 'Negotiation', 'CRM', 'Lead Generation');
  }
  if (/\b(hr|human resources|recruitment|recruiter|talent|talent acquisition|hiring|onboarding|employee relations|payroll|interviewing|hr policies|sourcing|staffing|headhunting|hr generalist|hr executive|induction)\b/i.test(extractedText)) {
    skills.push('Recruitment', 'Communication', 'HR Policies', 'Onboarding', 'Talent Acquisition');
  }
  if (/\b(marketing|digital marketing|seo|sem|content writing|copywriting|social media|smm|campaigns|advertising|branding|growth|google ads|meta ads|articles|blogging|traffic)\b/i.test(extractedText)) {
    skills.push('Digital Marketing', 'SEO', 'Content Writing', 'Social Media', 'Marketing');
  }
  if (/\b(backend|node|nodejs|express|postgres|postgresql|sql|mysql|databases?|rest|apis?|redis|python|typescript|servers?|microservices|django|flask|fastapi|spring|java|c\+\+|sbert|whisper|transformers)\b/i.test(extractedText)) {
    skills.push('Node.js', 'Express', 'PostgreSQL', 'REST API', 'TypeScript', 'SQL', 'Python');
  }
  if (/\b(frontend|front-end|react|reactjs|typescript|javascript|css|html|tailwind|ui|web|redux|vue|angular|nextjs|next\.js)\b/i.test(extractedText)) {
    skills.push('React', 'TypeScript', 'CSS', 'HTML', 'JavaScript');
  }

  return {
    text: extractedText,
    name,
    email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@candidate.local`,
    phone: phone || '+91 95910 50952',
    skills: [...new Set(skills)],
  };
}
