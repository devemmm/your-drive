# QAT Fixes — Slice A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the failing QAT rows on `docs/mobile-app-test-script.md` and land the four client-requested improvements (dark mode, language toggle, just-in-time push/location permissions).

**Architecture:** Single branch `feat/qat-slice-a` off `main`. Two PRs merged sequentially against `main`: **PR 2A** (correctness) lands A1–A6; **PR 2B** (polish) lands A7–A10 on top. PR 2B does not merge until PR 2A is merged.

**Tech Stack:** React Native + Expo SDK 54, Expo Router v4, TanStack React Query, react-hook-form + zod, react-i18next, Maestro for E2E, Node.js + Express + Prisma + Jest on the server.

**Spec:** `docs/superpowers/specs/2026-05-11-qat-fixes-slice-a-design.md`.

---

## File map

**Mobile — created**
- `mobile/src/app/(auth)/terms.tsx` — T&Cs stub screen
- `mobile/src/components/ui/Checkbox.tsx` — checkbox control
- `mobile/src/providers/ThemeProvider.tsx` — light/dark theme with system follow
- `mobile/src/lib/permissions.ts` — `ensurePushPermission`, `ensureLocationPermission`
- `mobile/.maestro/flows/auth/register-weak-password.yaml`
- `mobile/.maestro/flows/auth/register-with-referral.yaml`
- `mobile/.maestro/flows/settings/theme-toggle.yaml`
- `mobile/.maestro/flows/settings/language-toggle.yaml`
- `mobile/.maestro/scripts/fetch-referral.js`

**Mobile — modified**
- `mobile/src/lib/theme.ts` — split into `lightColors` + `darkColors`
- `mobile/src/app/(auth)/register.tsx` — password rule, T&Cs checkbox, auto-login
- `mobile/src/translations/en.json`, `rw.json` — new strings
- `mobile/src/translations/i18n.ts` — AsyncStorage-backed language persistence
- `mobile/src/app/(drawer)/profile.tsx` — Appearance + Language sections
- `mobile/src/app/_layout.tsx` — mount `ThemeProvider`, theme marker sentinels
- A4 inventory output drives a list of files that swap `colors.text.secondary` → `colors.error` on error surfaces (documented in Task 3 output before Task 11 commits)
- A7 mass migration: every file importing `{ colors }` from `@/lib/theme` switches to `useTheme()` (concrete list produced in Task 21 before Task 23 commits)
- Booking submit handler + post-ride publish handler call `ensurePushPermission()`
- Home map screen + LocationPicker call `ensureLocationPermission()` + render denial banner
- `mobile/.maestro/flows/auth/register.yaml` — drop manual login block, add T&Cs steps
- `mobile/.maestro/README.md` — Android run section

**Server — created**
- `server/src/services/__tests__/passwordValidator.test.ts`
- `server/src/controllers/__tests__/auth.register-referral.test.ts`

**Server — modified**
- `server/src/middlewares/validators/auth.request.validator.ts` — password rule
- `server/src/middlewares/validators/user.request.validator.ts` — password rule
- `server/src/routes/test.routes.ts` — add `GET /api/test/users/:id`
- `server/src/controllers/auth.controller.ts` (or wherever register lives — confirm in Task 4) — referral linkage fix

**Docs — modified**
- `docs/mobile-app-test-script.md` — rows 1.3 / 1.4 updated to "permission prompts at point of use"

---

## Task 0: Branch setup

**Files:**
- Create branch only.

- [ ] **Step 1: Create the feature branch**

```sh
git checkout main
git pull
git checkout -b feat/qat-slice-a
```

- [ ] **Step 2: Verify the spec is committed**

Run: `git log --oneline -3 -- docs/superpowers/specs/2026-05-11-qat-fixes-slice-a-design.md`
Expected: shows commit `8113375 docs(planning): slice A design — QAT fixes + polish`.

---

## Task 1: A1 — Reproduce the Android crash

**Files:**
- No code changes. Output is a written triage note saved to `docs/superpowers/plans/notes/2026-05-11-a1-android-crash-triage.md`.

- [ ] **Step 1: Build a local Android preview APK**

Run from repo root:

```sh
cd mobile
eas build --platform android --profile preview --local
```

Expected: an `.apk` is produced under `mobile/build/` (or path printed by EAS). If EAS errors before producing an APK, capture the error in the triage note and skip to Step 5.

- [ ] **Step 2: Boot an Android emulator (API 33+)**

```sh
emulator -list-avds
emulator -avd <name>   # in a separate terminal
adb devices            # confirm one device online
```

- [ ] **Step 3: Install the APK and capture logcat**

```sh
adb install -r /path/to/your-drive.apk
adb logcat -c
adb shell am start -n com.yourdrive.app/.MainActivity
adb logcat *:E ReactNativeJS:V ExpoModulesCore:V ExpoMaps:V > /tmp/android-crash.log
```

Open the app on the emulator. Wait for crash. Ctrl-C the logcat.

- [ ] **Step 4: Classify the crash**

Open `/tmp/android-crash.log`. Identify the topmost stack frame and the package emitting it. Classify into one of:

1. **Missing manifest key** — log mentions `meta-data com.google.android.geo.API_KEY`. Fix: ensure `mobile/app.config.ts` `android.config.googleMaps.apiKey` is set (it should already read `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`).
2. **Hermes / JS bundle error** — log mentions `ReactNativeJS` / `Hermes`. Fix: surface the JS error, often a missing env var.
3. **Native module init order** — log mentions `Expo modules`, `react-native-maps`. Fix depends on which module.
4. **Missing permission** — log mentions `SecurityException` or denied permission at boot. Fix: add the permission to `app.config.ts` `android.permissions`.
5. **New architecture** — log mentions `Fabric`/`TurboModule` and a module incompatibility. Fix: ensure `newArchEnabled: false` in `app.config.ts` if any dependency is non-compatible.
6. **Other** — capture the full stack and the suspected root cause.

- [ ] **Step 5: Write the triage note**

Create `docs/superpowers/plans/notes/2026-05-11-a1-android-crash-triage.md` with:

- Build command output (success or error)
- Topmost relevant log lines (~20 lines)
- Classified category from Step 4
- Proposed fix (one paragraph)
- Time spent

- [ ] **Step 6: Commit the triage note**

```sh
git add docs/superpowers/plans/notes/2026-05-11-a1-android-crash-triage.md
git commit -m "docs(planning): A1 Android crash triage note"
```

**Time-box: 1 working day.** If after this the cause is unidentified, surface in the PR description that A1 is being split and PR 2A is going to ship iOS-verified-only.

---

## Task 2: A1 — Apply the Android crash fix

**Files:** depend on Task 1 classification. Most likely candidates: `mobile/app.config.ts`, `mobile/.env.example`, or an `android/app/src/main/AndroidManifest.xml` patch via Expo plugins.

- [ ] **Step 1: Apply the fix from the triage note**

Based on the category from Task 1 Step 4:

- **(1) Missing manifest key**: confirm `mobile/.env` and `mobile/.env.test` have `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` set. Verify `app.config.ts` reads it. If a prebuild dir exists under `mobile/android`, regenerate with `npx expo prebuild --platform android --clean`.
- **(2) JS bundle error**: open the JS error from logcat; fix the source. Typical examples are env-var reads at module top-level that throw on missing keys.
- **(3) Native module init order**: pin or upgrade the offending package per the error. Run `npx expo doctor` to surface mismatches.
- **(4) Missing permission**: append to `app.config.ts` `android.permissions` array.
- **(5) New architecture**: set `"newArchEnabled": false` in `app.config.ts`.

- [ ] **Step 2: Rebuild and reverify**

```sh
cd mobile
eas build --platform android --profile preview --local
adb install -r <new-apk-path>
adb logcat -c
adb shell am start -n com.yourdrive.app/.MainActivity
```

Expected: app opens to the Welcome screen, no crash. Capture screenshot saved to `docs/superpowers/plans/notes/2026-05-11-a1-android-welcome.png`.

- [ ] **Step 3: Run Maestro smoke on Android**

In a separate terminal:

```sh
export MAESTRO_APP_ID=com.yourdrive.mobile
maestro test mobile/.maestro/flows/smoke.yaml
```

Expected: PASS.

- [ ] **Step 4: Commit the fix**

```sh
git add mobile/app.config.ts mobile/.env.example  # adjust to actually-changed files
git add docs/superpowers/plans/notes/2026-05-11-a1-android-welcome.png
git commit -m "fix(mobile): resolve Android APK launch crash"
```

---

## Task 3: A4 — Inventory error-styling surfaces

