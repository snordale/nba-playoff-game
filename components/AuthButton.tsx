"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  AvatarRoot,
  AvatarImage,
  Button,
  MenuRoot,
  MenuTrigger,
  MenuContent,
  MenuPositioner,
  MenuItem,
  MenuItemText,
  Spinner,
} from "@chakra-ui/react";

const AuthButton = ({ token, text = "Login" }: { token?: string, text?: string }) => {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <Button loading h="2rem" spinner={<Spinner size="xs" />}>Loading...</Button>;
  }

  if (status === "authenticated" && session?.user) {
    return (
      <MenuRoot>
        <MenuTrigger asChild>
          <Button variant="ghost" p={0} minW={0} h="auto" borderRadius="full">
            <AvatarRoot size="sm">
              <AvatarImage src={session.user.image ?? undefined} alt={session.user.name ?? undefined} />
            </AvatarRoot>
          </Button>
        </MenuTrigger>
        <MenuPositioner>
          <MenuContent>
            <MenuItem onClick={() => signOut()}>
              <MenuItemText fontWeight={600}>Logout</MenuItemText>
            </MenuItem>
          </MenuContent>
        </MenuPositioner>
      </MenuRoot>
    );
  }

  return <Button colorScheme="orange" onClick={() => signIn("google", { callbackUrl: token ? `/invite?token=${token}` : '/' })}>{text}</Button>;
};

export default AuthButton;
