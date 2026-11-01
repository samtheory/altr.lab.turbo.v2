import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ project: string }>;
};

/** Legacy route → inspector deep link (S0048). */
export default async function NewRecordPage({ params }: Props) {
  const { project } = await params;
  redirect(
    `/p/${encodeURIComponent(project)}/records?inspector=create-record`,
  );
}
