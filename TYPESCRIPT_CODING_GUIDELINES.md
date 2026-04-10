# TypeScript Coding Guidelines

## 1. General Principles

1. Clarity over cleverness.
   Prefer code that is easy to read, review, and maintain over compact or overly abstract code.
2. Type safety first.
   Use TypeScript to prevent invalid states, not just to annotate values after the fact.
3. Explicit business intent.
   Domain code should make bill, identity, company, contact, and minting flows easy to follow.
4. Immutable by default.
   Use `const` by default. Avoid mutating objects and arrays unless mutation is clearly the best option.
5. Small, composable units.
   Favor focused functions and focused components. Avoid mixing rendering, fetching, data shaping, and side effects in one place.
6. Normalize data before JSX.
   Perform data normalization and mapping before the render tree. Avoid embedding business transformations directly inside JSX expressions.
7. Accessibility is part of correctness.
   Invalid interactive nesting, missing labels, and keyboard traps are bugs, not polish issues.
8. Optimize after correctness.
   Prefer correctness, readability, and stable behavior before performance tuning.
9. Validate at the boundary.
   API responses, URL params, persisted storage data, and uploaded file metadata should be parsed and validated at the boundary before entering domain logic.

## 2. Tooling and Formatting

These are the current repo-level expectations:

- TypeScript `strict` mode is enabled.
- ESLint is the primary automated style gate.
- Prettier is used for formatting and is checked in CI.
- React Hooks rules are enforced.
- Vitest is used for unit/component tests.
- Vite is the app bundler and React Query is the primary server-state layer.

Guidelines:

1. Run `npm run lint` before merging non-trivial changes.
2. Keep lines reasonably short. Target about 100 characters where practical.
3. Use 2 spaces for new or substantially rewritten files. Preserve local file consistency for small targeted edits.
4. Keep imports sorted by the configured ESLint groups.
5. Prefer code comments only where intent is not obvious from the code.
6. Use JSDoc sparingly for exported utilities whose behavior is not obvious.

Note:

- Prettier is present in the repo and checked in CI.
- Formatting consistency should still be improved incrementally as touched files are updated.

## 3. Naming Conventions

1. Use `PascalCase` for React components, types, and type aliases.
2. Use `camelCase` for variables, functions, hooks, and object properties.
3. Use `SCREAMING_SNAKE_CASE` for true constants.
4. Use descriptive names. Avoid abbreviations unless they are domain-standard, such as `id`, `qr`, `api`, `intl`.
5. Prefix event props with `on...` and local handlers with `handle...`.
6. Name booleans so the state reads clearly, such as `isPending`, `hasSignature`, `canSwitch`.

## 4. TypeScript Rules

1. Prefer `interface` for object and props shapes (e.g., `export interface FooProps`),
   and prefer `type` for unions, primitive aliases, and utility/conditional types.
2. Prefer discriminated unions over multiple boolean flags for UI and async state.
   Discriminated unions must be handled exhaustively — use `switch` + `assertNever(...)` (or equivalent) for impossible states.
3. Prefer narrow types over broad `string`, `number`, and `object`.
4. Prefer `as const` and `satisfies` for constant maps and finite value sets.
5. Avoid `any`.
6. Avoid unsafe assertions such as `as Foo` and non-null assertions like `value!` unless there is a strong, documented reason.
7. Use `import type` for type-only imports.
8. Prefer `ReadonlyArray<T>` in shared or derived data structures that should not be mutated.
9. Be explicit at module boundaries:
   Public utilities, service adapters, serializers, and reusable hooks should have explicit input and return types.
10. Use `undefined` to omit fields in payloads. Use `null` only when the absence of a value is itself meaningful and expected by the API.
11. Do not add `.ts` or `.tsx` file extensions to local imports unless the toolchain specifically requires it.

## 5. Functions and Domain Logic

1. A function should do one thing well.
2. Prefer passing a single object argument when a function needs more than two parameters or has optional parameters.
3. Keep pure data transformation separate from side effects such as navigation, toasts, storage, and API calls.
4. Domain transformations should live close to the feature they belong to.
   `src/utils` is for cross-feature, domain-agnostic helpers only. If logic knows about bill, company, contact, or identity semantics, it should live in the owning feature or service module.
5. Avoid hidden dependencies on global state, `window`, or storage inside utility functions.
6. Prefer early returns over deep nesting.
7. Error handling should preserve useful context. Do not swallow service errors silently.

## 6. React Components

1. Prefer function components with typed props.
2. Do not use `React.FC` by default.
3. Keep presentational components mostly stateless.
4. Put data fetching and mutation logic in page/container components or dedicated hooks, not in low-level UI components.
5. Keep component props small and intention-revealing.
6. Prefer composition over prop explosion.
7. Avoid creating deeply nested conditional JSX in one return block. Extract branches into helper components when needed.
8. Avoid invalid interactive nesting.
   If a `Button` needs to render a link, use `asChild` and render the anchor as the button element.
9. Preserve consistent visual primitives.
   Reuse shared components such as `Button`, `Text`, `Property`, `Page`, `Topbar`, and `BottomNavigation` before introducing one-off variants.

## 7. State, Effects, and Data Fetching

1. Server state belongs in React Query.
2. Form state belongs in React Hook Form.
3. Local UI state belongs in component state.
4. Global client state should be used sparingly.
   In this repo, Context is acceptable for truly cross-cutting state such as identity/session concerns.
5. Effects should be minimal and justified.
   If logic can be derived during render, prefer deriving it over adding an effect.
