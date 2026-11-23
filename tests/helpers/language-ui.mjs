// Presentation components are isolated in tests that exercise unrelated business logic.
export const languageUi = {
  Text: ({ children }) => children,
  DateText: ({ value }) => value ?? '-',
  LanguageInput: 'input',
  LanguageSwitcher: () => null,
  useLanguage: () => 'id',
  useUiText: () => text => text,
};
