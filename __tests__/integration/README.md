# Integration Tests

This directory contains database integration tests that run against a real test database.

## Setup

Integration tests require a separate test database. Configure in `.env.test`:

```env
SUPABASE_URL=your-test-project-url
SUPABASE_ANON_KEY=your-test-anon-key
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=test-password
```

## Running Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific integration test file
npm run test:integration -- blueprint-cells.integration.test.ts
```

## Test Database Requirements

1. **Isolated**: Use a separate Supabase project for testing
2. **Seeded**: Have known test data for consistent results
3. **Resettable**: Tests should clean up after themselves

## Writing Integration Tests

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Use real Supabase client (not mocked)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

describe('Blueprint Integration', () => {
  beforeAll(async () => {
    // Setup: Create test data
  })

  afterAll(async () => {
    // Cleanup: Delete test data
  })

  it('creates and retrieves a blueprint', async () => {
    // Test actual database operations
  })
})
```

## Test Categories

### CRUD Operations (`*.crud.test.ts`)
- Create, read, update, delete operations
- Verify data persistence

### RLS Policies (`*.rls.test.ts`)
- Verify row-level security
- Test unauthorized access is blocked

### Foreign Keys (`*.fk.test.ts`)
- Verify referential integrity
- Test cascade deletes

### Migrations (`*.migration.test.ts`)
- Verify schema migrations work correctly
- Test rollback procedures

## Current Status

Integration tests are **planned but not yet implemented**. The structure is in place for future development.

### Priority Integration Tests Needed

1. **Blueprint Cells CRUD** - Test cell creation, updates, deletion
2. **Journey Cells CRUD** - Test cell creation with emotion scores
3. **Entity Links** - Test linking entities across tables
4. **RLS Policies** - Verify authorization is enforced
5. **Cascade Deletes** - Verify related records are cleaned up

## Running in CI/CD

Integration tests should run in a separate pipeline stage:

```yaml
# .github/workflows/test.yml
jobs:
  unit-tests:
    # Fast, run on every push

  integration-tests:
    # Slower, run on PR and main
    needs: unit-tests
    env:
      SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
      SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
```