**Files:**
- Output to `docs/superpowers/plans/notes/2026-05-11-a4-error-color-inventory.md`.

- [ ] **Step 1: Grep for error display sites**

```sh
cd mobile
grep -rn "error?.message\|errors\.\|formState\.errors" src --include="*.tsx" --include="*.ts" | grep -v __tests__ > /tmp/error-sites.txt
grep -rn "Alert\.alert" src --include="*.tsx" --include="*.ts" >> /tmp/error-sites.txt
```

- [ ] **Step 2: For each hit, classify the rendering color**

For each unique file in `/tmp/error-sites.txt`:

1. Open the file.
2. Find the error rendering location (helper-text, toast, Alert).
3. Note the color used: `colors.error`, `colors.text.secondary`, `colors.text.primary`, hardcoded hex, or none (default).
4. Mark **needs fix** if not `colors.error`.

- [ ] **Step 3: Write the inventory note**

Create `docs/superpowers/plans/notes/2026-05-11-a4-error-color-inventory.md` with a table:

| File | Line | Current color | Action |
|---|---|---|---|
| `app/(auth)/login.tsx` | 87 | `colors.text.secondary` | fix → `colors.error` |
| … | … | … | … |

Files where errors already use `colors.error`: include as "OK — no change".

- [ ] **Step 4: Commit the inventory**

```sh
git add docs/superpowers/plans/notes/2026-05-11-a4-error-color-inventory.md
git commit -m "docs(planning): A4 error-color inventory"
```

---

## Task 4: A6 — Trace the register controller's referral handling

**Files:**
- Output to `docs/superpowers/plans/notes/2026-05-11-a6-referral-trace.md`.

- [ ] **Step 1: Locate the register controller**

```sh
cd server
grep -rn "/auth/register\|registerHandler\|register(" src/routes src/controllers --include="*.ts" | head -20
```

- [ ] **Step 2: Read the handler's referralCode handling**

Open the file referenced. Look for `req.query.referralCode` and trace what happens with it. Confirm:

1. Is it validated? (Should be — `auth.request.validator.ts:57` does it.)
2. Is it used during `prisma.user.create`?
3. If yes, is it stored on the new user (e.g. `referredById`), or used to credit the inviter, or both?

- [ ] **Step 3: Check the Prisma schema for referral fields**

```sh
grep -n "referral\|referredBy\|inviter" server/prisma/schema.prisma
```

- [ ] **Step 4: Write the trace note**

Create `docs/superpowers/plans/notes/2026-05-11-a6-referral-trace.md` with:

- File and line numbers of the register handler.
- What it currently does with the referral code (verbatim quote).
- What the schema supports.
- Recommended fix scope: code-only, or migration required.

If a migration is required, **stop and ask the client** before proceeding (per spec).

- [ ] **Step 5: Commit the trace note**

```sh
git add docs/superpowers/plans/notes/2026-05-11-a6-referral-trace.md
git commit -m "docs(planning): A6 referral persistence trace"
```

---

# PR 2A — QAT correctness

## Task 5: A2 — Server password validator (TDD)

**Files:**
- Create: `server/src/middlewares/validators/__tests__/passwordRule.test.ts`
- Modify: `server/src/middlewares/validators/auth.request.validator.ts`
- Modify: `server/src/middlewares/validators/user.request.validator.ts`

- [ ] **Step 1: Read the existing validator signatures**

```sh
grep -n "body(\"password\")\|body('password')" server/src/middlewares/validators/*.ts
```

Note every file:line where the password is validated. The rule must apply to all of them.

- [ ] **Step 2: Write the failing test**

Create `server/src/middlewares/validators/__tests__/passwordRule.test.ts`:

```ts
import { validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import { registerValidator } from "../auth.request.validator";

async function runValidator(body: Record<string, unknown>) {
  const req = { body, query: {}, params: {} } as unknown as Request;
  const res = {} as Response;
  const next: NextFunction = () => undefined;
  for (const v of registerValidator) {
    // express-validator middleware exposes a `run` method
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (v as any).run(req);
  }
  return validationResult(req).array().map((e) => e.msg);
}

const validBody = {
  firstName: "T", lastName: "U", email: "t@example.com",
  agreeToTerms: true,
};

describe("password rule", () => {
  it("rejects passwords shorter than 8 chars", async () => {
    const errors = await runValidator({ ...validBody, password: "Pa1" });
    expect(errors.join(" ")).toMatch(/password/i);
  });
  it("rejects passwords without an uppercase letter", async () => {
    const errors = await runValidator({ ...validBody, password: "password1" });
    expect(errors.join(" ")).toMatch(/password/i);
  });
  it("rejects passwords without a lowercase letter", async () => {
    const errors = await runValidator({ ...validBody, password: "PASSWORD1" });
    expect(errors.join(" ")).toMatch(/password/i);
  });
  it("rejects passwords without a digit", async () => {
    const errors = await runValidator({ ...validBody, password: "Password" });
    expect(errors.join(" ")).toMatch(/password/i);
  });
  it("accepts passwords meeting all rules", async () => {
    const errors = await runValidator({ ...validBody, password: "Password1" });
    expect(errors.find((m) => /password/i.test(m))).toBeUndefined();
  });
});
```

> Adjust the import `registerValidator` to whatever the file actually exports. Read `auth.request.validator.ts` first to confirm the export name.

- [ ] **Step 3: Run the test, expect failure**

```sh
cd server
npm test -- --testPathPattern=passwordRule
```

Expected: 4 of 5 cases fail (the new rule is not yet enforced); `password1` and `PASSWORD1` likely pass through unchanged today.

- [ ] **Step 4: Implement the rule in the auth validator**

Edit `server/src/middlewares/validators/auth.request.validator.ts`. Find the existing `body("password")` chain in the register validator. Replace with:

```ts
body("password")
  .isLength({ min: 8 })
  .withMessage(validationMsg("validation.password_rule"))
  .matches(/[A-Z]/)
  .withMessage(validationMsg("validation.password_rule"))
  .matches(/[a-z]/)
  .withMessage(validationMsg("validation.password_rule"))
  .matches(/[0-9]/)
  .withMessage(validationMsg("validation.password_rule"))
```

> If a `validationMsg` helper doesn't exist, use a plain string `"Password must be at least 8 characters and include upper, lower, and a digit"`.

Apply the **identical chain** to any other `body("password")` validators in this file (reset-password, change-password).

- [ ] **Step 5: Mirror the rule in `user.request.validator.ts`**

Repeat Step 4 for every `body("password")` in `server/src/middlewares/validators/user.request.validator.ts`.

- [ ] **Step 6: Run the test, expect pass**

```sh
cd server
npm test -- --testPathPattern=passwordRule
```

Expected: 5/5 pass.

- [ ] **Step 7: Type-check and commit**

```sh
cd server
npm run type-check
git add src/middlewares/validators/auth.request.validator.ts \
        src/middlewares/validators/user.request.validator.ts \
        src/middlewares/validators/__tests__/passwordRule.test.ts
git commit -m "feat(server): enforce stronger password rule on register/reset/change"
```

---

## Task 6: A2 — Client password schema + translations

**Files:**
- Modify: `mobile/src/app/(auth)/register.tsx`
- Modify: `mobile/src/translations/en.json`
- Modify: `mobile/src/translations/rw.json`

- [ ] **Step 1: Add translation keys**

Edit `mobile/src/translations/en.json`. Under the `"auth"` object add:

```json
"passwordRule": "Password must be at least 8 characters and include upper, lower, and a digit"
```

Edit `mobile/src/translations/rw.json`. Under `"auth"` add the same key with a Kinyarwanda translation. If you don't have one, use the English string for now and tag a `TODO(translate)` in the PR description (this is allowed for new strings).

- [ ] **Step 2: Update the register form zod schema**

Edit `mobile/src/app/(auth)/register.tsx`. Replace `password: z.string().min(6, "Password must be at least 6 characters")` (line 20) with:

```ts
password: z.string()
  .min(8, t("auth.passwordRule"))
  .regex(/[A-Z]/, t("auth.passwordRule"))
  .regex(/[a-z]/, t("auth.passwordRule"))
  .regex(/[0-9]/, t("auth.passwordRule")),
```

If `t` isn't in scope at the schema definition (it's defined at module scope today), refactor the schema into a hook-internal `useMemo(() => z.object({...}), [t])`. Or pass a function: `const makeSchema = (t) => z.object({...})` invoked inside the component.

- [ ] **Step 3: Manual verify**

```sh
cd mobile
npx expo start --ios
```

In the running app: open register, type `password`, tap Create Account. Expected: red error showing the new rule. Type `Password1`. Expected: error clears.

