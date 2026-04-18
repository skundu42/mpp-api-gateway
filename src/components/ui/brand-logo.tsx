import Image from "next/image";

export function BrandLogo() {
  return (
    <span className="app-brand__lockup">
      <span className="app-brand__mark" aria-hidden="true">
        <Image src="/logo-mark.svg" alt="" width={44} height={44} priority />
      </span>
      <span className="app-brand__text">
        <span className="app-brand__name">AgentPaywall</span>
        <span className="app-brand__tag">Paid API gateway</span>
      </span>
    </span>
  );
}
