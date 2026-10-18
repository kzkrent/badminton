import { participantMembers, participantName, type Participant } from "@/lib/tournaments";
import { fullName } from "@/lib/players";
import { PlayerAvatar } from "./PlayerAvatar";

type Props = { participant: Participant; locale: string; size?: number; photosOnMobile?: boolean };

/** Name (or team name with members below) with player photos. */
export function ParticipantLabel({ participant: p, locale, size = 32, photosOnMobile = true }: Props) {
  const members = participantMembers(p, locale);
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className={`shrink-0 -space-x-2 ${photosOnMobile ? "flex" : "hidden sm:flex"}`}>
        <PlayerAvatar photoPath={p.player1.photo_path} name={fullName(p.player1, locale)} size={size} />
        {p.player2 && <PlayerAvatar photoPath={p.player2.photo_path} name={fullName(p.player2, locale)} size={size} />}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium">{participantName(p, locale)}</span>
        {members && <span className="block truncate text-xs text-muted">{members}</span>}
      </span>
    </span>
  );
}
