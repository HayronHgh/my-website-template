"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container } from "@/components/ui/container";
import { PixelIcon } from "@/components/ui/pixel-icon";
import type { ContactLink, NavigationItem, SiteProfile } from "@/data/site";

type FooterProps = {
  contactLinks: ContactLink[];
  navigationItems: NavigationItem[];
  siteProfile: SiteProfile;
};

export function Footer({ contactLinks, navigationItems, siteProfile }: FooterProps) {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="site-footer">
      <Container className="site-footer-inner">
        <div className="site-footer-brand">
          <p>{siteProfile.brandName}</p>
          <small>
            (c) {currentYear} {siteProfile.name}
          </small>
        </div>

        <nav aria-label="Footer" className="site-footer-links">
          {navigationItems.map((item) => (
            <Link data-glow={item.glow} href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="site-footer-contact">
          <a href={`mailto:${siteProfile.email}`}>{siteProfile.email}</a>
          {contactLinks.map((link) => (
            <a
              aria-label={link.label}
              className="site-footer-icon"
              href={link.href}
              key={link.label}
              rel={/^https?:\/\//.test(link.href) ? "noreferrer" : undefined}
              target={/^https?:\/\//.test(link.href) ? "_blank" : undefined}
            >
              <PixelIcon className="h-4 w-4" name={link.icon} />
            </a>
          ))}
        </div>
      </Container>
    </footer>
  );
}
