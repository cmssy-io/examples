import type { ButtonHTMLAttributes } from "react";
import styles from "./button.module.css";

export type ButtonVariant = "default" | "outline" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

export function buttonClass(
  variant: ButtonVariant = "default",
  size: ButtonSize = "md",
  extra?: string,
): string {
  return [styles.btn, styles[variant], styles[size], extra]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "default",
  size = "md",
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, className)}
      {...rest}
    />
  );
}
