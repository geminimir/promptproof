# json-essentials@0.1.0

Baseline JSON validity, required keys, ISO date, max length, and array shape guards.

Perfect for validating LLM-generated JSON outputs in Next.js apps, APIs, and serverless functions.

## Quick Install

```yaml
# promptproof.yaml
includes:
  - name: json-essentials
    version: 0.1.0
```

Or via CLI (if supported):
```bash
promptproof pack add json-essentials@0.1.0
```

## What it includes

✅ **json-valid** - Basic JSON structure validation  
✅ **required-keys** - Ensures title and summary are present  
✅ **summary-length** - Summary between 10-280 characters  
✅ **title-length** - Title between 3-120 characters  
✅ **iso-date** - Date in YYYY-MM-DD format  
✅ **tags-array** - Tags as array (max 5 items)  
✅ **no-null-empty** - No null values in key fields  
✅ **no-unsafe-strings-lite** - Basic XSS protection  

## Example Usage

```json
// ✅ This passes all rules
{
  "title": "OpenAI's latest model update",
  "summary": "A comprehensive summary of the new features and improvements.",
  "date": "2025-01-16",
  "tags": ["ai", "llm", "openai"]
}

// ❌ This fails multiple rules
{
  "title": "Hi",           // Too short
  "summary": null,         // Null value
  "date": "2025/01/16",    // Wrong date format
  "tags": "ai, llm"        // String instead of array
}
```

## Perfect for

- Next.js API routes returning JSON
- LangChain output validation
- Serverless function responses
- RAG system outputs
- Content generation pipelines

## Customization

Copy `pack.yml` to your project and modify rules as needed:

```yaml
# Add your own rules
checks:
  - include: json-essentials@0.1.0
  - id: custom-validation
    type: json_schema
    target: json
    schema:
      # Your custom schema
```
