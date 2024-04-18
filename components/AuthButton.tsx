"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  Avatar,
  Button,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
} from "@chakra-ui/react";

const AuthButton = () => {
  const { data: session, status } = useSession();

  if (typeof session === undefined) return null;

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

  return <Button onClick={() => signIn("google")}>Login</Button>;
};

export default AuthButton;
