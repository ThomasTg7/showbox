"use client";

import type { Editor } from "@tiptap/react";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Clapperboard, Heading2, Heading3, ImagePlus, Italic, Link as LinkIcon, List, ListOrdered, Minus, Quote } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { TextAlign } from "@/domain/post-body";

/** Se aplica al párrafo o título donde está el cursor, o a los que toca la selección (nunca a todo el texto). */
const ALIGN_BUTTONS: { align: TextAlign; label: string; icon: ComponentType<{ "aria-hidden"?: boolean }> }[] = [
  { align: "justify", label: "Justificar", icon: AlignJustify },
  { align: "left", label: "Alinear a la izquierda", icon: AlignLeft },
  { align: "center", label: "Centrar", icon: AlignCenter },
  { align: "right", label: "Alinear a la derecha", icon: AlignRight },
];

export type ToolbarPanel = "link" | "embed" | null;

type ToolButtonProps = {
  label: string;
  /** Texto visible junto al ícono (para lo que no se entiende solo con el ícono). */
  text?: string;
  icon: ComponentType<{ "aria-hidden"?: boolean }>;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function ToolButton({ label, text, icon: Icon, active = false, disabled, onClick }: ToolButtonProps) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      aria-pressed={active}
      aria-label={label}
      title={label}
      disabled={disabled}
      // El editor pierde la selección si el botón toma el foco antes de actuar.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={text ? "h-8 px-2" : "size-8 px-0"}
    >
      <Icon aria-hidden />
      {text ? <span aria-hidden>{text}</span> : null}
    </Button>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1">
      {children}
    </div>
  );
}

type EditorToolbarProps = {
  editor: Editor;
  panel: ToolbarPanel;
  onPanelChange: (panel: ToolbarPanel) => void;
  onInsertImage: () => void;
  /** `false` oculta «Foto» y «Video / Post» (textos de Configuración). */
  allowMedia?: boolean;
};

/** Barra del editor: títulos, formato, alineación, listas, cita, enlace, separador, imagen y publicación de una red. Se envuelve en celular. */
export function EditorToolbar({ editor, panel, onPanelChange, onInsertImage, allowMedia = true }: EditorToolbarProps) {
  return (
    <div role="toolbar" aria-label="Formato del texto" className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-card p-2">
      <Group label="Títulos">
        <ToolButton label="Título (H2)" icon={Heading2} active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
        <ToolButton label="Subtítulo (H3)" icon={Heading3} active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
      </Group>
      <Group label="Formato">
        <ToolButton label="Negrita" icon={Bold} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
        <ToolButton label="Cursiva" icon={Italic} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
        <ToolButton label="Enlace" icon={LinkIcon} active={editor.isActive("link") || panel === "link"} onClick={() => onPanelChange(panel === "link" ? null : "link")} />
      </Group>
      <Group label="Alineación">
        {ALIGN_BUTTONS.map(({ align, label, icon }) => (
          <ToolButton key={align} label={label} icon={icon} active={editor.isActive({ textAlign: align })} onClick={() => editor.chain().focus().setTextAlign(align).run()} />
        ))}
      </Group>
      <Group label="Bloques">
        <ToolButton label="Lista con viñetas" icon={List} active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <ToolButton label="Lista numerada" icon={ListOrdered} active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
        <ToolButton label="Cita" icon={Quote} active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
        <ToolButton label="Separador" icon={Minus} onClick={() => editor.chain().focus().setHorizontalRule().run()} />
      </Group>
      {allowMedia ? (
        <Group label="Insertar">
          <ToolButton label="Imagen" text="Foto" icon={ImagePlus} onClick={onInsertImage} />
          <ToolButton label="Video o publicación de YouTube, Instagram, TikTok o Facebook" text="Video / Post" icon={Clapperboard} active={panel === "embed"} onClick={() => onPanelChange(panel === "embed" ? null : "embed")} />
        </Group>
      ) : null}
    </div>
  );
}
