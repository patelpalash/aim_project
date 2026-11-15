import type { Metadata } from "next";
import { OrganizerDesk } from "@/components/organizer/OrganizerDesk";
import { deskMode } from "@/server/admin-auth";

export const metadata: Metadata = {
  title: "Organizer · Interest Atlas",
  description: "CSV-Import, Review und Veröffentlichung für Interest Atlas. — CSV import, review and publication for Interest Atlas."
};
export const dynamic = "force-dynamic";

export default function OrganizerPage() {
  return <OrganizerDesk enabled={deskMode() !== "disabled"} />;
}
