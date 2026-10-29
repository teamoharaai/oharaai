# Phase 4G — Current advisory inventory

October 28, 2026. npm audit exit 1 remains enforced. Counts are affected-package entries, not independent vulnerabilities. Local backports are not registry version fixes or approved exceptions.

Final compatible tree: **0 critical, 4 high, 38 moderate, 8 low; 50 total**. The image-size 2.0.4 experiment was withdrawn after reproducing a Metro file-path API incompatibility; 1.2.1 remains unresolved.

| Package | Installed version(s) | Severity | Direct advisory or propagated dependency |
| --- | --- | --- | --- |
| @babel/core | 7.29.0 | low | [GHSA-4x5r-pxfx-6jf8](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8) |
| image-size | 1.2.1 | high | [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq), [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) |
| @expo/cli | 55.0.18 | high | @expo/config, @expo/metro-config, @expo/prebuild-config, zod |
| @expo/config | 55.0.10 | low | deepmerge |
| @expo/config-plugins | 55.0.7 | moderate | xcode |
| @expo/local-build-cache-provider | 55.0.7 | low | @expo/config |
| @expo/metro-config | 55.0.11 | low | @expo/config |
| @expo/prebuild-config | 55.0.10 | low | @expo/config |
| @react-navigation/core | 7.17.0 | moderate | query-string |
| @tiptap/core | 2.27.1 | moderate | [GHSA-cp6q-959q-f8rh](https://github.com/advisories/GHSA-cp6q-959q-f8rh) |
| @tiptap/extension-blockquote | 2.27.2 | moderate | @tiptap/core |
| @tiptap/extension-bold | 2.27.2 | moderate | @tiptap/core |
| @tiptap/extension-bubble-menu | 2.27.2 | moderate | @tiptap/core |
| @tiptap/extension-bullet-list | 2.27.2 | moderate | @tiptap/core |
| @tiptap/extension-code | 2.27.2 | moderate | @tiptap/core |
| @tiptap/extension-code-block | 2.27.2 | moderate | @tiptap/core |
| @tiptap/extension-document | 2.27.2 | moderate | @tiptap/core |
| @tiptap/extension-dropcursor | 2.27.2 | moderate | @tiptap/core |
| @tiptap/extension-floating-menu | 2.27.2 | moderate | @tiptap/core |
| @tiptap/extension-gapcursor | 2.27.2 | moderate | @tiptap/core |
| @tiptap/extension-hard-break | 2.27.2 | moderate | @tiptap/core |
| @tiptap/extension-heading | 2.27.2 | moderate | @tiptap/core |
| @tiptap/extension-history | 2.27.2 | moderate | @tiptap/core |
| @tiptap/extension-horizontal-rule | 2.27.2 | moderate | @tiptap/core |
| @tiptap/extension-italic | 2.27.2 | moderate | @tiptap/core |
| @tiptap/extension-link | 2.27.1 | moderate | @tiptap/core |
| @tiptap/extension-list-item | 2.27.2 | moderate | @tiptap/core |
| @tiptap/extension-ordered-list | 2.27.2 | moderate | @tiptap/core |
| @tiptap/extension-paragraph | 2.27.2 | moderate | @tiptap/core |
| @tiptap/extension-placeholder | 2.27.1 | moderate | @tiptap/core |
| @tiptap/extension-strike | 2.27.2 | moderate | @tiptap/core |
| @tiptap/extension-task-item | 2.27.1 | moderate | @tiptap/core |
| @tiptap/extension-task-list | 2.27.1 | moderate | @tiptap/core |
| @tiptap/extension-text | 2.27.2 | moderate | @tiptap/core |
| @tiptap/extension-text-align | 2.27.1 | moderate | @tiptap/core |
| @tiptap/extension-text-style | 2.27.2 | moderate | @tiptap/core |
| @tiptap/extension-underline | 2.27.1 | moderate | @tiptap/core |
| @tiptap/react | 2.27.1 | moderate | @tiptap/core, @tiptap/extension-bubble-menu, @tiptap/extension-floating-menu |
| @tiptap/starter-kit | 2.27.1 | moderate | @tiptap/core, @tiptap/extension-blockquote, @tiptap/extension-bold, @tiptap/extension-bullet-list, @tiptap/extension-code, @tiptap/extension-code-block, @tiptap/extension-document, @tiptap/extension-dropcursor, @tiptap/extension-gapcursor, @tiptap/extension-hard-break, @tiptap/extension-heading, @tiptap/extension-history, @tiptap/extension-horizontal-rule, @tiptap/extension-italic, @tiptap/extension-list-item, @tiptap/extension-ordered-list, @tiptap/extension-paragraph, @tiptap/extension-strike, @tiptap/extension-text, @tiptap/extension-text-style |
| decode-uri-component | 0.2.2 | moderate | [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) |
| deepmerge | 4.3.1 | low | [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) |
| expo | 55.0.8 | high | @expo/cli, @expo/config, @expo/local-build-cache-provider, @expo/metro-config |
| expo-constants | 55.0.9 | low | @expo/config |
| expo-router | 55.0.7 | moderate | query-string |
| expo-splash-screen | 55.0.12 | low | @expo/prebuild-config |
| postcss-selector-parser | 6.1.2 | moderate | [GHSA-w9m9-85wc-3x92](https://github.com/advisories/GHSA-w9m9-85wc-3x92), [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) |
| query-string | 7.1.3 | moderate | decode-uri-component |
| uuid | 7.0.3 | moderate | [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) |
| xcode | 3.0.1 | moderate | uuid |
| zod | 3.25.76 | high | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) |

Total: {"info":0,"low":8,"moderate":38,"high":3,"critical":0,"total":49}

Disposition: unresolved unless explicitly described as fixed in the Go-Live Readiness report. No audit ignores, threshold changes, or exceptions applied.
