# Staging API SDK top-level dependency pin

Routine reproducibility repair of existing staging API; execute inline/test-first/read-only review. No new feature/secret/role/Auth identity or production scope.

- [x] Registry metadata confirms SDK2.118.0 exists; operator manifest/lock already pin that reviewed version.
- [x] New guard rejects moving Edge@2 import (observedRED), requires exact semver/operator-lock/import alignment; Edge import fixed2.118.0GREEN. Comment clarifies isolated staging status.
- [x] Full local tests/check, checkpoint reviewed source, deploy3files only to existing staging API, verify readback plus nine actual negative/CORS checks and zero user/session/code counts. Preservev2source/bundle backout and record exact CI.

Review found no concrete issue. Top-level SDK version alignment is not proof of identical Node/Edge transitive resolution or genuine hosted signed-in acceptance. Original runtimegetUser/current-session/no-store/self-only guards stay intact. Operator credentials and human source/clinical/reviewer gates remain blocked separately.

Source8bc1ada deployed isolated stagingv3/bundle42d1b5d8a07a8f55581815fb7c7150fe4ad9c0b22196b14e6f1ff24ab26e742d; exact3file parity and9real negativesPASS,0/0/0postcounts.14focused/full1581tests/checkPASS. No genuinepositiveAuth/production change; sourceCI41415880983 status recorded separately.

Finalsource8bc1ada/Foundation41415880983 ALL5jobsSUCCESS. Operatorlock read-only advisory metadata0known vulnerabilities, notEdge/security certification; movingv2@2source is historical only, not deterministicrollback. Finaldocs/registerheadCI separate; genuineAuth/human/production gates unchanged.
