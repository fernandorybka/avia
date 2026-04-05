import { db } from "@/db";
import { documentGenerations, templates, documentGenerationValues } from "@/db/schema";
import { Header } from "@/components/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { desc, eq } from "drizzle-orm";
import { FileCheck, Calendar, User } from "lucide-react";
import { connection } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function HistoryPage() {
  await connection();
  const { userId: currentUserId } = await auth();

  if (!currentUserId) {
    redirect("/sign-in");
  }

  const generations = await db
    .select({
      id: documentGenerations.id,
      name: documentGenerations.name,
      createdAt: documentGenerations.createdAt,
      userId: documentGenerations.userId,
    })
    .from(documentGenerations)
    .where(eq(documentGenerations.userId, currentUserId))
    .orderBy(desc(documentGenerations.createdAt));

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <Header />
      
      <main className="container mx-auto px-4 pt-12">
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
               <FileCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Registros Salvos
              </h1>
              <p className="text-slate-500">
                Visualize todos os conjuntos de dados salvos para preenchimento de documentos.
              </p>
            </div>
          </div>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-[300px]">Nome do Registro</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Salvo em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generations.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={4} className="h-48 text-center text-slate-400">
                            Nenhum registro encontrado.
                        </TableCell>
                    </TableRow>
                ) : (
                    generations.map((gen) => (
                    <TableRow key={gen.id} className="hover:bg-slate-50/30 transition-colors">
                        <TableCell className="font-medium text-slate-900">
                            {gen.name}
                        </TableCell>
                        <TableCell className="flex items-center gap-2 text-slate-600">
                            <User className="w-4 h-4 text-slate-300" />
                            {gen.userId}
                        </TableCell>
                        <TableCell className="text-slate-600">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-300" />
                                {new Date(gen.createdAt).toLocaleString("pt-BR")}
                            </div>
                        </TableCell>
                        <TableCell className="text-right">
                           <span className="text-xs font-semibold px-2 py-1 bg-green-50 text-green-600 rounded-full border border-green-100">
                             Salvo
                           </span>
                        </TableCell>
                    </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </main>
    </div>
  );
}
