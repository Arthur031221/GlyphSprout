import { useEffect, useState } from "react";
import { analyzeText } from "../core/text";
import type { Project } from "../core/types";
import type { Dictionary } from "./i18n";

export function Setup({
  project,
  t,
  onApply,
}: {
  project: Project | null;
  t: Dictionary;
  onApply: (name: string, text: string) => void;
}) {
  const [name, setName] = useState(project?.name ?? "My Handwriting");
  const [text, setText] = useState(project?.text ?? "Hello world!");
  useEffect(() => {
    setName(project?.name ?? "My Handwriting");
    setText(project?.text ?? "Hello world!");
  }, [project?.name, project?.text]);
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
          onApply(name, text);
        }}
      >
        <label>
          {t.projectName}
          <input
            name="font-name"
            value={name}
            maxLength={64}
            required
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          {t.text}
          <textarea
            value={text}
            rows={4}
            maxLength={8192}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
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
