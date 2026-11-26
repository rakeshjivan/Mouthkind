// Public keys that clinician codes are checked against (tools/clinician-code.mjs). Public by
// design: they can only check a code, not make one. More than one key lets a new key take
// over without stopping codes already issued.
export const CLIN_PUBLIC_KEYS = [
  "BJATZ79dTjnTd58mCjJePkgckni1cTRjnhvFJiRxo1WQaW_txxuEkRt71sOSEjOKLhCfEWlWhVNsM9XemDxcY9A",
];
// AHPRA numbers whose codes have been withdrawn.
export const REVOKED = [];
