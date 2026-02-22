"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Box, Text } from "@chakra-ui/react";

type ToastStatus = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  status?: ToastStatus;
  duration?: number;
}

interface ToasterContextValue {
  toasts: ToastItem[];
  create: (options: {
    title: string;
    description?: string;
    status?: ToastStatus;
    duration?: number;
    isClosable?: boolean;
  }) => void;
}

const ToasterContext = createContext<ToasterContextValue | null>(null);

export function useToaster() {
  const ctx = useContext(ToasterContext);
  if (!ctx) throw new Error("useToaster must be used within ToasterProvider");
  return ctx;
}

let createId = 0;
function nextId() {
  return String(++createId);
}

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const create = useCallback(
    (options: {
      title: string;
      description?: string;
      status?: ToastStatus;
      duration?: number;
      isClosable?: boolean;
    }) => {
      const id = nextId();
      const duration = options.duration ?? 5000;
      setToasts((prev) => [
        ...prev,
        {
          id,
          title: options.title,
          description: options.description,
          status: options.status ?? "info",
          duration,
        },
      ]);
      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    },
    []
  );

  useEffect(() => {
    globalCreate = create;
    return () => {
      globalCreate = null;
    };
  }, [create]);

  return (
    <ToasterContext.Provider value={{ toasts, create }}>
      {children}
      <Toaster />
    </ToasterContext.Provider>
  );
}

const statusColors: Record<ToastStatus, { bg: string; borderColor: string }> = {
  success: { bg: "green.50", borderColor: "green.500" },
  error: { bg: "red.50", borderColor: "red.500" },
  warning: { bg: "orange.50", borderColor: "orange.500" },
  info: { bg: "blue.50", borderColor: "blue.500" },
};

function Toaster() {
  const ctx = useContext(ToasterContext);
  const toasts = ctx?.toasts ?? [];

  if (toasts.length === 0) return null;

  return (
    <Box
      position="fixed"
      top={4}
      right={4}
      zIndex={9999}
      display="flex"
      flexDirection="column"
      gap={2}
      maxW="sm"
    >
      {toasts.map((t) => (
        <Box
          key={t.id}
          p={4}
          borderRadius="md"
          borderWidth="1px"
          borderColor={statusColors[t.status ?? "info"].borderColor}
          bg={statusColors[t.status ?? "info"].bg}
          shadow="md"
        >
          <Text fontWeight="semibold">{t.title}</Text>
          {t.description && (
            <Text fontSize="sm" mt={1}>
              {t.description}
            </Text>
          )}
        </Box>
      ))}
    </Box>
  );
}

let globalCreate: ToasterContextValue["create"] | null = null;

export const toaster = {
  create: (options: {
    title: string;
    description?: string;
    status?: ToastStatus;
    duration?: number;
    isClosable?: boolean;
  }) => {
    if (globalCreate) globalCreate(options);
  },
};

