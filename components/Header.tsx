import Link from "next/link";
import { Button } from "./ui/button";
import { UserButton, SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { ThemeToggle } from "./ThemeToggle";
import { isCurrentUserAdmin } from "@/lib/admin";
import { AdminNavMenu } from "./AdminNavMenu";

export async function Header() {
  const canAccessAdmin = await isCurrentUserAdmin();

  return (
    <header className="fixed top-0 left-0 right-0 border-b bg-background/80 backdrop-blur-md z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-logo font-normal text-[3rem] tracking-tight flex items-baseline gap-1 text-[#ff3939] drop-shadow-sm hover:opacity-90 transition-opacity">
          avia!
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/modelos">
            <Button variant="ghost" className="cursor-pointer hover:bg-muted font-medium px-4 h-9">Modelos</Button>
          </Link>
          <Link href="/cadastros">
            <Button variant="ghost" className="cursor-pointer hover:bg-muted font-medium px-4 h-9">Cadastros</Button>
          </Link>
          <Link href="/modelos-prontos">
            <Button variant="ghost" className="cursor-pointer hover:bg-muted font-medium px-4 h-9">Modelos Prontos</Button>
          </Link>
          <Link href="/ajuda">
            <Button variant="ghost" className="cursor-pointer hover:bg-muted font-medium px-4 h-9">Ajuda</Button>
          </Link>
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
      </div>
    </header>
  );
}
