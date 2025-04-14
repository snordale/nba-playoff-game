"use client";

import { Body1 } from "@/components/Body1";
import CustomLink from "@/components/CustomLink";
import {
  Button, HStack, Stack, Card, CardBody, Heading, IconButton, Text, Center, Spinner, SimpleGrid
} from "@chakra-ui/react";
import { AddIcon } from '@chakra-ui/icons';
import { useState } from "react";
import { CreateGroupModal } from "./CreateGroupModal";
import { useGetGroups } from "@/react-query/queries";

export const HomeContent = () => {
  const { data: groups, isLoading } = useGetGroups();
  const [modalVariant, setModalVariant] = useState("");
  const onCreateLeagueClose = () => setModalVariant("");

  return (
    <>
      <Stack spacing={4}>
        <HStack alignItems="center" gap={2}>
          <Heading size="lg">Groups</Heading>
          <IconButton
            icon={<AddIcon />}
            aria-label="Create Group"
            size="xs"
            colorScheme="orange"
            isRound={true}
            variant="solid"
            onClick={() => setModalVariant("create")}
          />
        </HStack>

        {isLoading && (
          <Center p={10}><Spinner color="orange.500" /></Center>
        )}

        {!isLoading && groups?.length === 0 && (
          <Card variant="outline" mt={2}>
            <CardBody>
              <Text textAlign="center" color="gray.500">
                No groups yet. Create one using the '+' button!
              </Text>
            </CardBody>
          </Card>
        )}

        {!isLoading && groups && groups.length > 0 && (
          <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4} mt={2}>
            {groups.map((group) => (
              <CustomLink key={group.id} href={`/groups/${group.id}`} _hover={{ textDecoration: 'none' }}>
                <Card
                  variant="outline"
                  _hover={{
                    borderColor: "orange.400",
                    boxShadow: "sm",
                    cursor: "pointer"
                  }}
                  transition="all 0.2s ease-in-out"
                  height="100%" // Ensure cards in the same row have equal height
                >
                  <CardBody p={4}>
                    <Heading size="md">{group.name}</Heading>
                    {group._count?.groupUsers !== undefined && (
                      <Text fontSize="sm" color="gray.500" mt={1}>
                        {group._count.groupUsers} Member{group._count.groupUsers !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </CardBody>
                </Card>
              </CustomLink>
            ))}
          </SimpleGrid>
        )}
      </Stack>
      <CreateGroupModal variant={modalVariant} onClose={onCreateLeagueClose} />
    </>
  );
};
