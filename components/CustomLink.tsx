"use client";

import { Link, LinkProps } from "@chakra-ui/next-js";

type Props = LinkProps & {
  children: React.ReactNode;
  href: string;
};

const CustomLink = ({ href, children, ...rest }: Props) => {
  return (
    <Link href={href} fontWeight={600} color='purple.600' {...rest}>
      {children}
    </Link>
  );
};

export default CustomLink;
