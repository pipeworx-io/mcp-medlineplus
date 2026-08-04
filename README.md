# @pipeworx/medlineplus

MedlinePlus MCP — NIH/NLM consumer health information service. Connect coded clinical data (ICD-10-CM, SNOMED CT, RxCUI, LOINC, NDC, MeSH, gene symbols) to plain-language health topic pages. No auth.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

- `connect(code, code_system, lang?)` — Connect API: map a clinical code to MedlinePlus topics
- `search(query, limit?, retstart?, db?, knowledge_response_type?)` — web search across MedlinePlus topics

## Code system OIDs (for `connect`)

- `2.16.840.1.113883.6.103` — ICD-9-CM
- `2.16.840.1.113883.6.90` — ICD-10-CM
- `2.16.840.1.113883.6.96` — SNOMED CT
- `2.16.840.1.113883.6.88` — RxNorm (RxCUI)
- `2.16.840.1.113883.6.1`  — LOINC
- `2.16.840.1.113883.6.69` — NDC
- `2.16.840.1.113883.6.177` — MeSH
- `2.16.840.1.113883.6.282` — HGNC (gene)

The pack accepts the short name (e.g. `"ICD-10-CM"`, `"SNOMED"`, `"RxNorm"`) and resolves to the OID.

## Data source

- Connect: `https://connect.medlineplus.gov/service`
- Search: `https://wsearch.nlm.nih.gov/ws/query` (NLM Web Search)

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "medlineplus": {
      "url": "https://gateway.pipeworx.io/medlineplus/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Medlineplus data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
