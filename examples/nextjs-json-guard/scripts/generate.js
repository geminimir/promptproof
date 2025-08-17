/**
 * Deterministic generator (no API calls) so CI is fast & stable.
 * Usage: node scripts/generate.js bad|good
 */
const mode = process.argv[2] || "bad";

// Create a proper PromptProof record
const record = {
  schema_version: "pp.v1",
  id: `example-${mode}-${Date.now()}`,
  timestamp: new Date().toISOString(),
  source: "example",
  input: {
    prompt: "Generate a blog post summary about OpenAI's latest model",
    params: {
      model: "gpt-4",
      temperature: 0.7
    }
  },
  output: {
    json: mode === "bad" ? {
      title: "OpenAI's latest model update",
      summary: "A short summary under 280 chars.",
      date: null,
      tags: "ai, llm"
    } : {
      title: "OpenAI's latest model update", 
      summary: "A short summary under 280 chars.",
      date: "2025-01-16",
      tags: ["ai", "llm"]
    }
  },
  metrics: {
    latency_ms: 850,
    cost_usd: 0.0012,
    input_tokens: 15,
    output_tokens: 25
  },
  redaction: {
    status: "sanitized"
  }
};

// Output as JSONL (single line)
console.log(JSON.stringify(record));
