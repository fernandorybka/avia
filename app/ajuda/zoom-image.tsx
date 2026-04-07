"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ZoomImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

export function ZoomImage({ src, alt, width, height, className }: ZoomImageProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className={`w-full text-left rounded-2xl overflow-hidden border border-border shadow-md bg-muted/20 aspect-[4/3] flex items-center justify-center hover:border-primary/50 transition-all cursor-zoom-in group ${className}`}
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
        />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-5xl h-fit border-none bg-transparent p-0 shadow-none ring-0">
          <DialogTitle className="sr-only">Zoom da imagem: {alt}</DialogTitle>
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <div className="relative w-full max-h-[90vh] overflow-hidden rounded-xl shadow-2xl border border-border bg-background">
              <Image
                src={src}
                alt={alt}
                width={1200}
                height={900}
                className="w-full h-auto object-contain"
                priority
              />
              <Button 
                onClick={() => setIsOpen(false)}
                variant="ghost" 
                size="icon" 
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
