<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Code Standards

- Prefer TypeScript `interfaces` to `type` declarations
- Preferred function style (where possible): arrow functions with implicit returns (e.g., `const addTwo = (num: number) => num + 2;`) -> arrow function with explicit return (e.g., `const addTwoAndMultiplyByNumber = (num: number, num2: number) => { if (num2 === 0) return 0; return (num + 2) * num2; }`) -> regular function (e.g., `function foo () { return 'bar'; }` )
- Unless absolutely necessary, DO NOT add explicit function return type annotations and allow TypeScript to implicitly infer return types
- Prefer named exports over default exports unless a default export is explicity required for the proper implementation.
- Don't self-minify variable or function names. Use descriptive names for variables, functions, components, etc.
- Prefer importing using path aliases (e.g., `import { isAdminRequest } '@/lib/auth/admin'`) over relative imports (e.g., `import { isAdminRequest } from '../lib/auth/admin';`)

<!-- END:nextjs-agent-rules ->
