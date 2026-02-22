import { useEffect, useState, type FormEvent } from "react";
import { useCreateGroup } from "@/react-query/queries";
import {
  Button,
  Input,
  DialogRoot,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogCloseTrigger,
  DialogHeader,
  DialogTitle,
  DialogBody,
  Stack
} from "@chakra-ui/react";

export const CreateGroupModal = ({ variant, onClose }: { variant: string; onClose: () => void }) => {
  const createGroup = useCreateGroup();
  const [groupName, setGroupName] = useState("");
  const open = variant !== "";

  const handleSubmit = (e: FormEvent) => {
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
            disabled={!groupName.trim()}
          >
            Create Group
          </Button>
        </Stack>
      );
    }
  };

  return (
    <DialogRoot open={open} onOpenChange={(e: { open: boolean }) => { if (!e.open) onClose(); }}>
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent>
          <DialogCloseTrigger />
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <form onSubmit={handleSubmit}>{renderBody()}</form>
          </DialogBody>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
};
