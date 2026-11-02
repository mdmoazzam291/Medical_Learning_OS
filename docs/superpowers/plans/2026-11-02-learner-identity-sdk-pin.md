# Staging API SDK top-level dependency pin

Routine reproducibility repair of existing staging API; execute inline/test-first/read-only review. No new feature/secret/role/Auth identity or production scope.

- [x] Registry metadata confirms SDK2.118.0 exists; operator manifest/lock already pin that reviewed version.
- [x] New guard rejects moving Edge@2 import (observedRED), requires exact semver/operator-lock/import alignment; Edge import fixed2.118.0GREEN. Comment clarifies isolated staging status.
- [ ] Full local tests/check, checkpoint reviewed source, deploy3files only to existing staging API, verify readback plus nine actual negative/CORS checks and zero user/session/code counts. Preservev2source/bundle backout and record exact CI.

Review found no concrete issue. Top-level SDK version alignment is not proof of identical Node/Edge transitive resolution or genuine hosted signed-in acceptance. Original runtimegetUser/current-session/no-store/self-only guards stay intact. Operator credentials and human source/clinical/reviewer gates remain blocked separately.
