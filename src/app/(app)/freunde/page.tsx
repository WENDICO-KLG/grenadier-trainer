import { ChevronRight, Trophy } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { AddFriendForm, FriendCodeCard, RequestActions } from "@/components/friends";
import { Card, GradeBadge, SectionTitle } from "@/components/ui";
import { getExercisesFor, getFriendships, getUserData } from "@/lib/data";
import { averageGrade, EXERCISES, gradeFor, type ExerciseId } from "@/lib/exercises";
import type { UserExercise } from "@/lib/data";
import { daysUntil } from "@/lib/plan";

function prognosis(exercises: Map<ExerciseId, UserExercise> | undefined) {
  const grades = EXERCISES.map((ex) => gradeFor(ex, exercises?.get(ex.id)?.record));
  return { avg: averageGrade(grades), tested: grades.filter((g) => g != null).length };
}

export default async function FriendsPage() {
  const [{ user, profile }, friendships] = await Promise.all([getUserData(), getFriendships()]);
  const friends = friendships.filter((f) => f.status === "accepted");
  const incoming = friendships.filter((f) => f.status === "pending" && f.incoming);
  const outgoing = friendships.filter((f) => f.status === "pending" && !f.incoming);

  const records = await getExercisesFor([user.id, ...friends.map((f) => f.friend.id)]);

  const ranking = [
    { id: user.id, name: profile.display_name ?? "Du", avatar: profile.avatar_url, examDate: profile.exam_date, me: true },
    ...friends.map((f) => ({
      id: f.friend.id,
      name: f.friend.display_name ?? "Unbekannt",
      avatar: f.friend.avatar_url,
      examDate: f.friend.exam_date,
      me: false,
    })),
  ]
    .map((p) => ({ ...p, ...prognosis(records.get(p.id)) }))
    .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Freunde</h1>
        <p className="mt-1 text-muted">Trainiert zusammen und vergleicht eure Bestleistungen.</p>
      </header>

      <Card>
        <FriendCodeCard code={profile.friend_code} />
        <div className="my-5 h-px bg-line/60" />
        <p className="mb-2 text-sm font-medium">Freund hinzufügen</p>
        <AddFriendForm />
      </Card>

      {incoming.length > 0 && (
        <>
          <SectionTitle>Anfragen</SectionTitle>
          <Card className="divide-y divide-line/60 p-0">
            {incoming.map((f) => (
              <div key={f.id} className="flex items-center gap-3 p-4">
                <Avatar url={f.friend.avatar_url} name={f.friend.display_name} size={44} />
                <p className="min-w-0 flex-1 truncate font-medium">{f.friend.display_name ?? "Unbekannt"}</p>
                <RequestActions id={f.id} incoming />
              </div>
            ))}
          </Card>
        </>
      )}

      <SectionTitle>Rangliste</SectionTitle>
      {friends.length === 0 ? (
        <Card className="text-center">
          <p className="font-medium">Noch keine Freunde</p>
          <p className="mt-1 text-sm text-muted">Teile deinen Code – sobald jemand annimmt, seht ihr gegenseitig eure Rekorde.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {ranking.map((p, i) => {
            const days = daysUntil(p.examDate);
            const row = (
              <>
                <span className={`w-6 text-center text-sm font-semibold ${i === 0 ? "text-lime" : "text-muted"}`}>
                  {i === 0 && p.avg != null ? <Trophy size={16} className="mx-auto" /> : i + 1}
                </span>
                <Avatar url={p.avatar} name={p.name} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {p.name}
                    {p.me && <span className="ml-2 text-xs text-muted">(du)</span>}
                  </p>
                  <p className="text-xs text-muted">
                    {p.tested}/5 Disziplinen
                    {days != null && days >= 0 && ` · Aushebung in ${days} Tagen`}
                  </p>
                </div>
                <GradeBadge grade={p.avg} />
                {!p.me && <ChevronRight size={18} className="text-muted" />}
              </>
            );
            return p.me ? (
              <div key={p.id} className="flex items-center gap-3 rounded-3xl bg-lime-dim p-3 pr-4">
                {row}
              </div>
            ) : (
              <Link
                key={p.id}
                href={`/freunde/${p.id}`}
                className="flex items-center gap-3 rounded-3xl bg-card p-3 pr-4 transition active:scale-[0.99]"
              >
                {row}
              </Link>
            );
          })}
        </div>
      )}

      {outgoing.length > 0 && (
        <>
          <SectionTitle>Gesendet</SectionTitle>
          <Card className="divide-y divide-line/60 p-0">
            {outgoing.map((f) => (
              <div key={f.id} className="flex items-center gap-3 p-4">
                <Avatar url={f.friend.avatar_url} name={f.friend.display_name} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{f.friend.display_name ?? "Unbekannt"}</p>
                  <p className="text-xs text-muted">Wartet auf Bestätigung</p>
                </div>
                <RequestActions id={f.id} incoming={false} />
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
