import { notFound } from "next/navigation";
import { getStudent } from "@/lib/data";
import DashboardClient from "./dashboard-client";

export default async function StudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = getStudent(id);
  if (!s) notFound();

  return <DashboardClient student={s} />;
}
