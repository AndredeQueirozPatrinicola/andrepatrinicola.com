export type ProfileLinkKind = "email" | "linkedin" | "github";

export type ProfileLink = {
  kind: ProfileLinkKind;
  label: string;
  href: string;
};

export type Profile = {
  name: string;
  role: string;
  location: string;
  summary: string;
  email: string;
  links: ProfileLink[];
};
