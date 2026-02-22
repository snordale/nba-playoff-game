/**
 * Chakra v3 compound components (Ark UI) often omit `children` and some HTML props from their
 * public types. This augmentation adds them so JSX usage type-checks. Runtime behavior is correct.
 */
import type { ReactNode } from "react";

declare module "@chakra-ui/react" {
  export interface FieldErrorTextProps {
    children?: ReactNode;
  }
  export interface MenuTriggerProps {
    children?: ReactNode;
    asChild?: boolean;
  }
  export interface MenuPositionerProps {
    children?: ReactNode;
  }
  export interface MenuContentProps {
    children?: ReactNode;
  }
  export interface MenuItemProps {
    children?: ReactNode;
    onClick?: () => void;
  }
  export interface MenuItemTextProps {
    children?: ReactNode;
    fontWeight?: string | number;
  }
  export interface FieldLabelProps {
    children?: ReactNode;
    fontSize?: string;
  }
  export interface DialogContentProps {
    children?: ReactNode;
    maxH?: string;
  }
  export interface DialogPositionerProps {
    children?: ReactNode;
  }
  export interface DialogTitleProps {
    children?: ReactNode;
  }
  export interface PopoverTriggerProps {
    children?: ReactNode;
    asChild?: boolean;
  }
  export interface PopoverPositionerProps {
    children?: ReactNode;
  }
  export interface PopoverContentProps {
    children?: ReactNode;
  }
  export interface PopoverHeaderProps {
    children?: ReactNode;
  }
  export interface AvatarImageProps {
    src?: string;
    alt?: string;
  }
}
