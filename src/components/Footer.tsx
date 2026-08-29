import Link from "next/link";

import styles from "@/components/Footer.module.css";
import { FOOTER_LANDSCAPE_IMAGE } from "@/components/footerLandscapeImage";

export function Footer() {
  return (
    <>
      <div className={`${styles.banner} footer-landscape-banner`} aria-hidden="true">
        <img
          className={`${styles.image} footer-landscape-image`}
          src={`data:image/webp;base64,${FOOTER_LANDSCAPE_IMAGE}`}
          width="1600"
          height="454"
          alt=""
          loading="lazy"
        />
      </div>

      <footer className="site-footer">
        <div className="shell footer-inner">
          <div>
            <strong>Tun Western Armenian Translator</strong>
            <span>© {new Date().getFullYear()} Tun. All rights reserved.</span>
          </div>
          <nav className="footer-links" aria-label="Footer navigation">
            <Link href="/pricing">Pricing</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
