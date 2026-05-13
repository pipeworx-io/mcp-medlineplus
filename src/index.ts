interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * MedlinePlus MCP — NIH consumer health info
 *
 * Two underlying services:
 *  - Connect API: map clinical codes (ICD-10-CM, SNOMED, RxNorm, LOINC, …) to
 *    MedlinePlus topic pages.
 *  - NLM Web Search: free-text search across MedlinePlus + other NLM databases.
 *
 * Both are keyless.
 */


const CONNECT_BASE = 'https://connect.medlineplus.gov/service';
const WSEARCH_BASE = 'https://wsearch.nlm.nih.gov/ws/query';

// Common code system short names → official OIDs
const CODE_SYSTEM_OIDS: Record<string, string> = {
  'ICD-9-CM': '2.16.840.1.113883.6.103',
  ICD9: '2.16.840.1.113883.6.103',
  'ICD-10-CM': '2.16.840.1.113883.6.90',
  ICD10: '2.16.840.1.113883.6.90',
  'ICD-10-PCS': '2.16.840.1.113883.6.4',
  SNOMED: '2.16.840.1.113883.6.96',
  'SNOMED CT': '2.16.840.1.113883.6.96',
  RXNORM: '2.16.840.1.113883.6.88',
  RxNorm: '2.16.840.1.113883.6.88',
  LOINC: '2.16.840.1.113883.6.1',
  NDC: '2.16.840.1.113883.6.69',
  MESH: '2.16.840.1.113883.6.177',
  MeSH: '2.16.840.1.113883.6.177',
  HGNC: '2.16.840.1.113883.6.282',
  GENE: '2.16.840.1.113883.6.282',
};

const tools: McpToolExport['tools'] = [
  {
    name: 'connect',
    description:
      'Map a clinical code (ICD-10-CM, SNOMED CT, RxCUI, LOINC, NDC, MeSH, HGNC) to MedlinePlus consumer-health topics.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code value (e.g. "J00" for ICD-10-CM acute nasopharyngitis)' },
        code_system: {
          type: 'string',
          description: 'Short name or OID — ICD-10-CM | SNOMED | RxNorm | LOINC | NDC | MeSH | HGNC | ICD-9-CM',
        },
        lang: { type: 'string', description: 'en (default) | es' },
      },
      required: ['code', 'code_system'],
    },
  },
  {
    name: 'search',
    description: 'Free-text search across MedlinePlus topics (or related NLM databases).',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        db: { type: 'string', description: 'healthTopics (default) | healthTopicsSpanish | drug | herb | meshhd | genetic' },
        limit: { type: 'number', description: '1-100 (default 10)' },
        retstart: { type: 'number', description: '0-based offset' },
        knowledge_response_type: { type: 'string', description: 'application/json (default) | application/xml' },
      },
      required: ['query'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'connect':
      return connect(args);
    case 'search':
      return search(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function connect(args: Record<string, unknown>) {
  const code = reqStr(args, 'code', '"J00"');
  const sysIn = reqStr(args, 'code_system', '"ICD-10-CM"');
  const oid = /^[0-9.]+$/.test(sysIn) ? sysIn : CODE_SYSTEM_OIDS[sysIn] ?? CODE_SYSTEM_OIDS[sysIn.toUpperCase()];
  if (!oid) {
    throw new Error(`Unknown code_system "${sysIn}". Supported: ${Object.keys(CODE_SYSTEM_OIDS).slice(0, 8).join(', ')}, or pass the OID directly.`);
  }
  const params = new URLSearchParams({
    'mainSearchCriteria.v.cs': oid,
    'mainSearchCriteria.v.c': code,
    'informationRecipient.languageCode.c': String(args.lang ?? 'en'),
    knowledgeResponseType: 'application/json',
  });
  const res = await fetch(`${CONNECT_BASE}?${params}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'pipeworx-mcp-medlineplus/1.0 (+https://pipeworx.io)',
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`MedlinePlus Connect error: ${res.status} ${t.slice(0, 200)}`);
  }
  return res.json();
}

async function search(args: Record<string, unknown>) {
  const params = new URLSearchParams({
    db: String(args.db ?? 'healthTopics'),
    term: reqStr(args, 'query', '"diabetes"'),
    rettype: 'brief',
    retmax: String(Math.min(100, Math.max(1, (args.limit as number) ?? 10))),
    retstart: String(Math.max(0, (args.retstart as number) ?? 0)),
  });
  const res = await fetch(`${WSEARCH_BASE}?${params}`, {
    headers: {
      Accept: 'application/xml',
      'User-Agent': 'pipeworx-mcp-medlineplus/1.0 (+https://pipeworx.io)',
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`MedlinePlus search error: ${res.status} ${t.slice(0, 200)}`);
  }
  const xml = await res.text();
  return parseWsearchXml(xml);
}

interface SearchResult {
  rank?: number;
  url?: string;
  title?: string;
  snippet?: string;
  organization?: string;
}

// NLM wsearch returns XML; parse out the documents.
function parseWsearchXml(xml: string) {
  const count = Number(/count=["'](\d+)["']/.exec(xml)?.[1] ?? '0');
  const total = Number(/<count>(\d+)<\/count>/.exec(xml)?.[1] ?? count);
  const docs: SearchResult[] = [];
  const docRe = /<document(?:\s+rank=["'](\d+)["'])?[^>]*?(?:\s+url=["']([^"']+)["'])?[^>]*>([\s\S]*?)<\/document>/g;
  for (const m of xml.matchAll(docRe)) {
    const rank = m[1] ? Number(m[1]) : undefined;
    const url = m[2];
    const inner = m[3];
    const fields: Record<string, string> = {};
    const fieldRe = /<content name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/content>/g;
    for (const f of inner.matchAll(fieldRe)) {
      fields[f[1]] = stripTags(f[2]);
    }
    docs.push({
      rank,
      url,
      title: fields.title,
      snippet: fields.snippet ?? fields.FullSummary,
      organization: fields.organizationName,
    });
  }
  return { total, returned: docs.length, results: docs };
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) {
    throw new Error(`Required argument "${key}" is missing. Pass a string like ${example}.`);
  }
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
