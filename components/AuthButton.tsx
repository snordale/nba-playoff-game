"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  Avatar,
  Button,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spinner,
} from "@chakra-ui/react";

const AuthButton = ({ token, text = "Login" }: { token: string, text?: string }) => {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <Button isLoading h="2rem" leftIcon={<Spinner size="xs" />}>Loading...</Button>;
  }

  if (status === "authenticated" && session?.user) {
    return (
      <Menu>
        <MenuButton>
          <Avatar name={session.user.name} src={session.user.image} size="sm" />
        </MenuButton>
        <MenuList>
          <MenuItem fontWeight={600} onClick={() => signOut()}>
            Logout
          </MenuItem>
        </MenuList>
      </Menu>
    );
  }

  return <Button colorScheme="orange" onClick={() => signIn("google", { callbackUrl: token ? `/invite?token=${token}` : '/' })}>{text}</Button>;
};

export default AuthButton;
