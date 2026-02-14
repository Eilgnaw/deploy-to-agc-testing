# Deploy to AGC Testing

English | [中文](./README.md)

A GitHub Action that uploads HarmonyOS app packages (`.app`) to AppGallery Connect (AGC) and automatically starts invite testing.

Similar to how Xcode Cloud distributes builds to TestFlight in the iOS ecosystem.

## How It Works

```
Signed package → Upload to AGC → Create test version → Wait for compilation → Bind test group → Submit for review → Generate invite code
```

## Quick Start

### Option 1: Service Account (Recommended)

```yaml
- name: Deploy to AGC Testing
  uses: Eilgnaw/deploy-to-agc-testing@v2
  with:
    service-account-json: ${{ secrets.AGC_SERVICE_ACCOUNT_JSON }}
    app-id: ${{ secrets.AGC_APP_ID }}
    app-path: build/outputs/default/MyApp-default-signed.app
```

### Option 2: API Client

```yaml
- name: Deploy to AGC Testing
  uses: Eilgnaw/deploy-to-agc-testing@v2
  with:
    client-id: ${{ secrets.AGC_CLIENT_ID }}
    client-secret: ${{ secrets.AGC_CLIENT_SECRET }}
    app-id: ${{ secrets.AGC_APP_ID }}
    app-path: build/outputs/default/MyApp-default-signed.app
```

## Full Example

A complete pipeline from build to invite testing, using the HarmonyOS CI container image. Automatically triggered when `versionCode` changes in `AppScope/app.json5`:

```yaml
name: Build and Deploy to AGC Testing

on:
  push:
    branches:
      - main
    paths:
      - 'AppScope/app.json5'

env:
  PRODUCT_NAME: default
  APP_UNSIGNED: build/outputs/default/MyApp-default-unsigned.app
  APP_SIGNED: build/outputs/default/MyApp-default-signed.app
  SIGN_TOOL: /opt/harmonyos-tools/command-line-tools/sdk/default/openharmony/toolchains/lib/hap-sign-tool.jar

jobs:
  check-version:
    runs-on: ubuntu-latest
    outputs:
      changed: ${{ steps.diff.outputs.changed }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - name: Check versionCode change
        id: diff
        run: |
          OLD=$(git show HEAD~1:AppScope/app.json5 2>/dev/null | grep -oP '"versionCode"\s*:\s*\K\d+' || echo "")
          NEW=$(grep -oP '"versionCode"\s*:\s*\K\d+' AppScope/app.json5)
          echo "old=$OLD new=$NEW"
          if [ "$OLD" != "$NEW" ]; then
            echo "changed=true" >> "$GITHUB_OUTPUT"
          else
            echo "changed=false" >> "$GITHUB_OUTPUT"
          fi

  build-and-deploy:
    needs: check-version
    if: needs.check-version.outputs.changed == 'true'
    runs-on: ubuntu-latest
    container: ghcr.io/eilgnaw/harmony-next-pipeline-docker/harmonyos-ci-image:latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Prepare signing materials
        run: |
          mkdir -p signing
          echo "${{ secrets.SIGNING_CERT }}" | base64 -d > signing/cert.cer
          echo "${{ secrets.SIGNING_PROFILE }}" | base64 -d > signing/profile.p7b
          echo "${{ secrets.SIGNING_KEYSTORE }}" | base64 -d > signing/keystore.p12

      - name: Install dependencies
        run: ohpm install --all

      - name: Build APP (release)
        run: hvigorw assembleApp --mode project -p product=${{ env.PRODUCT_NAME }} -p buildMode=release --no-daemon

      - name: Sign APP
        run: |
          java -jar ${{ env.SIGN_TOOL }} sign-app \
            -keyAlias "${{ secrets.KEY_ALIAS }}" \
            -keyPwd "${{ secrets.KEY_PWD }}" \
            -keystoreFile signing/keystore.p12 \
            -keystorePwd "${{ secrets.KEYSTORE_PWD }}" \
            -appCertFile signing/cert.cer \
            -profileFile signing/profile.p7b \
            -inFile "${{ env.APP_UNSIGNED }}" \
            -outFile "${{ env.APP_SIGNED }}" \
            -signAlg SHA256withECDSA \
            -mode localSign

      - name: Deploy to AGC Testing
        id: agc
        uses: Eilgnaw/deploy-to-agc-testing@v2
        with:
          service-account-json: ${{ secrets.AGC_SERVICE_ACCOUNT_JSON }}
          app-id: ${{ secrets.AGC_APP_ID }}
          app-path: ${{ env.APP_SIGNED }}
          what-to-test-dir: ./APPTest
          language: zh-Hans
          test-group-name: 'TestGroup'
          generate-invite-code: 'false'
          invite-code-valid-days: '7'
          invite-code-invite-limit: '100'

      - name: Print Results
        run: |
          echo "Version ID:      ${{ steps.agc.outputs.version-id }}"
          echo "Pkg Version:     ${{ steps.agc.outputs.pkg-version }}"
          echo "Group ID:        ${{ steps.agc.outputs.group-id }}"
          echo "Invitation Code: ${{ steps.agc.outputs.invitation-code }}"
```

## Authentication

Two authentication methods are supported (choose one; `service-account-json` takes priority):

### Service Account (Recommended)

Create a service account on Huawei Developer [API Console](https://developer.huawei.com/consumer/en/console#/credentials), download the JSON key file, and store the file contents as a GitHub Secret.

Uses JWT (PS256) signed authentication. No need to manage a client_secret, more secure.

### API Client

Create an API client in AGC Console under "Users and Permissions → API Key → Connect API" to obtain `client-id` and `client-secret`.

## Inputs

### Authentication (choose one)

| Input | Description |
|-------|-------------|
| `service-account-json` | Service Account JSON credentials content (recommended) |
| `client-id` | AGC API client ID |
| `client-secret` | AGC API client secret |

### Required

| Input | Description |
|-------|-------------|
| `app-id` | AGC application ID |
| `app-path` | Path to the signed package file (`.app`) |

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

### Service Account

| Secret | Source |
|--------|--------|
| `AGC_SERVICE_ACCOUNT_JSON` | [API Console](https://developer.huawei.com/consumer/en/console#/credentials) → Service Account → Full contents of the downloaded JSON key file |
| `AGC_APP_ID` | AGC Console → My Apps → App Information |

### API Client

| Secret | Source |
|--------|--------|
| `AGC_CLIENT_ID` | AGC Console → Users and Permissions → API Key → Connect API |
| `AGC_CLIENT_SECRET` | Same as above |
| `AGC_APP_ID` | AGC Console → My Apps → App Information |

## API References

- [Publishing API](https://developer.huawei.com/consumer/en/doc/app/agc-help-publish-api-guide-0000002271134665)
- [Testing API](https://developer.huawei.com/consumer/en/doc/app/agc-help-test-api-guide-0000002236015562)
- [Upload Management API](https://developer.huawei.com/consumer/en/doc/app/agc-help-upload-api-guide-0000002271160549)
- [Service Account Authentication](https://developer.huawei.com/consumer/en/doc/HMSCore-Guides/open-platform-service-account-0000001053509221)

## License

MIT
