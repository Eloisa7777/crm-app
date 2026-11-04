
import { NextResponse } from "next/server";
import { getVercelOidcToken } from "@vercel/oidc";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================
// GET: Return a fresh Vercel OIDC subject token
//
// This endpoint is called by Google Auth Library.
// It must NOT initialize Firebase Admin.
// ============================================================

export async function GET(request) {
  try {
    const secret = process.env.GCP_OIDC_BRIDGE_SECRET;

    if (!secret) {
      console.error(
        "[OIDC Bridge] Missing GCP_OIDC_BRIDGE_SECRET."
      );

      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Verify the internal shared-secret header.
    const receivedAuthorization =
      request.headers.get("authorization") || "";

    const expectedAuthorization = `Bearer ${secret}`;

    const receivedBuffer = Buffer.from(
      receivedAuthorization,
      "utf8"
    );

    const expectedBuffer = Buffer.from(
      expectedAuthorization,
      "utf8"
    );

    const authorized =
      receivedBuffer.length === expectedBuffer.length &&
      timingSafeEqual(receivedBuffer, expectedBuffer);

    if (!authorized) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Build the same audience used by the WIF provider.
    const projectNumber = process.env.GCP_PROJECT_NUMBER;
    const poolId = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
    const providerId =
      process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;

    if (!projectNumber || !poolId || !providerId) {
      return NextResponse.json(
        { error: "WIF configuration incomplete" },
        { status: 500 }
      );
    }

    const audience =
    process.env.GCP_AUDIENCE?.trim() ||
    process.env.GCP_WIF_TOKEN_AUDIENCE?.trim() ||
    `https://iam.googleapis.com/projects/${projectNumber}` +
        `/locations/global/workloadIdentityPools/${poolId}` +
        `/providers/${providerId}`;

    // Obtain the OIDC token from the current Vercel invocation.
const token = await getVercelOidcToken({ audience });

const parts = token.trim().split(".");

if (parts.length !== 3) {
  throw new Error("Invalid OIDC JWT format");
}

const header = JSON.parse(
  Buffer.from(parts[0], "base64url").toString("utf8")
);

const payload = JSON.parse(
  Buffer.from(parts[1], "base64url").toString("utf8")
);

console.log("[OIDC TOKEN DIAGNOSTICS]", {
  alg: header.alg,
  iss: payload.iss,
  aud: payload.aud,
  sub: payload.sub,
  iat: payload.iat,
  exp: payload.exp,
  expectedAudience: audience,
  audienceMatches:
    payload.aud === audience ||
    (Array.isArray(payload.aud) &&
      payload.aud.includes(audience)),
});
return new Response(token.trim(), {
  status: 200,
  headers: {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate",
  },
});
  } catch (error) {
    console.error("[OIDC Bridge] Error:", {
      message: error?.message,
      code: error?.code,
    });

    return NextResponse.json(
      { error: "Unable to obtain OIDC token" },
      { status: 500 }
    );
  }
}
