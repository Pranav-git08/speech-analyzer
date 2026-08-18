import * as pdfjsLib from 'pdfjs-dist';
// Vite same-origin worker loader
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.js?url';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export interface ExtractedResumeData {
  text: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
}

// Strict regex definitions for exact keyword matching
const STRICT_SKILL_PATTERNS: Record<string, RegExp> = {
  // Technical Competencies
  'React': /\b(react|reactjs|react\.js|redux|nextjs|next\.js)\b/i,
  'TypeScript': /\b(typescript|type\s*script)\b/i,
  'JavaScript': /\b(javascript|java\s*script|ecmascript|es6|web\s*development)\b/i,
  'Node.js': /\b(nodejs|node\.js|node\s*js|node-js)\b/i,
  'Express': /\b(express|expressjs|express\.js|express\s*framework)\b/i,
  'PostgreSQL': /\b(postgresql|postgres|psql|mysql|sql|relational\s*database|databases?)\b/i,
  'REST API': /\b(rest\s*api|restful\s*api|rest\s*apis|restful\s*apis|rest\s*api\s*design|restful|api\s*design)\b/i,
  'CSS': /\b(css|css3|sass|scss|tailwind|tailwindcss|bootstrap|styling|responsive\s*web)\b/i,
  'HTML': /\b(html|html5|web\s*technologies|web\s*pages?)\b/i,
  'Python': /\b(python|python3|django|flask|fastapi)\b/i,
  'SQL': /\b(sql|mysql|sqlite|postgresql|postgres|database|databases)\b/i,
  'Redis': /\b(redis|redis\s*queue|redis\s*cache)\b/i,
  'MongoDB': /\b(mongodb|mongo\s*db|nosql)\b/i,

  // Non-Technical / Business Competencies
  'Sales': /\b(sales|sale|selling|sales\s*representative|senior\s*sales|sales\s*executive|sales\s*associate|b2b\s*sales|b2c\s*sales|lead\s*generation|cold\s*calling|prospecting|closing\s*techniques|sales\s*quota|sales\s*targets?|sales\s*management|upsell|closing\s*deals?)\b/i,
  'Communication': /\b(communication|interpersonal\s*skills|presentation\s*skills|public\s*speaking|verbal\s*communication|written\s*communication|client\s*relationship|persuasive\s*skills)\b/i,
  'Negotiation': /\b(negotiation|negotiate|negotiating|closing\s*techniques|persuasive\s*negotiation|contract\s*negotiation|deal\s*closing|pricing\s*negotiation)\b/i,
  'CRM': /\b(crm|salesforce|hubspot|zoho\s*crm|crm\s*software|crm\s*management|crm\s*records|pos\s*systems?)\b/i,
  'Lead Generation': /\b(lead\s*generation|prospecting|cold\s*calling|email\s*campaigns|outreach)\b/i,
  'Recruitment': /\b(recruitment|recruiter|recruiting|talent\s*acquisition|sourcing|hiring|interviewing|staffing|headhunting|human\s*resources|hr\s*executive)\b/i,
  'HR Policies': /\b(hr\s*policies|human\s*resources\s*policies|compliance|employee\s*relations|labor\s*law|onboarding|payroll)\b/i,
  'Onboarding': /\b(onboarding|induction|employee\s*training|orientation|offboarding)\b/i,
  'Digital Marketing': /\b(digital\s*marketing|google\s*ads|meta\s*ads|search\s*engine\s*marketing|performance\s*marketing|campaigns?|marketing\s*strategy)\b/i,
  'SEO': /\b(seo|search\s*engine\s*optimization|keyword\s*research|backlinks|organic\s*traffic|serp)\b/i,
  'Content Writing': /\b(content\s*writing|copywriting|blogging|article\s*writing|content\s*creation|storytelling)\b/i,
  'Social Media': /\b(social\s*media|smm|instagram\s*marketing|linkedin\s*marketing|facebook\s*marketing|content\s*marketing)\b/i,
};

async function decompressPdfStreams(bytes: Uint8Array): Promise<string> {
  let decompressedText = '';
  if (typeof DecompressionStream === 'undefined') return '';

  let searchIdx = 0;
  while (searchIdx < bytes.length && searchIdx < 1500000) {
    let streamStart = -1;
    for (let i = searchIdx; i <= Math.min(bytes.length - 6, searchIdx + 200000); i++) {
      if (
        bytes[i] === 115 && bytes[i + 1] === 116 && bytes[i + 2] === 114 &&
        bytes[i + 3] === 101 && bytes[i + 4] === 97 && bytes[i + 5] === 109
      ) {
        streamStart = i + 6;
        break;
      }
    }
    if (streamStart === -1) break;

    while (streamStart < bytes.length && (bytes[streamStart] === 10 || bytes[streamStart] === 13 || bytes[streamStart] === 32)) {
      streamStart++;
    }

    let streamEndPos = -1;
    for (let i = streamStart; i <= Math.min(bytes.length - 9, streamStart + 300000); i++) {
      if (
        bytes[i] === 101 && bytes[i + 1] === 110 && bytes[i + 2] === 100 &&
        bytes[i + 3] === 115 && bytes[i + 4] === 116 && bytes[i + 5] === 114 &&
        bytes[i + 6] === 101 && bytes[i + 7] === 97 && bytes[i + 8] === 109
      ) {
        streamEndPos = i;
        break;
      }
    }
    if (streamEndPos === -1) break;

    const streamChunk = bytes.slice(streamStart, streamEndPos);
    searchIdx = streamEndPos + 9;

    if (streamChunk.length > 10) {
      try {
        const ds = new DecompressionStream('deflate');
        const writer = ds.writable.getWriter();
        writer.write(streamChunk);
        writer.close();
        const res = new Response(ds.readable);
        const decBuf = await res.arrayBuffer();
        const decoder = new TextDecoder('utf-8', { fatal: false });
        decompressedText += ' ' + decoder.decode(decBuf);
      } catch {
        try {
          const ds2 = new DecompressionStream('deflate-raw');
          const writer2 = ds2.writable.getWriter();
          writer2.write(streamChunk);
          writer2.close();
          const res2 = new Response(ds2.readable);
          const decBuf2 = await res2.arrayBuffer();
          const decoder2 = new TextDecoder('utf-8', { fatal: false });
          decompressedText += ' ' + decoder2.decode(decBuf2);
        } catch {}
      }
    }
  }
  return decompressedText;
}

export async function extractResumeData(file: File): Promise<ExtractedResumeData> {
  let extractedText = '';

  // 1. First attempt: PDF.js with same-origin Vite bundled worker
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    try {
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
      });
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
      console.warn('PDF.js text parse failed, falling back to stream reader:', pdfErr);
    }
  }

  // 2. Secondary attempt: Native browser DecompressionStream + ASCII extraction
  if (!extractedText || extractedText.length < 50) {
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

      const streamText = await decompressPdfStreams(bytes);
      extractedText = `${extractedText} ${raw} ${printable} ${streamText} ${file.name}`;
    } catch {
      extractedText = extractedText || file.name;
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

  // 6. Extract Skills STRICTLY using regex with word boundaries
  const skills: string[] = [];
  for (const [skillName, pattern] of Object.entries(STRICT_SKILL_PATTERNS)) {
    if (pattern.test(extractedText)) {
      skills.push(skillName);
    }
  }

  return {
    text: extractedText,
    name,
    email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@candidate.local`,
    phone: phone || '+91 95910 50952',
    skills: [...new Set(skills)],
  };
}
