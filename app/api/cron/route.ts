import { updateScores } from "@/services/ScoringService";
import { NextResponse } from "next/server";

export async function GET() {
  await updateScores();
  return NextResponse.json("Get some");
}
