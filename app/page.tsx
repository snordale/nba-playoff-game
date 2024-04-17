import { auth } from "@/auth"
import { Body1 } from "@/components/Body1"
import { Link } from "@chakra-ui/next-js"
import { Button, Stack } from "@chakra-ui/react"


export default async function Index() {
  const session = await auth()
  const leagues = [];
  return (
    <Stack>
      <Button>
        Create League
      </Button>
      <Body1>
        Leagues
      </Body1>
      {leagues.map((league) => (
        <Link key={league.id} href={`/leagues/${league.id}`}>
          {league.name}
        </Link>
      ))}
    </Stack>
  )
}
