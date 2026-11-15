import AuthTabGuard from '@/components/AuthTabGuard';

export default function LandingPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthTabGuard>{children}</AuthTabGuard>;
}