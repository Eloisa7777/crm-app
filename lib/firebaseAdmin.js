
import "server-only";

import {
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import { ExternalAccountClient } from "google-auth-library";
import { getVercelOidcToken } from "@vercel/oidc";

// ============================================================
// Firebase Admin 初始化
// 本地：不初始化，不使用 GCP 凭证
// Vercel：使用 OIDC + Workload Identity Federation
// ============================================================

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function createVercelCredential() {
  const projectNumber = getRequiredEnv("GCP_PROJECT_NUMBER");
  const poolId = getRequiredEnv("GCP_WORKLOAD_IDENTITY_POOL_ID");
  const providerId = getRequiredEnv(
    "GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID"
  );
  const serviceAccountEmail = getRequiredEnv(
    "GCP_SERVICE_ACCOUNT_EMAIL"
  );

  const providerAudience =
    `//iam.googleapis.com/projects/${projectNumber}` +
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
      getSubjectToken: getVercelOidcToken,
    },
  });

  if (!authClient) {
    throw new Error(
      "Failed to create Google external account client"
    );
  }

  return {
    async getAccessToken() {
      const result = await authClient.getAccessToken();

      if (!result.token) {
        throw new Error(
          "Failed to obtain Google access token"
        );
      }

      const expiresIn = Number(
        result.res?.data?.expires_in ?? 3600
      );

      return {
        access_token: result.token,
        expiration_time: Date.now() + expiresIn * 1000,
      };
    },
  };
}

// ============================================================
// 获取 Firebase Admin 服务
// 必须仅在服务端 API / Node.js 环境调用
// ============================================================

export function getFirebaseAdminServices() {
  // 本地开发不使用 Admin SDK，也不尝试寻找本地凭证。
  if (process.env.VERCEL !== "1") {
    throw new Error(
      "Firebase Admin is disabled locally. Use Vercel Preview or Production."
    );
  }

  const projectId = getRequiredEnv("GCP_PROJECT_ID");

  // 复用现有实例，避免 Next.js 热更新时重复初始化。
  const existingApp = getApps().find(
    (app) => app.name === "[DEFAULT]"
  );

  const app =
    existingApp ||
    initializeApp({
      credential: createVercelCredential(),
      projectId,
    });

  return {
    adminAuth: getAuth(app),
    adminDb: getFirestore(app),
  };
}
