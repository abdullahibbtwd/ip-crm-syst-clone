import iso3166 from "iso-3166-1";

export type CountryOption = {
  code: string;
  name: string;
};

const PINNED_CODE = "BG";

let cached: CountryOption[] | null = null;

export function getCountryOptions(): CountryOption[] {
  if (cached) return cached;

  const options = iso3166
    .all()
    .map((c) => ({
      code: c.alpha2,
      name: c.country,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));

  const pinned = options.find((c) => c.code === PINNED_CODE);
  const rest = options.filter((c) => c.code !== PINNED_CODE);
  cached = pinned ? [pinned, ...rest] : options;
  return cached;
}

export function findCountryByName(name: string): CountryOption | undefined {
  const trimmed = name.trim();
  if (!trimmed) return undefined;

  const fromPackage = iso3166.whereCountry(trimmed);
  if (fromPackage) {
    return { code: fromPackage.alpha2, name: fromPackage.country };
  }

  return getCountryOptions().find(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
  );
}

export function getCountryLabel(value: string | null | undefined): string {
  if (!value) return "-";

  const byCode = iso3166.whereAlpha2(value);
  if (byCode) return byCode.country;

  const byName = findCountryByName(value);
  if (byName) return byName.name;

  return value;
}

export function normalizeCountryValue(
  value: string | null | undefined,
): string {
  if (!value) return "";
  if (iso3166.whereAlpha2(value)) return value;
  const match = findCountryByName(value);
  return match?.code ?? value;
}
