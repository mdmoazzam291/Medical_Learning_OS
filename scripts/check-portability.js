import { checkServicePortability } from './lib/service-portability.js';
const result = checkServicePortability();
console.log(`Portability register and coupling check passed: ${result.services} services, ${result.locations} locations. Restore readiness is separate.`);
