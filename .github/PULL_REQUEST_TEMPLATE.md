## What changed and why

<!-- Brief description of the change and its motivation -->

## Pre-merge checklist

- [ ] `npm run typecheck` passes locally (`npx tsc --noEmit`)
- [ ] `npm run lint` passes locally
- [ ] CI checks (typecheck / lint / build) are green

### If schema changed
- [ ] New migration created with idempotent SQL (`IF NOT EXISTS`, `IF EXISTS`)
- [ ] Migration applied locally and `prisma migrate resolve` run if needed
- [ ] Every new camelCase field has `@map("snake_case")` in schema
- [ ] `DATA.md` updated to reflect schema changes

### If API route added or changed
- [ ] `app/api/groups/[groupId]/route.ts` response shape reflected in `GroupContextType`
- [ ] New fields included in relevant API mappers

### If a new server component queries Prisma
- [ ] Either `export const dynamic = "force-dynamic"` is set, **or**
- [ ] `generateStaticParams` wraps Prisma calls in try/catch returning `[]`
