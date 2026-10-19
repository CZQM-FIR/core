# Changelog

## [1.2.2](https://github.com/CZQM-FIR/core/compare/overseer-v1.2.1...overseer-v1.2.2) (2026-10-19)


### ⚠ BREAKING CHANGES

* technical debt and switch to remote functions ([#179](https://github.com/CZQM-FIR/core/issues/179))
* drizzle 1.0.0 migration ([#144](https://github.com/CZQM-FIR/core/issues/144))

### Features

* add active controller filter to activity page ([171949b](https://github.com/CZQM-FIR/core/commit/171949b2c998bff550ec9009a26c13ed1e16026a))
* add activity exemption flag ([#127](https://github.com/CZQM-FIR/core/issues/127)) ([c4488aa](https://github.com/CZQM-FIR/core/commit/c4488aad82dd73d92cd2ae61ffe7705e34fa85b4))
* add copy button ([4cdc8a2](https://github.com/CZQM-FIR/core/commit/4cdc8a296713f51f44d05c169512d48c6f3c7aec))
* add event and news delete ([2ec19a5](https://github.com/CZQM-FIR/core/commit/2ec19a5d82e0233e2db4b85b3791581db49476cb))
* add recurring toggle to events ([406847e](https://github.com/CZQM-FIR/core/commit/406847ef48588c0b489038d40a45e8bde5ce9d14))
* add sort to resources ([d00ec6a](https://github.com/CZQM-FIR/core/commit/d00ec6a13aa18dc01e88bab04db96cfd3d042af8))
* arktype validation ([3837585](https://github.com/CZQM-FIR/core/commit/3837585447173e675e7c4635d24d197bbe87c82b))
* document management system ([#134](https://github.com/CZQM-FIR/core/issues/134)) ([1d4cd31](https://github.com/CZQM-FIR/core/commit/1d4cd31fd49c8536686b08578df5f30c0f4f53eb))
* file upload ([b59a8ff](https://github.com/CZQM-FIR/core/commit/b59a8ff66d77e1a7f43b85bbb8d92d357c07d6dc))
* implement notification system ([#120](https://github.com/CZQM-FIR/core/issues/120)) ([5c0d18a](https://github.com/CZQM-FIR/core/commit/5c0d18a7a6cd70a4a50140713de32439317f26b3))
* markdown support for events and news ([9fdedfb](https://github.com/CZQM-FIR/core/commit/9fdedfbaf69214cb8b50aa4a6c46d13c78b6dfd1))
* markdown support for events and news ([a7a817b](https://github.com/CZQM-FIR/core/commit/a7a817b597f054f132613af8c8bac7c5412201bb))
* multi-position solo authorizations ([#248](https://github.com/CZQM-FIR/core/issues/248)) ([d4bfffe](https://github.com/CZQM-FIR/core/commit/d4bfffe9e3c0f45d2e6f4971c7b6dfa372c1e9f5))
* news ([bc4e7ab](https://github.com/CZQM-FIR/core/commit/bc4e7ab08318b9441bb883122968e92b0e4a3d1d))
* news editor ([f26b36d](https://github.com/CZQM-FIR/core/commit/f26b36d4fcc9d6b7b0082dcaf5bb76eb89a52f70))
* notification framework ([#105](https://github.com/CZQM-FIR/core/issues/105)) ([0a12ce6](https://github.com/CZQM-FIR/core/commit/0a12ce613c7c7ad00778272def275168b69225c6))
* **overseer:** edit events ([#19](https://github.com/CZQM-FIR/core/issues/19)) ([8d33964](https://github.com/CZQM-FIR/core/commit/8d339649fbeb8757f8b9a76e4795b9b2026a1932))
* **overseer:** resource editor ([7988e76](https://github.com/CZQM-FIR/core/commit/7988e765e10b934d6f8d8e3ae2779ffa0924a24c))
* staff role assignments and assistant access parity ([#200](https://github.com/CZQM-FIR/core/issues/200)) ([e1f24cc](https://github.com/CZQM-FIR/core/commit/e1f24cc35168875bff8851e9ab63bd2b359b32e7))
* user active status ([40ff881](https://github.com/CZQM-FIR/core/commit/40ff881ae5a3b8a21c66bc4866fa258d78443240))
* vector ([#87](https://github.com/CZQM-FIR/core/issues/87)) ([750cfca](https://github.com/CZQM-FIR/core/commit/750cfca40955f22e9bc8b88d9bbd236749b251f2))


### Bug Fixes

* 500 error on file upload ([#77](https://github.com/CZQM-FIR/core/issues/77)) ([23f233b](https://github.com/CZQM-FIR/core/commit/23f233b29612bd209541ca1364a985957bad2c17))
* add missing dependencies ([4a0eee4](https://github.com/CZQM-FIR/core/commit/4a0eee4ccb98159459e740812275735ee9f50d82))
* add missing import ([4a0eee4](https://github.com/CZQM-FIR/core/commit/4a0eee4ccb98159459e740812275735ee9f50d82))
* allow images up to 10MB ([#75](https://github.com/CZQM-FIR/core/issues/75)) ([2af9670](https://github.com/CZQM-FIR/core/commit/2af96703a68394fd37dfb040cd805c73da2c93c0))
* async local storage compatiability error ([4a0eee4](https://github.com/CZQM-FIR/core/commit/4a0eee4ccb98159459e740812275735ee9f50d82))
* attempt to cut down on db usage ([8dac8fc](https://github.com/CZQM-FIR/core/commit/8dac8fc5e7741930a93bb9dadaf04cc4306db621))
* broken events redirect ([fd93c81](https://github.com/CZQM-FIR/core/commit/fd93c81e3fa51142869dfc710c381a6c0f414989))
* buffer not defined ([f5a3179](https://github.com/CZQM-FIR/core/commit/f5a31798c75ee8ee940e736a8e3d6422bc7de79f))
* buffer not defined ([93da0ee](https://github.com/CZQM-FIR/core/commit/93da0ee76577c92cd8bdf042fb4e5ac299662ce4))
* build issues ([1205ca8](https://github.com/CZQM-FIR/core/commit/1205ca84416dd11799ec89ea990504f38be7f1f7))
* change onclick to onclickcapture ([#104](https://github.com/CZQM-FIR/core/issues/104)) ([28cff9f](https://github.com/CZQM-FIR/core/commit/28cff9f487bccbfeb1c5a96049c97d690862773a))
* **deps:** update dependency @libsql/client to ^0.18.0 ([83451ba](https://github.com/CZQM-FIR/core/commit/83451bab34cdbce8aac2ee5d9d18a8cf8c4d15c5))
* **deps:** update dependency @lucide/svelte to ^0.577.0 ([#21](https://github.com/CZQM-FIR/core/issues/21)) ([ddd044a](https://github.com/CZQM-FIR/core/commit/ddd044a00f41a410c1d60bdb59991376ee5f37f0))
* event edit changing every time ([86cedb2](https://github.com/CZQM-FIR/core/commit/86cedb21ef9c9a0eca283a69272f9a928cff1d76))
* events not able to be updated ([0286e0d](https://github.com/CZQM-FIR/core/commit/0286e0d0ec496689c0fb1e29269b031cc20cb0dd))
* events not able to be updated due to recurring checkbox error ([0286e0d](https://github.com/CZQM-FIR/core/commit/0286e0d0ec496689c0fb1e29269b031cc20cb0dd))
* incorrect file type for favicon ([3e268df](https://github.com/CZQM-FIR/core/commit/3e268df27ca26314349ad02821991df071542933))
* incorrect filtering ([ded78cf](https://github.com/CZQM-FIR/core/commit/ded78cf98a36b03c462d2ec262fc6cf79072f757))
* incorrect filtering on activity page ([e28f823](https://github.com/CZQM-FIR/core/commit/e28f8239dcbfc7e740bf15cd24e792fb2c977c9b))
* incorrect form data handling causing new news articles to not post ([#63](https://github.com/CZQM-FIR/core/issues/63)) ([4f99074](https://github.com/CZQM-FIR/core/commit/4f99074fca227c9dc340f007c55af5d8ca9c304c))
* incorrect type definitions ([19dbf2c](https://github.com/CZQM-FIR/core/commit/19dbf2c5c6c93a6292fd2ba23c16ed51c368f77e))
* increase overseer upload limit ([56792d0](https://github.com/CZQM-FIR/core/commit/56792d0b6f4a8575285825d2f8984d736a3d5ea4))
* maximum upload size ([#72](https://github.com/CZQM-FIR/core/issues/72)) ([1ee29ad](https://github.com/CZQM-FIR/core/commit/1ee29adf6d57a70911c40a2db101e25775dc61cf))
* overseer build error ([8a97ef3](https://github.com/CZQM-FIR/core/commit/8a97ef3d11999aff338da854dc3943d81c125d4b))
* overseer link not being shown ([13b47d3](https://github.com/CZQM-FIR/core/commit/13b47d3c6841c6c627c5b852cd8cbb47c8a45c14))
* overseer not checking permissions ([fecf465](https://github.com/CZQM-FIR/core/commit/fecf4653e71aa6d8ec073800fc36817de351b5d6))
* overseer permissions not being checked ([#209](https://github.com/CZQM-FIR/core/issues/209)) ([4f611d8](https://github.com/CZQM-FIR/core/commit/4f611d8940d48e152bea61966c7331735d50c13f))
* overseer permissions not being checked ([#209](https://github.com/CZQM-FIR/core/issues/209)) ([41ea902](https://github.com/CZQM-FIR/core/commit/41ea90226e21eaa8ae41b30ac7b3f024a3b39e57))
* **overseer:** fix wrangler name again because I can't read ([1205ca8](https://github.com/CZQM-FIR/core/commit/1205ca84416dd11799ec89ea990504f38be7f1f7))
* **overseer:** remove guests from user list ([#52](https://github.com/CZQM-FIR/core/issues/52)) ([01c6aef](https://github.com/CZQM-FIR/core/commit/01c6aeff05d619e3b6a5ffcf35ae83af62ced919))
* release please ([cc5165b](https://github.com/CZQM-FIR/core/commit/cc5165b6df12f79aeedd025bc2b76609d8bc6376))
* resources missing code ([d3630c3](https://github.com/CZQM-FIR/core/commit/d3630c32cfa76f18cc1c30a81c74ba5e0c7d9275))
* resources not saving ([7ac379e](https://github.com/CZQM-FIR/core/commit/7ac379e7f5671b9765bd083232158d03002e3b64))
* solos not being created ([#129](https://github.com/CZQM-FIR/core/issues/129)) ([a5580b5](https://github.com/CZQM-FIR/core/commit/a5580b506d368dfdd5c63fa6e54ed33283065127))
* solve discord integration error caused by arktype ([0869542](https://github.com/CZQM-FIR/core/commit/0869542ce58c5a0a47cfae439a064d022fe8a56a))
* sync issues when updating certain fields ([9fcfc0a](https://github.com/CZQM-FIR/core/commit/9fcfc0a1c6c56e644d7e8aa2ceb3a4b4f2fe3e74))
* time and date for events incorrect padding ([ef95a04](https://github.com/CZQM-FIR/core/commit/ef95a0404ad020bd0137fdb4677586f019d81b1a))
* unable to change user roster status ([#97](https://github.com/CZQM-FIR/core/issues/97)) ([411f084](https://github.com/CZQM-FIR/core/commit/411f084b1d8d0f2815d7c79033d5f9082a75e47f))
* update ratings from vatcan for all users ([f057a77](https://github.com/CZQM-FIR/core/commit/f057a770042de37cb3949c8f8fa62cd7805f9e64))
* upload limit too low ([#103](https://github.com/CZQM-FIR/core/issues/103)) ([d0681e6](https://github.com/CZQM-FIR/core/commit/d0681e62f401b943247e9e1a0c1e66f84c1430fb))
* user activity display incorrect division ([57f12eb](https://github.com/CZQM-FIR/core/commit/57f12eb3820b9bd417e498e90f83c9676caf13c9))
* user page showing rolling window rather than quarters ([#106](https://github.com/CZQM-FIR/core/issues/106)) ([f8dbc26](https://github.com/CZQM-FIR/core/commit/f8dbc262a514741d804081265891de42d664b118))
* web and overseer build issues ([1205ca8](https://github.com/CZQM-FIR/core/commit/1205ca84416dd11799ec89ea990504f38be7f1f7))
* weird styling on user info ([92653da](https://github.com/CZQM-FIR/core/commit/92653daa495058d582e589b3adb04030c23d5381))
* worker imports ([1205ca8](https://github.com/CZQM-FIR/core/commit/1205ca84416dd11799ec89ea990504f38be7f1f7))
* **worker:** error imports ([1205ca8](https://github.com/CZQM-FIR/core/commit/1205ca84416dd11799ec89ea990504f38be7f1f7))
* wrangler names do not match cloudflare pages ([#3](https://github.com/CZQM-FIR/core/issues/3)) ([1205ca8](https://github.com/CZQM-FIR/core/commit/1205ca84416dd11799ec89ea990504f38be7f1f7))


### Miscellaneous Chores

* drizzle 1.0.0 migration ([#144](https://github.com/CZQM-FIR/core/issues/144)) ([468656d](https://github.com/CZQM-FIR/core/commit/468656d7c59c663e05fa8c2b767a75d415952a2c))
* force release ([cdcfdc0](https://github.com/CZQM-FIR/core/commit/cdcfdc0dae06b14bffc9dcdfc8fdcd293045006a))
* force release ([4259d34](https://github.com/CZQM-FIR/core/commit/4259d34a313a974b411d7f5dd399570ee5683ba5))


### Code Refactoring

* technical debt and switch to remote functions ([#179](https://github.com/CZQM-FIR/core/issues/179)) ([4a0eee4](https://github.com/CZQM-FIR/core/commit/4a0eee4ccb98159459e740812275735ee9f50d82))

## [1.2.1](https://github.com/CZQM-FIR/core/compare/overseer-v1.2.0...overseer-v1.2.1) (2026-10-18)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @czqm/db bumped to 1.2.0
    - @czqm/common bumped to 1.2.0

## [1.2.0](https://github.com/CZQM-FIR/core/compare/overseer-v1.1.1...overseer-v1.2.0) (2026-10-18)

### Miscellaneous Chores

- force release ([4259d34](https://github.com/CZQM-FIR/core/commit/4259d34a313a974b411d7f5dd399570ee5683ba5))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @czqm/db bumped to 1.2.0
    - @czqm/common bumped to 1.2.0

## [1.1.1](https://github.com/CZQM-FIR/core/compare/overseer-v1.1.0...overseer-v1.1.1) (2026-09-21)

### Bug Fixes

- solve discord integration error caused by arktype ([0869542](https://github.com/CZQM-FIR/core/commit/0869542ce58c5a0a47cfae439a064d022fe8a56a))

## [1.1.0](https://github.com/CZQM-FIR/core/compare/overseer-v1.0.0...overseer-v1.1.0) (2026-09-21)

### Features

- multi-position solo authorizations ([#248](https://github.com/CZQM-FIR/core/issues/248)) ([d4bfffe](https://github.com/CZQM-FIR/core/commit/d4bfffe9e3c0f45d2e6f4971c7b6dfa372c1e9f5))

## [1.1.0](https://github.com/CZQM-FIR/core/compare/overseer-v1.0.0...overseer-v1.1.0) (2026-09-21)

### Features

- multi-position solo authorizations ([#248](https://github.com/CZQM-FIR/core/issues/248)) ([d4bfffe](https://github.com/CZQM-FIR/core/commit/d4bfffe9e3c0f45d2e6f4971c7b6dfa372c1e9f5))
