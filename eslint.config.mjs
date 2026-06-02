import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    // Architecture guard rails. The feature-slice migration moved the data layer
    // out of `lib/` into `features/*` (contracts/gateway/actions), `server/*`
    // (http, cookies, errors, contracts), and `config/*`. Forbid the old paths so
    // they can't creep back in. `lib/` now holds only cross-cutting helpers
    // (utils, fonts, constants), which remain importable.
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/lib/api",
                "@/lib/api/*",
                "@/lib/server",
                "@/lib/server/*",
                "@/lib/actions",
                "@/lib/actions/*",
                "@/lib/errors",
                "@/lib/auth",
                "@/lib/notifications",
                "@/lib/validation",
                "@/lib/validation/*",
              ],
              message:
                "This module moved during the feature-slice migration. Import from @/features/*, @/server/*, or @/config/* instead.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
