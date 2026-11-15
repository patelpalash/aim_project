import type { Metadata } from "next";
import { OrganizerDesk } from "@/components/organizer/OrganizerDesk";

export const metadata: Metadata = {
  title: "Organizer · Interest Atlas",
  description: "CSV-Import, Review und Veröffentlichung für Interest Atlas. — CSV import, review and publication for Interest Atlas."
};
export const dynamic = "force-dynamic";

export default function OrganizerPage() {
  return <OrganizerDesk enabled={process.env.INTEREST_ATLAS_LOCAL_DESK === "1"} />;
}
