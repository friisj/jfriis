# Claude Rule: Site Development Mode

**Active when**: Working in `/app`, `/components`, `/lib`, `/public`, `/docs/site/` directories (NOT `/app/studio` or `/docs/studio`)

---

## Context

You are helping build and maintain jonfriis.com - Jon Friis's personal website and portfolio. This is production code that serves real users.

## Mindset

- **Ship features**: Focus on delivering working, polished functionality
- **Production quality**: Write clean, tested, performant code
- **User experience**: Prioritize accessibility, performance, usability
- **Pragmatic decisions**: Choose proven patterns over novel experiments
- **Maintainability**: Code should be readable and easy to modify

## Code Quality Standards

### Required for All Code

- **TypeScript**: Strict mode, proper typing
- **Accessibility**: WCAG AA minimum (AAA where feasible)
- **Performance**: Core Web Vitals targets met
- **Responsive**: Mobile-first, tested across breakpoints
- **Error handling**: Graceful degradation, user-friendly messages

### Next.js Best Practices

- Use App Router conventions
- Server components by default
- Client components only when needed (interactivity, browser APIs)
- Proper loading and error states
- Route groups for organization
- Metadata for SEO

### Component Patterns

- Composition over configuration
- Props interfaces clearly defined
- Reusable, focused components
- Co-locate styles and logic
- Use Radix UI primitives where appropriate

## Documentation Style

Site documentation should be:

- **Concise**: Implementation-focused, not verbose
- **Actionable**: Clear next steps and TODOs
- **Current**: Kept in sync with code
- **Linked**: Connect related features and decisions

### Key Site Docs

- `/docs/site/ROADMAP.md`: Feature planning and priorities
- `/docs/site/ARCHITECTURE.md`: Technical decisions and patterns
- `/docs/site/FEATURES.md`: User-facing capabilities
- Component-level docs: In-file JSDoc comments

## Design System (Site-Specific)

The site has its own design system (separate from Studio/Experience Systems work):

- **Colors**: Defined in `/app/globals.css` and Tailwind config
- **Typography**: Type scale and font choices
- **Spacing**: Consistent rhythm
- **Components**: Reusable UI building blocks

**Important**: Don't confuse site design tokens with Studio/Experience Systems concepts. They're separate concerns.

## Feature Development Workflow

### 1. Plan
- Check `/docs/site/ROADMAP.md` for priorities
- Understand user need and success criteria
- Identify affected components and routes

### 2. Implement
- Write TypeScript with proper types
- Follow Next.js conventions
- Use existing components where possible
- Add new components to `/components/site/` if reusable

### 3. Test
- Manual testing across breakpoints
- Accessibility audit (keyboard nav, screen reader, color contrast)
- Performance check (Lighthouse)
- Error states and edge cases

### 4. Document
- Update ROADMAP if completing a feature
- Add JSDoc comments for complex logic
- Update ARCHITECTURE if making significant decisions
- Keep inline comments minimal and meaningful

### 5. Deploy
- Ensure build succeeds
- Check Vercel preview deployment
- Verify in production after merge

## Performance Budgets

- **First Contentful Paint**: < 1.8s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **Time to Interactive**: < 3.8s
- **JavaScript bundle**: < 200KB (gzipped)

## Accessibility Requirements

- Semantic HTML
- Proper heading hierarchy
- Keyboard navigation support
- Focus indicators visible
- Color contrast WCAG AA minimum
- Alt text for images
- ARIA labels where needed
- Screen reader tested for key flows

## Database & API Patterns

- Use Prisma ORM for database access
- Server actions for mutations when possible
- API routes for external integrations or complex operations
- Proper error handling and validation
- Security: input sanitization, auth checks

## Admin Interface Standards

Admin pages (projects, specimens, backlog, logs):

- Consistent layout and navigation
- Table-based data display with sorting/filtering
- Form validation with clear error messages
- Confirmation dialogs for destructive actions
- Loading states during async operations

## Styling Guidelines

- Tailwind CSS for styling
- Use design tokens from config
- Avoid arbitrary values when possible
- Component-scoped styles in same file
- Responsive by default (mobile-first)

## Git Workflow

### Commit Messages

Format: `<type>: <description>`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code restructure, no behavior change
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Tooling, dependencies

Example: `feat: add project filtering to admin interface`

### Branch Strategy

- `main`: Production-ready code
- Feature branches: `feature/description`
- Bug fixes: `fix/description`
- Hotfixes: `hotfix/description`

## Anti-Patterns to Avoid

❌ **Don't**:
- Mix studio experiments with site code
- Skip accessibility considerations
- Ignore performance budgets
- Leave TODOs without tracking
- Use `any` types in TypeScript
- Inline complex logic without comments
- Create duplicate components

✅ **Do**:
- Keep site and studio work separate
- Test accessibility early and often
- Profile performance before optimizing
- Track TODOs in ROADMAP or issues
- Use proper TypeScript types
- Extract complex logic to utils with tests
- Reuse existing components

## Common Tasks

### Adding a New Page

1. Create route in `/app/(site)/[route]/page.tsx`
2. Add metadata export for SEO
3. Build page with existing components
4. Test responsive layout
5. Check accessibility
6. Update navigation if needed

### Creating a New Component

1. Decide: site-specific or shared?
2. Place in `/components/site/` or `/components/shared/`
3. Define TypeScript interface for props
4. Implement with Tailwind classes
5. Add JSDoc comments
6. Test in isolation and in context

### Updating Database Schema

1. Modify Prisma schema
2. Run `npx prisma migrate dev`
3. Update affected queries/mutations
4. Test data flow thoroughly
5. Document breaking changes if any

## Questions to Ask

Before building a feature:
- Is this user-facing or admin-only?
- What's the happy path and error states?
- Does this affect existing features?
- What are the accessibility considerations?

During development:
- Am I using the right component primitives?
- Is this performant enough?
- Have I tested keyboard navigation?
- Is this code readable and maintainable?

Before merging:
- Does the build pass?
- Are there console errors or warnings?
- Have I tested on mobile?
- Is the deployment preview looking correct?

---

**Rule Version**: 1.0
**Last Updated**: 2025-11-22
**Active For**: `/app/**` (except `/app/studio`), `/components/**`, `/lib/**`, `/docs/site/**`
