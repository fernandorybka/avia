import Link from "next/link";
import { Button } from "./ui/button";
import { UserButton, SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { ThemeToggle } from "./ThemeToggle";
import { canCurrentUserAccessMerch, canCurrentUserManageProjects, isCurrentUserAdmin } from "@/lib/admin";
import { AdminNavMenu } from "./AdminNavMenu";
import { MobileNav } from "./MobileNav";
import { navItemClass } from "./nav-styles";

export async function Header() {
  const [canAccessAdmin, canAccessMerch, canAccessProjects] = await Promise.all([
    isCurrentUserAdmin(),
    canCurrentUserAccessMerch(),
    canCurrentUserManageProjects(),
  ]);

  return (
    <header className="fixed top-0 left-0 right-0 border-b bg-background/80 backdrop-blur-md z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-logo font-normal text-[3rem] tracking-tight flex items-baseline gap-1 text-[#ff3939] drop-shadow-sm hover:opacity-90 transition-opacity">
          avia!
        </Link>
        <nav className="hidden items-center gap-4 md:flex">
          <Link href="/modelos" className={navItemClass}>Modelos</Link>
          <Link href="/cadastros" className={navItemClass}>Cadastros</Link>
          <Link href="/modelos-prontos" className={navItemClass}>Modelos Prontos</Link>
          <Link href="/ajuda" className={navItemClass}>Ajuda</Link>
          {canAccessMerch && (
            <Link href="/merch" className={navItemClass}>Lojinha</Link>
          )}
          {canAccessProjects && (
            <Link href="/projetos" className={navItemClass}>Projetos</Link>
          )}
          {canAccessAdmin && <AdminNavMenu />}
          <div className="ml-4 flex items-center gap-4 border-l pl-4 border-border">
            <ThemeToggle />
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="default">Entrar</Button>
              </SignInButton>
            </SignedOut>
          </div>
        </nav>

        <MobileNav canAccessAdmin={canAccessAdmin} canAccessMerch={canAccessMerch} canAccessProjects={canAccessProjects} />
      </div>
    </header>
  );
}
