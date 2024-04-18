import { auth } from "@/auth";
import HomeContent from "./HomeContent";
import PublicContent from "./PublicContent";

const IndexRoot = async () => {
  const session = await auth();

  if (session) {
    return <HomeContent />;
  }

  return <PublicContent />;
};

export default IndexRoot;
