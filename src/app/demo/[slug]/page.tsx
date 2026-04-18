import { RouteDemoApp } from "@/components/route-demo-app";

export default async function DemoRoutePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <RouteDemoApp slug={slug} />;
}
