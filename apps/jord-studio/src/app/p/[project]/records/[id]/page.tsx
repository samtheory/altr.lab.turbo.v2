import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ project: string; id: string }>;
};

/** Legacy route → inspector deep link (S0048). */
export default async function RecordPage({ params }: Props) {
  const { project, id } = await params;
  redirect(
    `/p/${encodeURIComponent(project)}/records?inspector=record-detail&recordId=${encodeURIComponent(id)}`,
  );
}
