"use client";
import { useState } from "react";
import { ACCESSIBILITY_KEYS, type AccessibilityKey } from "@/lib/types";
import { useI18n } from "./I18nProvider";
export default function AccessibilityReview({ initial, onSave }: { initial: AccessibilityKey[]; onSave: (needs: AccessibilityKey[]) => void }) {
  const { t, lang } = useI18n();
  const copy = {
    en: ["Saved", "Save reviewed needs", "Add or uncheck any suggestion, then save. You can remove all choices."],
    es: ["Guardado", "Guardar necesidades revisadas", "Añade o desmarca sugerencias y guarda. Puedes quitarlas todas."],
    fr: ["Enregistré", "Enregistrer les besoins vérifiés", "Ajoutez ou décochez les suggestions, puis enregistrez. Vous pouvez tout retirer."],
    zh: ["已保存", "保存已核对的需求", "添加或取消建议后保存。您可以取消全部选项。"],
    vi: ["Đã lưu", "Lưu nhu cầu đã kiểm tra", "Thêm hoặc bỏ chọn rồi lưu. Bạn có thể bỏ tất cả."],
    hi: ["सहेजा गया", "जाँची गई ज़रूरतें सहेजें", "सुझाव जोड़ें या हटाएँ और सहेजें। आप सभी विकल्प हटा सकते हैं।"],
  }[lang];
  const [needs, setNeeds] = useState(initial);
  const [saved, setSaved] = useState(false);
  return <section className="action-card">
    <h3>{t.form.s3Title}</h3><p>{copy[2]}</p>
    <fieldset className="choices choices--2"><legend>{t.form.s3Title}</legend>
      {ACCESSIBILITY_KEYS.map(key => <label className="choice" key={key}>
        <input type="checkbox" checked={needs.includes(key)} onChange={e => {
          setNeeds(current => e.target.checked ? [...current, key] : current.filter(k => k !== key)); setSaved(false);
        }} /><span>{t.access.labels[key]}</span>
      </label>)}
    </fieldset>
    <button className="btn btn--primary" type="button" disabled={saved} onClick={() => { onSave(needs); setSaved(true); }}>{saved ? copy[0] : copy[1]}</button>
    <p role="status">{saved ? copy[0] : ""}</p>
  </section>;
}
