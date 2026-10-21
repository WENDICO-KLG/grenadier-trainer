import { notFound } from "next/navigation";
import { TestRunner } from "@/components/test-runner";
import { getUserData } from "@/lib/data";
import { getExercise } from "@/lib/exercises";

export default async function TestPage({ params }: PageProps<"/test/[id]">) {
  const { id } = await params;
  const ex = getExercise(id);
  if (!ex) notFound();

  const { exercises } = await getUserData();
  const data = exercises.get(ex.id);

  return <TestRunner exerciseId={ex.id} record={data?.record ?? null} goal={data?.goal ?? null} />;
}
