// app/admin/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Container, Heading, Text } from '@chakra-ui/react';
import AdminInterface from '@/components/pages/admin/AdminInterface';

// Define the required admin email
const ADMIN_EMAIL = "snordale@gmail.com";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return <Container centerContent py={10}><Text>Loading session...</Text></Container>;
  }

  // Redirect if not authenticated or not the admin user
  if (status === 'unauthenticated' || session?.user?.email !== ADMIN_EMAIL) {
    router.replace('/'); // Redirect to home page
    return <Container centerContent py={10}><Text>Access Denied. Redirecting...</Text></Container>;
  }

  // If authenticated and is the admin user, render the admin interface
  return (
    <Container maxW="container.lg" py={10}>
      <Heading mb={6}>Admin Panel</Heading>
      <AdminInterface />
    </Container>
  );
} 