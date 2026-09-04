/**
 * Neon Infrastructure as Code Configuration
 * Project: softly-wellness-dev (proud-tooth-39069065)
 * Organization: soumilim668@gmail.com (org-frosty-dream-73567984)
 */

export const neonConfig = {
  projectId: "proud-tooth-39069065",
  projectName: "softly-wellness-dev",
  orgId: "org-frosty-dream-73567984",
  branch: "main",
  services: {
    postgres: {
      enabled: true,
      pooled: true,
      database: "neondb",
      role: "neondb_owner",
    },
  },
};

export default neonConfig;
