import dictionaries from '../data/locales.json' with { type: 'json' };

export function getCopy(locale) {
  if (!Object.hasOwn(dictionaries, locale)) throw new Error('Unsupported or incomplete locale');
  return dictionaries[locale];
}