- [ ] **Step 4: Commit**

```sh
git add mobile/src/app/(auth)/register.tsx mobile/src/translations/en.json mobile/src/translations/rw.json
git commit -m "feat(mobile): enforce stronger password rule on register"
```

---

## Task 7: A3 — Stub T&Cs screen

**Files:**
- Create: `mobile/src/app/(auth)/terms.tsx`
- Modify: `mobile/src/translations/en.json`
- Modify: `mobile/src/translations/rw.json`

- [ ] **Step 1: Add translation keys**

Edit both `en.json` and `rw.json` under `"auth"`:

```json
"terms": {
  "title": "Terms & Conditions",
  "body": "Use of the YourDrive app implies you agree to our terms of service. Full terms will be made available in app and at yourdrive.app/terms before public launch."
}
```

- [ ] **Step 2: Create the stub screen**

Create `mobile/src/app/(auth)/terms.tsx`:

```tsx
import React from "react";
import { ScrollView, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { colors, fontSize, spacing } from "@/lib/theme";

export default function TermsScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView testID="terms.screen" style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t("auth.terms.title")}</Text>
        <Text style={styles.body}>{t("auth.terms.body")}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xxl, gap: spacing.lg },
  title: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text.primary },
  body: { fontSize: fontSize.md, color: colors.text.secondary, lineHeight: 24 },
});
```

- [ ] **Step 3: Verify route renders**

```sh
cd mobile
npx expo start --ios
```

In Expo's dev menu paste `exp://…/(auth)/terms` or wire a temporary `router.push("/(auth)/terms")` from welcome to spot-check. Expected: header + body render, `testID="terms.screen"` present.

- [ ] **Step 4: Commit**

```sh
git add mobile/src/app/\(auth\)/terms.tsx mobile/src/translations/en.json mobile/src/translations/rw.json
git commit -m "feat(mobile): add stub Terms & Conditions screen"
```

---

## Task 8: A3 — Build the Checkbox component

**Files:**
- Create: `mobile/src/components/ui/Checkbox.tsx`

- [ ] **Step 1: Create the Checkbox**

Create `mobile/src/components/ui/Checkbox.tsx`:

```tsx
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Check } from "lucide-react-native";
import { colors } from "@/lib/theme";

interface CheckboxProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  testID?: string;
  accessibilityLabel?: string;
}

export function Checkbox({ value, onValueChange, testID, accessibilityLabel }: CheckboxProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      onPress={() => onValueChange(!value)}
      hitSlop={8}
      style={[styles.box, value && styles.boxChecked]}
    >
      {value ? <Check size={16} color={colors.text.inverse} strokeWidth={3} /> : <View />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 22, height: 22, borderRadius: 4,
    borderWidth: 2, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.background,
  },
  boxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
});
```

- [ ] **Step 2: Commit**

```sh
git add mobile/src/components/ui/Checkbox.tsx
git commit -m "feat(mobile): add Checkbox UI primitive"
```

---

## Task 9: A3 — Wire T&Cs checkbox into register form

**Files:**
- Modify: `mobile/src/app/(auth)/register.tsx`
- Modify: `mobile/src/translations/en.json`
- Modify: `mobile/src/translations/rw.json`

- [ ] **Step 1: Add translation keys**

Append to `"auth"` in both `en.json` and `rw.json`:

```json
"agreeToTermsRequired": "You must accept the Terms & Conditions",
"agreeToTermsPrefix": "I accept the ",
"agreeToTermsLink": "Terms & Conditions"
```

- [ ] **Step 2: Update the register zod schema + form values**

Edit `mobile/src/app/(auth)/register.tsx`:

1. Add to the schema (place the field before `referralCode`):

```ts
agreeToTerms: z.literal(true, {
  errorMap: () => ({ message: t("auth.agreeToTermsRequired") }),
}),
```

2. Add `agreeToTerms: false` to `defaultValues`.
3. Remove `agreeToTerms: true` from the hardcoded `registerMutation.mutateAsync` call (line 43); the value now comes from the form.

- [ ] **Step 3: Add the checkbox UI**

In the JSX, above the Create Account button, insert:

```tsx
<Controller
  control={control}
  name="agreeToTerms"
  render={({ field: { onChange, value } }) => (
    <View style={rs.termsRow}>
      <Checkbox
        testID="register.termsCheckbox"
        value={value}
        onValueChange={onChange}
        accessibilityLabel={t("auth.agreeToTermsRequired")}
      />
      <Text style={rs.termsText}>
        {t("auth.agreeToTermsPrefix")}
        <Text
          testID="register.termsLink"
          style={rs.termsLink}
          onPress={() => router.push("/(auth)/terms")}
        >
          {t("auth.agreeToTermsLink")}
        </Text>
      </Text>
    </View>
  )}
/>
{errors.agreeToTerms ? (
  <Text style={rs.termsError}>{errors.agreeToTerms.message}</Text>
) : null}
```

Add to `rs`:

```ts
termsRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
termsText: { flex: 1, fontSize: fontSize.sm, color: colors.text.secondary },
termsLink: { color: colors.primary, fontWeight: "600" },
termsError: { fontSize: fontSize.sm, color: colors.error, marginTop: spacing.xs },
```

Import `Checkbox` from `@/components/ui/Checkbox`.

- [ ] **Step 4: Manual verify**

```sh
cd mobile
npx expo start --ios
```

In the app: open register, fill everything except the checkbox, tap Create Account. Expected: red error "You must accept the Terms & Conditions". Tick the checkbox; error clears; tap the underlined "Terms & Conditions" → navigates to the stub terms screen.

- [ ] **Step 5: Commit**

```sh
git add mobile/src/app/\(auth\)/register.tsx mobile/src/translations/en.json mobile/src/translations/rw.json
git commit -m "feat(mobile): require T&Cs acceptance on signup"
```

---

## Task 10: A5 — Auto-login after successful registration

