const clientId = process.env.WORKOS_CLIENT_ID;
const authkitDomain = process.env.WORKOS_AUTHKIT_DOMAIN;

if (!clientId) {
  throw new Error("Missing WORKOS_CLIENT_ID in Convex environment variables");
}
if (!authkitDomain) {
  throw new Error("Missing WORKOS_AUTHKIT_DOMAIN in Convex environment variables");
}
const normalizedAuthkitDomain = authkitDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "");

export default {
  providers: [
    {
      type: "customJwt",
      issuer: `https://${normalizedAuthkitDomain}`,
      algorithm: "RS256",
      applicationID: clientId,
      jwks: `https://${normalizedAuthkitDomain}/oauth2/jwks`,
    },
  ],
};
