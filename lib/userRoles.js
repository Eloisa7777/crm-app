
import "server-only";

// ============================================================
// Firebase UID -> CRM Role
// Replace the example UIDs with real Firebase Authentication UIDs.
// ============================================================

export const USER_ROLES = {
  "Eqj5n773rbOC9pHRc3xyegSxyIk1": "admin",
  "REPLACE_WITH_PO_UID": "yjpo",
  "REPLACE_WITH_EST_UID": "yjest",
};

export function getRoleByUid(uid) {
  return USER_ROLES[uid] || null;
}