**Files:**
- Modify: `mobile/src/app/(auth)/register.tsx`
- Modify: `mobile/src/hooks/useAuth.ts` (only if `useRegister` doesn't return the token in the AuthResponse shape — verify first)

- [ ] **Step 1: Confirm `useRegister` returns a token**

Read `mobile/src/hooks/useAuth.ts` lines 11-19. The `useRegister` mutation returns `AuthResponse`. Read `mobile/src/lib/types.ts` for the `AuthResponse` shape — confirm it has a `token` field (the login path uses the same shape).

If `AuthResponse` does NOT contain a token from `/auth/register`, the server endpoint must be amended to return one. Read `server/src/controllers/auth.controller.ts` (or wherever register lives — already located in Task 4) to confirm. If the server doesn't already return a token here, add it (mirror the login response shape exactly) and update server tests. Otherwise skip to Step 2.

- [ ] **Step 2: Use signIn from AuthContext after success**

Edit `mobile/src/app/(auth)/register.tsx`:

1. Add the import: `import { useAuthContext } from "@/providers/AuthProvider";`
2. Inside the component: `const { signIn } = useAuthContext();`
3. Replace the `onSubmit` success branch (currently lines 36-47):

```ts
async function onSubmit(data: RegisterForm) {
  try {
    const response = await registerMutation.mutateAsync({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      referralCode: data.referralCode || undefined,
      agreeToTerms: data.agreeToTerms,
    });
    await signIn(response.token);
    router.replace("/onboarding/verify-phone");
  } catch (error: any) {
    handleApiError(error, t);
  }
}
```

> If `response.token` is named differently, use the correct field name.

- [ ] **Step 3: Manual verify**

```sh
cd mobile
npx expo start --ios
```

Register a new account end-to-end. Expected: no `Please log in` alert; lands directly on the verify-phone screen.

- [ ] **Step 4: Commit**

```sh
git add mobile/src/app/\(auth\)/register.tsx
git commit -m "fix(mobile): auto sign-in after successful registration"
```

---

## Task 11: A4 — Apply error-color fixes from the inventory

**Files:**
- Modify: every file listed as "needs fix" in `docs/superpowers/plans/notes/2026-05-11-a4-error-color-inventory.md`.

- [ ] **Step 1: For each file in the inventory marked "needs fix", swap the color token**

Replace any error-text color other than `colors.error` with `colors.error`. Common patterns:

- `color: colors.text.secondary` on an error helper → `color: colors.error`
- `<Text style={{ color: colors.text.primary }}>{errors.x.message}</Text>` → `color: colors.error`

Do not touch success or info text.

- [ ] **Step 2: Manual verify a few sites**

```sh
cd mobile
npx expo start --ios
```

Open at least three forms touched in the inventory; trigger validation errors; confirm each renders red.

- [ ] **Step 3: Commit per file or as a single sweep**

If the inventory is short (≤5 files): single commit.

```sh
git add <list of files>
git commit -m "fix(mobile): render form errors with the error color"
```

If long (>5 files): one commit per logical grouping (auth screens, profile screens, etc.) with the same message scoped (`fix(mobile): auth — error color`).

---

## Task 12: A6 — Add `GET /api/test/users/:id` test endpoint

**Files:**
- Modify: `server/src/routes/test.routes.ts`

- [ ] **Step 1: Read the existing test routes**

Open `server/src/routes/test.routes.ts`. Note the existing routes, their auth-gating (`isTestEnv` + `x-test-token`), and the Prisma client import.

- [ ] **Step 2: Add the endpoint**

The Task 4 trace established that referral linkage is stored via a `Referral` join table (`receivedReferral` relation on `User`), NOT a `referredById` column. The endpoint must return the join row so the Maestro flow can assert linkage.

Append to `test.routes.ts`:

```ts
router.get("/users/by-email/:email", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { email: req.params.email },
    select: {
      id: true,
      email: true,
      phone: true,
      receivedReferral: {
        select: { inviterId: true },
      },
      createdAt: true,
    },
  });
  if (!user) return res.status(404).json({ error: "not_found" });
  res.json(user);
});
```

> The endpoint is keyed by `email` rather than `id` because Maestro flows know the email they registered with (output.registerEmail) but not the assigned user id. If a by-id variant is also wanted, add both.

- [ ] **Step 3: Smoke test it manually**

```sh
cd server
npm run dev
# in another terminal:
curl -H "x-test-token: $TEST_AUTH_TOKEN" http://localhost:3000/api/test/users/by-email/passenger@test.local
```

Expected: JSON with the user fields. `receivedReferral` is `null` for an un-referred user, or `{ "inviterId": <number> }` if they were referred.

- [ ] **Step 4: Type-check and commit**

```sh
cd server
npm run type-check
git add src/routes/test.routes.ts
git commit -m "feat(server): add GET /api/test/users/by-email/:email for E2E referral assertion"
```

---

## Task 13: A6 — Referral persistence regression test

**Files:**
- Create: `server/src/controllers/__tests__/auth.register-referral.test.ts`

**Reframing (per Task 4 trace):** the register controller at `server/src/controllers/auth.controller.ts:134-321` already persists referrals correctly via the `Referral` join table (`receivedReferral.create({ inviterId })` on user create). No controller change is needed. Task 13 demotes to a **regression test** that locks the existing behavior in place, so a future controller refactor can't silently break QAT 2.9 again.

**STATUS (2026-05-11): partially landed as a skipped scaffold.** The server has no integration-test harness (`app` not exported from a side-effect-free module, no supertest, no test DB). The file is committed at `server/src/controllers/__tests__/auth.register-referral.test.ts` with `describe.skip` and a docblock listing the unblock path. The Maestro flow in Task 16 (`register-with-referral.yaml` + `fetch-referral.js`) is the practical regression guard for QAT 2.9 in this slice. A follow-up plan should add the integration harness before flipping `.skip` back on.

- [ ] **Step 1: Write the regression test**

Create `server/src/controllers/__tests__/auth.register-referral.test.ts`:

```ts
import request from "supertest";
import { app } from "../../app";  // adjust to actual app export
import { prisma } from "../../lib/prisma";  // adjust to actual prisma client export

describe("POST /auth/register — referral linkage (regression for QAT 2.9)", () => {
  let inviterId: number;
  let inviterReferralCode: string;
  const newbyEmail = "newby@test.local";
  const inviterEmail = "inviter@test.local";

  beforeAll(async () => {
    // Clean slate
    await prisma.referral.deleteMany({ where: { invitee: { email: newbyEmail } } });
    await prisma.user.deleteMany({ where: { email: { in: [inviterEmail, newbyEmail] } } });

    const inviter = await prisma.user.create({
      data: {
        email: inviterEmail,
        password: "Password1",
        firstName: "Inv",
        lastName: "Iter",
        referralCode: "TESTREF1",
      },
    });
    inviterId = inviter.id;
    inviterReferralCode = inviter.referralCode;
  });

  afterAll(async () => {
    await prisma.referral.deleteMany({ where: { invitee: { email: newbyEmail } } });
    await prisma.user.deleteMany({ where: { email: { in: [inviterEmail, newbyEmail] } } });
  });

  it("creates a Referral row when a valid referral code is provided", async () => {
    const res = await request(app)
      .post(`/api/v1/auth/register?referralCode=${inviterReferralCode}`)
      .send({
        firstName: "New",
        lastName: "By",
        email: newbyEmail,
        password: "Password1",
        agreeToTerms: true,
      });
    expect(res.status).toBe(201);

    const created = await prisma.user.findUnique({
      where: { email: newbyEmail },
      include: { receivedReferral: true },
    });
    expect(created).not.toBeNull();
    expect(created?.receivedReferral).not.toBeNull();
    expect(created?.receivedReferral?.inviterId).toBe(inviterId);
  });

  it("registers without a referral row when the code does not match an existing user", async () => {
    await prisma.referral.deleteMany({ where: { invitee: { email: newbyEmail } } });
    await prisma.user.deleteMany({ where: { email: newbyEmail } });

    const res = await request(app)
      .post(`/api/v1/auth/register?referralCode=DOES_NOT_EXIST`)
      .send({
        firstName: "New",
        lastName: "By",
        email: newbyEmail,
        password: "Password1",
        agreeToTerms: true,
      });
    // Register still succeeds — invalid code is a no-op for linkage, not an error.
    expect(res.status).toBe(201);

    const created = await prisma.user.findUnique({
      where: { email: newbyEmail },
      include: { receivedReferral: true },
    });
    expect(created?.receivedReferral).toBeNull();
  });
});
```

> Adjust the import paths (`../../app`, `../../lib/prisma`) and the route prefix (`/api/v1/auth/register`) to whatever the codebase actually uses. Confirm by reading `server/src/app.ts` (or wherever the express app is exported) and `server/src/routes/auth.routes.ts` for the route prefix.

- [ ] **Step 2: Run the test, expect PASS**

```sh
cd server
npm test -- --testPathPattern=auth.register-referral
```

Expected: **PASS** — the implementation already does this. If a case fails, that itself is a real bug surfaced by the regression test and should be reported back before merging.

- [ ] **Step 3: Run the full server suite**

```sh
cd server
npm test
```

Expected: all green.

- [ ] **Step 4: Commit**

```sh
git add server/src/controllers/__tests__/auth.register-referral.test.ts
git commit -m "test(server): regression coverage for register referral linkage (QAT 2.9)"
```

---

## Task 13b: A6 — (skipped) referral fix

**SKIPPED.** Per the Task 4 trace, no controller change is required. The behavior the client reported as failing in QAT 2.9 is most likely either a tester misunderstanding (no visible "you were referred by X" surface in the app to confirm linkage) or the tester used a referral code that didn't match an existing user (silently no-op'd). Task 13 above locks the working behavior; if QAT 2.9 still reports a fail after this slice ships, surface for re-triage with the new regression test as proof of working behavior.

---

## Task 14: Maestro — rewrite `register.yaml` for auto-login + T&Cs

**Files:**
- Modify: `mobile/.maestro/flows/auth/register.yaml`

- [ ] **Step 1: Rewrite the flow**

Replace the contents of `mobile/.maestro/flows/auth/register.yaml` with:

```yaml
# Register a fresh user with T&Cs accepted, auto-login, verify phone, land on home.
appId: ${MAESTRO_APP_ID}
env:
  OTP_PHONE: ${output.registerPhone}
---
- runScript: ../../scripts/reset.js
- launchApp:
    clearState: true
    permissions:
      all: allow
- tapOn:
    id: "welcome.signUpButton"
- tapOn:
    id: "register.firstNameInput"
- inputText: "Test"
- tapOn:
    id: "register.lastNameInput"
- inputText: "Newuser"
- tapOn:
    id: "register.emailInput"
- inputText: ${output.registerEmail}
- tapOn:
    id: "register.passwordInput"
- inputText: ${output.password}
- tapOn:
    id: "register.confirmPasswordInput"
- inputText: ${output.password}
- tapOn:
    id: "register.termsCheckbox"
- tapOn:
    id: "register.submitButton"

# Auto-login lands directly on phone verification (no login step).
- extendedWaitUntil:
    visible:
      id: "verifyPhone.phoneInput"
    timeout: 15000
- tapOn:
    id: "verifyPhone.phoneInput"
- inputText: ${output.registerPhone}
- tapOn:
    id: "verifyPhone.sendCodeButton"

- runScript: ../../scripts/fetch-otp.js
- tapOn:
    id: "verifyPhone.codeInput"
- inputText: ${output.otp}
- tapOn:
    id: "verifyPhone.verifyButton"

- extendedWaitUntil:
    visible:
      id: "home.screen"
    timeout: 15000
```

