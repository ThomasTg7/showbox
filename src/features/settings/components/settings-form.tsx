"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MediaDTO } from "@/features/media/dto";
import { SETTING_KEYS, SETTING_LABELS, type SettingKey, type SettingsMap } from "../registry";
import { SettingPanel } from "./setting-panel";

type SettingsFormProps = {
  settings: SettingsMap;
  ogMedia: MediaDTO | null;
  privacyUpdatedLabel: string | null;
  initialTab: SettingKey;
};

/**
 * Configuración del sitio en pestañas; cada una se guarda por separado. Una pestaña se monta la primera vez que se abre y
 * queda montada (oculta) para no perder lo escrito al cambiar de pestaña; así Tiptap tampoco se carga hasta que se necesita.
 */
export function SettingsForm({ settings, ogMedia, privacyUpdatedLabel, initialTab }: SettingsFormProps) {
  const [tab, setTab] = useState<SettingKey>(initialTab);
  const [opened, setOpened] = useState<Set<SettingKey>>(() => new Set([initialTab]));

  function changeTab(next: string) {
    const key = next as SettingKey;
    setTab(key);
    setOpened((current) => new Set(current).add(key));
  }

  return (
    <Tabs value={tab} onValueChange={changeTab}>
      <TabsList variant="line" className="h-auto w-full flex-wrap group-data-horizontal/tabs:h-auto justify-start gap-x-1 gap-y-1.5 pb-2">
        {SETTING_KEYS.map((key) => (
          <TabsTrigger key={key} value={key} className="flex-none px-3">
            {SETTING_LABELS[key]}
          </TabsTrigger>
        ))}
      </TabsList>
      {SETTING_KEYS.map((key) => (
        <TabsContent key={key} value={key} forceMount className="pt-6" hidden={tab !== key}>
          {opened.has(key) ? <SettingPanel settingKey={key} settings={settings} ogMedia={ogMedia} privacyUpdatedLabel={privacyUpdatedLabel} /> : null}
        </TabsContent>
      ))}
    </Tabs>
  );
}
