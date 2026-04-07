"use client";

import { ArrowRight, FileText, Upload, Wand2, HelpCircle } from "lucide-react";
import Link from "next/link";

export function WorkflowInfographic() {
  return (
    <div className="w-full bg-card/50 border rounded-3xl p-8 mb-8 backdrop-blur-sm border-primary/10 shadow-sm">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center space-y-4 group">
            <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
              <FileText className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">1. Identifique os Campos</h3>
              <div className="p-3 bg-muted/50 rounded-lg font-mono text-sm border border-border inline-block">
                Eu, <span className="opacity-40">____________</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Localize no seu documento Word os espaços que precisam ser preenchidos.
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center justify-center absolute top-7 left-[33.33%] -translate-x-1/2 text-primary/30">
            <ArrowRight className="w-6 h-6" />
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center space-y-4 group">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/5 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform duration-300">
              <Upload className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">2. Troque por Coringas</h3>
              <div className="p-3 bg-orange-500/5 rounded-lg font-mono text-sm border border-orange-500/20 text-orange-600 inline-block">
                Eu, <span className="font-bold">##NOME##</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Substitua cada espaço por um coringa com ## antes e depois.
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center justify-center absolute top-7 left-[66.66%] -translate-x-1/2 text-primary/30">
            <ArrowRight className="w-6 h-6" />
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center space-y-4 group">
            <div className="w-14 h-14 rounded-2xl bg-green-500/5 flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform duration-300">
              <Wand2 className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">3. Gere Documentos</h3>
              <div className="p-3 bg-green-500/5 rounded-lg font-mono text-sm border border-green-500/20 text-green-700 inline-block">
                Eu, <span className="font-bold">Maria da Silva</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Suba o arquivo .docx modificado e gere quantos documentos precisar.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-primary/5 flex justify-center text-sm">
          <Link
            href="/ajuda"
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group px-4 py-2 rounded-full hover:bg-primary/5 border border-transparent hover:border-primary/10"
          >
            <HelpCircle className="w-4 h-4" />
            <span>
              Quer ver um exemplo real?{" "}
              <span className="font-medium text-primary group-hover:underline">
                Saiba mais aqui
              </span>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
