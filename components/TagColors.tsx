"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { setTagColor } from "@/services/tag-actions";
import { Badge } from "@/components/ui/badge";
import { TAG_COLOR_PALETTE, tagBadgeStyle } from "@/lib/tag-colors";
import { toast } from "sonner";

type TagColorsContextValue = {
  colors: Record<string, string>;
  changeColor: (tag: string, color: string | null) => void;
};

const TagColorsContext = React.createContext<TagColorsContextValue>({
  colors: {},
  changeColor: () => {},
});

/** Holds tag colors for the whole page so a change shows up on every copy of the tag at once. */
export function TagColorsProvider({
  initialColors,
  children,
}: {
  initialColors: Record<string, string>;
  children: React.ReactNode;
}) {
  const [colors, setColors] = React.useState(initialColors);

  React.useEffect(() => {
    setColors(initialColors);
  }, [initialColors]);

  const changeColor = React.useCallback((tag: string, color: string | null) => {
    let previous: string | undefined;
    setColors((current) => {
      previous = current[tag];
      const next = { ...current };
      if (color) next[tag] = color;
      else delete next[tag];
      return next;
    });

    setTagColor(tag, color).catch(() => {
      toast.error("Erro ao mudar a cor da etiqueta.");
      setColors((current) => {
        const next = { ...current };
        if (previous) next[tag] = previous;
        else delete next[tag];
        return next;
      });
    });
  }, []);

  const value = React.useMemo(() => ({ colors, changeColor }), [colors, changeColor]);
  return <TagColorsContext.Provider value={value}>{children}</TagColorsContext.Provider>;
}

export function useTagColor(tag: string): string | undefined {
  return React.useContext(TagColorsContext).colors[tag];
}

/** Wraps a tag badge so right-clicking it opens the color picker. */
export function TagColorMenu({ tag, children }: { tag: string; children: React.ReactNode }) {
  const { colors, changeColor } = React.useContext(TagColorsContext);
  const current = colors[tag];

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent onClick={(e) => e.stopPropagation()}>
        <ContextMenuLabel>Cor de &quot;{tag}&quot;</ContextMenuLabel>
        <div className="grid grid-cols-5 gap-1 p-1">
          {TAG_COLOR_PALETTE.map((color) => (
            <ContextMenuItem
              key={color}
              aria-label={`Cor ${color}`}
              className="size-7 justify-center p-0 rounded-full ring-1 ring-foreground/15 focus:ring-2 focus:ring-ring"
              style={{ backgroundColor: color }}
              onSelect={() => changeColor(tag, color)}
            >
              {current === color && <Check className="size-4 text-white drop-shadow" />}
            </ContextMenuItem>
          ))}
        </div>
        {current && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => changeColor(tag, null)}>
              <X />
              Remover cor
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

/** Tag badge painted with the tag's color (when it has one) and right-click to change it. */
export function TagBadge({
  tag,
  tone = "solid",
  style,
  ...props
}: React.ComponentProps<typeof Badge> & { tag: string; tone?: "solid" | "soft" }) {
  const color = useTagColor(tag);

  return (
    <TagColorMenu tag={tag}>
      <Badge {...props} style={{ ...tagBadgeStyle(color, tone), ...style }} />
    </TagColorMenu>
  );
}
