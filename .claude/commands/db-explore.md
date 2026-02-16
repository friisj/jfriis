---
description: Explore database schema and data. Use when you need to understand the current DB state.
allowed-tools: "Bash, Read, Glob, Grep, mcp__jfriis__db_list_tables, mcp__jfriis__db_query, mcp__jfriis__db_get"
---

# Database Explorer

Explore the current database schema and data using the MCP tools.

## Steps

1. List all tables:
   - Use `mcp__jfriis__db_list_tables` to get the full table list

2. If $ARGUMENTS specifies a table or topic:
   - Query that specific table with `mcp__jfriis__db_query`
   - Show schema (columns, types) and sample data (limit 5 rows)
   - Show row count
   - Check for related tables (foreign keys, naming patterns)

3. If no arguments, provide an overview:
   - Group tables by namespace (site, studio_, cog_)
   - Show row counts for each
   - Identify the core entity tables

4. Report findings in a clear, organized format with table structures.
