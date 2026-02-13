# Deploy to AGC Testing

[English](./README.en.md) | 中文

一个 GitHub Action，将 HarmonyOS 应用包（`.hap` / `.app`）上传到 AppGallery Connect (AGC) 并自动发布邀请测试。

类似 iOS 生态中 Xcode Cloud 构建后自动分发到 TestFlight 的流程。

## 工作流程

```
构建签名包 → 上传到 AGC → 创建测试版本 → 等待编译 → 绑定测试群组 → 提交测试审核 → 生成邀请码
```

## 快速开始

```yaml
- name: Deploy to AGC Testing
  uses: Eilgnaw/deploy-to-agc-testing@v1
  with:
    client-id: ${{ secrets.AGC_CLIENT_ID }}
    client-secret: ${{ secrets.AGC_CLIENT_SECRET }}
    app-id: ${{ secrets.AGC_APP_ID }}
    app-path: ./entry/build/default/outputs/default/entry-default-signed.hap
```

## 完整示例

配合 HarmonyOS CI 容器镜像，实现从构建到邀请测试的完整流水线：

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
          test-group-name: 'QA团队'
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

## 输入参数

### 必填

| 参数 | 说明 |
|------|------|
| `client-id` | AGC API 客户端 ID |
| `client-secret` | AGC API 客户端密钥 |
| `app-id` | AGC 应用 ID |
| `app-path` | 已签名的软件包路径（`.hap` 或 `.app`） |

### 可选

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `what-to-test-dir` | `APPTest` | 测试内容文件目录，存放 `WhatToTest.{locale}.txt` |
| `language` | `zh-Hans` | 测试内容语言标识 |
| `test-desc` | — | 测试版本描述（最长 50 字符），不填则从 WhatToTest 文件读取 |
| `release-type` | `6` | 发布方式（6 = HarmonyOS 测试发布） |
| `test-type` | `3` | 测试类型（3 = 邀请测试，4 = 公开测试） |
| `test-group-name` | — | 测试群组名称，不存在时自动创建 |
| `generate-invite-code` | `false` | 是否生成邀请码 |
| `invite-code-valid-days` | `7` | 邀请码有效天数（最大 30） |
| `invite-code-invite-limit` | `1000` | 邀请码可邀请人数上限（最大 10000） |

## 输出

| 参数 | 说明 |
|------|------|
| `version-id` | 创建的测试版本 ID |
| `pkg-version` | 软件包版本 ID |
| `group-id` | 测试群组 ID |
| `invitation-code` | 生成的邀请码 |
| `invitation-code-id` | 邀请码 ID |

## 测试内容文件

在你的项目中创建 `APPTest/` 目录，放置测试说明文件：

```
your-app/
└── APPTest/
    ├── WhatToTest.zh-Hans.txt   # 中文测试说明
    └── WhatToTest.en.txt        # 英文测试说明（可选）
```

文件内容会作为测试版本描述（截取前 50 个字符）。也可以通过 `test-desc` 输入参数直接指定，跳过文件读取。

## Secrets 配置

在仓库 **Settings → Secrets and variables → Actions** 中添加：

| Secret | 来源 |
|--------|------|
| `AGC_CLIENT_ID` | AGC 控制台 → 我的项目 → 项目设置 → 凭据 |
| `AGC_CLIENT_SECRET` | 同上 |
| `AGC_APP_ID` | AGC 控制台 → 我的应用 → 应用信息 |

## API 参考

- [Publishing API](https://developer.huawei.com/consumer/cn/doc/app/agc-help-publish-api-guide-0000002271134665)
- [Testing API](https://developer.huawei.com/consumer/cn/doc/app/agc-help-test-api-guide-0000002236015562)
- [Upload Management API](https://developer.huawei.com/consumer/cn/doc/app/agc-help-upload-api-guide-0000002271160549)

## License

MIT
