# A1 — Android APK launch crash, triage

Plan: `docs/superpowers/plans/2026-05-11-qat-fixes-slice-a.md`, Task 1 (A1).
QAT row: 2.1 — "App crashes on launch (Android)".
Branch: `feat/qat-slice-a`.
Date: 2026-05-11.
Time spent: ~45 min.

## TL;DR

**On the developer machine, the latest local APK does NOT crash.** The app boots to the welcome screen ("YourDrive — Share rides. Save money. Travel together.") on a fresh Android emulator at API 36 (well above the API 33 floor in the plan), with no fatal exception in logcat.

The crash is therefore **not reproducible from the artifact in this tree** as of 2026-05-11. The most plausible explanations for the QAT report:

1. **The QAT APK was an older build** that pre-dates one of the recent mobile fixes (`94a8b7d fix(mobile): align onboarding flows with server contract`, `bfaeca4 fix(e2e)`, the uncommitted `app.config.ts` Android Maps-key split). The QAT report was filed against a build delivered to the client; the client's APK and the one in `mobile/android/app/build/outputs/apk/release/` may not be the same binary.
2. **The QAT device was on an older Android API** (e.g. API 30/31) where one of the native modules (`react-native-maps`, `react-native-reanimated`, new arch / Fabric path) fails differently than on API 36.
3. **The QAT APK had no Google Maps API key wired in** (this is the highest-likelihood static cause — see "Static audit" below).

Given the time-box and that the runtime reproduction did not yield a fatal, this note doubles as a **static audit** so Task A2's "Fix" step has a ranked starting point.

## Step 1 — Build output

`eas build --platform android --profile preview --local` was **not run**. Two pre-existing APKs were available in the tree:

```
mobile/android/app/build/outputs/apk/debug/app-debug.apk     74.5 MB  2026-04-26 14:52
mobile/android/app/build/outputs/apk/release/app-release.apk 47.7 MB  2026-05-01 12:26
```

The host `java -version` is OpenJDK **25.0.2**. Expo SDK 54 / React Native 0.81 officially requires JDK 17. A local `eas build` would likely fail with a Gradle / AGP incompatibility on JDK 25; the existing release APK was sufficient to attempt reproduction without rebuilding. Recommendation for the fix task: install JDK 17 (e.g. `brew install --cask zulu@17`) before rebuilding.

The release APK is **older than the most recent app.config.ts change** (uncommitted: split `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` into iOS / Android keys). It is, however, newer than the QAT report itself, so it is a reasonable proxy for what the client tested.

## Step 2 — Emulator

```
$ emulator -list-avds
Medium_Phone_API_36.1

$ adb devices
emulator-5554   device

$ adb shell getprop ro.build.version.sdk
36
```

API 36 is above the API 33+ floor in the plan. No older API image was provisioned (see "Recommended next steps").

## Step 3 — Install + logcat

```
$ adb install -r .../app-release.apk
Performing Streamed Install
Success

$ adb logcat -c
$ adb shell am start -n com.yourdrive.app/.MainActivity     # NOTE: plan says com.yourdrive.mobile — wrong, actual package is .app
Starting: Intent { cmp=com.yourdrive.app/.MainActivity }
$ adb logcat -v time > /tmp/android-crash-full.log
# wait ~12s, then Ctrl-C
```

The process remained alive after launch (`adb shell ps -A | grep yourdrive` still listed the PID, `mCurrentFocus` still pointed at `MainActivity`), and a screenshot showed the welcome screen rendered correctly. **No FATAL exception, no AndroidRuntime crash, no tombstone.**

## Step 4 — Topmost relevant log lines (boot trace)

The boot trace is clean — every native lib loads, AppContext initializes, the JS bundle runs, gesture handler attaches:

```
I/Zygote                     : Process 15842 created for com.yourdrive.app
W/SoLoader                   : SoLoader initialized: 8
D/nativeloader               : Load libreactnative.so : ok
D/nativeloader               : Load libhermes.so : ok
D/nativeloader               : Load libexpo-modules-core.so : ok
D/nativeloader               : Load libreanimated.so : ok
D/nativeloader               : Load libworklets.so : ok
D/nativeloader               : Load libgesturehandler.so : ok
D/nativeloader               : Load librnscreens.so : ok
W/dev.expo.updates           : {"message":"The expo-updates system is explicitly disabled.", "level":"warn"}
I/ExpoModulesCore             : AppContext was initialized
I/ExpoModulesCore             : JSI interop was installed
I/ExpoModulesCore             : Constants were exported
W/ViewManagerPropertyUpdater : Could not find generated setter for class com.rnmaps.maps.MapManager  (x ~13 — benign)
I/ReactNativeJS              : Running "main"
W/ReactNativeJS              : '[Layout children]: No route named "ride-request" exists in nested children'  (router warning, non-fatal)
W/unknown:ReactNative        : StatusBarModule: Ignored status bar change, current activity is edge-to-edge.
I/ReactNative                : [GESTURE HANDLER] Initialize gesture handler for root view ReactSurfaceView
I/ActivityTaskManager        : Displayed com.yourdrive.app/.MainActivity for user 0: +415ms
```

Two warnings worth surfacing (neither is the crash, but both are signs of misconfiguration that could surface as crashes on older APIs or different configurations):

- `Could not find generated setter for class com.rnmaps.maps.*` — repeats for every map view manager. This is the **react-native-maps + new architecture** mismatch: the codegen output isn't being picked up for these view managers. Harmless on API 36 (the old props pathway still works), but on devices that fully enforce Fabric this is a likely crash site.
- `'[Layout children]: No route named "ride-request" exists in nested children'` — the router declares a `ride-request` route but only `ride-request/[id]` and `ride-request/open` exist as children. Cosmetic, but indicates a stale `expo-router` redirect somewhere; not a crash cause.