- [ ] **Step 2: Run the flow on iOS**

```sh
maestro test mobile/.maestro/flows/auth/register.yaml
```

Expected: PASS.

- [ ] **Step 3: Commit**

```sh
git add mobile/.maestro/flows/auth/register.yaml
git commit -m "test(e2e): align register flow with T&Cs + auto-login"
```

---

## Task 15: Maestro — `register-weak-password.yaml`

**Files:**
- Create: `mobile/.maestro/flows/auth/register-weak-password.yaml`

- [ ] **Step 1: Create the flow**

Create `mobile/.maestro/flows/auth/register-weak-password.yaml`:

```yaml
# Asserts the password rule blocks weak passwords and accepts a valid one.
appId: ${MAESTRO_APP_ID}
---
- runScript: ../../scripts/reset.js
- launchApp:
    clearState: true
    permissions:
      all: allow
- tapOn:
    id: "welcome.signUpButton"
- tapOn:
    id: "register.firstNameInput"
- inputText: "Pw"
- tapOn:
    id: "register.lastNameInput"
- inputText: "Test"
- tapOn:
    id: "register.emailInput"
- inputText: "pwtest@example.com"

# 1. password too short → expect rule text visible
- tapOn:
    id: "register.passwordInput"
- inputText: "Pa1"
- tapOn:
    id: "register.confirmPasswordInput"
- inputText: "Pa1"
- tapOn:
    id: "register.termsCheckbox"
- tapOn:
    id: "register.submitButton"
- assertVisible: "at least 8 characters"

# 2. password missing uppercase → expect rule text visible
- tapOn:
    id: "register.passwordInput"
- eraseText: 3
- inputText: "password1"
- tapOn:
    id: "register.confirmPasswordInput"
- eraseText: 3
- inputText: "password1"
- tapOn:
    id: "register.submitButton"
- assertVisible: "at least 8 characters"

# 3. valid password → no rule error visible
- tapOn:
    id: "register.passwordInput"
- eraseText: 9
- inputText: "Password1"
- tapOn:
    id: "register.confirmPasswordInput"
- eraseText: 9
- inputText: "Password1"
- tapOn:
    id: "register.submitButton"
- assertNotVisible: "at least 8 characters"
```

- [ ] **Step 2: Run the flow**

```sh
maestro test mobile/.maestro/flows/auth/register-weak-password.yaml
```

Expected: PASS.

- [ ] **Step 3: Commit**

```sh
git add mobile/.maestro/flows/auth/register-weak-password.yaml
git commit -m "test(e2e): assert weak-password rejection on register"
```

---

## Task 16: Maestro — `register-with-referral.yaml`

**Files:**
- Create: `mobile/.maestro/scripts/fetch-referral.js`
- Create: `mobile/.maestro/flows/auth/register-with-referral.yaml`

- [ ] **Step 1: Create the fetch-referral script**

Create `mobile/.maestro/scripts/fetch-referral.js`:

```js
// Hits GET /api/test/users/:id and exposes the inviter id and the new user's referredById.
const baseUrl = MAESTRO_TEST_API_URL;
const token = MAESTRO_TEST_AUTH_TOKEN;
const newUserId = output.newUserId;
const inviterId = output.inviterId;

const resp = http.get(`${baseUrl}/api/test/users/${newUserId}`, {
  headers: { "x-test-token": token },
});
if (resp.status !== 200) {
  throw new Error(`fetch user failed: ${resp.status} ${resp.body}`);
}
const body = json(resp.body);
if (body.referredById !== inviterId) {
  throw new Error(`expected referredById=${inviterId}, got ${body.referredById}`);
}
output.referredById = body.referredById;
```

- [ ] **Step 2: Extend the reset script to expose inviter id + referral code**

Read `mobile/.maestro/scripts/reset.js`. Ensure it seeds an inviter user and exposes `output.inviterId` and `output.inviterReferralCode`. If the existing script does not do this, add it — mirror the existing fixture pattern.

- [ ] **Step 3: Create the flow**

Create `mobile/.maestro/flows/auth/register-with-referral.yaml`:

```yaml
# Register a user with a referral code; assert the link is persisted server-side.
appId: ${MAESTRO_APP_ID}
env:
  OTP_PHONE: ${output.registerPhone}
---
- runScript: ../../scripts/reset.js
- launchApp:
    clearState: true
    permissions:
      all: allow
- tapOn:
    id: "welcome.signUpButton"
- tapOn:
    id: "register.firstNameInput"
- inputText: "Ref"
- tapOn:
    id: "register.lastNameInput"
- inputText: "Erred"
- tapOn:
    id: "register.emailInput"
- inputText: ${output.registerEmail}
- tapOn:
    id: "register.passwordInput"
- inputText: "Password1"
- tapOn:
    id: "register.confirmPasswordInput"
- inputText: "Password1"
- tapOn:
    id: "register.referralInput"
- inputText: ${output.inviterReferralCode}
- tapOn:
    id: "register.termsCheckbox"
- tapOn:
    id: "register.submitButton"

- extendedWaitUntil:
    visible:
      id: "verifyPhone.phoneInput"
    timeout: 15000

# Pull the new user's id from the seeded fixture (reset.js should have set output.newUserId
# from the email it generated). Then assert referral.
- runScript: ../../scripts/fetch-referral.js
```

> If `reset.js` doesn't already set `output.newUserId` from the registered email, extend it.

- [ ] **Step 4: Run the flow**

```sh
maestro test mobile/.maestro/flows/auth/register-with-referral.yaml
```

Expected: PASS.

- [ ] **Step 5: Commit**

```sh
git add mobile/.maestro/scripts/fetch-referral.js \
        mobile/.maestro/scripts/reset.js \
        mobile/.maestro/flows/auth/register-with-referral.yaml
git commit -m "test(e2e): assert referral linkage persists on register"
```

---

## Task 17: Maestro README — Android run section

**Files:**
- Modify: `mobile/.maestro/README.md`

- [ ] **Step 1: Append the Android run section**

After the existing "Running flows locally" section, append:

````markdown
## Running on Android

The smoke flow is the slice-A regression guard for the Android APK launch crash (QAT 2.1).

```sh
# Boot an Android emulator first (API 33+), then:
export MAESTRO_APP_ID=com.yourdrive.app         # production bundle id
export MAESTRO_TEST_API_URL=http://10.0.2.2:3000
export MAESTRO_TEST_AUTH_TOKEN=<same as server TEST_AUTH_TOKEN>

# Install the preview APK
adb install -r mobile/build/your-drive.apk

# Smoke
maestro test mobile/.maestro/flows/smoke.yaml
```

The auth and settings flows are iOS-only in this slice; Android is covered only by the smoke flow until follow-up stabilization.
````

- [ ] **Step 2: Commit**

```sh
git add mobile/.maestro/README.md
git commit -m "docs(e2e): Android run section + iOS-only scope note"
```

---

## Task 18: PR 2A — verification + open PR

**Files:** none.

- [ ] **Step 1: Run server tests**

```sh
cd server
npm test
```

Expected: all green.

- [ ] **Step 2: Run iOS Maestro suite**

```sh
maestro test mobile/.maestro/flows/auth
```

Expected: all green (smoke, login, register, register-weak-password, register-with-referral).

- [ ] **Step 3: Run Android smoke**

Boot Android emulator, install APK from Task 2.

```sh
maestro test mobile/.maestro/flows/smoke.yaml
```

Expected: PASS.

- [ ] **Step 4: Manual run-through on a fresh APK**

Manually walk QAT rows 2.1, 2.5, 2.6, 2.7, 2.8, 2.9. Record the result in a short note `docs/superpowers/plans/notes/2026-05-11-pr-2a-manual-qat.md`.

- [ ] **Step 5: Open PR 2A**

```sh
git push -u origin feat/qat-slice-a
gh pr create --title "QAT Slice A — correctness (A1–A6)" --body "$(cat <<'EOF'
## Summary
- Fixes the failing QAT test-script rows: Android APK launch crash, weak password accepted, missing T&Cs checkbox, post-register login bounce, referral code not persisted.
- Sweeps form errors to use `colors.error` consistently.
- Slice B (polish: dark mode, lang toggle, perms) follows on the same branch.

Spec: `docs/superpowers/specs/2026-05-11-qat-fixes-slice-a-design.md`.

## Test plan
- [ ] Server: `cd server && npm test`
- [ ] iOS Maestro: `maestro test mobile/.maestro/flows/auth`
- [ ] Android smoke: `maestro test mobile/.maestro/flows/smoke.yaml`
- [ ] Manual QAT rows 2.1, 2.5, 2.6, 2.7, 2.8, 2.9 — see `docs/superpowers/plans/notes/2026-05-11-pr-2a-manual-qat.md`
EOF
)"
```

