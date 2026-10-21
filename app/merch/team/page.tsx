import { asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { merchMembers } from "@/db/schema";
import { isCurrentUserAdmin } from "@/lib/admin";
import { MerchTeamEditor } from "@/components/merch/MerchTeamEditor";

export default async function MerchTeamPage() {
  if (!(await isCurrentUserAdmin())) {
    notFound();
  }

  const members = await db
    .select({ id: merchMembers.id, email: merchMembers.email })
    .from(merchMembers)
    .orderBy(asc(merchMembers.email));

  return <MerchTeamEditor members={members} />;
}
