
import "server-only";

import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import { ExternalAccountClient } from "google-auth-library";
import { getVercelOidcToken } from "@vercel/oidc";

// ============================================================
// Read required environment variables
// ============================================================
function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

// ============================================================
// Create Vercel OIDC -> Google Cloud credential
// ============================================================
function createVercelCredential() {
  const projectNumber = getRequiredEnv("GCP_PROJECT_NUMBER");
  const poolId = getRequiredEnv("GCP_WORKLOAD_IDENTITY_POOL_ID");
  const providerId = getRequiredEnv("GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID");
  const serviceAccountEmail = getRequiredEnv("GCP_SERVICE_ACCOUNT_EMAIL");

  const providerAudience =
    `https://iam.googleapis.com/projects/${projectNumber}` +
    `/locations/global/workloadIdentityPools/${poolId}` +
    `/providers/${providerId}`;

  const authClient = ExternalAccountClient.fromJSON({
    type: "external_account",
    audience: providerAudience,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url:
      "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/" +
      `${serviceAccountEmail}:generateAccessToken`,
  subject_token_supplier: {
    getSubjectToken: async () => {
      // 使用 Google Cloud Workload Identity Provider 的默认 Audience
      const token = await getVercelOidcToken({
        audience: providerAudience,
      });

      // 临时检查 Token 声明，不记录完整 Token
      const parts = token.split(".");

      if (parts.length !== 3) {
        throw new Error("Invalid Vercel OIDC token format");
      }

      const claims = JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf8")
      );

      console.log("[Vercel OIDC claims]", {
        iss: claims.iss,
        sub: claims.sub,
        aud: claims.aud,
      });

      return token;
    },
  },
  });

  if (!authClient) {
    throw new Error("Failed to create Google external account client");
  }

  return {
    async getAccessToken() {
      const result = await authClient.getAccessToken();

      if (!result.token) {
        throw new Error("Failed to obtain Google access token");
      }

      const expiresIn = Number(result.res?.data?.expires_in ?? 3600);

      return {
        access_token: result.token,
        expiration_time: Date.now() + expiresIn * 1000,
      };
    },
  };
}

// ============================================================
// Initialize Firebase Admin
// IMPORTANT:
// Do not eagerly initialize Firestore during login.
// ============================================================
export function getFirebaseAdminServices() {
  if (process.env.VERCEL !== "1") {
    throw new Error(
      "Firebase Admin is disabled locally. Use Vercel Preview or Production."
    );
  }

  const projectId = getRequiredEnv("GCP_PROJECT_ID");

  const existingApp = getApps().find(
    (app) => app.name === "[DEFAULT]"
  );

  const app =
    existingApp ||
    initializeApp({
      credential: createVercelCredential(),
      projectId,
    });

  const adminAuth = getAuth(app);

  // Lazy initialization: Firestore is created only when adminDb is accessed.
  return {
    adminAuth,

    get adminDb() {
      return getFirestore(app);
    },
  };
}
