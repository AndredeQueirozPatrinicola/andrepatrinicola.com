import { profile } from "../../content/profile";
import { localize } from "../../domain/localized";
import type { ProfileRepository } from "../repositories";

export function createLocalProfileRepository(): ProfileRepository {
  return {
    async get(locale) {
      return {
        ...profile,
        role: localize(profile.role, locale),
        location: localize(profile.location, locale),
        summary: localize(profile.summary, locale),
      };
    },
  };
}
