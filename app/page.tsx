import { signIn } from "@/auth"

export default async function Index() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">NextAuth.js Example</h1>
      <form
        action={async () => {
          "use server"
          await signIn("google")
        }}
      >
        <button type="submit">Login with Google</button>
      </form>
    </div>
  )
}
