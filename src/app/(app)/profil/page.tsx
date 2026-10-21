import { CalendarDays, LogOut, Mail } from "lucide-react";
import { signOut } from "@/app/actions";
import { AvatarUpload } from "@/components/avatar-upload";
import { ExamDateForm } from "@/components/exam-date-form";
import { InstallAppButton } from "@/components/install-app";
import { NameForm } from "@/components/name-form";
import { Card, SectionTitle } from "@/components/ui";
import { getUserData } from "@/lib/data";

export default async function ProfilePage() {
  const { user, profile } = await getUserData();

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Profil</h1>
      </header>

      <Card>
        <AvatarUpload url={profile.avatar_url} name={profile.display_name} />
        <p className="mt-6 text-xs uppercase tracking-wider text-muted">Name</p>
        <NameForm initial={profile.display_name} />
        <p className="mt-4 flex items-center gap-2 text-sm text-muted">
          <Mail size={14} /> {user.email}
        </p>
      </Card>

      <SectionTitle>Aushebung</SectionTitle>
      <Card>
        <p className="flex items-center gap-2 text-sm">
          <CalendarDays size={16} className="text-lime" /> Datum der Eignungsprüfung
        </p>
        <ExamDateForm initial={profile.exam_date} />
        <p className="mt-3 text-xs text-muted">
          Dein Trainingsplan auf der Startseite passt sich automatisch an die verbleibende Zeit an.
        </p>
      </Card>

      <SectionTitle>App</SectionTitle>
      <Card>
        <p className="mb-4 text-sm text-muted">
          Installiere den Grenadier Trainer auf deinem Homescreen – startet im Vollbild wie eine normale App.
        </p>
        <InstallAppButton />
      </Card>

      <SectionTitle>Prüfung bestehen</SectionTitle>
      <Card className="space-y-2 text-sm">
        <Row grade="5.00 – 4.50" label="sehr gut" color="text-lime" />
        <Row grade="4.49 – 4.00" label="gut" color="text-amber-400" />
        <Row grade="3.99 – 3.60" label="genügend" color="text-zinc-100" />
        <Row grade="3.59 – 1.00" label="ungenügend" color="text-red-400" />
        <p className="pt-2 text-xs leading-relaxed text-muted">
          Bestanden, wenn der Durchschnitt aller 5 Disziplinen mindestens genügend (3.60) ist. Wiederholung
          frühestens nach einem halben Jahr – alle Disziplinen werden erneut geprüft.
        </p>
      </Card>

      <form action={signOut} className="mt-8">
        <button className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-card text-sm font-medium text-red-400">
          <LogOut size={16} /> Abmelden
        </button>
      </form>
    </div>
  );
}

function Row({ grade, label, color }: { grade: string; label: string; color: string }) {
  return (
    <div className="flex justify-between">
      <span className="tabular">{grade}</span>
      <span className={color}>{label}</span>
    </div>
  );
}
