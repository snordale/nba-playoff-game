import { GroupRoot } from "@/components/pages/group/GroupRoot";

type Params = Promise<{ groupId: string }>

export default async function GroupPage({ params }: { params: Params }) {
    const { groupId } = await params;
    return <GroupRoot groupId={groupId} />;
}
