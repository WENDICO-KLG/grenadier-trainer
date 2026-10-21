import { ArrowLeft, CalendarDays } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { RemoveFriendButton } from "@/components/friends";
import { BandLabel, Card, ExerciseImage, GradeBadge, SectionTitle } from "@/components/ui";
import { getExercisesFor, getFriendships, getResults, getUserData } from "@/lib/data";
import { averageGrade, EXERCISES, formatValue, getExercise, gradeFor } from "@/lib/exercises";
import { daysUntil, formatDateCH } from "@/lib/plan";

export default async function FriendPage({ params }: PageProps<"/freunde/[id]">) {
  const { id } = await params;
  const [{ user }, friendships] = await Promise.all([getUserData(), getFriendships()]);
  const friendship = friendships.find((f) => f.friend.id === id && f.status === "accepted");
  if (!friendship) notFound();

  const friend = friendship.friend;
  const name = friend.display_name ?? "Unbekannt";
  const [records, results] = await Promise.all([getExercisesFor([user.id, id]), getResults(id, undefined, 6)]);
  const mine = records.get(user.id);
  const theirs = records.get(id);

  const rows = EXERCISES.map((ex) => {
    const their = theirs?.get(ex.id)?.record ?? null;
    const my = mine?.get(ex.id)?.record ?? null;
    let leader: "them" | "me" | null = null;
    if (their != null && my != null && their !== my) {
      leader = (ex.lowerIsBetter ? their < my : their > my) ? "them" : "me";
    }
    return { ex, their, my, theirGrade: gradeFor(ex, their), myGrade: gradeFor(ex, my), leader };
  });
  const avg = averageGrade(rows.map((r) => r.theirGrade));
  const days = daysUntil(friend.exam_date);

  return (
    <div>
      <Link
        href="/freunde"
        aria-label="Zurück"
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-card"
      >
        <ArrowLeft size={20} />
      </Link>

      <div className="flex flex-col items-center text-center">
        <Avatar url={friend.avatar_url} name={name} size={104} />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{name}</h1>
        {friend.exam_date && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
            <CalendarDays size={14} />
            {days != null && days >= 0 ? `Aushebung in ${days} Tagen · ` : "Aushebung "}
            {formatDateCH(friend.exam_date)}
          </p>
        )}
      </div>

      <Card className="mt-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">Prognose</p>
          <BandLabel grade={avg} />
          {avg == null && <p className="text-sm text-muted">Noch keine Rekorde</p>}
        </div>
        <GradeBadge grade={avg} size="lg" />
      </Card>

      <SectionTitle>Bestleistungen</SectionTitle>
      <div className="mb-2 grid grid-cols-[1fr_5rem_5rem] px-4 text-xs text-muted">
        <span />
        <span className="text-right">{name.split(" ")[0]}</span>
        <span className="text-right">Du</span>
      </div>
      <div className="space-y-2">
        {rows.map(({ ex, their, my, theirGrade, myGrade, leader }) => (
          <div key={ex.id} className="grid grid-cols-[1fr_5rem_5rem] items-center gap-1 rounded-3xl bg-card p-3 pr-4">
            <div className="flex min-w-0 items-center gap-3">
              <ExerciseImage exercise={ex} className="h-12 w-12 shrink-0 rounded-xl" sizes="48px" />
              <span className="truncate text-sm font-medium">{ex.short}</span>
            </div>
            <Cell value={formatValue(ex, their)} grade={theirGrade} lead={leader === "them"} />
            <Cell value={formatValue(ex, my)} grade={myGrade} lead={leader === "me"} />
          </div>
        ))}
      </div>

      {results.length > 0 && (
        <>
          <SectionTitle>Letzte Tests</SectionTitle>
          <Card className="divide-y divide-line/60 p-0">
            {results.map((r) => {
              const ex = getExercise(r.exercise)!;
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="min-w-0 flex-1 truncate">{ex.name}</span>
                  <span className="tabular text-muted">{formatValue(ex, r.value)}</span>
                  <GradeBadge grade={r.grade} />
                </div>
              );
            })}
          </Card>
        </>
      )}

      <div className="mt-8">
        <RemoveFriendButton id={friendship.id} name={name} />
      </div>
    </div>
  );
}

function Cell({ value, grade, lead }: { value: string; grade: number | null; lead: boolean }) {
  return (
    <div className={`rounded-xl px-2 py-1.5 text-right ${lead ? "bg-lime-dim" : ""}`}>
      <p className="tabular text-sm font-semibold">{value}</p>
      <p className="text-xs">
        <GradeBadge grade={grade} />
      </p>
    </div>
  );
}
