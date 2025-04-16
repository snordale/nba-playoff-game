import { useCreateGroup } from "@/react-query/queries";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";

export const CreateGroupModal = ({ variant, onClose }) => {
  const createGroup = useCreateGroup();
  const [groupName, setGroupName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (variant === "create") {
      if (groupName.trim()) {
        createGroup.mutate({ groupName: groupName.trim() });
      }
    }
  };

  useEffect(() => {
    if (createGroup.isSuccess) {
      setGroupName("");
      onClose();
    }
  }, [createGroup.isSuccess, onClose]);

  const renderBody = () => {
    if (variant === "create") {
      return (
        <Stack pb={4} gap={4}>
          <Input 
            name="groupName"
            placeholder="Group Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <Button 
            type="submit" 
            colorScheme="orange" 
            isDisabled={!groupName.trim()}
          >
            Create Group
          </Button>
        </Stack>
      );
    }
  };

  return (
    <Modal isOpen={variant !== ""} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton />
        <ModalHeader>Create Group</ModalHeader>
        <ModalBody>
          <form onSubmit={handleSubmit}>{renderBody()}</form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
