import styles from "@/components/Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.root}>
      <div
        className={`${styles.curve} tunapp-footer-curve`}
        aria-hidden="true"
      >
        <img
          className={`${styles.artwork} tunapp-footer-artwork`}
          src="/tun-footer-background.png"
          width="1200"
          height="340"
          alt=""
          loading="lazy"
        />
      </div>

      <div className={`${styles.footerBar} tunapp-footer-bar`}>
        <p>
          Copyright © {new Date().getFullYear()}. All rights reserved. For every Armenian who loves their home.
        </p>
      </div>
    </footer>
  );
}
