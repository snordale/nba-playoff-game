import { loadGamesForDate } from "@/services/GameLoaderService";
import { NextResponse } from "next/server";

export async function GET() {
  console.log("Loading games for today");
  const targetDate = new Date();
  await loadGamesForDate(targetDate);
  console.log("Games loaded for today");
  return NextResponse.json("Get some");
}
