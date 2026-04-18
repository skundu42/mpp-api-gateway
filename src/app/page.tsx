import { PaywallApp } from "@/components/paywall-app";
import { appEnv } from "@/lib/env";

export default function HomePage() {
  return <PaywallApp provider={appEnv.publicProvider} />;
}
