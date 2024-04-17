import { auth } from "@/auth"
import { Link } from "@chakra-ui/next-js"


export default async function Index() {
  const session = await auth()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">NextAuth.js Example</h1>
      {/* <div>
        This is an example site to demonstrate how to use
        <Link href="https://nextjs.authjs.dev">NextAuth.js</Link>
        for authentication. Check out the
        <Link href="/server-example" className="underline">
          Server
        </Link>
        and the
        <Link href="/client-example" className="underline">
          Client
        </Link>
        examples to see how to secure pages and get session data.
      </div>
      <div className="flex flex-col rounded-md bg-neutral-100">
        <div className="p-4 font-bold rounded-t-md bg-neutral-200">
          Current Session
        </div>
        <pre className="py-6 px-4 whitespace-pre-wrap break-all">
          {JSON.stringify(session, null, 2)}
        </pre> */}
      {/* </div> */}
    </div>
  )
}
