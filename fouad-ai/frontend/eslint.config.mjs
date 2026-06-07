// Flat ESLint config for Next 16 using eslint-config-next's native flat exports.
// (FlatCompat is intentionally avoided — it triggers a circular-config bug here.)
import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [".next/**", "node_modules/**", "scripts/**"],
  },
];

export default eslintConfig;
