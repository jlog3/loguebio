"use client";

import { useState, type ReactNode } from "react";
import styles from "./InfoTooltip.module.css";

interface Props {
  text: string;
  children: ReactNode;
}

export default function InfoTooltip({ text, children }: Props) {
  const [show, setShow] = useState(false);

  return (
    <span
      className={styles.wrapper}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <span className={styles.badge}>?</span>
      {show && <div className={styles.tooltip}>{text}</div>}
    </span>
  );
}
