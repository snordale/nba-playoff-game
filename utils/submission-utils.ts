import type { PlayerGameStats } from "@prisma/client";
import { format, startOfDay } from 'date-fns';

// --- Canonical Submission Types ---
export type ProcessedSubmission = {
    date: string;
    gameId: string;
    playerId: string;
    playerName: string | null;
    score: number | null;
    stats: PlayerGameStats | null;
    gameStatus: string;
    gameDate: Date;
    gameStartsAt: string | null;
}

export type ScoredGroupUser = {
    groupUserId: string;
    userId: string;
    username: string;
    isAdmin: boolean;
    score: number;
    submissions: ProcessedSubmission[];
}

export type SubmissionView = {
    userId: string;
    username: string;
    playerName: string | null;
    score: number | null;
    stats: PlayerGameStats | null;
    gameStatus?: string;
    gameDate?: Date;
    gameStartsAt?: string | null;
}

export function isPickLocked(gameStatus: string, gameStartsAt: Date | string | null): boolean {
    const now = new Date();
    return gameStatus !== 'STATUS_SCHEDULED' || (gameStartsAt && new Date(gameStartsAt) <= now);
}

export function processSubmission(
    submission: any,
    stats: PlayerGameStats | null,
    score: number | null,
    isOwnUser: boolean
): ProcessedSubmission | null {
    if (!submission.game || !submission.player) return null;

    const gameDate = new Date(submission.game.date);
    const locked = isPickLocked(submission.game.status, submission.game.startsAt);
    const canShowDetails = locked || isOwnUser;

    return {
        date: format(gameDate, 'yyyy-MM-dd'),
        gameId: submission.gameId,
        playerId: submission.playerId,
        playerName: canShowDetails ? submission.player.name : null,
        score: canShowDetails ? score : null,
        stats: canShowDetails ? stats : null,
        gameStatus: submission.game.status,
        gameDate: submission.game.date,
        gameStartsAt: submission.game.startsAt,
    };
}
