import { getTodaysWiseBrief } from "../lib/wisebrief";
import WiseBriefDashboard from "./components/WiseBriefDashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const dateKey = new Date().toISOString().slice(0, 10);
  const items = await getTodaysWiseBrief(dateKey);
  return <WiseBriefDashboard items={items} dateKey={dateKey} />;
}

