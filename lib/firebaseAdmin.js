
import "server-only";

import {
  getApps,
  initializeApp,
  applicationDefault,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

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
// 2. Build WIF external account ADC configuration
// ============================================================

function getWifConfiguration() {
  const projectNumber = getRequiredEnv("GCP_PROJECT_NUMBER");
  const poolId = getRequiredEnv(
    "GCP_WORKLOAD_IDENTITY_POOL_ID"
  );
  const providerId = getRequiredEnv(
    "GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID"
  );

  const serviceAccountEmail = getRequiredEnv(
    "GCP_SERVICE_ACCOUNT_EMAIL"
  );

  const bridgeSecret = getRequiredEnv(
    "GCP_OIDC_BRIDGE_SECRET"
  );

  const providerResourceName =
    `//iam.googleapis.com/projects/${projectNumber}` +
    `/locations/global/workloadIdentityPools/${poolId}` +
    `/providers/${providerId}`;

  const tokenAudience =
    process.env.GCP_WIF_TOKEN_AUDIENCE?.trim() ||
    `https://iam.googleapis.com/projects/${projectNumber}` +
      `/locations/global/workloadIdentityPools/${poolId}` +
      `/providers/${providerId}`;

  // Allow an explicit URL override if required.
  const tokenUrl =
    process.env.GCP_OIDC_TOKEN_URL?.trim() ||
    `https://${getRequiredEnv("VERCEL_URL")}` +
      `/api/internal/gcp-subject-token`;

  const impersonationUrl =
    "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/" +
    `${serviceAccountEmail}:generateAccessToken`;

  const headers = {
    Authorization: `Bearer ${bridgeSecret}`,
  };

  // Optional Vercel Deployment Protection bypass.
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    headers["x-vercel-protection-bypass"] =
      process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  }

  return {
    type: "external_account",
    audience: providerResourceName,
    subject_token_type:
      "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url: impersonationUrl,

    // Google Auth Library fetches a fresh OIDC token
    // from this URL whenever it needs to refresh credentials.
    credential_source: {
      url: tokenUrl,
      headers,
      format: {
        type: "text",
      },
    },
  };
}

// ============================================================
// 3. Configure Vercel WIF as external account ADC
// ============================================================

let credentialSetupPromise = null;

async function configureVercelADC() {
  if (process.env.VERCEL !== "1") {
    return;
  }

  if (credentialSetupPromise) {
    return credentialSetupPromise;
  }

  credentialSetupPromise = (async () => {
    const configuration = getWifConfiguration();

    const configPath = join(
      tmpdir(),
      `firebase-admin-wif-${process.pid}.json`
    );

    await writeFile(
      configPath,
      JSON.stringify(configuration, null, 2),
      {
        encoding: "utf8",
        mode: 0o600,
      }
    );

    // Firebase Admin applicationDefault() will now load
    // the external account ADC configuration.
    process.env.GOOGLE_APPLICATION_CREDENTIALS = configPath;

    console.log(
      "[Firebase Admin] Vercel WIF ADC configuration initialized."
    );
  })();

  try {
    await credentialSetupPromise;
  } catch (error) {
    credentialSetupPromise = null;
    throw error;
  }
}

// ============================================================
// 4. Initialize Firebase Admin
//
// Local:
//   applicationDefault() -> local ADC
//
// Vercel:
//   External Account ADC -> Vercel OIDC -> Google WIF
// ============================================================

let servicesPromise = null;

export async function getFirebaseAdminServices() {
  if (servicesPromise) {
    return servicesPromise;
  }

  servicesPromise = (async () => {
    const projectId = getRequiredEnv("GCP_PROJECT_ID");

    if (process.env.VERCEL === "1") {
      await configureVercelADC();
    } else if (process.env.NODE_ENV !== "development") {
      throw new Error(
        "[Firebase Admin] Unsupported environment. " +
        "Expected local development or Vercel."
      );
    }

    let app = getApps().find(
      (existingApp) => existingApp.name === "[DEFAULT]"
    );

    if (!app) {
      app = initializeApp({
        credential: applicationDefault(),
        projectId,
      });
    }

    const adminAuth = getAuth(app);
    const adminDb = getFirestore(app);

    console.log(
      "[Firebase Admin] Firebase services initialized."
    );

    return {
      adminAuth,
      adminDb,
    };
  })();

  try {
    return await servicesPromise;
  } catch (error) {
    servicesPromise = null;
    throw error;
  }
}
