"use client";

import NextLink from "next/link";
import { Box, type BoxProps } from "@chakra-ui/react";

const anchorKeys = new Set([
  "href", "children", "target", "rel", "download", "referrerPolicy", "prefetch",
  "replace", "scroll", "shallow", "locale", "legacyBehavior", "onClick",
  "onMouseEnter", "onMouseLeave", "onTouchStart",
]);

type AnchorOnly = Pick<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "target" | "rel" | "download" | "referrerPolicy" | "onClick">;

type Props = AnchorOnly & {
  children: React.ReactNode;
  href: string;
} & Omit<BoxProps, "as">;

const CustomLink = ({ href, children, ...rest }: Props) => {
  const anchorProps: Record<string, unknown> = {};
  const boxProps: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (key === "children") continue;
    if (anchorKeys.has(key)) (anchorProps as Record<string, unknown>)[key] = value;
    else boxProps[key] = value;
  }
  return (
    <NextLink href={href} {...anchorProps}>
      <Box
        as="span"
        fontWeight={600}
        color="orange.600"
        _hover={{ color: "orange.700", textDecoration: "underline" }}
        display="inline-block"
        {...boxProps}
      >
        {children}
      </Box>
    </NextLink>
  );
};

export default CustomLink;
