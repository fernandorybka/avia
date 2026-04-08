import { db } from "@/db";
import { documentGenerations, documentGenerationValues } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { Users } from "lucide-react";
import { connection } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CadastrosViewer } from "@/components/CadastrosViewer";

import { unstable_cache } from "next/cache";

export default async function CadastrosPage() {
  await connection();
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const getCachedData = unstable_cache(
    async (uid: string) => {
      const generations = await db
        .select({
          id: documentGenerations.id,
          name: documentGenerations.name,
          createdAt: documentGenerations.createdAt,
        })
        .from(documentGenerations)
        .where(eq(documentGenerations.userId, uid))
        .orderBy(documentGenerations.name);

      const generationIds = generations.map(g => g.id);
      
      let values: { id: string, generationId: string, fieldKey: string, fieldValue: string }[] = [];
      if (generationIds.length > 0) {
        values = await db
          .select({
            id: documentGenerationValues.id,
            generationId: documentGenerationValues.generationId,
            fieldKey: documentGenerationValues.fieldKey,
            fieldValue: documentGenerationValues.fieldValue,
          })
          .from(documentGenerationValues)
          .where(inArray(documentGenerationValues.generationId, generationIds))
          .orderBy(documentGenerationValues.fieldKey);
      }

      const groupedValues = values.reduce((acc, curr) => {
        if (!acc[curr.generationId]) acc[curr.generationId] = [];
        acc[curr.generationId].push(curr);
        return acc;
      }, {} as Record<string, typeof values>);

      return { generations, groupedValues };
    },
    [`cadastros-${userId}`],
    { tags: [`cadastros-${userId}`] }
  );

  const { generations, groupedValues } = await getCachedData(userId);

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="container mx-auto px-4 pt-28">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
               <Users className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Pessoas & Dados
              </h1>
              <p className="text-muted-foreground">
                Visão global de todos os dados e campos extraídos vinculados a cada nome.
              </p>
            </div>
          </div>

          <CadastrosViewer generations={generations} groupedValues={groupedValues} />
        </div>
      </main>
    </div>
  );
}
