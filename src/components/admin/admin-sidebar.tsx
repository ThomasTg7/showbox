"use client";

import { adminPath } from "@/lib/site-urls";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar,
  Handshake,
  History,
  Home,
  Inbox,
  Layers,
  LogOut,
  Newspaper,
  Settings,
  Swords,
  Trash2,
  Trophy,
  UserCog,
  UserRound,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { BRAND } from "@/domain/brand";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

const SECTIONS = [
  { href: adminPath("/"), label: "Inicio", icon: Home, group: "Promotora" },
  { href: adminPath("/boxeadores"), label: "Boxeadores", icon: Swords, group: "Promotora" },
  { href: adminPath("/divisiones"), label: "Divisiones", icon: Layers, group: "Promotora" },
  { href: adminPath("/eventos"), label: "Eventos", icon: Calendar, group: "Promotora" },
  { href: adminPath("/rankings"), label: "Rankings", icon: Trophy, group: "Promotora" },
  { href: adminPath("/noticias"), label: "Noticias", icon: Newspaper, group: "Contenido" },
  { href: adminPath("/patrocinadores"), label: "Patrocinadores", icon: Handshake, group: "Contenido" },
  { href: adminPath("/bandeja"), label: "Bandeja", icon: Inbox, group: "Contenido" },
  { href: adminPath("/configuracion"), label: "Configuración", icon: Settings, group: "Administración" },
  { href: adminPath("/usuarios"), label: "Usuarios", icon: UserCog, group: "Administración" },
  { href: adminPath("/papelera"), label: "Papelera", icon: Trash2, group: "Administración" },
  { href: adminPath("/historial"), label: "Historial", icon: History, group: "Administración" },
];

function isActive(pathname: string, href: string): boolean {
  return href === adminPath("/") ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({ email, newInbox = 0 }: { email: string; /** Mensajes de la bandeja que nadie ha respondido. */ newInbox?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  async function signOut() {
    await authClient.signOut();
    router.replace(adminPath("/login"));
    router.refresh();
  }

  return (
    <Sidebar>
      <SidebarHeader className="px-3 py-4">
        <Link href={adminPath("/")} className="flex items-center gap-2 px-1" onClick={() => setOpenMobile(false)}>
          <Logo size="sm" />
          <span className="font-cond text-xs font-semibold uppercase tracking-widest text-muted-foreground">Panel<br />{BRAND.shortName}</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {["Promotora", "Contenido", "Administración"].map((group) => <SidebarGroup key={group}>
          <SidebarGroupLabel className="font-cond uppercase tracking-[.14em] text-muted-foreground">{group}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SECTIONS.filter((section) => section.group === group).map((section) => (
                <SidebarMenuItem key={section.href}>
                  <SidebarMenuButton asChild isActive={isActive(pathname, section.href)}>
                    <Link href={section.href} onClick={() => setOpenMobile(false)}>
                      <section.icon />
                      <span>{section.label}</span>
                    </Link>
                  </SidebarMenuButton>
                  {section.href === adminPath("/bandeja") && newInbox > 0 ? <SidebarMenuBadge aria-label={`${newInbox} mensajes nuevos`}>{newInbox}</SidebarMenuBadge> : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>)}
      </SidebarContent>
      <SidebarFooter className="px-3 py-3 gap-2">
        <span className="px-2 text-xs text-muted-foreground truncate">{email}</span>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive(pathname, adminPath("/cuenta"))}>
              <Link href={adminPath("/cuenta")} onClick={() => setOpenMobile(false)}>
                <UserRound />
                <span>Mi cuenta</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <LogOut />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
