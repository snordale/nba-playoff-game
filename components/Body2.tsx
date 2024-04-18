import { Text, TextProps } from "@chakra-ui/react";

type Props = TextProps & {
  children: React.ReactNode;
};

export const Body2 = ({ children }: Props) => {
  return <Text fontSize="sm">{children}</Text>;
};
