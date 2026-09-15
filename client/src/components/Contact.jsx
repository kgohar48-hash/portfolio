import { useRef, useState } from "react";
import Section from "./Section";
import { Reveal, SpotlightCard } from "./primitives";
import { sendContact } from "../api";
import { trackEvent } from "../lib/analytics";
import { useLanguage } from "../i18n/LanguageContext";

const initial = { name: "", email: "", subject: "", message: "", company: "" };

export default function Contact({ contact }) {
  const { lang, t } = useLanguage();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | ok | bad
  const [note, setNote] = useState("");
  const startedRef = useRef(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function onFieldFocus(field) {
    if (!startedRef.current) {
      startedRef.current = true;
      trackEvent("contact_field_focus", { meta: { field } });
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    setErrors({});
    setNote("");
    trackEvent("contact_submit");
    const { ok, body } = await sendContact({ ...form, lang });
    if (ok) {
      setStatus("ok");
      setNote(body.message || t.contact.successFallback);
      setForm(initial);
      trackEvent("contact_success");
    } else {
      setStatus("bad");
      setErrors(body.errors || {});
      setNote(body.error || t.contact.errorFallback);
      trackEvent("contact_error", { meta: { fields: Object.keys(body.errors || {}) } });
    }
  }

  return (
    <Section id="contact" eyebrow={t.contact.eyebrow} title={t.contact.title} sub={t.contact.sub}>
      <div className="contact-grid">
        <Reveal delay={0.05}>
          <div className="contact-links">
            {contact.links.map((l) => (
              <a key={l.label} href={l.href} data-track={`contact:${l.label.toLowerCase()}`} target={l.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="contact-link">
                <div>
                  <div className="k">{l.label}</div>
                  <div className="v">{l.value}</div>
                </div>
                <span className="arw">↗</span>
              </a>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <SpotlightCard>
            <form className="form" onSubmit={onSubmit} noValidate>
              <input
                className="hp"
                tabIndex={-1}
                autoComplete="off"
                name="company"
                value={form.company}
                onChange={(e) => update("company", e.target.value)}
                aria-hidden="true"
              />

              <div className="field">
                <label htmlFor="name">{t.contact.name}</label>
                <input id="name" value={form.name} onFocus={() => onFieldFocus("name")} onChange={(e) => update("name", e.target.value)} placeholder={t.contact.namePlaceholder} />
                {errors.name && <span className="err">{errors.name}</span>}
              </div>

              <div className="field">
                <label htmlFor="email">{t.contact.email}</label>
                <input id="email" type="email" value={form.email} onFocus={() => onFieldFocus("email")} onChange={(e) => update("email", e.target.value)} placeholder={t.contact.emailPlaceholder} />
                {errors.email && <span className="err">{errors.email}</span>}
              </div>

              <div className="field">
                <label htmlFor="subject">{t.contact.subject}</label>
                <input id="subject" value={form.subject} onFocus={() => onFieldFocus("subject")} onChange={(e) => update("subject", e.target.value)} placeholder={t.contact.subjectPlaceholder} />
              </div>

              <div className="field">
                <label htmlFor="message">{t.contact.message}</label>
                <textarea id="message" value={form.message} onFocus={() => onFieldFocus("message")} onChange={(e) => update("message", e.target.value)} placeholder={t.contact.messagePlaceholder} />
                {errors.message && <span className="err">{errors.message}</span>}
              </div>

              <button type="submit" className="btn btn-primary" data-track="contact:send" disabled={status === "sending"}>
                {status === "sending" ? t.contact.sending : t.contact.send}
              </button>

              {note && <div className={`form-note ${status === "ok" ? "ok" : "bad"}`}>{note}</div>}
            </form>
          </SpotlightCard>
        </Reveal>
      </div>
    </Section>
  );
}
