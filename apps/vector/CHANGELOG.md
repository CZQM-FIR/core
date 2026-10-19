# Changelog

## [1.2.2](https://github.com/CZQM-FIR/core/compare/vector-v1.2.1...vector-v1.2.2) (2026-10-19)


### ⚠ BREAKING CHANGES

* technical debt and switch to remote functions ([#179](https://github.com/CZQM-FIR/core/issues/179))
* drizzle 1.0.0 migration ([#144](https://github.com/CZQM-FIR/core/issues/144))

### Features

* add Discord manual task alerts ([#290](https://github.com/CZQM-FIR/core/issues/290)) ([287a127](https://github.com/CZQM-FIR/core/commit/287a127d991d7994129a69b4c36a44b4a731515f))
* document management system ([#134](https://github.com/CZQM-FIR/core/issues/134)) ([1d4cd31](https://github.com/CZQM-FIR/core/commit/1d4cd31fd49c8536686b08578df5f30c0f4f53eb))
* mark controllers in training on course enrolment ([#291](https://github.com/CZQM-FIR/core/issues/291)) ([9247be3](https://github.com/CZQM-FIR/core/commit/9247be3936cdadc0250c1d0abc749b4992c5e27e))
* multi-position solo authorizations ([#248](https://github.com/CZQM-FIR/core/issues/248)) ([d4bfffe](https://github.com/CZQM-FIR/core/commit/d4bfffe9e3c0f45d2e6f4971c7b6dfa372c1e9f5))
* optomistic waitlist updates ([#91](https://github.com/CZQM-FIR/core/issues/91)) ([4ff9028](https://github.com/CZQM-FIR/core/commit/4ff9028390f11a5d6c9dde80becd2c32d5b6da5e))
* staff role assignments and assistant access parity ([#200](https://github.com/CZQM-FIR/core/issues/200)) ([e1f24cc](https://github.com/CZQM-FIR/core/commit/e1f24cc35168875bff8851e9ab63bd2b359b32e7))
* training note email notifications ([#285](https://github.com/CZQM-FIR/core/issues/285)) ([bbdc1e1](https://github.com/CZQM-FIR/core/commit/bbdc1e17c8c92832e8e0e4822f75f6508ea40a1b))
* vector ([#87](https://github.com/CZQM-FIR/core/issues/87)) ([750cfca](https://github.com/CZQM-FIR/core/commit/750cfca40955f22e9bc8b88d9bbd236749b251f2))
* **vector:** add activity and certification prerequisites ([01b534a](https://github.com/CZQM-FIR/core/commit/01b534a5f1c20c6e06e214eae8bf93d34d0db8e5))
* **vector:** allow for backdated training sessions ([#254](https://github.com/CZQM-FIR/core/issues/254)) ([8204165](https://github.com/CZQM-FIR/core/commit/82041656410f91230943fab190b605d21d744280))
* waitlist management ([#93](https://github.com/CZQM-FIR/core/issues/93)) ([a2bc4cd](https://github.com/CZQM-FIR/core/commit/a2bc4cd336eb287303f202f407d9eb15963ca3e4))


### Bug Fixes

* add missing dependencies ([4a0eee4](https://github.com/CZQM-FIR/core/commit/4a0eee4ccb98159459e740812275735ee9f50d82))
* add missing import ([4a0eee4](https://github.com/CZQM-FIR/core/commit/4a0eee4ccb98159459e740812275735ee9f50d82))
* another async issue ([#90](https://github.com/CZQM-FIR/core/issues/90)) ([5c56671](https://github.com/CZQM-FIR/core/commit/5c5667151930342c56d39d8bef1640c8a49d4a5f))
* async local storage compatiability error ([4a0eee4](https://github.com/CZQM-FIR/core/commit/4a0eee4ccb98159459e740812275735ee9f50d82))
* attempt to cut down on db usage ([8dac8fc](https://github.com/CZQM-FIR/core/commit/8dac8fc5e7741930a93bb9dadaf04cc4306db621))
* change onclick to onclickcapture ([#104](https://github.com/CZQM-FIR/core/issues/104)) ([28cff9f](https://github.com/CZQM-FIR/core/commit/28cff9f487bccbfeb1c5a96049c97d690862773a))
* **deps:** update dependency @libsql/client to ^0.18.0 ([83451ba](https://github.com/CZQM-FIR/core/commit/83451bab34cdbce8aac2ee5d9d18a8cf8c4d15c5))
* **deps:** update dependency @lucide/svelte to ^0.577.0 ([#21](https://github.com/CZQM-FIR/core/issues/21)) ([ddd044a](https://github.com/CZQM-FIR/core/commit/ddd044a00f41a410c1d60bdb59991376ee5f37f0))
* discord sync no longer wipes non-managed roles ([#275](https://github.com/CZQM-FIR/core/issues/275)) ([01e1544](https://github.com/CZQM-FIR/core/commit/01e154440245234efafb649c0a1857f835fb4a16))
* reduce number of subrequests ([51cc4a8](https://github.com/CZQM-FIR/core/commit/51cc4a8987153bbb5ad2c5180b3327f6eb8acfd5))
* release please ([cc5165b](https://github.com/CZQM-FIR/core/commit/cc5165b6df12f79aeedd025bc2b76609d8bc6376))
* skip db init during vector Docker build ([b2653f5](https://github.com/CZQM-FIR/core/commit/b2653f5e1d959d2dd8f6e31ba77917c1b3ccb7ee))
* solve discord integration error caused by arktype ([0869542](https://github.com/CZQM-FIR/core/commit/0869542ce58c5a0a47cfae439a064d022fe8a56a))
* student pages try to access instructor endpoints ([aae1de7](https://github.com/CZQM-FIR/core/commit/aae1de7b08b1cd080349b4a22df8552651cb2e7e))
* sync forbidden issue ([5ac472e](https://github.com/CZQM-FIR/core/commit/5ac472e1416d74980918148db33e1a2a707e097e))
* sync tasks is forbidden ([ac109ce](https://github.com/CZQM-FIR/core/commit/ac109cef2d2b64a9d99560d3f5c444f38dbb1c94))
* temp dissable ssr for vector ([abf009f](https://github.com/CZQM-FIR/core/commit/abf009ffa4ab749d5473ea55b007dc4b4a7aa2e1))
* update wording of backdated training note ([b08f3cd](https://github.com/CZQM-FIR/core/commit/b08f3cd8e2c2e980fe6f8a5f0b1f5a0d47c5bf14))
* vector not respecting drizzle update ([a3ae30f](https://github.com/CZQM-FIR/core/commit/a3ae30f58ab6667fcaf1bdb8e0752d2f1cacc7ee))


### Miscellaneous Chores

* drizzle 1.0.0 migration ([#144](https://github.com/CZQM-FIR/core/issues/144)) ([468656d](https://github.com/CZQM-FIR/core/commit/468656d7c59c663e05fa8c2b767a75d415952a2c))
* force release ([cdcfdc0](https://github.com/CZQM-FIR/core/commit/cdcfdc0dae06b14bffc9dcdfc8fdcd293045006a))
* force release ([4259d34](https://github.com/CZQM-FIR/core/commit/4259d34a313a974b411d7f5dd399570ee5683ba5))


### Code Refactoring

* technical debt and switch to remote functions ([#179](https://github.com/CZQM-FIR/core/issues/179)) ([4a0eee4](https://github.com/CZQM-FIR/core/commit/4a0eee4ccb98159459e740812275735ee9f50d82))

## [1.2.1](https://github.com/CZQM-FIR/core/compare/vector-v1.2.0...vector-v1.2.1) (2026-10-19)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @czqm/common bumped to 1.2.1

## [1.2.0](https://github.com/CZQM-FIR/core/compare/vector-v1.1.4...vector-v1.2.0) (2026-10-18)

### Features

- add Discord manual task alerts ([#290](https://github.com/CZQM-FIR/core/issues/290)) ([287a127](https://github.com/CZQM-FIR/core/commit/287a127d991d7994129a69b4c36a44b4a731515f))
- mark controllers in training on course enrolment ([#291](https://github.com/CZQM-FIR/core/issues/291)) ([9247be3](https://github.com/CZQM-FIR/core/commit/9247be3936cdadc0250c1d0abc749b4992c5e27e))
- training note email notifications ([#285](https://github.com/CZQM-FIR/core/issues/285)) ([bbdc1e1](https://github.com/CZQM-FIR/core/commit/bbdc1e17c8c92832e8e0e4822f75f6508ea40a1b))

### Miscellaneous Chores

- force release ([4259d34](https://github.com/CZQM-FIR/core/commit/4259d34a313a974b411d7f5dd399570ee5683ba5))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @czqm/db bumped to 1.2.0
    - @czqm/common bumped to 1.2.0

## [1.1.4](https://github.com/CZQM-FIR/core/compare/vector-v1.1.3...vector-v1.1.4) (2026-10-03)

### Bug Fixes

- discord sync no longer wipes non-managed roles ([#275](https://github.com/CZQM-FIR/core/issues/275)) ([01e1544](https://github.com/CZQM-FIR/core/commit/01e154440245234efafb649c0a1857f835fb4a16))

## [1.1.3](https://github.com/CZQM-FIR/core/compare/vector-v1.1.2...vector-v1.1.3) (2026-09-30)

### Features

- **vector:** add activity and certification prerequisites ([01b534a](https://github.com/CZQM-FIR/core/commit/01b534a5f1c20c6e06e214eae8bf93d34d0db8e5))

## [1.1.2](https://github.com/CZQM-FIR/core/compare/vector-v1.1.1...vector-v1.1.2) (2026-09-24)

### Bug Fixes

- update wording of backdated training note ([b08f3cd](https://github.com/CZQM-FIR/core/commit/b08f3cd8e2c2e980fe6f8a5f0b1f5a0d47c5bf14))

## [1.1.1](https://github.com/CZQM-FIR/core/compare/vector-v1.1.0...vector-v1.1.1) (2026-09-21)

### Bug Fixes

- solve discord integration error caused by arktype ([0869542](https://github.com/CZQM-FIR/core/commit/0869542ce58c5a0a47cfae439a064d022fe8a56a))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @czqm/common bumped to 1.1.2

## [1.1.0](https://github.com/CZQM-FIR/core/compare/vector-v1.0.0...vector-v1.1.0) (2026-09-21)

### Features

- multi-position solo authorizations ([#248](https://github.com/CZQM-FIR/core/issues/248)) ([d4bfffe](https://github.com/CZQM-FIR/core/commit/d4bfffe9e3c0f45d2e6f4971c7b6dfa372c1e9f5))
- **vector:** allow for backdated training sessions ([#254](https://github.com/CZQM-FIR/core/issues/254)) ([8204165](https://github.com/CZQM-FIR/core/commit/82041656410f91230943fab190b605d21d744280))
