import { ChevronDown, PackageOpen } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PreparedTemplateDownloadButton } from "@/components/PreparedTemplateDownloadButton";
import { getPublicPreparedTemplates } from "@/services/prepared-template-services";

type TemplateItem = Awaited<ReturnType<typeof getPublicPreparedTemplates>>[number];

type CategoryTreeNode = {
  templates: TemplateItem[];
  children: Record<string, CategoryTreeNode>;
};

function createNode(): CategoryTreeNode {
  return { templates: [], children: {} };
}

function buildTemplateTree(templates: TemplateItem[]): CategoryTreeNode {
  const root = createNode();

  for (const template of templates) {
    const rawPath = template.categoryPath || "Sem categoria";
    const segments = rawPath.split(">").map((segment) => segment.trim()).filter(Boolean);

    let node = root;
    for (const segment of segments) {
      if (!node.children[segment]) {
        node.children[segment] = createNode();
      }
      node = node.children[segment];
    }

    node.templates.push(template);
  }

  return root;
}

function CategoryBranch({
  label,
  node,
  level,
}: {
  label: string;
  node: CategoryTreeNode;
  level: number;
}) {
  const childEntries = Object.entries(node.children).sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  const sortedTemplates = [...node.templates].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const headingClass = level === 0 ? "text-xl" : level === 1 ? "text-lg" : "text-base";
  const sectionCount = node.templates.length + childEntries.length;

  return (
    <details
      className="rounded-xl border bg-card shadow-sm overflow-hidden [&[open]>summary_.category-chevron]:rotate-180"
      open={level !== 1}
    >
      <summary className="px-5 py-4 border-b bg-muted/25 cursor-pointer list-none">
        <div className="flex items-center justify-between gap-3">
          <h2 className={`${headingClass} font-semibold tracking-tight text-foreground`}>{label}</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{sectionCount} itens</span>
            <ChevronDown className="category-chevron w-4 h-4 transition-transform" />
          </div>
        </div>
      </summary>

      <div>
        {node.templates.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>{new Date(template.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="text-right">
                    <PreparedTemplateDownloadButton templateId={template.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {childEntries.length > 0 && (
          <div className="space-y-4 p-4">
            {childEntries.map(([childLabel, childNode]) => (
              <CategoryBranch
                key={`${label}-${childLabel}`}
                label={childLabel}
                node={childNode}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

export default async function ModelosProntosPage() {
  const templates = await getPublicPreparedTemplates();
  const tree = buildTemplateTree(templates);
  const topLevel = Object.entries(tree.children).sort(([a], [b]) => a.localeCompare(b, "pt-BR"));

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
      <main className="container mx-auto px-4 pt-28">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <PackageOpen className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Modelos Prontos
              </h1>
              <p className="text-muted-foreground">
                Baixe modelos públicos pré-configurados com os coringas já organizados.
              </p>
            </div>
          </div>

          {templates.length === 0 ? (
            <div className="rounded-xl border bg-card shadow-sm p-10 text-center text-muted-foreground">
              Nenhum modelo público pronto cadastrado ainda.
            </div>
          ) : (
            <div className="space-y-5">
              {topLevel.map(([label, node]) => (
                <CategoryBranch key={label} label={label} node={node} level={0} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
