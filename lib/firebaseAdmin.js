
import "server-only";

import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { ExternalAccountClient } from "google-auth-library";
import { getVercelOidcToken } from "@vercel/oidc";

// ============================================================
// 1. Read required environment variables
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
// 2. Build Google Cloud WIF audience values
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

  return {
    // Audience used in the Google external_account credential config.
    providerResourceName,

    // Default OIDC audience expected by a Google Cloud OIDC provider.
    // If the provider has custom Allowed audiences, configure that value
    // explicitly in Vercel as GCP_WIF_TOKEN_AUDIENCE.
    oidcTokenAudience:
      process.env.GCP_WIF_TOKEN_AUDIENCE?.trim() ||
      `https://iam.googleapis.com/projects/${projectNumber}` +
        `/locations/global/workloadIdentityPools/${poolId}` +
        `/providers/${providerId}`,
  };
}

// ============================================================
// 3. Create a Vercel OIDC -> Google Cloud credential
//    No service-account JSON key is used.
// ============================================================
function createVercelCredential() {
  if (process.env.VERCEL !== "1") {
    throw new Error(
      "[Firebase Admin] WIF authentication is enabled only in Vercel."
    );
  }

  const projectId = getRequiredEnv("GCP_PROJECT_ID");
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

    // Google STS expects the full provider resource name here.
    audience: providerResourceName,

    subject_token_type:
      "urn:ietf:params:oauth:token-type:jwt",

    token_url: "https://sts.googleapis.com/v1/token",

    service_account_impersonation_url: impersonationUrl,

    subject_token_supplier: {
      getSubjectToken: async () => {
        let token;

        try {
          token = await getVercelOidcToken({
            audience: oidcTokenAudience,
          });
        } catch (error) {
          throw new Error(
            `[Firebase Admin] Failed to obtain Vercel OIDC token: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }

        if (
          typeof token !== "string" ||
          token.split(".").length !== 3
        ) {
          throw new Error(
            "[Firebase Admin] Vercel returned an invalid OIDC token."
          );
        }

        // Never log the token or its claims.
        return token;
      },
    },
  });

  if (!authClient) {
    throw new Error(
      "[Firebase Admin] Failed to create Google WIF client."
    );
  }

  // Firebase Admin expects access_token + expiration_time.
  return {
async getAccessToken() {
  const result = await authClient.getAccessToken();

  if (!result.token) {
    throw new Error("Failed to obtain Google access token");
  }

  const expiresIn = Number(result.res?.data?.expires_in ?? 3600);

  return {
    access_token: result.token,
    expires_in: expiresIn,
    expiration_time: Date.now() + expiresIn * 1000,
  };
}
  };
}

// ============================================================
// 4. Initialize Firebase Admin
//    Firestore stays lazy; login only needs Firebase Auth.
// ============================================================
export function getFirebaseAdminServices() {
  const projectId = getRequiredEnv("GCP_PROJECT_ID");

  let app = getApps().find(
    (existingApp) => existingApp.name === "[DEFAULT]"
  );

  if (!app) {
    const credential = createVercelCredential();

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
