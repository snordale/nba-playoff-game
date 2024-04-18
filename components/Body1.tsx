import { Text, TextProps } from "@chakra-ui/react";

type Props = TextProps & {
  children: React.ReactNode;
};

export const Body1 = ({ children, ...rest }: Props) => {
  return (
    <Text fontSize="md" {...rest}>
      {children}
    </Text>
  );
};
