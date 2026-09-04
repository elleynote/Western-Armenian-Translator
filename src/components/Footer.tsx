import styles from "@/components/Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.root}>
      <div
        className={`${styles.curve} tunapp-footer-curve`}
        aria-hidden="true"
      >
        <div className={`${styles.scene} tunapp-footer-scene`}>
          <img
            className={`${styles.artwork} tunapp-footer-artwork`}
            src="https://tunapp.com/wp-content/uploads/2026/09/Tun-Footer-Translate__.png"
            alt=""
            loading="lazy"
          />
        </div>
      </div>

      <div className={`${styles.footerBar} tunapp-footer-bar`}>
        <p>
          Copyright © {new Date().getFullYear()}. All rights reserved. For every Armenian who loves their home.
        </p>
      </div>
    </footer>
  );
}
