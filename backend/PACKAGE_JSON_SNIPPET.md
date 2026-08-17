Add these scripts to package.json:

```json
"audit:prefixes": "ts-node -r tsconfig-paths/register scripts/audit/controller-prefix-audit.ts",
"audit:controllers": "ts-node -r tsconfig-paths/register scripts/audit/controller-security-audit.ts",
"audit:secrets": "ts-node -r tsconfig-paths/register scripts/audit/secret-scan.ts",
"audit:circular": "madge --circular --extensions ts src",
"audit:security": "ts-node -r tsconfig-paths/register scripts/audit/security-audit.ts"
```
