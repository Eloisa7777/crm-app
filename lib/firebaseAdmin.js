
import "server-only";

import {
  getApps,
  initializeApp,
  applicationDefault,
} from "firebase-admin/app";

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import { getVercelOidcToken } from "@vercel/oidc";

import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
// 2. Build Google WIF configuration
// ============================================================

function getWifConfig() {
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

  // Google Workload Identity Provider resource name.
  const providerResourceName =
    `//iam.googleapis.com/projects/${projectNumber}` +
    `/locations/global/workloadIdentityPools/${poolId}` +
    `/providers/${providerId}`;

  // OIDC token audience.
  // Prefer the audience configured in Vercel environment variables.
  const oidcTokenAudience =
    process.env.GCP_WIF_TOKEN_AUDIENCE?.trim() ||
    process.env.GCP_AUDIENCE?.trim() ||
    `https://iam.googleapis.com/projects/${projectNumber}` +
      `/locations/global/workloadIdentityPools/${poolId}` +
      `/providers/${providerId}`;

  const impersonationUrl =
    "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/" +
    `${serviceAccountEmail}:generateAccessToken`;

  return {
    providerResourceName,
    oidcTokenAudience,
    impersonationUrl,
  };
}

// ============================================================
// 3. Vercel OIDC -> Standard Google ADC configuration
//
// Firebase Admin Firestore requires:
// - ApplicationDefaultCredential
// - OR ServiceAccountCredential
//
// Therefore, we create a standard external_account ADC file.
// The Vercel OIDC token itself is stored separately in /tmp.
//
// No service account private key is used.
// ============================================================

async function configureVercelADC() {
  const {
    providerResourceName,
    oidcTokenAudience,
    impersonationUrl,
  } = getWifConfig();

  // Retrieve the OIDC token from the current Vercel request.
  // Do not cache this token globally.
  const oidcToken = await getVercelOidcToken({
    audience: oidcTokenAudience,
  });

  if (
    typeof oidcToken !== "string" ||
    oidcToken.split(".").length !== 3
  ) {
    throw new Error(
      "[Firebase Admin] Invalid Vercel OIDC token."
    );
  }

  // Use a process-specific temporary directory.
  const wifDirectory = join(
    tmpdir(),
    `crm-yj-wif-${process.pid}`
  );

  await mkdir(wifDirectory, {
    recursive: true,
    mode: 0o700,
  });

  const subjectTokenFile = join(
    wifDirectory,
    "vercel-oidc-token.txt"
  );

  const adcConfigFile = join(
    wifDirectory,
    "google-wif-adc.json"
  );

  // ----------------------------------------------------------
  // 3.1 Write the current Vercel OIDC subject token.
  //
  // Google Auth Library reads this file when it needs to
  // exchange the external account token.
  // ----------------------------------------------------------

  await writeFile(subjectTokenFile, oidcToken, {
    encoding: "utf8",
    mode: 0o600,
  });

  // ----------------------------------------------------------
  // 3.2 Create standard Google external_account ADC JSON.
  //
  // This is NOT a service account private key file.
  // ----------------------------------------------------------

  const adcConfig = {
    type: "external_account",

    audience: providerResourceName,

    subject_token_type:
      "urn:ietf:params:oauth:token-type:jwt",

    token_url:
      "https://sts.googleapis.com/v1/token",

    service_account_impersonation_url:
      impersonationUrl,

    credential_source: {
      file: subjectTokenFile,
    },
  };

  await writeFile(
    adcConfigFile,
    JSON.stringify(adcConfig, null, 2),
    {
      encoding: "utf8",
      mode: 0o600,
    }
  );

  // Tell Google Application Default Credentials
  // to use the external account configuration.
  process.env.GOOGLE_APPLICATION_CREDENTIALS =
    adcConfigFile;
}

// ============================================================
// 4. Select credentials by environment
//
// Local:
//   Google Application Default Credentials
//
// Vercel Preview / Production:
//   Vercel OIDC -> Google WIF -> Standard ADC
// ============================================================

async function prepareFirebaseAdminCredentials() {
  if (process.env.VERCEL === "1") {
    await configureVercelADC();
    return;
  }

  if (process.env.NODE_ENV === "development") {
    // Keep local ADC unchanged.
    return;
  }

  throw new Error(
    "[Firebase Admin] Unsupported environment."
  );
}

// ============================================================
// 5. Initialize Firebase Admin
// ============================================================

export async function getFirebaseAdminServices() {
  const projectId = getRequiredEnv("GCP_PROJECT_ID");

  // Important:
  // Prepare WIF before creating ApplicationDefaultCredential.
  await prepareFirebaseAdminCredentials();

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

  return {
    adminAuth,

    get adminDb() {
      return getFirestore(app);
    },
  };
}
