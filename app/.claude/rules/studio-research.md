# Claude Rule: Studio Research Mode

**Active when**: Working in `/docs/studio/` or `/app/studio/` directories

---

## Context

You are helping with R&D and conceptual exploration in Jon Friis's Studio space. This is NOT production website development - it's experimental, iterative, paradigm-shaping work.

## Mindset

- **Exploration over execution**: Prioritize thinking, research, and iteration over shipping features
- **Document evolution**: Track how ideas change through iterations
- **Multiple perspectives**: Welcome multi-model collaboration (Claude, Gemini, Codex)
- **Conceptual rigor**: Define terms precisely, create glossaries, map relationships
- **Prototype-grade code**: When building, focus on demonstration not production quality

## Documentation Expectations

### Every Studio Project Must Have

1. **README.md**: Project overview, status, navigation
2. **definitions.md**: Glossary of project-specific terms
3. **Conceptual docs**: Whitepapers, research, iterations
4. **Diagrams**: ERDs, flowcharts, architecture (use Mermaid)

### Documentation Style

- **Verbose is okay**: Studio docs should be comprehensive, not minimal
- **Show your work**: Document reasoning, not just conclusions
- **Link bidirectionally**: Connect related docs explicitly
- **Version important docs**: Track major revisions
- **Use examples**: Provide concrete illustrations of abstract concepts

## Iteration Protocols

When iterating on studio concepts:

1. **Critique previous version**: What worked, what didn't, what's missing
2. **Summarize changes**: Clear statement of what this iteration adds
3. **Maintain lineage**: Link to previous iterations
4. **Update iteration logs**: Track evolution chronologically
5. **Provide directives**: Tell next collaborator what to focus on

## Multi-Model Collaboration

When working with other AI models (Gemini, Codex):

- Read iteration logs to understand what others have contributed
- Build on their work, don't replace it
- Follow iteration guidelines strictly
- Be explicit about your perspective and additions
- Respect the user's feedback about removing baseless elements (like time estimates)

## Research Methodologies

### Hypothesis-Driven Exploration

- State hypotheses explicitly
- Design validation approaches
- Document results (validated, invalidated, or uncertain)
- Pivot based on findings

### Industry Research

- Survey existing approaches
- Identify gaps
- Position the studio work relative to industry state
- Validate concepts with real-world examples

### Worked Examples

- Create concrete scenarios with realistic data
- Show full data flows (input → transformation → output)
- Include metrics and calculations
- Provide "before/after" comparisons

## Prototype Standards

When building prototypes in `/app/studio/`:

- **Demonstrate concepts**: Focus on showing the idea, not perfecting implementation
- **Document learnings**: Track what worked, what didn't, why
- **Make it visible**: Build with intention to showcase on jonfriis.com/studio
- **Keep it separate**: Don't mix studio prototype code with production site code
- **Refactor on promotion**: If prototype becomes a site feature, rebuild with production quality

### Database for Studio Prototypes

- **Use the same Supabase instance** as the main site for simplicity
- **Namespace your tables**: Prefix studio project tables (e.g., `studio_es_tokens`, `studio_prototype_data`)
- **Document schema**: Keep SQL schema definitions in `/docs/studio/{project}/prototype/schema.sql`
- **RLS policies**: Set appropriate policies (typically less strict for prototypes)
- **Clean up**: Mark prototype tables clearly; archive or drop when project spins off or is abandoned

## Artifacts to Create

### Phase 1: Exploration

- Whitepapers (iterate multiple times)
- Research summaries
- Definitions glossary
- Architecture diagrams (ERD, flowcharts, data flows)
- Roadmaps (avoid time estimates, use phase gates)
- Worked examples
- Iteration logs

### Phase 2: Prototype

- Working code demonstrating concept
- Implementation notes
- Technical decisions log
- Performance data
- Demo screenshots/videos
- Lessons learned

### Phase 3: Demonstration

- Live demo on jonfriis.com/studio
- Case study writeup
- Public documentation
- Community feedback log

## Anti-Patterns to Avoid

❌ **Don't**:
- Rush to implementation before concepts are clear
- Create production-grade code in exploration phase
- Mix studio work with site features
- Skip documentation "to move faster"
- Ignore previous iterations in multi-model collaboration
- Add baseless time estimates
- Over-optimize prototypes

✅ **Do**:
- Take time to think deeply and document thoroughly
- Build prototypes only when concepts are well-defined
- Keep studio and site work separate
- Prioritize documentation as first-class output
- Build on previous work respectfully
- Use phase gates and validation criteria instead of timelines
- Focus on demonstrating ideas clearly

## Success Metrics for Studio Work

- **Clarity of thinking**: Are concepts well-defined and understandable?
- **Thoroughness**: Is the exploration comprehensive?
- **Reusability**: Could others learn from or build on this?
- **Evolution**: Does the work show iterative improvement?
- **Demonstration**: Can the concept be shown, not just described?

## Questions to Ask

Before starting studio work:
- What paradigm or thesis am I exploring?
- What's the current state of industry thinking on this?
- What gaps exist that this work addresses?
- What would success look like?

During studio work:
- Am I documenting my thinking, not just conclusions?
- Are my terms well-defined?
- Have I provided concrete examples?
- What would the next collaborator need to know?

Before transitioning phases:
- Is the exploration thorough enough?
- Are concepts validated with worked examples?
- Is the documentation comprehensive?
- What are the explicit transition criteria?

---

**Rule Version**: 1.0
**Last Updated**: 2025-11-22
**Active For**: `/docs/studio/**`, `/app/studio/**`
