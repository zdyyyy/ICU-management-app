# PubMed literature Q&A: `literature.js` → `literatureQAService.js` → `pubmedClient.js`

## Layered architecture

| Layer | File | Responsibility |
|-------|------|----------------|
| HTTP | `src/routes/literature.js` | Validate body, rate-limit, call `askLiterature`, return JSON |
| Orchestration / RAG | `src/services/literatureQAService.js` | Build search query → PubMed search → fetch abstracts → grounded answer |
| Data source | `src/services/pubmedClient.js` | NCBI `esearch` / `efetch`, parse XML into article records |

## Call graph (Mermaid)

Use a Mermaid preview extension in VS Code / Cursor, or paste the diagram into the [Mermaid Live Editor](https://mermaid.live).

```mermaid
flowchart TB
  subgraph route["literature.js"]
    POST["POST /ask + rateLimit"]
    POST --> askLit["literatureQAService.askLiterature"]
  end

  subgraph qa["literatureQAService.js"]
    askLit --> buildQ["buildPubMedSearchQuery"]
    buildQ --> OAI1["OpenAI: build PubMed query string"]
    askLit --> searchPM["pubmedClient.searchPubMed"]
    askLit --> slice["pool.slice → top N PMIDs"]
    slice --> fetchA["pubmedClient.fetchArticlesByPmids"]
    askLit --> ans["answerFromRetrievedPapers"]
    ans --> fmt["formatContextForPrompt"]
    ans --> OAI2["OpenAI: answer from excerpts only"]
  end

  subgraph pm["pubmedClient.js"]
    searchPM --> b1["buildUrl + commonParams"]
    b1 --> ES["NCBI esearch.fcgi"]
    fetchA --> b2["buildUrl + commonParams"]
    b2 --> EF["NCBI efetch.fcgi XML"]
    EF --> ext["extractArticlesFromPubmedXml"]
    ext --> st["stripTags / decodeXmlEntities"]
  end
```

## pubmedClient internals

- `searchPubMed` → `commonParams` + `buildUrl` → `fetch(esearch)`
- `fetchArticlesByPmids` → `commonParams` + `buildUrl` → `fetch(efetch)` → `extractArticlesFromPubmedXml`
- `extractArticlesFromPubmedXml` applies `stripTags` and `decodeXmlEntities` to each `<PubmedArticle>` block

`literatureQAService` exports `askLiterature` only; other functions are internal helpers for that flow.
