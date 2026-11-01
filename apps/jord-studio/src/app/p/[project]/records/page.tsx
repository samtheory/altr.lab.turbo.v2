import { RecordsBrowser } from "@/components/records-browser";

type Props = {
  searchParams: Promise<{ bucket?: string }>;
};

export default async function RecordsPage({ searchParams }: Props) {
  const params = await searchParams;
  const bucket = params.bucket?.trim() || "lab";
  return <RecordsBrowser initialBucket={bucket} />;
}
