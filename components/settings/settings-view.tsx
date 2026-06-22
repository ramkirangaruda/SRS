// Settings shell. Desktop: a section list on the left, content on the right.
// Mobile (iOS-Settings style): the list fills the screen; tapping a section opens
// it full-screen with a back button. Sections are role-gated — parents see a
// subset. Labels use next-intl so the whole page follows the chosen language.
"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { CalendarRange, Building2, GitBranch, KeyRound, Share2, Users, LifeBuoy, Languages, ShieldCheck, Bell, LogOut, ChevronRight, ChevronLeft } from "lucide-react";
import { ROLES } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AcademicYearSection } from "@/components/settings/sections/academic-year-section";
import { SchoolProfileSection } from "@/components/settings/sections/school-profile-section";
import { AccountSection } from "@/components/settings/sections/account-section";
import { ShareSection } from "@/components/settings/sections/share-section";
import { UsersSection } from "@/components/settings/sections/users-section";
import { SupportSection } from "@/components/settings/sections/support-section";
import { LanguageSection } from "@/components/settings/sections/language-section";
import { LegalSection } from "@/components/settings/sections/legal-section";
import { NotificationsSection } from "@/components/settings/sections/notifications-section";
import { BranchesSection } from "@/components/settings/sections/branches-section";

type SectionDef = { key: string; icon: React.ElementType; principalOnly?: boolean; render: () => React.ReactNode };

export function SettingsView({ role, locale, schoolName }: { role: string; locale: string; schoolName: string }) {
  const t = useTranslations("settings");
  const isPrincipal = role === ROLES.PRINCIPAL;

  const ALL: SectionDef[] = [
    { key: "academicYear", icon: CalendarRange, principalOnly: true, render: () => <AcademicYearSection /> },
    { key: "schoolProfile", icon: Building2, principalOnly: true, render: () => <SchoolProfileSection /> },
    { key: "branches", icon: GitBranch, principalOnly: true, render: () => <BranchesSection /> },
    { key: "changePassword", icon: KeyRound, render: () => <AccountSection /> },
    { key: "shareSchool", icon: Share2, principalOnly: true, render: () => <ShareSection /> },
    { key: "manageUsers", icon: Users, principalOnly: true, render: () => <UsersSection /> },
    { key: "notifications", icon: Bell, render: () => <NotificationsSection /> },
    { key: "language", icon: Languages, render: () => <LanguageSection currentLocale={locale} /> },
    { key: "legal", icon: ShieldCheck, render: () => (isPrincipal ? <LegalSection /> : <PublicLegalLinks />) },
    { key: "support", icon: LifeBuoy, render: () => <SupportSection schoolName={schoolName} /> },
    { key: "logout", icon: LogOut, render: () => <LogoutSection /> },
  ];
  const sections = ALL.filter((s) => !s.principalOnly || isPrincipal);
  const [active, setActive] = useState<string>(sections[0].key);
  const activeDef = sections.find((s) => s.key === active)!;

  return (
    <div className="md:grid md:grid-cols-[260px_1fr] md:gap-6">
      {/* Section list — full width on mobile, hidden once a section is open there */}
      <nav className={cn("space-y-1", active && "hidden md:block")}>
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <button key={s.key} onClick={() => setActive(s.key)} className={cn("flex w-full items-center gap-3 rounded-md border p-3 text-left md:border-0 md:p-2", active === s.key ? "md:bg-muted" : "hover:bg-muted/50")}>
              <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{t(`sections.${s.key}`)}</span>
                <span className="block text-xs text-muted-foreground">{t(`sections.${s.key}Desc`)}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground md:hidden" />
            </button>
          );
        })}
      </nav>

      {/* Content — full screen on mobile with a back button */}
      <div className={cn(active ? "block" : "hidden md:block")}>
        <Button variant="ghost" size="sm" className="mb-3 md:hidden" onClick={() => setActive("")}><ChevronLeft className="mr-1 h-4 w-4" /> Settings</Button>
        {active && (
          <div>
            <h2 className="mb-4 text-lg font-semibold md:hidden">{t(`sections.${activeDef.key}`)}</h2>
            {activeDef.render()}
          </div>
        )}
      </div>
    </div>
  );
}

function LogoutSection() {
  async function logout() {
    // Server-side: expire the cookie. Client-side: next-auth clears + redirects.
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    signOut({ callbackUrl: "/login" });
  }
  return (
    <div className="max-w-md space-y-3">
      <p className="text-sm text-muted-foreground">Sign out of your account on this device.</p>
      <Button variant="destructive" onClick={logout}><LogOut className="mr-1 h-4 w-4" /> Logout</Button>
    </div>
  );
}

function PublicLegalLinks() {
  return (
    <div className="max-w-md space-y-2 text-sm">
      <a href="/settings/privacy-policy" target="_blank" className="block text-blue-600 hover:underline">Privacy Policy</a>
      <a href="/settings/terms" target="_blank" className="block text-blue-600 hover:underline">Terms of Service</a>
    </div>
  );
}
