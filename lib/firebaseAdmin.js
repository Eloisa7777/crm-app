
import "server-only";

import {
  getApps,
  initializeApp,
  applicationDefault,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { ExternalAccountClient } from "google-auth-library";
import { getVercelOidcToken } from "@vercel/oidc";

// ============================================================
// 1. Environment variables
// ============================================================

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `[Firebase Admin] Missing environment variable: ${name}`
    );
  }

  return value;
}

// ============================================================
// 2. Vercel OIDC -> Google Cloud Workload Identity Federation
// ============================================================

function getWifAudience() {
  const projectNumber = getRequiredEnv("GCP_PROJECT_NUMBER");
  const poolId = getRequiredEnv("GCP_WORKLOAD_IDENTITY_POOL_ID");
  const providerId = getRequiredEnv(
    "GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID"
  );

  const providerResourceName =
    `//iam.googleapis.com/projects/${projectNumber}` +
    `/locations/global/workloadIdentityPools/${poolId}` +
    `/providers/${providerId}`;

  const oidcTokenAudience =
    process.env.GCP_WIF_TOKEN_AUDIENCE?.trim() ||
    `https://iam.googleapis.com/projects/${projectNumber}` +
      `/locations/global/workloadIdentityPools/${poolId}` +
      `/providers/${providerId}`;

  return {
    providerResourceName,
    oidcTokenAudience,
  };
}

function createVercelCredential() {
  const serviceAccountEmail = getRequiredEnv(
    "GCP_SERVICE_ACCOUNT_EMAIL"
  );

  const { providerResourceName, oidcTokenAudience } =
    getWifAudience();

  const impersonationUrl =
    "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/" +
    `${serviceAccountEmail}:generateAccessToken`;

  const authClient = ExternalAccountClient.fromJSON({
    type: "external_account",
    audience: providerResourceName,
    subject_token_type:
      "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url: impersonationUrl,
    subject_token_supplier: {
      getSubjectToken: async () => {
        const token = await getVercelOidcToken({
          audience: oidcTokenAudience,
        });

        if (
          typeof token !== "string" ||
          token.split(".").length !== 3
        ) {
          throw new Error(
            "[Firebase Admin] Invalid Vercel OIDC token."
          );
        }

        return token;
      },
    },
  });

  if (!authClient) {
    throw new Error(
      "[Firebase Admin] Failed to create Google WIF client."
    );
  }

  return {
    async getAccessToken() {
      const result = await authClient.getAccessToken();

      if (
        typeof result?.token !== "string" ||
        !result.token
      ) {
        throw new Error(
          "[Firebase Admin] Google WIF returned no access token."
        );
      }

      // Google may return expires_in or an absolute expireTime.
      const responseData = result.res?.data;

      const expiresInFromResponse = Number(
        responseData?.expires_in
      );

      const expireTime =
        responseData?.expireTime ??
        responseData?.expire_time;

      const expiresInFromTimestamp = expireTime
        ? Math.floor(
            (new Date(expireTime).getTime() - Date.now()) /
              1000
          )
        : NaN;

      const expiresIn =
        Number.isFinite(expiresInFromResponse) &&
        expiresInFromResponse > 0
          ? Math.floor(expiresInFromResponse)
          : expiresInFromTimestamp;

      if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
        throw new Error(
          "[Firebase Admin] Google WIF returned an invalid token expiry."
        );
      }

      // Firebase Admin expects access_token and expires_in.
      // expires_in is a duration in seconds, not an absolute timestamp.
      return {
        access_token: result.token,
        expires_in: expiresIn,
      };
    },
  };
}

// ============================================================
// 3. Select credentials by environment
//
// Local development: Application Default Credentials (ADC)
// Vercel: OIDC / Workload Identity Federation
// ============================================================

function getFirebaseAdminCredential() {
  if (process.env.VERCEL === "1") {
    return createVercelCredential();
  }

  if (process.env.NODE_ENV === "development") {
    return applicationDefault();
  }

  throw new Error(
    "[Firebase Admin] Unsupported environment."
  );
}

// ============================================================
// 4. Initialize Firebase Admin
// ============================================================

export function getFirebaseAdminServices() {
  const projectId = getRequiredEnv("GCP_PROJECT_ID");

  let app = getApps().find(
    (existingApp) => existingApp.name === "[DEFAULT]"
  );

  if (!app) {
    const credential = getFirebaseAdminCredential();

    app = initializeApp({
      credential,
      projectId,
    });
  }

  const adminAuth = getAuth(app);

  return {
    adminAuth,

    get adminDb() {
      return getFirestore(app);
    },
  };
}
