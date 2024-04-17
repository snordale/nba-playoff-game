'use client'
import { signIn, signOut, useSession } from 'next-auth/react';
import { Avatar, Button, Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/react';
import { useEffect, useState } from 'react';

const AuthButton = () => {
  const session = useSession();
  const [imageSrc, setImageSrc] = useState('')

  useEffect(() => {
    if (session.data?.user) {
      setImageSrc(session.data.user?.image)
    }
  }, [session])

  console.log('session')
  console.log(session)

  if (session.data?.user) {
    return (
      <Menu>
        <MenuButton>
          <Avatar name={session.data.user?.name} src={imageSrc} />
        </MenuButton>
        <MenuList>
          <MenuItem onClick={() => signOut()}>
            <Button >
              Logout
            </Button>
          </MenuItem>
        </MenuList>
      </Menu>
    )
  }

  return (
    <Button onClick={() => signIn()}>
      Login
    </Button>
  )
}

export default AuthButton