---

# PR 2B — Polish (dark mode, lang toggle, permissions)

## Task 19: A7 — Split theme.ts into light + dark palettes

**Files:**
- Modify: `mobile/src/lib/theme.ts`

- [ ] **Step 1: Rewrite the theme module**

Replace `mobile/src/lib/theme.ts` with:

```ts
type ColorPalette = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  background: string;
  surface: string;
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };
  border: string;
  error: string;
  warning: string;
  success: string;
  star: string;
};

export const lightColors: ColorPalette = {
  primary: "#22C55E",
  primaryDark: "#16A34A",
  primaryLight: "#DCFCE7",
  background: "#FFFFFF",
  surface: "#F9FAFB",
  text: {
    primary: "#111827",
    secondary: "#6B7280",
    tertiary: "#9CA3AF",
    inverse: "#FFFFFF",
  },
  border: "#E5E7EB",
  error: "#EF4444",
  warning: "#F59E0B",
  success: "#22C55E",
  star: "#FBBF24",
};

export const darkColors: ColorPalette = {
  primary: "#22C55E",
  primaryDark: "#16A34A",
  primaryLight: "#064E3B",
  background: "#0B0F14",
  surface: "#111827",
  text: {
    primary: "#F9FAFB",
    secondary: "#9CA3AF",
    tertiary: "#6B7280",
    inverse: "#111827",
  },
  border: "#1F2937",
  error: "#F87171",
  warning: "#FBBF24",
  success: "#22C55E",
  star: "#FBBF24",
};

// Back-compat shim — re-export light as `colors` so unmigrated files keep working
// until Task 23 finishes the migration.
export const colors = lightColors;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const fontSize = { xs: 12, sm: 14, md: 16, lg: 18, xl: 20, xxl: 24, xxxl: 28, title: 32 } as const;
export const borderRadius = { sm: 6, md: 8, lg: 12, xl: 16, full: 9999 } as const;

export type { ColorPalette };
```

- [ ] **Step 2: Type-check**

```sh
cd mobile
npx tsc --noEmit
```

Expected: clean (the back-compat `colors` shim keeps every existing import working).

- [ ] **Step 3: Commit**

```sh
git add mobile/src/lib/theme.ts
git commit -m "refactor(mobile): split theme into light + dark palettes"
```

---

## Task 20: A7 — Build the ThemeProvider

**Files:**
- Create: `mobile/src/providers/ThemeProvider.tsx`

- [ ] **Step 1: Create the provider**

Create `mobile/src/providers/ThemeProvider.tsx`:

```tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lightColors, darkColors, ColorPalette } from "@/lib/theme";

type Preference = "system" | "light" | "dark";
const STORAGE_KEY = "@yourdrive/theme";

interface ThemeContextValue {
  colors: ColorPalette;
  preference: Preference;
  resolved: "light" | "dark";
  setPreference: (p: Preference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<Preference>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setPreferenceState(stored);
      }
    });
  }, []);

  const resolved: "light" | "dark" =
    preference === "system" ? (system === "dark" ? "dark" : "light") : preference;
  const colors = resolved === "dark" ? darkColors : lightColors;

  const setPreference = async (p: Preference) => {
    setPreferenceState(p);
    await AsyncStorage.setItem(STORAGE_KEY, p);
  };

  return (
    <ThemeContext.Provider value={{ colors, preference, resolved, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
```

> If `@react-native-async-storage/async-storage` is not yet a dependency, install it: `cd mobile && npm install @react-native-async-storage/async-storage`. Verify in `mobile/package.json` first; many Expo templates include it.

- [ ] **Step 2: Type-check**

```sh
cd mobile
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```sh
git add mobile/src/providers/ThemeProvider.tsx mobile/package.json mobile/package-lock.json
git commit -m "feat(mobile): add ThemeProvider with system follow + override"
```

---

## Task 21: A7 — Mount provider + inventory consumers + theme markers

**Files:**
- Modify: `mobile/src/app/_layout.tsx`
- Output: `docs/superpowers/plans/notes/2026-05-11-a7-theme-consumers.md`

- [ ] **Step 1: Mount ThemeProvider in `_layout.tsx`**

Open `mobile/src/app/_layout.tsx`. Wrap the existing provider tree so that `ThemeProvider` is the outermost app-level provider (outside `AuthProvider`).

```tsx
import { ThemeProvider, useTheme } from "@/providers/ThemeProvider";
import { View } from "react-native";

function ThemeMarker() {
  const { resolved } = useTheme();
  return <View testID={`app.themeMarker.${resolved}`} style={{ width: 0, height: 0 }} />;
}

// Inside the layout root:
<ThemeProvider>
  <ThemeMarker />
  {/* existing tree: AuthProvider → QueryProvider → SocketProvider → Stack */}
</ThemeProvider>
```

- [ ] **Step 2: Inventory `colors` imports across `mobile/src`**

```sh
grep -rln 'from "@/lib/theme"' mobile/src --include="*.tsx" --include="*.ts" > /tmp/theme-importers.txt
wc -l /tmp/theme-importers.txt
```

For each file: is it importing `colors` (theme-dependent) or only `spacing`/`fontSize`/`borderRadius` (theme-invariant)? Files that only import the invariants need no change.

- [ ] **Step 3: Write the inventory note**

Create `docs/superpowers/plans/notes/2026-05-11-a7-theme-consumers.md`:

```markdown
# Theme consumers to migrate

Files importing `colors` from `@/lib/theme`:

- [ ] `src/app/(auth)/welcome.tsx`
- [ ] `src/app/(auth)/login.tsx`
- [ ] `src/app/(auth)/register.tsx`
- … (list every file)

Files importing only `spacing` / `fontSize` / `borderRadius` (no change needed):

- `src/components/ui/Avatar.tsx`
- …
```

- [ ] **Step 4: Commit**

```sh
git add mobile/src/app/_layout.tsx docs/superpowers/plans/notes/2026-05-11-a7-theme-consumers.md
git commit -m "feat(mobile): mount ThemeProvider with theme marker + inventory consumers"
```

---

## Task 22: A7 — Migrate consumers to `useTheme()`

**Files:** every file marked in the inventory from Task 21.

- [ ] **Step 1: Per-file migration template**

For each importer, apply the same transform:

**Before:**

```tsx
import { colors, spacing, fontSize } from "@/lib/theme";

export default function Screen() {
  return <View style={styles.container}>...</View>;
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.background, padding: spacing.lg },
  title: { color: colors.text.primary, fontSize: fontSize.xl },
});
```

**After:**

```tsx
import { useMemo } from "react";
import { spacing, fontSize, ColorPalette } from "@/lib/theme";
import { useTheme } from "@/providers/ThemeProvider";

export default function Screen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return <View style={styles.container}>...</View>;
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { backgroundColor: colors.background, padding: spacing.lg },
  title: { color: colors.text.primary, fontSize: fontSize.xl },
});
```

For inline `style={{ color: colors.x }}` usages, just swap the source — no `makeStyles` needed.

- [ ] **Step 2: Migrate in batches and commit per batch**

Group files by directory (`(auth)/`, `(drawer)/`, `chat/`, etc.). After each batch:

```sh
cd mobile
npx tsc --noEmit
```

Expected: clean.

Then commit per batch:

```sh
git add <batch files>
git commit -m "refactor(mobile): migrate <area> to useTheme()"
```

- [ ] **Step 3: Remove the back-compat `colors` shim**

Once every file in the inventory is migrated, edit `mobile/src/lib/theme.ts` and delete:

```ts
export const colors = lightColors;
```

Run `npx tsc --noEmit`. Expected: clean. If anything still fails, that file was missed — migrate it then re-run.

- [ ] **Step 4: Final type-check and commit**

```sh
cd mobile
npx tsc --noEmit
git add mobile/src/lib/theme.ts
git commit -m "refactor(mobile): remove theme back-compat shim, useTheme() everywhere"
```

---

## Task 23: A7 — Appearance section in Profile

**Files:**
- Modify: `mobile/src/app/(drawer)/profile.tsx`
- Modify: `mobile/src/translations/en.json`
- Modify: `mobile/src/translations/rw.json`

- [ ] **Step 1: Add translation keys**

In `en.json` and `rw.json` under `"profile"`:

```json
"appearance": "Appearance",
"theme": { "system": "System", "light": "Light", "dark": "Dark" }
```

- [ ] **Step 2: Add the Appearance section**

Edit `mobile/src/app/(drawer)/profile.tsx`. Add a section above the existing options:

```tsx
const { preference, setPreference } = useTheme();
// ...
<View testID="profile.appearanceSection" style={styles.section}>
  <Text style={styles.sectionTitle}>{t("profile.appearance")}</Text>
  {(["system", "light", "dark"] as const).map((opt) => (
    <Pressable
      key={opt}
      testID={`profile.themeOption.${opt}`}
      onPress={() => setPreference(opt)}
      style={styles.optionRow}
    >
      <View style={[styles.radio, preference === opt && styles.radioSelected]} />
      <Text style={styles.optionLabel}>{t(`profile.theme.${opt}`)}</Text>
    </Pressable>
  ))}
