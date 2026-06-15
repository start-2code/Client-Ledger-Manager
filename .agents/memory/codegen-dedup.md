---
name: Codegen duplicate export fix
description: orval split mode generates TypeScript types that conflict with Zod schema exports, causing TS2308 errors. The post-process script in api-spec/package.json handles this dynamically.
---

## Rule
After running orval, the post-process node script in `lib/api-spec/package.json` reads all export names from `lib/api-zod/src/generated/api.ts` and removes any matching barrel re-export from `lib/api-zod/src/generated/types/index.ts`.

**Why:** orval's `split` mode generates both a Zod schema (`api.ts`) and a TypeScript type (`types/<name>.ts`) for every schema. Both get re-exported from `api-zod/src/index.ts` → `lib/api-zod/src/index.ts`, causing "already exported" TS2308 errors.

**How to apply:** Every time a new OpenAPI schema is added that generates both a Zod shape and a TS type with the same PascalCase name, the dedup script handles it automatically. If you ever change the codegen script, preserve the dynamic dedup logic — do not revert to a hardcoded list of names.