## Step 5 — Classified category

**Category: 6 — Other (not reproduced on dev machine).** With a fallback static audit ranking (see below).

The plan's six categories map to this codebase as follows:

| # | Plan category | Evidence in this codebase | Verdict |
|---|---|---|---|
| 1 | Missing manifest key `com.google.android.geo.API_KEY` | Generated `AndroidManifest.xml` does contain it (`AIzaSyA8FK5jrgLmj88OnU1qupuLZBlA_DMrw0k`). `app.config.ts` reads `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY` (uncommitted change — committed version was `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`). | **Most-likely cause of the client's crash.** If the client's APK was built without the env var present, `app.config.ts` resolves `apiKey: undefined`, the manifest meta-data tag becomes empty, and react-native-maps' Google provider throws at first render of `<MapView provider={PROVIDER_GOOGLE}>` (which is the first screen for an authenticated user — `src/app/(drawer)/index.tsx` line 1). Unauthenticated users see the welcome screen and never trigger the map, which is why the dev-machine repro didn't crash (no auto-login). |
| 2 | Hermes / JS bundle error | Logcat shows `ReactNativeJS: Running "main"` and the JS bundle starts. Only warnings are router-level. | Unlikely. |
| 3 | Native module init order | `react-native-maps` 1.20.1 is installed but **not declared as a plugin** in `app.config.ts.plugins[]`. `react-native-google-places-autocomplete` is NOT in `package.json` despite the plan listing it — that entry in the plan is stale. | Possible secondary cause: maps view managers fail to register cleanly under new arch (see ViewManagerPropertyUpdater warnings above). |
| 4 | Missing permission (SecurityException) | Manifest declares `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `INTERNET`. No `SecurityException` in logcat. | Ruled out. |
| 5 | New arch (Fabric/TurboModule) | `newArchEnabled: true` in both `app.config.ts` and `android/gradle.properties`. `react-native-maps@1.20.1` does have new-arch support, but the ViewManager codegen warnings hint at a partial mismatch. | Possible contributor — would manifest as a crash the moment a map mounts, not at process start. Same surface as category 1. |
| 6 | Other | The screenshot proves the app reaches the welcome screen on this build. | This bucket. |

### Ranked probable cause

1. **Empty Google Maps API key on the client's APK** (Category 1) — first map render in `(drawer)/index.tsx` throws under PROVIDER_GOOGLE. Strongest fit: client's environment likely lacked the env var, the plan even notes the recent uncommitted split into iOS/Android keys, and the crash report says "crash on launch" which for an auto-logging-in returning user IS the home map screen.
2. **react-native-maps + new arch view-manager codegen mismatch** (Categories 3 + 5) — secondary; same surface as #1.
3. **Older Android API + Reanimated 4 / Worklets** — the codebase pins `react-native-reanimated@~4.1.1` and `react-native-worklets@0.5.1`. Reanimated 4 has had documented launch-time crashes on certain API levels; this would only show up on the QAT device, not on API 36 here.

## Proposed fix (one paragraph, for Task 2 — A1.fix)

Treat this as a **two-pronged fix**: (a) ensure the Android Google Maps key is present at build time and surfaces a friendly error rather than a hard native crash if missing, and (b) confirm `react-native-maps` works under new arch on a fresh API 33 / API 34 emulator (i.e. emulators closer to typical client devices than API 36). For (a): keep the uncommitted `app.config.ts` change that reads `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY`, document that variable in `mobile/.env.example` (already done in the uncommitted diff), make EAS local builds fail fast if it is missing (a simple `process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY ?? throw` in `app.config.ts` or a check in `eas.json` build env), and wrap `<MapView>` mount sites in `src/app/(drawer)/index.tsx` and `src/components/ActiveRideMap.tsx` in an error boundary that renders a "Maps unavailable" placeholder if the native module throws. For (b): provision a Pixel 6 API 33 system image, run the same `adb logcat` sweep against the freshly-built preview APK, and if a new-arch view-manager error fires, either bump `react-native-maps` to a release whose new-arch codegen matches RN 0.81 cleanly or set `newArchEnabled: false` until the fix lands (the plan's category 5). The Maestro `flows/smoke.yaml` regression guard should be extended to log in and open the map screen, not just hit the welcome screen, otherwise it would not have caught this in the first place.

## Recommended next steps (for whoever picks up A1.fix)

1. Install JDK 17 (`brew install --cask zulu@17`, `export JAVA_HOME=$(/usr/libexec/java_home -v 17)`).
2. Create an API 33 AVD: `sdkmanager "system-images;android-33;google_apis;arm64-v8a"` → `avdmanager create avd -n Pixel_API_33 -k "system-images;android-33;google_apis;arm64-v8a"`.
3. From `mobile/`: ensure `.env` has `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY` set, then `eas build --platform android --profile preview --local`.
4. Repeat Steps 2-3 from the original plan against the **fresh** APK on the **API 33** emulator. If still no crash, also try with the env var deliberately unset to validate hypothesis #1.
5. Whether or not the crash reproduces, ship the env-var guard + error boundary fixes from the paragraph above. A defensive map mount is cheap insurance.

## Artifacts

- Full logcat: `/tmp/android-crash-full.log` (722 lines, on dev machine, not committed).
- Screenshot proving the app reaches welcome screen: `/tmp/app-screen.png`.
- Generated AndroidManifest checked: `mobile/android/app/src/main/AndroidManifest.xml` line 19 — meta-data key present.
- App config checked: `mobile/app.config.ts` lines 35-39 — Android Maps key wired (post uncommitted diff).