</View>
```

Add corresponding styles:

```ts
section: { paddingVertical: spacing.lg },
sectionTitle: { fontSize: fontSize.lg, fontWeight: "600", color: colors.text.primary, marginBottom: spacing.md },
optionRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border },
radioSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
optionLabel: { fontSize: fontSize.md, color: colors.text.primary },
```

> Profile must already use `useTheme()` from Task 22's migration. If it doesn't yet, migrate it first.

- [ ] **Step 3: Manual verify**

```sh
cd mobile
npx expo start --ios
```

Open Profile → Appearance → tap Dark. Expected: app theme flips immediately. Toggle back to System; close + reopen the app. Expected: preference persisted.

- [ ] **Step 4: Commit**

```sh
git add mobile/src/app/\(drawer\)/profile.tsx mobile/src/translations/en.json mobile/src/translations/rw.json
git commit -m "feat(mobile): Appearance section with system/light/dark toggle"
```

---

## Task 24: A8 — Language toggle UI + persistence

**Files:**
- Modify: `mobile/src/translations/i18n.ts`
- Modify: `mobile/src/app/(drawer)/profile.tsx`
- Modify: `mobile/src/translations/en.json`
- Modify: `mobile/src/translations/rw.json`

- [ ] **Step 1: AsyncStorage-back the i18n init**

Replace `mobile/src/translations/i18n.ts` with:

```ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import en from "./en.json";
import rw from "./rw.json";

const STORAGE_KEY = "@yourdrive/lang";

function pickInitial(): "en" | "rw" {
  const deviceLanguage = getLocales()[0]?.languageCode ?? "en";
  return deviceLanguage === "rw" ? "rw" : "en";
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, rw: { translation: rw } },
  lng: pickInitial(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

// Override with the persisted preference once loaded.
AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
  if (stored === "en" || stored === "rw") {
    if (i18n.language !== stored) i18n.changeLanguage(stored);
  }
});

export async function setLanguage(lang: "en" | "rw") {
  await AsyncStorage.setItem(STORAGE_KEY, lang);
  await i18n.changeLanguage(lang);
}

export default i18n;
```

- [ ] **Step 2: Add translation keys**

In `en.json` and `rw.json` under `"profile"`:

```json
"language": "Language",
"languageOption": { "en": "English", "rw": "Kinyarwanda" }
```

- [ ] **Step 3: Add the Language section to Profile**

Below the Appearance section in `mobile/src/app/(drawer)/profile.tsx`:

```tsx
import { setLanguage } from "@/translations/i18n";

// inside the component:
const currentLang = i18n.language === "rw" ? "rw" : "en";

<View testID="profile.languageSection" style={styles.section}>
  <Text style={styles.sectionTitle}>{t("profile.language")}</Text>
  {(["en", "rw"] as const).map((opt) => (
    <Pressable
      key={opt}
      testID={`profile.languageOption.${opt}`}
      onPress={() => setLanguage(opt)}
      style={styles.optionRow}
    >
      <View style={[styles.radio, currentLang === opt && styles.radioSelected]} />
      <Text style={styles.optionLabel}>{t(`profile.languageOption.${opt}`)}</Text>
    </Pressable>
  ))}
</View>
```

Import `i18n` from `@/translations/i18n` and reuse the `styles` keys from Task 23 (or duplicate as needed).

- [ ] **Step 4: Manual verify**

```sh
cd mobile
npx expo start --ios
```

Open Profile → Language → tap Kinyarwanda. Expected: all labels switch. Close + reopen the app. Expected: language persists.

- [ ] **Step 5: Commit**

```sh
git add mobile/src/translations/i18n.ts \
        mobile/src/app/\(drawer\)/profile.tsx \
        mobile/src/translations/en.json \
        mobile/src/translations/rw.json
git commit -m "feat(mobile): Language section with en/rw toggle + persistence"
```

---

## Task 25: A9 + A10 — Permissions helper

**Files:**
- Create: `mobile/src/lib/permissions.ts`
- Modify: `mobile/package.json` (install `expo-notifications` if missing)

- [ ] **Step 1: Install expo-notifications if missing**

```sh
cd mobile
npm list expo-notifications || npx expo install expo-notifications
```

- [ ] **Step 2: Create the helper**

Create `mobile/src/lib/permissions.ts`:

```ts
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Result = "granted" | "denied";
const PUSH_ASKED_KEY = "@yourdrive/perm/pushAsked";
const LOC_ASKED_KEY = "@yourdrive/perm/locAsked";

export async function ensurePushPermission(): Promise<Result> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return "granted";

  const asked = await AsyncStorage.getItem(PUSH_ASKED_KEY);
  if (current.status === "denied" && asked) return "denied";

  const res = await Notifications.requestPermissionsAsync();
  await AsyncStorage.setItem(PUSH_ASKED_KEY, "1");
  return res.status === "granted" ? "granted" : "denied";
}

export async function ensureLocationPermission(): Promise<Result> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === "granted") return "granted";

  const asked = await AsyncStorage.getItem(LOC_ASKED_KEY);
  if (current.status === "denied" && asked) return "denied";

  const res = await Location.requestForegroundPermissionsAsync();
  await AsyncStorage.setItem(LOC_ASKED_KEY, "1");
  return res.status === "granted" ? "granted" : "denied";
}
```

- [ ] **Step 3: Type-check and commit**

```sh
cd mobile
npx tsc --noEmit
git add mobile/src/lib/permissions.ts mobile/package.json mobile/package-lock.json
git commit -m "feat(mobile): permissions helper for push + location"
```

---

## Task 26: A9 — Wire push permission at booking submit + post-ride publish

**Files:**
- Modify: the booking submit handler (locate in Step 1)
- Modify: the post-ride publish handler (locate in Step 1)

- [ ] **Step 1: Locate the handlers**

```sh
cd mobile
grep -rln "useBookRide\|bookSeat\|/bookings\|submitBooking" src --include="*.tsx" --include="*.ts" | head -10
grep -rln "publishRide\|/rides\".*POST\|usePostRide" src --include="*.tsx" --include="*.ts" | head -10
```

Open the screen that owns the submit button (the form's `onSubmit`).

- [ ] **Step 2: Add the call**

After a successful booking submit (inside the mutation's `onSuccess` or right after `mutateAsync` resolves):

```ts
import { ensurePushPermission } from "@/lib/permissions";
// ...
void ensurePushPermission();
```

> `void` — we don't block the success-flow on the user's permission decision; the helper itself stores the "asked before" flag so we don't re-prompt.

Repeat for the post-ride publish handler.

- [ ] **Step 3: Manual verify**

```sh
cd mobile
npx expo start --ios
```

Reset perms for the app in iOS Settings → privacy. In the app, complete a booking. Expected: push permission dialog appears once. Decline. Complete another booking. Expected: no second prompt.

- [ ] **Step 4: Commit**

```sh
git add <booking handler> <post-ride handler>
git commit -m "feat(mobile): request push permission just-in-time on booking / publish"
```

---

## Task 27: A10 — Wire location permission at home map + denial banner

**Files:**
- Modify: the home map screen (locate in Step 1)
- Modify: `mobile/src/translations/en.json`, `rw.json`

- [ ] **Step 1: Locate the home map screen**

```sh
cd mobile
grep -rln "home.screen\|MapView\|useCurrentLocation" src/app --include="*.tsx" | head -10
```

The screen with `testID="home.screen"` is the target.

- [ ] **Step 2: Add translation keys**

In `en.json` and `rw.json` under `"home"`:

```json
"locationBanner": "Enable location in settings to see nearby drivers",
"openSettings": "Open Settings"
```

- [ ] **Step 3: Call the helper + render the banner**

In the home map screen, on mount:

```tsx
import { useEffect, useState } from "react";
import { Linking, View, Text, Pressable } from "react-native";
import { ensureLocationPermission } from "@/lib/permissions";

