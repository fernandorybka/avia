/** Top menu item: tinted pill plus an underline that grows from the center on hover. */
export const navItemClass =
  "relative inline-flex h-9 cursor-pointer items-center justify-center rounded-md px-4 text-sm font-medium text-foreground/80 " +
  "transition-colors duration-200 hover:bg-primary/10 hover:text-primary " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
  "after:absolute after:inset-x-3 after:bottom-0.5 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full " +
  "after:bg-primary after:transition-transform after:duration-200 hover:after:scale-x-100";
