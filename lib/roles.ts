import { generateJSON } from "@/lib/gemini";

export const ROLE_CATEGORIES = [
  "Engineering",
  "Design",
  "Data",
  "Product",
  "Marketing",
  "Operations",
  "Sales",
  "Other",
] as const;

export type RoleCategory = (typeof ROLE_CATEGORIES)[number];

const CATEGORY_PATTERNS: Record<RoleCategory, RegExp> = {
  Engineering:
    /engineer|developer|software|architect|sre|devops|backend|frontend|fullstack|full.stack|platform|infrastructure|security|firmware|embedded|mobile|ios|android/i,
  Design:
    /design|ux\b|ui\b|user experience|user interface|visual|figma|sketch|creative/i,
  Data: /\bdata\b|analyst|analytics|\bml\b|machine learning|\bai\b|artificial intelligence|scientist|research|nlp|llm|computer vision/i,
  Product:
    /product manager|\bpm\b|program manager|project manager|scrum master|agile coach|roadmap/i,
  Marketing:
    /marketing|growth|seo|content|brand|social media|demand gen|copywriter|communications/i,
  Operations:
    /operations|\bops\b|support|customer success|customer service|finance|accounting|\bhr\b|human resources|recruiter|recruiting|people ops/i,
  Sales:
    /sales|account executive|\bae\b|business development|\bbdr\b|\bsdr\b|revenue|partnerships/i,
  Other: /.*/,
};

const KNOWN_SKILLS: readonly string[] = [
  // Languages
  "TypeScript",
  "JavaScript",
  "Python",
  "Go",
  "Rust",
  "Java",
  "C++",
  "C#",
  "Ruby",
  "PHP",
  "Swift",
  "Kotlin",
  "Scala",
  "Elixir",
  "Haskell",
  "R",
  // Frontend
  "React",
  "Next.js",
  "Vue",
  "Angular",
  "Svelte",
  "Remix",
  "Astro",
  "Tailwind CSS",
  // Backend
  "Node.js",
  "Express",
  "FastAPI",
  "Django",
  "Flask",
  "Rails",
  "Spring Boot",
  "NestJS",
  // Databases
  "PostgreSQL",
  "MySQL",
  "SQLite",
  "MongoDB",
  "Redis",
  "Elasticsearch",
  "DynamoDB",
  "Cassandra",
  "Snowflake",
  "BigQuery",
  // Cloud & Infra
  "AWS",
  "GCP",
  "Azure",
  "Docker",
  "Kubernetes",
  "Terraform",
  "Pulumi",
  "Ansible",
  "Helm",
  // APIs
  "GraphQL",
  "REST",
  "gRPC",
  "WebSockets",
  // ML / Data
  "PyTorch",
  "TensorFlow",
  "Scikit-learn",
  "Pandas",
  "NumPy",
  "Spark",
  "Airflow",
  "dbt",
  // Tools
  "Git",
  "GitHub Actions",
  "CircleCI",
  "Jenkins",
  "Figma",
  "Jira",
  "Datadog",
  "Sentry",
  "Prometheus",
  "Grafana",
];

export function categorizeRole(title: string): RoleCategory {
  for (const category of ROLE_CATEGORIES.slice(0, -1)) {
    if (CATEGORY_PATTERNS[category].test(title)) return category;
  }
  return "Other";
}

export function normalizeTitle(title: string): string {
  return title
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b(sr\.?|senior)\b/gi, "Senior")
    .replace(/\b(jr\.?|junior)\b/gi, "Junior")
    .replace(/\bstaff\b/gi, "Staff")
    .replace(/\bprincipal\b/gi, "Principal");
}

export function extractKnownSkills(text: string): string[] {
  return KNOWN_SKILLS.filter((skill) =>
    new RegExp(
      `\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "i"
    ).test(text)
  );
}

export async function extractSkillsWithAI(
  description: string
): Promise<string[]> {
  try {
    const result = await generateJSON<{ skills: string[] }>(`
Extract all technical skills, tools, and technologies mentioned in this job description.
Include programming languages, frameworks, platforms, databases, cloud services, and developer tools.
Do not include soft skills or non-technical terms.

Job description:
${description.slice(0, 3000)}

Return: { "skills": ["skill1", "skill2"] }
`);
    return result.skills ?? [];
  } catch {
    return extractKnownSkills(description);
  }
}

export async function analyzePatterns(
  postings: Array<{ title: string; description?: string | null }>,
  verifiedCounts?: {
    totalActive:  number;
    isaCount:     number;
    topRole:      string;
    topRoleCount: number;
    topState:     string;
    topStateCount: number;
  }
): Promise<Array<{ keyword: string; category: string; count: number }>> {
  const combined = postings
    .map((p) => `${p.title}\n${p.description ?? ""}`)
    .join("\n\n")
    .slice(0, 6000);

  const countsBlock = verifiedCounts
    ? `\nVerified counts from the database — your analysis MUST NOT contradict these:\n` +
      `- Total active postings: ${verifiedCounts.totalActive}\n` +
      `- ISA roles: ${verifiedCounts.isaCount} (${Math.round((verifiedCounts.isaCount / Math.max(verifiedCounts.totalActive, 1)) * 100)}% of total)\n` +
      `- Most common role: ${verifiedCounts.topRole} (${verifiedCounts.topRoleCount} postings)\n` +
      `- Top state: ${verifiedCounts.topState} (${verifiedCounts.topStateCount} postings)\n`
    : "";

  const result = await generateJSON<{
    patterns: Array<{ keyword: string; category: string; count: number }>;
  }>(`Analyze ONLY the job postings provided below. Do not reference external knowledge or historical trends. All insights must come strictly from this dataset.
${countsBlock}
Identify the most frequently mentioned skills, tools, technologies, and role types in this real estate job data.
Return the top 50 patterns, ranked by frequency.

Job postings:
${combined}

Return: { "patterns": [{ "keyword": "ISA", "category": "domain", "count": 12 }] }
Valid categories: language, framework, platform, database, tool, cloud, domain`);

  return result.patterns ?? [];
}
