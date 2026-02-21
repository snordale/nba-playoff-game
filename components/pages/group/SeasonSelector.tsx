"use client";

import {
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Button,
  Spinner,
} from "@chakra-ui/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useGetSeasons } from "@/react-query/queries";

interface SeasonSelectorProps {
  currentSeason: { year: number; displayName: string } | undefined;
}

export function SeasonSelector({ currentSeason }: SeasonSelectorProps) {
  const { data: seasons = [], isLoading } = useGetSeasons();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSelect = (year: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("season", String(year));
    router.push(`${pathname}?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <Button size="sm" variant="outline" colorScheme="orange" isDisabled leftIcon={<Spinner size="sm" />}>
        Season
      </Button>
    );
  }

  if (seasons.length === 0) return null;

  return (
    <Menu>
      <MenuButton
        as={Button}
        size="sm"
        variant="outline"
        colorScheme="orange"
        aria-label="Select season"
      >
        {currentSeason?.displayName ?? "Select Season"}
      </MenuButton>
      <MenuList>
        {seasons.map((s) => (
          <MenuItem
            key={s.id}
            onClick={() => handleSelect(s.year)}
            fontWeight={s.year === currentSeason?.year ? "semibold" : "normal"}
          >
            {s.displayName}
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
}
