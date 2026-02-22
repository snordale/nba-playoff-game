"use client";

import { Body1 } from "@/components/Body1";
import CustomLink from "@/components/CustomLink";
import {
  Button, HStack, Stack, CardRoot, CardBody, Heading, IconButton, Text, Center, Spinner, SimpleGrid, Container
} from "@chakra-ui/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { CreateGroupModal } from "./CreateGroupModal";
import { useGetGroups, useGetSeasons } from "@/react-query/queries";
import { Box } from "@chakra-ui/react";

export const HomeContent = () => {
  const { data: groups, isLoading } = useGetGroups();
  const { data: seasons = [] } = useGetSeasons();
  const [modalVariant, setModalVariant] = useState("");
  const onCreateLeagueClose = () => setModalVariant("");

  const isPrePlayoff = !isLoading && seasons.length === 0;

  return (
    <>
      <Container maxW="container.xl" p={{ base: 4, md: 6 }}>
        <Stack gap={4}>
          {isPrePlayoff && (
            <Box p={3} borderRadius="md" borderWidth={1} borderColor="orange.200" bg="orange.50">
              <Text fontSize="sm" color="gray.700">
                No playoff season is set up yet. You can still create and join groups and invite friends—once the season and bracket are configured, you&apos;ll make daily and series picks in your group.
              </Text>
            </Box>
          )}
          <HStack alignItems="center" gap={2}>
            <Heading size="lg">Groups</Heading>
            <IconButton
              aria-label="Create Group"
              size="xs"
              colorScheme="orange"
              borderRadius="full"
              variant="solid"
              onClick={() => setModalVariant("create")}
            >
              <Plus size={16} />
            </IconButton>
          </HStack>

          {isLoading && (
            <Center p={10}><Spinner color="orange.500" /></Center>
          )}

          {!isLoading && groups?.length === 0 && (
            <CardRoot variant="outline" mt={2}>
              <CardBody>
                <Text textAlign="center" color="gray.500">
                  No groups yet. Create one using the &apos;+&apos; button!
                </Text>
              </CardBody>
            </CardRoot>
          )}

          {!isLoading && groups && groups.length > 0 && (
            <SimpleGrid columns={{ base: 2, md: 3 }} gap={4} mt={2}>
              {groups.map((group: { id: string; name: string; _count?: { groupUsers: number } }) => (
                <CustomLink key={group.id} href={`/groups/${group.id}`} _hover={{ textDecoration: 'none' }}>
                  <CardRoot
                    variant="outline"
                    _hover={{
                      borderColor: "orange.400",
                      boxShadow: "sm",
                      cursor: "pointer"
                    }}
                    transition="all 0.2s ease-in-out"
                    height="100%"
                  >
                    <CardBody p={4}>
                      <Heading size="md">{group.name}</Heading>
                      {group._count?.groupUsers !== undefined && (
                        <Text fontSize="sm" color="gray.500" mt={1}>
                          {group._count.groupUsers} Member{group._count.groupUsers !== 1 ? 's' : ''}
                        </Text>
                      )}
                    </CardBody>
                  </CardRoot>
                </CustomLink>
              ))}
            </SimpleGrid>
          )}
        </Stack>
      </Container>
      <CreateGroupModal variant={modalVariant} onClose={onCreateLeagueClose} />
    </>
  );
};
