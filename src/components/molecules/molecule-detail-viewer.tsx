"use client";

import { useState } from "react";
import { getMolecule, type MoleculeId } from "@/lib/chemistry/molecules";
import { MoleculeViewer, type ViewStyle } from "./molecule-viewer";
import { StyleSwitch } from "./style-switch";

/** Молекула бетіндегі үлкен 3D көрініс + стиль таңдау */
export function MoleculeDetailViewer({ id }: { id: MoleculeId }) {
  const [viewStyle, setViewStyle] = useState<ViewStyle>("ballStick");
  const molecule = getMolecule(id);
  if (!molecule) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-3xl border border-line bg-[radial-gradient(120%_90%_at_50%_40%,var(--stage-a)_0%,var(--panel)_55%,var(--stage-b)_100%)] shadow-[0_1px_2px_var(--shadow)] dark:shadow-none">
        <MoleculeViewer molecule={molecule} viewStyle={viewStyle} className="aspect-square w-full" />
      </div>
      <StyleSwitch value={viewStyle} onChange={setViewStyle} />
    </div>
  );
}
