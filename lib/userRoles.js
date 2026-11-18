
import "server-only";

// ============================================================
// Firebase UID -> CRM Role
// Replace the example UIDs with real Firebase Authentication UIDs.
// ============================================================

export const USER_ROLES = {
  "Eqj5n773rbOC9pHRc3xyegSxyIk1":"subsup",
  "":"admin",
  "D7BZRM5bzqT3QY4zFUgcVO4U60K2":"general",
  "0DGaES5eHNa0CUJMtP6MiyacN332": "yjpo",
  "REPLACE_WITH_EST_UID": "yjest",
};

export function getRoleByUid(uid) {
  return USER_ROLES[uid] || null;
}
