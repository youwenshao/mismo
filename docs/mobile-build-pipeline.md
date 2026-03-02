# Mobile Build Pipeline

React Native + Expo build pipeline for autonomous iOS/Android app generation, managed by n8n workflow orchestration.

## Architecture

```
Webhook (POST /mobile-build-pipeline)
  -> Mobile Feasibility Checker (BMAD score gate)
     -> score < 6: HALT, notify client
     -> score >= 6: continue
  -> GSD Dependency Checker (parse mobile tasks)
  -> Mobile Scaffold Agent (Expo project generation)
  -> Contract Check (scaffold vs architecture_decision)
  -> Mobile Feature Agent (screens, components, API client)
  -> Contract Check (features vs PRD)
  -> [Fork]
     Branch A: iOS Build (Studio 2, macOS via SSH)
     Branch B: Android Build (Studio 3 via SSH)
     Branch C: Store Metadata (parallel)
  -> Merge (waitAll)
  -> Final Validation (app size, bundle ID)
  -> Success / Failure
```

## Agent Services

| Agent | Package | Port | Description |
|-------|---------|------|-------------|
| Mobile Scaffold | `@mismo/agent-mobile-scaffold` | 3020 | Expo project structure, app.json, navigation, NativeWind, state management |
| Mobile Feature | `@mismo/agent-mobile-feature` | 3021 | Screen generation, React Native Paper components, native permissions |
| Mobile Build Engineer | `@mismo/agent-mobile-build-engineer` | 3022 | EAS builds via SSH to Mac studios, TestFlight/Play Console submission |
| Store Submission | `@mismo/agent-store-submission` | 3023 | Store listings, Maestro screenshot flows, fastlane metadata |

## BMAD Feasibility Scoring

The pipeline begins with a feasibility check. Score range: 0-10, threshold: 6.

**Positive factors** (each +2):
- Clear archetype (pure RN, no native modules)
- No complex hardware integration (camera is fine, Bluetooth is not)
- Apple Developer account confirmed
- Google Play Console confirmed
- Estimated app size under 100MB

**Negative factors:**
- Push notifications required: -3
- Background location required: -3
- Custom native modules required: -5

Score < 6 halts the pipeline with explanation: "This requires custom native development, outside autonomous scope."

## Architecture Decision Output

The feasibility checker produces `architectureDecision`:

```json
{
  "platform_strategy": "expo-managed",
  "justification": "Standard Expo managed workflow",
  "native_modules_required": [],
  "certificate_strategy": "client-provided",
  "risk_mitigation": ["iOS builds require Studio 2 availability", "Max EAS build time: 30 minutes"]
}
```

## State Management Auto-Selection

The scaffold agent scores app complexity:

- `screenCount + (dataModelCount * 2) + (realtime ? 3 : 0) + (offline ? 3 : 0)`
- Score > 10: Redux Toolkit
- Score <= 10: Zustand

## Build Process

### iOS (Studio 2 - macOS)

1. SSH into Studio 2 via `STUDIO_2_SSH_HOST`
2. Run `eas build --platform ios --profile production --non-interactive`
3. Poll build status (30-minute timeout)
4. Submit to TestFlight via `eas submit --platform ios`
5. Stops at "Ready for Review" (manual 2FA required for App Store release)

### Android (Studio 3)

1. SSH into Studio 3 via `STUDIO_3_SSH_HOST`
2. Run `eas build --platform android --profile production --non-interactive`
3. Submit to Google Play Internal testing track

### Store Metadata

Runs in parallel with builds:
- Generates title (30 chars), subtitle, description (4000 chars), keywords
- Creates Maestro screenshot automation flows for 5 device sizes
- Produces fastlane-compatible metadata JSON

## Contract Checks

Three mobile-specific checks added to the contract checker:

1. **Architecture Check** (`/check-mobile-architecture`): If `expo-managed`, rejects any native code files (.swift, .java, .kt, .gradle, Podfile)
2. **App Size Check** (`/check-app-size`): Rejects builds over 100MB
3. **Bundle ID Check** (`/check-bundle-id`): Validates bundle ID matches client's Apple/Google accounts

## GSD Task Dependencies

```
mobile-scaffold (parallel safe, no deps)
  -> mobile-feature (depends: mobile-scaffold)
  -> mobile-native-config (depends: mobile-scaffold)
     -> mobile-build-ios (depends: mobile-feature, mobile-native-config)
     -> mobile-build-android (depends: mobile-feature, mobile-native-config)
store-metadata (parallel safe, no deps)
```

Critical path: iOS build is always on critical path (slowest, most failure-prone).

## Limitations

- iOS builds require physical Mac hardware (Studio 2)
- Cannot auto-submit to App Store (requires human 2FA for final release)
- Max EAS cloud build timeout: 30 minutes
- Client must provide: Apple Developer Team ID, Google Play Service Account

## Running Locally

```bash
# Start all mobile pipeline agents
./scripts/start-mobile-pipeline.sh

# Stop all agents
./scripts/stop-mobile-pipeline.sh

# Trigger a build (via internal API)
curl -X POST http://localhost:3001/api/mobile/build \
  -H "Content-Type: application/json" \
  -d '{
    "buildId": "test-123",
    "prdJson": {
      "projectName": "MyApp",
      "bundleId": "com.example.myapp",
      "screens": [{"name": "Home", "path": "index", "type": "tab"}],
      "mobileConfig": {
        "apple_developer_confirmed": true,
        "google_play_confirmed": true
      }
    }
  }'
```

## Related Documentation

- [GSD Build Pipeline](gsd-build-pipeline.md) — Web app build orchestration (parallel pipeline)
- [n8n HA Deployment](../docker/n8n-ha/DEPLOYMENT.md) — Production n8n deployment

## Environment Variables

See `.env.example` for the full list. Key variables:

- `STUDIO_2_SSH_HOST` / `STUDIO_2_SSH_KEY` - iOS build machine
- `STUDIO_3_SSH_HOST` / `STUDIO_3_SSH_KEY` - Android build machine
- `APPLE_TEAM_ID`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER_ID`, `APPLE_API_KEY_PATH`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH`
- `EXPO_TOKEN`
