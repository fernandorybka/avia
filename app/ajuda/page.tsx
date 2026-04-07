import { Header } from "@/components/Header";
import { BookOpen, FileText, Lightbulb, AlertTriangle, CheckCircle2, ArrowRight, Hash } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ZoomImage } from "./zoom-image";

export const metadata = {
  title: "Como configurar modelos – avia!",
  description: "Aprenda a criar e configurar modelos de documentos no avia! usando coringas ##CAMPO## para geração automatizada.",
};

const steps = [
  {
    number: "01",
    title: "Crie o documento no Word",
    description: "Abra o Microsoft Word (ou LibreOffice Writer) e crie seu modelo normalmente — texto, formatação, cabeçalho, assinatura. Onde quiser inserir dados variáveis, use um coringa.",
  },
  {
    number: "02",
    title: "Insira os coringas",
    description: "Escreva os campos variáveis entre ## de cada lado — por exemplo ##nome do campo##, ##Data de Início## ou ##função##. Letras acentuadas, til e espaços são aceitos. O único campo obrigatório é ##NOME##.",
  },
  {
    number: "03",
    title: "Salve como .docx ou .doc",
    description: "Salve o arquivo no formato .docx ou .doc. O avia! só aceita este formato para garantir a compatibilidade com o sistema de substituição.",
  },
  {
    number: "04",
    title: "Envie para o avia!",
    description: 'Na página de Modelos, clique em "Enviar novo modelo", preencha o nome e selecione o arquivo .docx. O sistema detectará automaticamente todos os coringas.',
  },
  {
    number: "05",
    title: "Preencha e gere",
    description: 'Acesse o modelo, preencha os campos detectados e clique em "Salvar e Gerar". O documento .docx preenchido será baixado automaticamente.',
  },
];

export default function AjudaPage() {
  return (
    <div className="min-h-screen bg-background pb-28 overflow-x-hidden">
      <Header />

      <main className="container mx-auto px-4 pt-28">
        <div className="max-w-4xl mx-auto space-y-16">

          {/* Hero */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Como configurar modelos
              </h1>
              <p className="text-muted-foreground max-w-2xl text-[1.25rem] pt-8">
                O <span className="font-logo font-normal text-[#ff3939]">avia!</span> usa um sistema de <strong>coringas</strong> para identificar os campos variáveis do seu documento. Você escreve o modelo uma vez, e o sistema preenche automaticamente a cada geração.
              </p>
            </div>
          </div>

          {/* What is a wildcard */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <Hash className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">O que é um coringa?</h2>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                Um coringa é um marcador de posição inserido no corpo do seu documento Word. Ele indica onde o avia! deve substituir o conteúdo real. A sintaxe é simples:
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-6">
                <div className="flex items-center gap-3 bg-muted/60 rounded-xl px-6 py-4 font-mono text-xl font-bold text-primary tracking-widest border border-border">
                  ##nome do campo##
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <ArrowRight className="w-5 h-5 shrink-0" />
                  <span className="text-sm">Será substituído pelo valor preenchido no formulário</span>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 space-y-1">
                  <p className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />Correto</p>
                  <p className="font-mono text-foreground">##NOME##</p>
                  <p className="font-mono text-foreground">##data de início##</p>
                  <p className="font-mono text-foreground">##função##</p>
                </div>
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 space-y-1">
                  <p className="font-semibold text-destructive flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Incorreto</p>
                  <p className="font-mono text-foreground line-through opacity-60">#nome#</p>
                  <p className="font-mono text-foreground line-through opacity-60">[[NOME]]</p>
                  <p className="font-mono text-foreground line-through opacity-60">%CAMPO%</p>
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-1">
                  <p className="font-semibold text-primary flex items-center gap-2"><Lightbulb className="w-4 h-4" />Regras</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">O texto entre <span className="font-mono">##</span> dos dois lados.</p>
                </div>
              </div>
            </div>
          </section>

          {/* ##NOME## warning */}
          <div className="flex gap-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">##NOME## é obrigatório em todo modelo</p>
              <p className="text-sm text-muted-foreground">
                O campo <span className="font-mono font-bold text-primary">##NOME##</span> é usado como identificador da pessoa ao salvar um registro. O avia! o adiciona automaticamente a todos os modelos enviados, mesmo que você não o tenha incluído no documento.
              </p>
            </div>
          </div>

          {/* Visual example */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Exemplo visual</h2>
            </div>

            <p className="text-muted-foreground">
              Veja o processo completo desde o documento original até a geração final (clique para ampliar):
            </p>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Step 1: Original */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    1. Documento do Edital
                  </span>
                </div>
                <ZoomImage
                  src="/ajuda/1-original.png"
                  alt="Modelo original do edital com linhas em branco"
                  width={600}
                  height={450}
                />
                <p className="text-xs text-muted-foreground text-center">
                  Como o documento vem no anexo do edital
                </p>
              </div>

              {/* Step 2: Wildcards */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    2. Inserção de Coringas
                  </span>
                </div>
                <ZoomImage
                  src="/ajuda/2-wildcards.png"
                  alt="Modelo com coringas ##NOME## inseridos"
                  width={600}
                  height={450}
                />
                <p className="text-xs text-muted-foreground text-center">
                  Você substitui os espaços por <span className="font-mono text-primary">##CORINGAS##</span>
                </p>
              </div>

              {/* Step 3: Data Entry */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    3. Preenchimento no avia!
                  </span>
                </div>
                <ZoomImage
                  src="/ajuda/3-dados.png"
                  alt="Formulário do avia! com os dados preenchidos"
                  width={600}
                  height={450}
                />
                <p className="text-xs text-muted-foreground text-center">
                  O sistema identifica os campos para você preencher
                </p>
              </div>

              {/* Step 4: Final Result */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    4. Documento Gerado
                  </span>
                </div>
                <ZoomImage
                  src="/ajuda/4-gerado.png"
                  alt="Documento final gerado com os dados aplicados"
                  width={600}
                  height={450}
                />
                <p className="text-xs text-muted-foreground text-center font-semibold text-primary">
                  O avia! gera o documento final pronto para uso
                </p>
              </div>
            </div>
          </section>

          {/* Step by step */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Passo a passo</h2>
            </div>

            <div className="space-y-4">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-5 bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors">
                  <div className="text-3xl font-black text-primary/20 tabular-nums leading-none shrink-0 w-10">
                    {step.number}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <h3 className="font-bold text-foreground text-lg">Pronto para começar?</h3>
              <p className="text-sm text-muted-foreground">Envie seu primeiro modelo e comece a gerar documentos em segundos.</p>
            </div>
            <Link href="/modelos">
              <Button size="lg" className="px-8 shadow-md hover:shadow-lg transition-all whitespace-nowrap">
                <FileText className="mr-2 w-4 h-4" />
                Ir para Modelos
              </Button>
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
