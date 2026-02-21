import { useEffect, useState, type FormEvent } from "react";
import { useCreateGroup } from "@/react-query/queries";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack
} from "@chakra-ui/react";

export const CreateGroupModal = ({ variant, onClose }: { variant: string; onClose: () => void }) => {
  const createGroup = useCreateGroup();
  const [groupName, setGroupName] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (variant === "create") {
      if (groupName.trim()) {
        createGroup.mutate({ groupName: groupName.trim() });
      }
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (createGroup.isSuccess) {
      setGroupName("");
      onClose();
    }
  }, [createGroup.isSuccess, onClose]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