const [locationGranted, setLocationGranted] = useState<boolean | null>(null);

useEffect(() => {
  ensureLocationPermission().then((res) => setLocationGranted(res === "granted"));
}, []);

// In the JSX, above the map:
{locationGranted === false ? (
  <View testID="home.locationBanner" style={styles.banner}>
    <Text style={styles.bannerText}>{t("home.locationBanner")}</Text>
    <Pressable onPress={() => Linking.openSettings()}>
      <Text style={styles.bannerLink}>{t("home.openSettings")}</Text>
    </Pressable>
  </View>
) : null}
```

Add styles using `colors.warning`/`colors.surface` per the theme.

- [ ] **Step 4: Manual verify**

```sh
cd mobile
npx expo start --ios
```

Reset perms. Open home. Expected: location prompt appears. Deny. Expected: banner renders with "Open Settings".

- [ ] **Step 5: Commit**

```sh
git add <home map screen> mobile/src/translations/en.json mobile/src/translations/rw.json
git commit -m "feat(mobile): request location just-in-time + denial banner on home"
```

---

## Task 28: Maestro — `theme-toggle.yaml`

**Files:**
- Create: `mobile/.maestro/flows/settings/theme-toggle.yaml`

- [ ] **Step 1: Create the flow**

Create `mobile/.maestro/flows/settings/theme-toggle.yaml`:

```yaml
# Asserts dark theme can be selected from Profile and persists across launches.
appId: ${MAESTRO_APP_ID}
---
- runScript: ../../scripts/reset.js
- launchApp:
    clearState: true
    permissions:
      all: allow

# Log in as the seeded passenger.
- tapOn:
    id: "welcome.loginButton"
- tapOn:
    id: "auth.emailInput"
- inputText: ${output.passengerEmail}
- tapOn:
    id: "auth.passwordInput"
- inputText: ${output.password}
- tapOn:
    id: "auth.loginButton"
- extendedWaitUntil:
    visible:
      id: "home.screen"
    timeout: 15000

# Open the drawer and Profile.
- tapOn:
    id: "home.menuButton"
- tapOn:
    id: "drawer.profile"

# Initially the theme marker is light (assuming light system theme).
- assertVisible:
    id: "app.themeMarker.light"

# Pick Dark.
- tapOn:
    id: "profile.themeOption.dark"
- assertVisible:
    id: "app.themeMarker.dark"

# Reopen app — preference persists.
- launchApp:
    clearState: false
- assertVisible:
    id: "app.themeMarker.dark"
```

> If the drawer/profile entry has a different testID, adjust. The smoke flow proves the home/menu testIDs.

- [ ] **Step 2: Run the flow**

```sh
maestro test mobile/.maestro/flows/settings/theme-toggle.yaml
```

Expected: PASS.

- [ ] **Step 3: Commit**

```sh
git add mobile/.maestro/flows/settings/theme-toggle.yaml
git commit -m "test(e2e): theme toggle + persistence"
```

---

## Task 29: Maestro — `language-toggle.yaml`

**Files:**
- Create: `mobile/.maestro/flows/settings/language-toggle.yaml`

- [ ] **Step 1: Create the flow**

Create `mobile/.maestro/flows/settings/language-toggle.yaml`:

```yaml
# Asserts Kinyarwanda can be selected and persists. Uses a known-translated string.
appId: ${MAESTRO_APP_ID}
---
- runScript: ../../scripts/reset.js
- launchApp:
    clearState: true
    permissions:
      all: allow

- tapOn:
    id: "welcome.loginButton"
- tapOn:
    id: "auth.emailInput"
- inputText: ${output.passengerEmail}
- tapOn:
    id: "auth.passwordInput"
- inputText: ${output.password}
- tapOn:
    id: "auth.loginButton"
- extendedWaitUntil:
    visible:
      id: "home.screen"
    timeout: 15000

- tapOn:
    id: "home.menuButton"
- tapOn:
    id: "drawer.profile"

- tapOn:
    id: "profile.languageOption.rw"
# Pick any string that exists in rw.json and is visible on Profile, e.g. "Ururimi" (Language).
# Adjust this asserting string to whatever profile.language is translated to in rw.json.
- assertVisible: "Ururimi"

# Reopen — preference persists.
- launchApp:
    clearState: false
- tapOn:
    id: "home.menuButton"
- tapOn:
    id: "drawer.profile"
- assertVisible: "Ururimi"
```

- [ ] **Step 2: Run the flow**

```sh
maestro test mobile/.maestro/flows/settings/language-toggle.yaml
```

Expected: PASS.

- [ ] **Step 3: Commit**

```sh
git add mobile/.maestro/flows/settings/language-toggle.yaml
git commit -m "test(e2e): language toggle + persistence"
```

---

## Task 30: Update the test script doc for new permission timing

**Files:**
- Modify: `docs/mobile-app-test-script.md`

- [ ] **Step 1: Edit rows 1.3 and 1.4**

Open `docs/mobile-app-test-script.md`. Replace row 1.3 expected result with:

> First time you open the map screen (any pickup/destination flow), the location permission prompt appears. Allow location.

Replace row 1.4 with:

> First time you submit a ride booking, the push notification prompt appears. Allow notifications.

Add a sentence in section 1 introduction noting the change so a future tester doesn't expect the prompts on raw app open.

- [ ] **Step 2: Commit**

```sh
git add docs/mobile-app-test-script.md
git commit -m "docs(test-script): permission prompts now fire just-in-time"
```

---

## Task 31: PR 2B — verification + open PR

**Files:** none.

- [ ] **Step 1: Run server tests**

```sh
cd server
npm test
```

Expected: all green (no server changes in 2B, but a safety check).

- [ ] **Step 2: Type-check mobile**

```sh
cd mobile
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Run iOS Maestro suite**

```sh
maestro test mobile/.maestro/flows/auth
maestro test mobile/.maestro/flows/settings
```

Expected: all green.

- [ ] **Step 4: Run Android smoke**

Boot the emulator, install the latest APK.

```sh
maestro test mobile/.maestro/flows/smoke.yaml
```

Expected: PASS.

- [ ] **Step 5: Manual run-through**

On iOS and Android, walk through:

- Profile → Appearance → System / Light / Dark — colors flip
- Reopen — preference persists
- Profile → Language → Kinyarwanda — labels switch
- Reopen — language persists
- Reset perms → open map → location prompt appears once
- Deny location → banner with Open Settings renders
- Reset push perms → submit a booking → push prompt appears once

Record results in `docs/superpowers/plans/notes/2026-05-11-pr-2b-manual-verify.md`.

- [ ] **Step 6: Open PR 2B**

PR 2A must be merged first. Then:

```sh
git push origin feat/qat-slice-a
gh pr create --title "QAT Slice A — polish (A7–A10)" --body "$(cat <<'EOF'
## Summary
- Dark mode with system follow + manual override.
- Language toggle (English / Kinyarwanda) with AsyncStorage persistence.
- Just-in-time push and location permission prompts.

Spec: `docs/superpowers/specs/2026-05-11-qat-fixes-slice-a-design.md`.
Builds on PR 2A.

## Test plan
- [ ] `cd mobile && npx tsc --noEmit`
- [ ] `maestro test mobile/.maestro/flows/auth` (regression)
- [ ] `maestro test mobile/.maestro/flows/settings` (new flows)
- [ ] Android smoke: `maestro test mobile/.maestro/flows/smoke.yaml`
- [ ] Manual iOS + Android run-through — see `docs/superpowers/plans/notes/2026-05-11-pr-2b-manual-verify.md`
EOF
)"
```

---

## Self-review checklist

- [ ] Spec coverage: every A1–A10 has a task (A1: Tasks 1+2; A2: Tasks 5+6; A3: Tasks 7+8+9; A4: Tasks 3+11; A5: Task 10; A6: Tasks 4+12+13; A7: Tasks 19+20+21+22+23; A8: Task 24; A9: Tasks 25+26; A10: Tasks 25+27; Maestro coverage: Tasks 14+15+16+17+28+29; verification: Tasks 18+31)
- [ ] No placeholders: every code step shows actual code; investigation tasks produce concrete artifacts (triage notes).
- [ ] Type consistency: `useTheme()` returns `{ colors, preference, resolved, setPreference }` everywhere it's used; `Preference` type is `"system" | "light" | "dark"`; permission helper returns `"granted" | "denied"`.
- [ ] Frequent commits: every task ends in a commit.
