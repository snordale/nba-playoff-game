// app/admin/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Container, Heading, Text } from '@chakra-ui/react';
import AdminInterface from "@/components/pages/admin/AdminInterface";
import AdminSeasonBracket from "@/components/pages/admin/AdminSeasonBracket";

type AdminAccess = 'pending' | 'admin' | 'denied';

export default function AdminPage() {
  const { status } = useSession();
  const router = useRouter();
  const [adminAccess, setAdminAccess] = useState<AdminAccess>('pending');

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/admin/me')
      .then((res) => {
        if (res.ok) setAdminAccess('admin');
        else {
          setAdminAccess('denied');
          router.replace('/');
        }
      })
      .catch(() => {
        setAdminAccess('denied');
        router.replace('/');
      });
  }, [status, router]);

  if (status === 'loading') {
    return <Container centerContent py={10}><Text>Loading session...</Text></Container>;
  }

  if (status === 'unauthenticated') {
    router.replace('/');
    return <Container centerContent py={10}><Text>Access Denied. Redirecting...</Text></Container>;
  }

  if (status === 'authenticated' && adminAccess === 'pending') {
    return <Container centerContent py={10}><Text>Checking access...</Text></Container>;
  }

  if (status === 'authenticated' && adminAccess === 'denied') {
    return <Container centerContent py={10}><Text>Access Denied. Redirecting...</Text></Container>;
  }

  // status === 'authenticated' && adminAccess === 'admin'
  return (
    <Container maxW="container.lg" py={10}>
      <Heading mb={6}>Admin Panel</Heading>
      <AdminInterface />
      <AdminSeasonBracket />
    </Container>
  );
}