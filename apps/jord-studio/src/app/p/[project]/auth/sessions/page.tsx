import { AuthSectionGate } from "@/components/auth-section-gate";

export default function AuthSessionsPage() {
  return (
    <AuthSectionGate
      title="Sessions"
      description="Inspect and revoke end-user refresh-token families, and issue custom claims."
      dependency="S0076 (sessions and custom claims)"
      planned={[
        "List active sessions per user with created/last-used timestamps",
        "Revoke one session or every session for a user",
        "Edit custom JWT claims with validation",
      ]}
    />
  );
}
