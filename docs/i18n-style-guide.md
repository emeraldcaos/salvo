# Translation Style Guide

Write for people who may be stressed, tired, or reading on a small screen.

- Use common words, short sentences, and active voice. Aim for a general reading level around grade 6 to 8.
- Say what a person can do next. Keep one main idea in each sentence.
- Avoid legal jargon, idioms, slang, acronyms, and unexplained abbreviations. If a technical term is necessary, explain it in plain language.
- Keep the meaning and level of certainty the same across languages. Do not promise safety, legal outcomes, or confidentiality that the product cannot guarantee.
- Do not concatenate translated fragments. Translate the full sentence so word order can change naturally.
- Keep punctuation and capitalization natural for each language. Do not force English title case onto translations.
- Use a translator or qualified reviewer for each language. Do not treat machine translation as final, especially for safety or legal information.

## Adding a language

Create a file under `src/i18n/locales/` using the language's short code, such as `ht.ts`, `pt.ts`, or `zh.ts`. Copy the complete message shape from an existing locale, translate every value, add the code to `Language` and the locale registry in `src/i18n/index.ts`, and add its translated name to `languageSwitcher.languages` in each locale. Run the language-switcher tests and review the layout with longer translated strings.
