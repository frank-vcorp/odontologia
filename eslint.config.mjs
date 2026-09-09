/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "drizzle/**"],
  },
];

export default eslintConfig;
