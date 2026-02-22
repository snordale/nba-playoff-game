"use client";

import {
  MenuRoot,
  MenuTrigger,
  MenuContent,
  MenuPositioner,
  MenuItem,
  MenuItemText,
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
      <Button size="sm" variant="outline" colorScheme="orange" disabled spinner={<Spinner size="sm" />}>
        Season
      </Button>
    );
  }

  if (seasons.length === 0) return null;

  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          colorScheme="orange"
          aria-label="Select season"
        >
          {currentSeason?.displayName ?? "Select Season"}
        </Button>
      </MenuTrigger>
      <MenuPositioner>
        <MenuContent>
          {seasons.map((s) => (
            <MenuItem key={s.id} onClick={() => handleSelect(s.year)}>
              <MenuItemText fontWeight={s.year === currentSeason?.year ? "semibold" : "normal"}>
                {s.displayName}
              </MenuItemText>
            </MenuItem>
          ))}
        </MenuContent>
      </MenuPositioner>
    </MenuRoot>
  );
}
