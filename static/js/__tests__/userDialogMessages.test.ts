import { describe, it, expect } from 'vitest';
import {
  DECK_DUPLICATE_NAME_SUFFIX,
  DECK_EXPORT_JSON_FILE_NAME,
  DECK_NAME_FALLBACK_DISPLAY,
  MSG_DECK_API_AUTH_REQUIRED,
  MSG_DECK_API_DECK_NOT_FOUND,
  MSG_IMPORT_JSON_INVALID_FORMAT,
  MSG_PROMPT_DECK_NAME,
  MSG_UPDATE_DECK_NOT_LOADED,
  msgAssociationCardNotFound,
  msgConfirmDeleteDeck,
  msgDeckDuplicated,
  msgDeckZoneFull,
  msgErrorPrefixed,
  msgImportCardsNotFound,
} from '../utils/userDialogMessages.js';
import { TEXT_GUILLEMET_CLOSE, TEXT_GUILLEMET_OPEN } from '../utils/textPlaceholders.js';

describe('userDialogMessages', () => {
  it('msgAssociationCardNotFound inclut le nom cherché', () => {
    const m = msgAssociationCardNotFound('Dark Magician');
    expect(m).toContain('Dark Magician');
    expect(m).toContain('/carte');
    expect(m).toContain(TEXT_GUILLEMET_OPEN);
    expect(m).toContain(TEXT_GUILLEMET_CLOSE);
  });

  it('msgErrorPrefixed préfixe Erreur', () => {
    expect(msgErrorPrefixed('timeout')).toBe('Erreur: timeout');
  });

  it('DECK_DUPLICATE_NAME_SUFFIX aligné msgDeckDuplicated / apiDuplicateDeck', () => {
    expect(DECK_DUPLICATE_NAME_SUFFIX).toBe(' (copie)');
    expect(msgDeckDuplicated('X')).toContain(DECK_DUPLICATE_NAME_SUFFIX);
    expect(msgDeckDuplicated('X')).toContain('X');
  });

  it('msgConfirmDeleteDeck échappe le nom', () => {
    expect(msgConfirmDeleteDeck('<script>')).not.toContain('<script>');
  });

  it('msgDeckZoneFull inclut la limite', () => {
    expect(msgDeckZoneFull(15)).toContain('15');
  });

  it('MSG_IMPORT_JSON_INVALID_FORMAT mentionne main/extra/side', () => {
    expect(MSG_IMPORT_JSON_INVALID_FORMAT).toContain('main');
  });

  it('messages deck persist / API stables', () => {
    expect(MSG_PROMPT_DECK_NAME).toContain('deck');
    expect(MSG_UPDATE_DECK_NOT_LOADED.length).toBeGreaterThan(20);
    expect(DECK_NAME_FALLBACK_DISPLAY).toBe('Sans nom');
    expect(DECK_EXPORT_JSON_FILE_NAME).toBe('deck.json');
    expect(MSG_DECK_API_AUTH_REQUIRED).toContain('Connexion');
    expect(MSG_DECK_API_DECK_NOT_FOUND).toBe('Deck introuvable');
  });

  it('msgImportCardsNotFound résume la liste', () => {
    const a = msgImportCardsNotFound(['A', 'B']);
    expect(a).toContain('2 carte');
    expect(a).toContain('A');
    expect(a).toContain('B');
    const many = msgImportCardsNotFound(Array.from({ length: 12 }, (_, i) => `c${i}`));
    expect(many).toContain('... et 2 autre');
  });
});
