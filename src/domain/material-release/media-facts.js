// Local in-process measurement identity; uploaded JSON never enters this WeakSet.
const measured=new WeakSet();
export function measuredImageFacts(facts){const value=Object.freeze(facts);measured.add(value);return value;}
export function isMeasuredImageFacts(facts){return measured.has(facts);}
