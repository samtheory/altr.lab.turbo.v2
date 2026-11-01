import { Alert, AlertDescription, AlertTitle } from "@altr/apolyx";

import { ProjectForm } from "@/components/project-form";
import { getSession } from "@/lib/auth/session";
import { proxyToJord } from "@/lib/jord-proxy";
import type { ProjectPublic } from "@/lib/projects";

type Props = { params: Promise<{ id: string }> };

export default async function EditProjectPage({ params }: Props) {
  const session = await getSession();
  const role = session?.role ?? "readonly";
  const { id } = await params;

  if (role !== "admin") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Alert variant="warning">
          <AlertTitle>Admin only</AlertTitle>
          <AlertDescription>
            Project edit is limited to operator admin sessions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const upstream = await proxyToJord(
    `/admin/projects/${encodeURIComponent(id)}`,
    undefined,
    { skipProjectScope: true },
  );
  const body = (await upstream.json().catch(() => ({}))) as {
    project?: ProjectPublic;
    error?: string;
    message?: string;
    reason?: string;
  };

  if (!upstream.ok || !body.project) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Cannot edit</AlertTitle>
          <AlertDescription>
            {body.reason ??
              body.message ??
              body.error ??
              `Failed to load project (${upstream.status})`}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <ProjectForm mode="edit" role={role} project={body.project} />;
}
