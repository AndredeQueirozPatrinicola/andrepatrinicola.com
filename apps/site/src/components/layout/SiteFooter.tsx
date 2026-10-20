import { track } from "../../analytics/umami";
import type { Profile } from "../../domain/profile";
import { useI18n } from "../../i18n/context";
import "./site-footer.css";

const SOURCE_URL = "https://github.com/AndredeQueirozPatrinicola/andrepatrinicola.com";

export function SiteFooter({ profile }: { profile: Profile }) {
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

        <p className="site-footer-meta">
          <a
            href={SOURCE_URL}
            rel="noreferrer"
            onClick={() => track("project-source", { project: "andrepatrinicola-com", location: "footer" })}
          >
            {messages.footer.source}
          </a>
        </p>
      </div>
    </footer>
  );
}
