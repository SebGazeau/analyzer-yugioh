import { describe, it, expect } from 'vitest';
import {
  MSG_IMPORT_JSON_INVALID_FORMAT,
  msgAssociationCardNotFound,
  msgConfirmDeleteDeck,
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

  it('msgConfirmDeleteDeck échappe le nom', () => {
    expect(msgConfirmDeleteDeck('<script>')).not.toContain('<script>');
  });

  it('msgDeckZoneFull inclut la limite', () => {
    expect(msgDeckZoneFull(15)).toContain('15');
  });

  it('MSG_IMPORT_JSON_INVALID_FORMAT mentionne main/extra/side', () => {
    expect(MSG_IMPORT_JSON_INVALID_FORMAT).toContain('main');
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
