---
title: Client-Side Assistant Memory & Customization (Option A)
description: Guide for setting up client-side system prompts and memory files alongside SparkyFitness MCP server prompts.
---

# Client-Side Assistant Memory & Customization (Option A)

While SparkyFitness provides server-side MCP system prompts via the Prompts Protocol (Option B: `sparky_system_prompt`), users can also configure **client-side memory and rules** (Option A) to customize assistant behavior directly in their local IDE or CLI (such as Claude Code, Cursor, Windsurf, or Antigravity).

Client-side memory complements server-side prompts by letting individual users specify personal preferences, workflow rules, or safety guidelines.

---

## Setting Up Client-Side Memory

Depending on your client environment, add system rules or memory using one of the following methods:

### 1. `CLAUDE.md` or `.cursorrules` / `.windsurfrules`

Create a `CLAUDE.md` file in your workspace root or global config directory (e.g. `~/.claude/CLAUDE.md`) containing custom instructions for the AI assistant:

```markdown
# Personal SparkyFitness Assistant Rules

- **Food Logging Safety**: Always search for existing foods before attempting to create a new custom food item. Never create a new custom food without explicit user instruction.
- **Unit Preference**: Default to metric units (`g`, `ml`) unless specified otherwise.
- **Family Sharing**: When searching or logging foods, consider family-shared items as well as personal foods.
```

### 2. Global Agent Instructions (`AGENTS.md`)

If using an agent environment like Antigravity, add rules to your `~/.gemini/config/AGENTS.md` file.

---

## Comparison: Option A (Client-Side) vs. Option B (Server-Side)

| Feature | Option A (Client Memory / `CLAUDE.md`) | Option B (Server-Side MCP Prompts) |
| :--- | :--- | :--- |
| **Location** | Client machine (`CLAUDE.md`, `.cursorrules`) | SparkyFitness Server API (`prompts/get`) |
| **Control** | User-specific, client-bound | Centralized, synchronized across clients |
| **Setup** | Manual file creation per client | Automatic via MCP client prompt fetching |
| **Best Use Case** | Individual preferences & assistant tone | Standard domain rules & tool schemas |
