import { AuthSectionGate } from "@/components/auth-section-gate";

export default function AuthEmailPage() {
  return (
    <AuthSectionGate
      title="Email"
      description="Sender identity and the confirmation, invite and recovery templates."
      dependency="S0072 (email templates)"
      planned={[
        "Sender name and reply-to",
        "Editable confirmation, invite and reset templates",
        "Template preview and test send",
      ]}
    />
  );
}