6. Keep `useEffect` dependency arrays correct. Do not suppress hook warnings casually.
7. Query keys must be stable and descriptive.
8. In mutations, handle both success and failure paths explicitly.
9. In async UI flows, guard against partial state updates, stale closures, and in-flight race conditions.

## 8. Project Structure and Imports

Current repo patterns:

- Shared building blocks live under `src/components`.
- Feature screens and flows live under `src/pages`.
- Constants live under `src/constants`.
- Cross-feature utilities live under `src/utils`.
- Import alias `@/` points to `src/`.

Guidelines:

1. Collocate feature-specific code near the feature that owns it.
2. Use relative imports for nearby files in the same feature.
3. Use `@/` imports for cross-feature or shared modules.
4. Avoid long relative paths like `../../../../foo` when an alias would be clearer.
5. Keep module public surfaces deliberate. Do not create index files that re-export everything by default without a clear reason.
6. Default exports are allowed for route/page entry points only. Prefer named exports everywhere else.

## 9. Styling and UI Composition

1. Follow the existing design system first.
   This codebase already uses Tailwind utility classes, Radix primitives, and shared typography/button components.
2. Prefer shared design tokens and semantic classes over ad hoc one-off values.
3. Use `cn(...)` for conditional class composition.
4. Do not introduce duplicate variants when an existing `Button`, `Text`, or layout wrapper can be extended safely.
5. Handle mobile, PWA, and safe-area behavior deliberately.
   Bottom navigation, dialogs, fixed buttons, and scroll hints must account for viewport and safe-area constraints.
6. Keep visual state predictable across desktop, mobile browser, and standalone PWA.
7. When using truncation, ensure interactive and non-text content still renders correctly.
   Not every value should go through a text truncation helper.

## 10. Forms, Validation, and Uploads

1. Use React Hook Form for non-trivial forms.
2. Keep form field names aligned with payload shape.
3. Validation rules should be explicit and as close to the field definition as practical.
4. Async upload flows must preserve source-of-truth IDs through submit.
5. Do not make destructive behavior implicit.
   File previews should not clear files on generic click; removal must be explicit.
6. Disable submit when required async prerequisites are still in flight.
7. When payload fields are optional, omit them intentionally instead of sending empty strings unless the backend contract requires empty strings.

## 11. Internationalization

1. User-facing strings must use `FormattedMessage` or `useIntl`.
2. New strings should include useful `description` text.
3. Do not hardcode user-facing copy in components unless there is a strong technical reason.
4. Keep message IDs stable and descriptive.

## 12. Accessibility

1. Every interactive control must have an accessible name.
2. Do not nest interactive elements.
3. Disabled visual state and semantic disabled state must stay aligned.
4. Respect keyboard navigation and focus visibility.
5. Decorative icons should be hidden from assistive technology when appropriate.
6. Dialogs, popovers, and drawers must preserve focus and escape behavior.

## 13. Testing

1. Add or update tests for behavior changes, not only for happy paths.
2. Prefer Vitest for component and utility behavior.
3. Use Playwright for user flows, cross-browser behavior, and PWA-sensitive behavior.
4. Test the bug you fixed.
   If the issue was a race condition, safe-area issue, or accessibility regression, cover that specific failure mode where practical.
5. Avoid brittle snapshot-style assertions for dynamic UI unless they provide real value.
6. Mock only the boundary you need. Over-mocking reduces confidence.

## 14. Error Handling and Observability

1. Fail loudly enough to debug, but gracefully enough for the user.
2. Convert service-layer failures into clear UI behavior:
   toast, fallback UI, disabled action, retry path, or redirect.
3. Include actionable context in thrown errors.
4. Remove temporary logs after debugging.
5. Avoid leaving silent failure branches in async code.

## 15. Performance

1. Do not optimize speculatively.
2. Avoid unnecessary renders caused by unstable objects, functions, or large derived values.
3. Memoization is not the default.
   Use it only when there is a measured or clearly reasoned need.
4. Prefer efficient list rendering and stable keys.
5. Consider network churn and cache headers in PWA paths, service worker assets, and root app shell routes.

## 16. Documentation and Code Review

1. Document non-obvious architectural decisions in markdown near the repo root or relevant feature.
2. PRs should explain behavior change, risk, and verification.
3. Review for:
   correctness,
   edge cases,
   accessibility,
   i18n,
   mobile/PWA behavior,
   tests,
   and maintainability.

## 17. Current Repo Standards Already Enforced

These are already partially or fully enforced today:

- TypeScript strict mode
- React Hooks lint rules
- no unused locals
- no fallthrough in switch statements
- no unused parameters
- Prettier checks in CI

These should be treated as non-optional.

## 18. Improvements Still Missing or Worth Adding

The current codebase is in a decent place, but these gaps remain:
1. Consider enforcing naming conventions for types and boolean variables through ESLint.
2. Consider documenting service-layer contracts and payload conventions more explicitly.
   Several recent bugs came from subtle payload and optional-field behavior.
3. Consider formalizing accessibility checks in CI for common interactive patterns.
4. Consider tightening lint coverage around unsafe assertions, `console.*`, and boundary validation.
5. Consider documenting when to use shared primitives such as page wrappers, drawers, cards, and query hooks so feature code stays consistent.

## 19. Practical Rule of Thumb

When there is tension between speed and style:
1. Keep the code correct.
2. Keep the code readable.
3. Match existing repo patterns unless they are clearly causing bugs.
4. Improve local consistency as you touch code.
5. If a rule adds ceremony without reducing bugs, prefer pragmatism.
