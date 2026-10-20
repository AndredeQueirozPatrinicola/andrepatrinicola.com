import { track } from "../../analytics/umami";
import type { Profile } from "../../domain/profile";
import { useI18n } from "../../i18n/context";
import "./site-footer.css";

const SOURCE_URL = "https://github.com/AndredeQueirozPatrinicola/andrepatrinicola.com";

type SiteFooterProps = {
  profile: Profile;
  onManageConsent: () => void;
};

export function SiteFooter({ profile, onManageConsent }: SiteFooterProps) {
  const { messages } = useI18n();

  return (
    <footer className="site-footer">
      <div className="page site-footer-inner">
        <div className="site-footer-identity">
          <p className="site-footer-name">{profile.name}</p>
          <p>{profile.role}</p>
          <p>{profile.location}</p>
        </div>

        <div className="site-footer-contact">
          <h2 className="label">{messages.footer.contact}</h2>
          <ul>
            {profile.links.map((link) => (
              <li key={link.kind}>
                <a
                  href={link.href}
                  rel={link.kind === "email" ? undefined : "me noreferrer"}
                  onClick={() => track("contact", { channel: link.kind, location: "footer" })}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="site-footer-meta">
          <button type="button" className="site-footer-privacy" onClick={onManageConsent}>
            {messages.footer.privacy}
          </button>
          <a
            href={SOURCE_URL}
            rel="noreferrer"
            onClick={() => track("project-source", { project: "andrepatrinicola-com", location: "footer" })}
          >
            {messages.footer.source}
          </a>
        </div>
      </div>
    </footer>
  );
}
