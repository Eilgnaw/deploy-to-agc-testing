# Deploy to AGC Testing

English | [中文](./README.md)

A GitHub Action that uploads HarmonyOS app packages (`.hap` / `.app`) to AppGallery Connect (AGC) and automatically starts invite testing.

Similar to how Xcode Cloud distributes builds to TestFlight in the iOS ecosystem.

## How It Works

```
Signed package → Upload to AGC → Create test version → Wait for compilation → Bind test group → Submit for review → Generate invite code
```

## Quick Start

```yaml
- name: Deploy to AGC Testing
  uses: Eilgnaw/deploy-to-agc-testing@v1
  with:
    client-id: ${{ secrets.AGC_CLIENT_ID }}
    client-secret: ${{ secrets.AGC_CLIENT_SECRET }}
    app-id: ${{ secrets.AGC_APP_ID }}
    app-path: ./entry/build/default/outputs/default/entry-default-signed.hap
```

## Full Example

A complete pipeline from build to invite testing, using the HarmonyOS CI container image:

```yaml
name: Build and Deploy to AGC Testing

on:
  push:
    tags:
      - 'v*'

env:
  HAP_UNSIGNED: entry/build/default/outputs/default/entry-default-unsigned.hap
  HAP_SIGNED: entry/build/default/outputs/default/entry-default-signed.hap

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    container: ghcr.io/sanchuanhehe/harmony-next-pipeline-docker/harmonyos-ci-image:v5.0.4
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install dependencies
        run: ohpm install --all

      - name: Build HAP
        run: hvigorw assembleHap --no-daemon

      - name: Sign HAP
        id: sign_hap
        run: |
          java -jar hap-sign-tool.jar sign-app \
            -keyAlias "${{ secrets.KEY_ALIAS }}" \
            -keyPwd "${{ secrets.KEY_PWD }}" \
            -keystoreFile "${{ secrets.KEYSTORE_FILE }}" \
            -keystorePwd "${{ secrets.KEYSTORE_PWD }}" \
            -appCertFile "${{ secrets.APP_CERT_FILE }}" \
            -profileFile "${{ secrets.PROFILE_FILE }}" \
            -inFile "${{ env.HAP_UNSIGNED }}" \
            -outFile "${{ env.HAP_SIGNED }}" \
            -signAlg SHA256withECDSA \
            -mode localSign

      - name: Deploy to AGC Testing
        id: agc
        uses: Eilgnaw/deploy-to-agc-testing@v1
        with:
          client-id: ${{ secrets.AGC_CLIENT_ID }}
          client-secret: ${{ secrets.AGC_CLIENT_SECRET }}
          app-id: ${{ secrets.AGC_APP_ID }}
          app-path: ${{ steps.sign_hap.outcome == 'success' && env.HAP_SIGNED || env.HAP_UNSIGNED }}
          what-to-test-dir: ./APPTest
          language: zh-Hans
          test-group-name: 'QA Team'
          generate-invite-code: 'true'
          invite-code-valid-days: '7'
          invite-code-invite-limit: '100'

      - name: Print Results
        run: |
          echo "Version ID:      ${{ steps.agc.outputs.version-id }}"
          echo "Pkg Version:     ${{ steps.agc.outputs.pkg-version }}"
          echo "Group ID:        ${{ steps.agc.outputs.group-id }}"
          echo "Invitation Code: ${{ steps.agc.outputs.invitation-code }}"
```

## Inputs

### Required

| Input | Description |
|-------|-------------|
| `client-id` | AGC API client ID |
| `client-secret` | AGC API client secret |
| `app-id` | AGC application ID |
| `app-path` | Path to the signed package file (`.hap` or `.app`) |

### Optional

| Input | Default | Description |
|-------|---------|-------------|
| `what-to-test-dir` | `APPTest` | Directory containing `WhatToTest.{locale}.txt` files |
| `language` | `zh-Hans` | Locale identifier for test content |
| `test-desc` | — | Test version description (max 50 chars). Falls back to WhatToTest file content |
| `release-type` | `6` | Release type (6 = HarmonyOS test release) |
| `test-type` | `3` | Test type (3 = invite testing, 4 = public testing) |
| `test-group-name` | — | Test group name. Created automatically if not found |
| `generate-invite-code` | `false` | Whether to generate an invitation code |
| `invite-code-valid-days` | `7` | Invitation code validity in days (max 30) |
| `invite-code-invite-limit` | `1000` | Max invitees per code (max 10000) |

## Outputs

| Output | Description |
|--------|-------------|
| `version-id` | Created test version ID |
| `pkg-version` | Package version ID |
| `group-id` | Test group ID |
| `invitation-code` | Generated invitation code |
| `invitation-code-id` | Invitation code ID |

## WhatToTest Files

Create an `APPTest/` directory in your project with test description files:

```
your-app/
└── APPTest/
    ├── WhatToTest.zh-Hans.txt   # Chinese test notes
    └── WhatToTest.en.txt        # English test notes (optional)
```

The file content is used as the test version description (truncated to 50 characters). You can also specify the description directly via the `test-desc` input to skip file reading.

## Secrets Setup

Add the following in your repository **Settings → Secrets and variables → Actions**:

| Secret | Source |
|--------|--------|
| `AGC_CLIENT_ID` | AGC Console → My Projects → Project Settings → Credentials |
| `AGC_CLIENT_SECRET` | Same as above |
| `AGC_APP_ID` | AGC Console → My Apps → App Information |

## API References

- [Publishing API](https://developer.huawei.com/consumer/en/doc/app/agc-help-publish-api-guide-0000002271134665)
- [Testing API](https://developer.huawei.com/consumer/en/doc/app/agc-help-test-api-guide-0000002236015562)
- [Upload Management API](https://developer.huawei.com/consumer/en/doc/app/agc-help-upload-api-guide-0000002271160549)

## License

MIT
