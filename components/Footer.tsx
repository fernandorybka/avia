export function Footer() {
  return (
    <footer className="border-t bg-background/70">
      <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
        Projeto feito de maneira independente. Encontrou algum erro? Envie um e-mail para {" "}
        <a
          href="mailto:fernando.pr@gmail.com?subject=Erro%20no%20avia!"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          fernando.pr@gmail.com
        </a>
        .
      </div>
    </footer>
  );
}
