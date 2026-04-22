type BrandWordmarkProps = {
  size?: "sm" | "md" | "lg";
  withTagline?: boolean;
};

const sizeClasses = {
  sm: {
    zero: "text-3xl",
    text: "text-lg tracking-[0.28em]"
  },
  md: {
    zero: "text-4xl",
    text: "text-xl tracking-[0.32em]"
  },
  lg: {
    zero: "text-5xl",
    text: "text-2xl tracking-[0.34em]"
  }
};

export function BrandWordmark({ size = "md", withTagline = false }: BrandWordmarkProps) {
  const classes = sizeClasses[size];

  return (
    <div className="inline-flex flex-col gap-1">
      <div
        aria-label="0PDV"
        className="inline-flex items-end gap-1.5 font-black uppercase leading-none text-brand-900"
      >
        <span className={`brand-zero ${classes.zero}`}>0</span>
        <span className={classes.text}>PDV</span>
      </div>
      {withTagline ? (
        <span className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-700">
          Caixa, estoque e operação
        </span>
      ) : null}
    </div>
  );
}
