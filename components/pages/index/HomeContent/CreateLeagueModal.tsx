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
import React from "react";

const CreateLeagueModal = ({ variant, onClose }) => {
  const handleSubmit = (e) => {
    console.log("submit");
    console.log(e);
    e.preventDefault();

  };

  const renderBody = () => {
    if (variant === "create") {
      return (
        <form onSubmit={handleSubmit}>
          <Stack>
            <Input placeholder="League Name" />
            <Input placeholder="League Description" />
            <Button type='submit' colorScheme="purple">Create League</Button>
          </Stack>
        </form>
      );
    }

    if (variant === "join") {
      return (
        <form onSubmit={handleSubmit}>
          <Stack>
            <Input placeholder="League Code" />
            <Button value="Join League" />
          </Stack>
        </form>
      );
    }
  };

  return (
    <Modal isOpen={variant !== ""} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton />
        <ModalHeader>Create League</ModalHeader>
        <ModalBody>{renderBody()}</ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default CreateLeagueModal;
