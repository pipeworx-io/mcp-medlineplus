# @pipeworx/medlineplus

MedlinePlus MCP — NIH/NLM consumer health information service. Connect coded clinical data (ICD-10-CM, SNOMED CT, RxCUI, LOINC, NDC, MeSH, gene symbols) to plain-language health topic pages. No auth.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

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

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/medlineplus/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Medlineplus data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/connect \
  -H 'Content-Type: application/json' \
  -d '{"code":"J00","code_system":"ICD-10-CM"}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/connect`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.
