import { useCreateLeague, useJoinLeague } from "@/react-query/queries";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
} from "@chakra-ui/react";
import React, { useEffect } from "react";

const CreateLeagueModal = ({ variant, onClose }) => {
  const createLeague = useCreateLeague();
  const joinLeague = useJoinLeague();

  const handleSubmit = (e) => {
    console.log("submit");
    console.log(e);
    e.preventDefault();
    const formData = new FormData(e.target);

    if (variant === "create") {
      const leagueName = formData.get("leagueName");
      const password = formData.get("password");

      createLeague.mutate({
        leagueName,
        password
      });
    }
    if (variant === "join") {
      const leagueCode = formData.get("leagueCode");

      joinLeague.mutate({
        leagueCode,
      });
    }
  };


  useEffect(() => {
    if (createLeague.isSuccess) {
      onClose();
    }
  }, [createLeague.isSuccess, onClose]);

  const renderBody = () => {
    if (variant === "create") {
      return (
        <Stack>
          <Input name="leagueName" placeholder="League Name" />
          <Input name="password" placeholder="Password" />
          <Button type="submit" colorScheme="purple">
            Create League
          </Button>
        </Stack>
      );
    }

    if (variant === "join") {
      return (
        <Stack>
          <Input name="leagueCode" placeholder="League Code" />
          <Button value="Join League" />
        </Stack>
      );
    }
  };

  return (
    <Modal isOpen={variant !== ""} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton />
        <ModalHeader>Create League</ModalHeader>
        <ModalBody>
          <form onSubmit={handleSubmit}>{renderBody()}</form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default CreateLeagueModal;
