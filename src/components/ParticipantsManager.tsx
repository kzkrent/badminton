"use client";

import { useActionState, useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ParticipantFormState } from "@/app/actions/tournaments";
import { createPlayerInline } from "@/app/actions/players";
import type { Gender, Player } from "@/lib/players";
import { isDoubles, lineupSlots, type Discipline, type Participant } from "@/lib/tournaments";
import { ParticipantLabel } from "./ParticipantLabel";
import { PlayerForm } from "./PlayerForm";
import { PlayerPicker } from "./PlayerPicker";
import { TeamNameEditor } from "./TeamNameEditor";
import { groupLetter } from "@/lib/groups";

type Props = {
  discipline: Discipline;
  players: Player[];
  participants: Participant[];
  addAction: (prev: ParticipantFormState, fd: FormData) => Promise<ParticipantFormState>;
  removeAction: (participantId: string) => Promise<void>;
  renameAction: (participantId: string, prev: ParticipantFormState, fd: FormData) => Promise<ParticipantFormState>;
  /** Manual group distribution: number of groups (0 = off) */
  manualGroups?: number;
  setGroup?: (participantId: string, group: number | null) => Promise<void>;
};


export function ParticipantsManager({
  discipline,
  players,
  participants,
  addAction,
  removeAction,
  renameAction,
  manualGroups = 0,
  setGroup,
}: Props) {
  const t = useTranslations("tournaments");
  const te = useTranslations("errors");
  const locale = useLocale();
  // Gender required in each slot (null = any); mixed pairs are entered as man + woman.
  const slots: (Gender | null)[] = lineupSlots(discipline);
  const doubles = isDoubles(discipline);

  const [extraPlayers, setExtraPlayers] = useState<Player[]>([]);
  const [selected, setSelected] = useState<(Player | null)[]>(slots.map(() => null));
  const [teamName, setTeamName] = useState("");
  const [teamNameEn, setTeamNameEn] = useState("");
  const [creatingFor, setCreatingFor] = useState<number | null>(null);
  const [state, formAction, pending] = useActionState(async (prev: ParticipantFormState, fd: FormData) => {
    const result = await addAction(prev, fd);
    if (result.ok) {
      setSelected(slots.map(() => null));
      setTeamName("");
      setTeamNameEn("");
    }
    return result;
  }, {});

  const taken = useMemo(
    () => new Set(participants.flatMap((p) => [p.player1.id, p.player2?.id]).filter(Boolean)),
    [participants],
  );
  const allPlayers = useMemo(() => {
    const ids = new Set(players.map((p) => p.id));
    return [...players, ...extraPlayers.filter((p) => !ids.has(p.id))];
  }, [players, extraPlayers]);

  const available = (slot: number) =>
    allPlayers.filter(
      (p) => (slots[slot] === null || p.gender === slots[slot]) && !taken.has(p.id) && !selected.some((s, i) => i !== slot && s?.id === p.id),
    );

  const select = (slot: number, p: Player | null) => setSelected((cur) => cur.map((s, i) => (i === slot ? p : s)));

  const onCreated = useCallback(
    (p: Player) => {
      setExtraPlayers((cur) => [...cur, p]);
      if (creatingFor !== null) select(creatingFor, p);
      setCreatingFor(null);
    },
    [creatingFor],
  );

  const errorKey = state.error;
  const error = !errorKey
    ? null
    : errorKey === "forbidden" || errorKey === "generic"
      ? te(errorKey)
      : t(`err_${errorKey}`);

  return (
    <div className="space-y-4">
      <form action={formAction} className="card space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {slots.map((_, i) => (
            <PlayerPicker
              key={i}
              label={doubles ? t(i === 0 ? "player1" : "player2") : t("player")}
              players={available(i)}
              value={selected[i]}
              onChange={(p) => select(i, p)}
              onCreateNew={() => setCreatingFor(i)}
            />
          ))}
          {doubles && (
            <div>
              <label htmlFor="team_name" className="label">
                {t("teamName")}
              </label>
              <input
                id="team_name"
                name="team_name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder={t("teamNameHint")}
                className="input"
              />
            </div>
          )}
          {doubles && (
            <div>
              <label htmlFor="team_name_en" className="label">
                {t("teamNameEn")}
              </label>
              <input
                id="team_name_en"
                name="team_name_en"
                value={teamNameEn}
                onChange={(e) => setTeamNameEn(e.target.value)}
                placeholder={t("teamNameEnHint")}
                className="input"
              />
            </div>
          )}
        </div>
        {selected.map((p, i) => p && <input key={i} type="hidden" name={`player${i + 1}_id`} value={p.id} />)}
        {error && <p className="text-sm text-danger">{error}</p>}
        <button className="btn-primary" disabled={pending || selected.some((s) => !s)}>
          {t("addParticipant")}
        </button>
      </form>

      {participants.length === 0 ? (
        <p className="text-sm text-muted">{t("noParticipants")}</p>
      ) : (
        <ul className="card divide-y divide-border">
          {participants.map((p, i) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-2">
              <span className="w-6 text-right text-sm text-muted">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <ParticipantLabel participant={p} locale={locale} />
              </span>
              {manualGroups > 0 && setGroup && (
                <select
                  value={p.group_no ?? ""}
                  onChange={(e) => setGroup(p.id, e.target.value ? Number(e.target.value) : null)}
                  className={`input w-auto py-1 ${p.group_no ? "" : "border-danger"}`}
                  aria-label={t("groupFor")}
                >
                  <option value="">{t("noGroup")}</option>
                  {Array.from({ length: manualGroups }, (_, i) => i + 1).map((g) => (
                    <option key={g} value={g}>
                      {t("groupName", { letter: groupLetter(g) })}
                    </option>
                  ))}
                </select>
              )}
              {doubles && <TeamNameEditor participant={p} save={renameAction.bind(null, p.id)} />}
              <button
                type="button"
                onClick={() => removeAction(p.id)}
                className="cursor-pointer text-sm text-muted hover:text-danger"
              >
                {t("remove")}
              </button>
            </li>
          ))}
        </ul>
      )}

      {creatingFor !== null && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-4"
          role="dialog"
          aria-modal
        >
          <div className="w-full max-w-2xl">
            <h2 className="mb-2 text-lg font-semibold text-white">{t("newPlayer")}</h2>
            <PlayerForm
              action={createPlayerInline}
              defaultGender={slots[creatingFor] ?? undefined}
              onCreated={onCreated}
              onCancel={() => setCreatingFor(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
