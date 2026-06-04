import CoachDashboard from "./CoachDashboard";

export default async function CoachPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  return <CoachDashboard coachId={id} />;
}
