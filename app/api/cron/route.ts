import { loadGamesForDate } from "@/services/GameLoaderService";
import { NextResponse } from "next/server";

export async function GET() {
  const targetDate = new Date();
  await loadGamesForDate(targetDate);
  return NextResponse.json("Get some");
}
