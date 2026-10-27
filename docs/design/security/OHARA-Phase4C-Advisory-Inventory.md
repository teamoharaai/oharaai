# Phase 4C — Complete dependency inventory

Generated from the October 26 npm lockfile audits. Counts are affected packages, not unique advisories. The initial 60 packages contain 59 distinct advisory URLs; propagated packages are explicitly shown. Exact install paths, all immediate parent constraints, shortest root chains, advisory affected ranges and npm suggestions are preserved in the adjacent JSON. Suggestions are not approved remedies.

| Package | Installed → candidate | Severity before → after | Direct? | Context | Advisory / propagation |
| --- | --- | --- | --- | --- | --- |
| @babel/core | 7.29.0 → 7.29.0 | low → low | no | Build/development/native tooling (not a safety exemption) | [GHSA-4x5r-pxfx-6jf8](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8) |
| @expo/cli | 55.0.18 → 55.0.18 | high → high | no | Build/development/native tooling (not a safety exemption) | via @expo/code-signing-certificates; via node-forge; via zod |
| @expo/code-signing-certificates | 0.0.6 → 0.0.6 | high → high | no | Build/development/native tooling (not a safety exemption) | via node-forge |
| @expo/config-plugins | 55.0.7 → 55.0.7 | moderate → moderate | no | Build/development/native tooling (not a safety exemption) | via xcode |
| @expo/metro-config | 55.0.11 → 55.0.11 | moderate → moderate | no | Build/development/native tooling (not a safety exemption) | via postcss |
| @react-navigation/core | 7.17.0 → 7.17.0 | moderate → moderate | no | Web/native runtime; some build consumers | via query-string |
| @tiptap/core | 2.27.1 → 2.27.1 | moderate → moderate | yes | Web editor runtime | [GHSA-cp6q-959q-f8rh](https://github.com/advisories/GHSA-cp6q-959q-f8rh) |
| @tiptap/extension-blockquote | 2.27.2 → 2.27.2 | moderate → moderate | no | Web editor runtime | via @tiptap/core |
| @tiptap/extension-bold | 2.27.2 → 2.27.2 | moderate → moderate | no | Web editor runtime | via @tiptap/core |
| @tiptap/extension-bubble-menu | 2.27.2 → 2.27.2 | moderate → moderate | no | Web editor runtime | via @tiptap/core |
| @tiptap/extension-bullet-list | 2.27.2 → 2.27.2 | moderate → moderate | no | Web editor runtime | via @tiptap/core |
| @tiptap/extension-code | 2.27.2 → 2.27.2 | moderate → moderate | no | Web editor runtime | via @tiptap/core |
| @tiptap/extension-code-block | 2.27.2 → 2.27.2 | moderate → moderate | no | Web editor runtime | via @tiptap/core |
| @tiptap/extension-document | 2.27.2 → 2.27.2 | moderate → moderate | no | Web editor runtime | via @tiptap/core |
| @tiptap/extension-dropcursor | 2.27.2 → 2.27.2 | moderate → moderate | no | Web editor runtime | via @tiptap/core |
| @tiptap/extension-floating-menu | 2.27.2 → 2.27.2 | moderate → moderate | no | Web editor runtime | via @tiptap/core |
| @tiptap/extension-gapcursor | 2.27.2 → 2.27.2 | moderate → moderate | no | Web editor runtime | via @tiptap/core |
| @tiptap/extension-hard-break | 2.27.2 → 2.27.2 | moderate → moderate | no | Web editor runtime | via @tiptap/core |
| @tiptap/extension-heading | 2.27.2 → 2.27.2 | moderate → moderate | no | Web editor runtime | via @tiptap/core |
| @tiptap/extension-history | 2.27.2 → 2.27.2 | moderate → moderate | no | Web editor runtime | via @tiptap/core |
| @tiptap/extension-horizontal-rule | 2.27.2 → 2.27.2 | moderate → moderate | no | Web editor runtime | via @tiptap/core |
| @tiptap/extension-italic | 2.27.2 → 2.27.2 | moderate → moderate | no | Web editor runtime | via @tiptap/core |
| @tiptap/extension-link | 2.27.1 → 2.27.1 | moderate → moderate | yes | Web editor runtime | via @tiptap/core |
| @tiptap/extension-list-item | 2.27.2 → 2.27.2 | moderate → moderate | no | Web editor runtime | via @tiptap/core |
| @tiptap/extension-ordered-list | 2.27.2 → 2.27.2 | moderate → moderate | no | Web editor runtime | via @tiptap/core |
| @tiptap/extension-paragraph | 2.27.2 → 2.27.2 | moderate → moderate | no | Web editor runtime | via @tiptap/core |
| @tiptap/extension-placeholder | 2.27.1 → 2.27.1 | moderate → moderate | yes | Web editor runtime | via @tiptap/core |
| @tiptap/extension-strike | 2.27.2 → 2.27.2 | moderate → moderate | no | Web editor runtime | via @tiptap/core |
| @tiptap/extension-task-item | 2.27.1 → 2.27.1 | moderate → moderate | yes | Web editor runtime | via @tiptap/core |
| @tiptap/extension-task-list | 2.27.1 → 2.27.1 | moderate → moderate | yes | Web editor runtime | via @tiptap/core |
| @tiptap/extension-text | 2.27.2 → 2.27.2 | moderate → moderate | no | Web editor runtime | via @tiptap/core |
| @tiptap/extension-text-align | 2.27.1 → 2.27.1 | moderate → moderate | yes | Web editor runtime | via @tiptap/core |
| @tiptap/extension-text-style | 2.27.2 → 2.27.2 | moderate → moderate | no | Web editor runtime | via @tiptap/core |
| @tiptap/extension-underline | 2.27.1 → 2.27.1 | moderate → moderate | yes | Web editor runtime | via @tiptap/core |
| @tiptap/react | 2.27.1 → 2.27.1 | moderate → moderate | yes | Web editor runtime | via @tiptap/core; via @tiptap/extension-bubble-menu; via @tiptap/extension-floating-menu |
| @tiptap/starter-kit | 2.27.1 → 2.27.1 | moderate → moderate | yes | Web editor runtime | via @tiptap/core; via @tiptap/extension-blockquote; via @tiptap/extension-bold; via @tiptap/extension-bullet-list; via @tiptap/extension-code; via @tiptap/extension-code-block; via @tiptap/extension-document; via @tiptap/extension-dropcursor; via @tiptap/extension-gapcursor; via @tiptap/extension-hard-break; via @tiptap/extension-heading; via @tiptap/extension-history; via @tiptap/extension-horizontal-rule; via @tiptap/extension-italic; via @tiptap/extension-list-item; via @tiptap/extension-ordered-list; via @tiptap/extension-paragraph; via @tiptap/extension-strike; via @tiptap/extension-text; via @tiptap/extension-text-style |
| @xmldom/xmldom | 0.8.11 → 0.8.15 | high → not reported | no | Build/development/native tooling (not a safety exemption) | [GHSA-wh4c-j3r5-mjhp](https://github.com/advisories/GHSA-wh4c-j3r5-mjhp); [GHSA-2v35-w6hq-6mfw](https://github.com/advisories/GHSA-2v35-w6hq-6mfw); [GHSA-f6ww-3ggp-fr8h](https://github.com/advisories/GHSA-f6ww-3ggp-fr8h); [GHSA-x6wf-f3px-wcqx](https://github.com/advisories/GHSA-x6wf-f3px-wcqx); [GHSA-j759-j44w-7fr8](https://github.com/advisories/GHSA-j759-j44w-7fr8); [GHSA-6gmq-8vp8-gcm6](https://github.com/advisories/GHSA-6gmq-8vp8-gcm6); [GHSA-w2rr-34g9-rvrj](https://github.com/advisories/GHSA-w2rr-34g9-rvrj); [GHSA-4w3w-2rp5-g8jm](https://github.com/advisories/GHSA-4w3w-2rp5-g8jm); [GHSA-c7q8-3ch8-vqpv](https://github.com/advisories/GHSA-c7q8-3ch8-vqpv); [GHSA-27p8-2357-5qqv](https://github.com/advisories/GHSA-27p8-2357-5qqv); [GHSA-6h8r-xr42-gp59](https://github.com/advisories/GHSA-6h8r-xr42-gp59); [GHSA-8344-3jmq-59r6](https://github.com/advisories/GHSA-8344-3jmq-59r6); [GHSA-x4fp-j954-r2f4](https://github.com/advisories/GHSA-x4fp-j954-r2f4); [GHSA-965w-775f-mr7g](https://github.com/advisories/GHSA-965w-775f-mr7g); [GHSA-93r5-fhx6-vmg9](https://github.com/advisories/GHSA-93r5-fhx6-vmg9) |
| baseline-browser-mapping | 2.10.10 → 2.11.33 | moderate → not reported | no | Build/development/native tooling (not a safety exemption) | [GHSA-w5vr-8v7q-w6rv](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv) |
| brace-expansion | 1.1.12 → 1.1.21; 5.0.5 → 5.0.12 | high → not reported | no | Build/development/native tooling (not a safety exemption) | [GHSA-f886-m6hf-6m8v](https://github.com/advisories/GHSA-f886-m6hf-6m8v); [GHSA-jxxr-4gwj-5jf2](https://github.com/advisories/GHSA-jxxr-4gwj-5jf2); [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp); [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp); [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg); [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg); [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895); [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895); [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr); [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr); [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7); [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7); [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p); [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) |
| browserslist | 4.28.1 → 4.29.4 | high → not reported | no | Build/development/native tooling (not a safety exemption) | [GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx); [GHSA-73wf-gq98-2v4g](https://github.com/advisories/GHSA-73wf-gq98-2v4g) |
| compression | 1.8.1 → 1.8.2 | high → not reported | no | Build/development/native tooling (not a safety exemption) | [GHSA-vc2v-76pw-4v95](https://github.com/advisories/GHSA-vc2v-76pw-4v95) |
| decode-uri-component | 0.2.2 → 0.2.2 | moderate → moderate | no | Web/native runtime; some build consumers | [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) |
| expo | 55.0.8 → 55.0.8 | high → high | yes | Build/development/native tooling (not a safety exemption) | via @expo/cli; via @expo/metro-config |
| expo-router | 55.0.7 → 55.0.7 | moderate → moderate | yes | Web/native runtime; some build consumers | via query-string |
| image-size | 1.2.1 → 1.2.1 | high → high | no | Build/development/native tooling (not a safety exemption) | [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq); [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) |
| js-yaml | 4.1.1 → 4.3.2; 3.14.2 → 3.15.2 | high → not reported | no | Build/development/native tooling (not a safety exemption) | [GHSA-h67p-54hq-rp68](https://github.com/advisories/GHSA-h67p-54hq-rp68); [GHSA-h67p-54hq-rp68](https://github.com/advisories/GHSA-h67p-54hq-rp68); [GHSA-52cp-r559-cp3m](https://github.com/advisories/GHSA-52cp-r559-cp3m); [GHSA-52cp-r559-cp3m](https://github.com/advisories/GHSA-52cp-r559-cp3m); [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj); [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj); [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh); [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh) |
| markdown-it | 14.3.0 → 14.3.3 | high → not reported | no | Tiptap PM markdown dependency; no app markdown-it caller found | [GHSA-r7fv-28h4-cvq7](https://github.com/advisories/GHSA-r7fv-28h4-cvq7); [GHSA-vfgh-jcmw-g37q](https://github.com/advisories/GHSA-vfgh-jcmw-g37q); [GHSA-gfr2-rv44-r23c](https://github.com/advisories/GHSA-gfr2-rv44-r23c); [GHSA-253c-mchw-3w2r](https://github.com/advisories/GHSA-253c-mchw-3w2r) |
| nanoid | 3.3.11 → 3.3.20 | high → not reported | no | Web/native runtime; some build consumers | [GHSA-28wg-ghj8-5hjv](https://github.com/advisories/GHSA-28wg-ghj8-5hjv); [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8); [GHSA-xwg4-73v4-xw9w](https://github.com/advisories/GHSA-xwg4-73v4-xw9w) |
| node-forge | 1.4.0 → 1.4.0 | high → high | no | Build/development/native tooling (not a safety exemption) | [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) |
| postcss | 8.4.49 → 8.4.49 | high → high | no | Build/development/native tooling (not a safety exemption) | [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93); [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q); [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp); [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) |
| postcss-selector-parser | 6.1.2 → 6.1.2 | moderate → moderate | no | Build/development/native tooling (not a safety exemption) | [GHSA-w9m9-85wc-3x92](https://github.com/advisories/GHSA-w9m9-85wc-3x92); [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) |
| prosemirror-view | 1.42.2 → 1.42.8 | high → not reported | no | Web editor runtime | [GHSA-c8x8-7fp4-3x9w](https://github.com/advisories/GHSA-c8x8-7fp4-3x9w) |
| query-string | 7.1.3 → 7.1.3 | moderate → moderate | no | Web/native runtime; some build consumers | via decode-uri-component |
| shell-quote | 1.8.3 → 1.12.0 | critical → not reported | no | React DevTools standalone development tooling (bundled copy also present) | [GHSA-w7jw-789q-3m8p](https://github.com/advisories/GHSA-w7jw-789q-3m8p); [GHSA-395f-4hp3-45gv](https://github.com/advisories/GHSA-395f-4hp3-45gv) |
| source-map-js | 1.2.1 → 1.2.2 | high → not reported | no | Build/development/native tooling (not a safety exemption) | [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) |
| tmp | 0.2.5 → 0.2.7 | high → not reported | no | Build/development/native tooling (not a safety exemption) | [GHSA-ph9p-34f9-6g65](https://github.com/advisories/GHSA-ph9p-34f9-6g65) |
| uuid | 7.0.3 → 7.0.3 | moderate → moderate | no | Build/development/native tooling (not a safety exemption) | [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) |
| ws | 8.20.0 → 8.22.0; 7.5.10 → 7.5.13 | high → not reported | no | Server Realtime + native/dev/Metro tooling; browser uses native WebSocket | [GHSA-58qx-3vcg-4xpx](https://github.com/advisories/GHSA-58qx-3vcg-4xpx); [GHSA-96hv-2xvq-fx4p](https://github.com/advisories/GHSA-96hv-2xvq-fx4p); [GHSA-96hv-2xvq-fx4p](https://github.com/advisories/GHSA-96hv-2xvq-fx4p) |
| xcode | 3.0.1 → 3.0.1 | moderate → moderate | no | Build/development/native tooling (not a safety exemption) | via uuid |
| zod | 3.25.76 → 3.25.76 | high → high | no | Build/development/native tooling (not a safety exemption) | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) |

## Exact lockfile changes

| Install path | Before | After |
| --- | --- | --- |
| node_modules/@expo/xcpretty/node_modules/js-yaml | 4.1.1 | 4.3.2 |
| node_modules/@react-native/codegen/node_modules/brace-expansion | 1.1.12 | 1.1.21 |
| node_modules/@supabase/realtime-js/node_modules/ws | 8.20.0 | 8.22.0 |
| node_modules/@xmldom/xmldom | 0.8.11 | 0.8.15 |
| node_modules/baseline-browser-mapping | 2.10.10 | 2.11.33 |
| node_modules/brace-expansion | 5.0.5 | 5.0.12 |
| node_modules/browserslist | 4.28.1 | 4.29.4 |
| node_modules/caniuse-lite | 1.0.30001781 | 1.0.30001819 |
| node_modules/compression | 1.8.1 | 1.8.2 |
| node_modules/electron-to-chromium | 1.5.325 | 1.5.464 |
| node_modules/expo/node_modules/ws | 8.20.0 | 8.22.0 |
| node_modules/js-yaml | 3.14.2 | 3.15.2 |
| node_modules/markdown-it | 14.3.0 | 14.3.3 |
| node_modules/nanoid | 3.3.11 | 3.3.20 |
| node_modules/node-releases | 2.0.36 | 2.0.60 |
| node_modules/prosemirror-model | 1.25.11 | 1.25.12 |
| node_modules/prosemirror-view | 1.42.2 | 1.42.8 |
| node_modules/react-native/node_modules/brace-expansion | 1.1.12 | 1.1.21 |
| node_modules/rimraf/node_modules/brace-expansion | 1.1.12 | 1.1.21 |
| node_modules/shell-quote | 1.8.3 | 1.12.0 |
| node_modules/source-map-js | 1.2.1 | 1.2.2 |
| node_modules/test-exclude/node_modules/brace-expansion | 1.1.12 | 1.1.21 |
| node_modules/tmp | 0.2.5 | 0.2.7 |
| node_modules/update-browserslist-db | 1.2.3 | 1.3.4 |
| node_modules/ws | 7.5.10 | 7.5.13 |
