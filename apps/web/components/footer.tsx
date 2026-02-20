import { Mail } from "lucide-react";

export function Footer() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@relevx.ai";

  return (
    <footer className="border-t border-border/30 py-8 mt-20">
      <div className="container-wide flex flex-col items-center gap-3 text-sm text-muted-foreground/60">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          <a
            href={`mailto:${supportEmail}`}
            className="hover:text-muted-foreground transition-colors"
          >
            {supportEmail}
          </a>
        </div>
        <p>&copy; {new Date().getFullYear()} RelevX. All rights reserved.</p>
      </div>
    </footer>
  );
}
