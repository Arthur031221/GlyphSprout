import { useEffect, useState } from "react";
import {
  addCharacterSet,
  analyzeText,
  CHARACTER_SETS,
  type CharacterSetId,
  missingFromSet,
} from "../core/text";
import type { Project } from "../core/types";
import type { Dictionary } from "./i18n";

const PRESET_LABELS = {
  uppercase: "presetUppercase",
  lowercase: "presetLowercase",
  digits: "presetDigits",
  punctuation: "presetPunctuation",
  accentedLower: "presetAccentedLower",
  accentedUpper: "presetAccentedUpper",
  hiragana: "presetHiragana",
  katakana: "presetKatakana",
} as const;

export function Setup({
  project,
  t,
  onApply,
  onDirtyChange,
}: {
  project: Project | null;
  t: Dictionary;
  onApply: (name: string, text: string) => boolean;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const committed = {
    name: project?.name ?? "My Handwriting",
    text: project?.text ?? "Hello world!",
  };
  const [name, setName] = useState(committed.name);
  const [text, setText] = useState(committed.text);
  const [nameDirty, setNameDirty] = useState(false);
  const [textDirty, setTextDirty] = useState(false);
  useEffect(() => {
    if (!nameDirty) setName(project?.name ?? "My Handwriting");
    if (!textDirty) setText(project?.text ?? "Hello world!");
  }, [project?.name, project?.text, nameDirty, textDirty]);
  const dirty = nameDirty || textDirty;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  const analysis = analyzeText(text);
  return (
    <section className="panel setup">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{t.setupLabel}</span>
          <h2>{t.setup}</h2>
        </div>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (onApply(name, text)) {
            setName(name.trim());
            setText(analyzeText(text).text);
            setNameDirty(false);
            setTextDirty(false);
          }
        }}
      >
        <label>
          {t.projectName}
          <input
            name="font-name"
            value={name}
            maxLength={64}
            required
            onChange={(e) => {
              setName(e.target.value);
              setNameDirty(e.target.value !== committed.name);
            }}
          />
        </label>
        <label>
          {t.text}
          <textarea
            value={text}
            rows={4}
            maxLength={8192}
            onChange={(e) => {
              setText(e.target.value);
              setTextDirty(e.target.value !== committed.text);
            }}
          />
        </label>
        <fieldset className="presets">
          <legend>{t.presetsLabel}</legend>
          {(Object.keys(CHARACTER_SETS) as CharacterSetId[]).map((id) => (
            <button
              key={id}
              type="button"
              className="chip"
              disabled={!missingFromSet(text, id).length}
              onClick={() => {
                const next = addCharacterSet(text, id);
                setText(next);
                setTextDirty(next !== committed.text);
              }}
            >
              {t[PRESET_LABELS[id]]}
            </button>
          ))}
        </fieldset>
        <div className="analysis" aria-live="polite">
          <span>
            {t.distinct}: {analysis.characters.length} / 512
          </span>
          <span>
            {t.pages}: {Math.ceil(analysis.characters.length / 35)}
          </span>
          {!!analysis.unsupported.length && (
            <span className="bad">
              {t.unsupported}: {analysis.unsupported.join(" ")}
            </span>
          )}
          {analysis.overflow && <span className="bad">{t.tooMany}</span>}
        </div>
        <button
          className="primary"
          type="submit"
          disabled={
            !name.trim() ||
            !analysis.characters.length ||
            !!analysis.unsupported.length ||
            analysis.overflow
          }
        >
          {t.projectReady}
        </button>
      </form>
      <p className="instructions">{t.sourceHelp}</p>
    </section>
  );
}
