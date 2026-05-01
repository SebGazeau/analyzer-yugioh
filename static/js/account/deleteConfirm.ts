import { DOM_EVENT_SUBMIT } from '../utils/domEventNames.js';

const ACCOUNT_DELETE_FORM_SELECTOR = 'form[data-account-action="delete"]';
const ACCOUNT_DELETE_CONFIRM_MESSAGE =
    'Cette action est définitive. Voulez-vous vraiment supprimer votre compte ?';

export function bindAccountDeleteConfirm(): void {
    const form = document.querySelector<HTMLFormElement>(ACCOUNT_DELETE_FORM_SELECTOR);
    if (!form) return;
    form.addEventListener(DOM_EVENT_SUBMIT, (event) => {
        if (!window.confirm(ACCOUNT_DELETE_CONFIRM_MESSAGE)) {
            event.preventDefault();
        }
    });
}
