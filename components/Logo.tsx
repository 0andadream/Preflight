type LogoProps = {
  className?: string;
  title?: string;
  variant?: "lime" | "ink";
};

export function Logo({ className = "h-8 w-8", title = "PREflight", variant = "lime" }: LogoProps) {
  const fill = variant === "lime" ? "#c6f04d" : "#07080a";
  const cut = variant === "lime" ? "#07080a" : "#ffffff";

  return (
    <svg
      viewBox="0 0 128 128"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <polygon fill={fill} points="20,12 116,12 116,108" />
      <polygon fill={fill} points="12,54 60,54 60,102" />
      <g transform="translate(84 46) rotate(-18)">
        <rect x="-13" y="-17" width="26" height="34" rx="4" fill={cut} />
        <rect x="-7.2" y="-10" width="4.2" height="10" rx="1.1" fill={fill} />
        <rect x="3" y="-10" width="4.2" height="10" rx="1.1" fill={fill} />
        <circle cx="0" cy="8" r="2.4" fill={fill} />
        <path
          d="M2.2 9.6 C10 10 12.2 4 11.4 -2"
          fill="none"
          stroke={fill}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
