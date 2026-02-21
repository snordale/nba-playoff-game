import { GroupRoot } from "@/components/pages/group/GroupRoot";

type Params = Promise<{ groupId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { groupId } = await params;
  const sp = await searchParams;
  const seasonParam = typeof sp?.season === "string" ? sp.season : undefined;
  return <GroupRoot groupId={groupId} seasonParam={seasonParam} />;
}
