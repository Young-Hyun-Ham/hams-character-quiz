import type { SsoGender, SsoServicePlan } from "@hams-fam/sso-client";

export type HeaderUser = {
  id: string;
  nickname: string;
  email: string;
  birthDate: string | null;
  gender: SsoGender | null;
  aiEnabled: boolean;
  membership: { serviceName: string; plan: SsoServicePlan } | null;
};
