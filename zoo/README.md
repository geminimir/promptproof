# PromptProof Failure Zoo 🎪

A curated collection of real-world LLM failures, anonymized and categorized for learning and prevention.

## Categories

### 🔒 Security & Privacy
- PII leakage in responses
- Prompt injection vulnerabilities
- Unauthorized data exposure

### 💰 Cost & Performance
- Token explosion incidents
- Infinite loop generations
- Rate limit violations

### 🎯 Accuracy & Reliability
- Hallucination patterns
- Inconsistent responses
- Format violations

### 🚨 Safety & Compliance
- Toxic content generation
- Legal/medical advice without disclaimers
- Brand guideline violations

## Case Format

Each case includes:
- **Description**: What went wrong
- **Impact**: Business/user impact
- **Root Cause**: Why it happened
- **Detection**: How it was discovered
- **Prevention**: PromptProof checks that would catch it
- **Lessons**: Key takeaways

## Contributing

Submit your anonymized failure cases via GitHub issues using the template provided.

## Browse Cases

- [Case 001: PII Leak in Support Responses](cases/001-pii-leak.json)
- [Case 002: Cost Explosion from Recursive Prompts](cases/002-cost-explosion.json)
- [Case 003: Inconsistent JSON Schema](cases/003-schema-violation.json)
- [Case 004: Missing Legal Disclaimer](cases/004-disclaimer-missing.json)
- [Case 005: Prompt Injection Attack](cases/005-prompt-injection.json)
- [Case 006: Hallucinated API Responses](cases/006-hallucination.json)
