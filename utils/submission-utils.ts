import type { PlayerGameStats } from "@prisma/client";
import { format, startOfDay } from 'date-fns';

// --- Canonical Submission Types ---
export interface ProcessedSubmission {
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

export interface ScoredGroupUser {
    groupUserId: string;
    userId: string;
    username: string;
    isAdmin: boolean;
    score: number;
    submissions: ProcessedSubmission[];
}

export interface SubmissionView {
    userId: string;
    username: string;
    playerName: string | null;
    score: number | null;
    stats: PlayerGameStats | null;
    gameStatus?: string;
    gameDate?: Date;
    gameStartsAt?: string | null;
}

export interface UserSubmissionMap {
    [dateKey: string]: {
        playerName: string | null;
        score: number | null;
        isFuture: boolean;
        playerId?: string;
    };
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

export function createSubmissionsByDate(
    scoredUsers: ScoredGroupUser[],
    gameCountsByDate: { [key: string]: number },
    todayStart: Date
): { [key: string]: SubmissionView[] } {
    const submissionsByDate: { [key: string]: SubmissionView[] } = {};

    Object.keys(gameCountsByDate).forEach(dateKey => {
        const dateStart = startOfDay(new Date(dateKey));
        const isFutureDate = dateStart > todayStart;
        submissionsByDate[dateKey] = [];

        scoredUsers.forEach(user => {
            const submission = user.submissions.find(sub => sub.date === dateKey);

            submissionsByDate[dateKey].push({
                username: user.username,
                playerName: isFutureDate ? null : submission?.playerName || null,
                score: isFutureDate ? null : submission?.score || null,
                stats: isFutureDate ? null : submission?.stats || null,
                gameStatus: submission?.gameStatus,
                gameDate: submission?.gameDate,
                gameStartsAt: submission?.gameStartsAt,
                userId: user.userId,
            });
        });
    });

    return submissionsByDate;
}

export function createUserSubmissionsMap(
    submissions: ProcessedSubmission[],
    todayStart: Date
): UserSubmissionMap {
    const map: UserSubmissionMap = {};

    submissions.forEach(sub => {
        const gameDateStart = startOfDay(sub.gameDate);
        const dateKey = format(gameDateStart, 'yyyy-MM-dd');

        map[dateKey] = {
            playerName: sub.playerName,
            score: sub.score,
            isFuture: gameDateStart > todayStart,
            playerId: sub.playerId
        };
    });

    return map;
} 