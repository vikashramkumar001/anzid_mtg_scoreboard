// Who currently owns each card-viewer slot.
//
// The scoreboard renders ONE card overlay per side — card-id 1 is the left
// overlay, anything else is the right (public/js/scoreboard.js:1868). On the
// anu vendor the left overlay is display:none, so the operator (id 2) and the
// chat bridge (id 3) are pointed at the SAME physical viewer.
//
// "Chat yields": the operator always wins. A chat request is refused while the
// operator has that side occupied, and an operator card immediately takes the
// slot back from chat. Ownership is keyed by SIDE, not card-id, because two
// different ids resolve to the same overlay.

const sideOf = (cardId) => (String(cardId ?? '') === '1' ? 'left' : 'right');

const owners = { left: null, right: null };   // { owner:'operator'|'chat', at:number }

export function claimSlot(cardId, owner) {
    owners[sideOf(cardId)] = { owner, at: Date.now() };
}

export function releaseSlot(cardId, onlyIfOwner = null) {
    const side = sideOf(cardId);
    const cur = owners[side];
    if (!cur) return false;
    if (onlyIfOwner && cur.owner !== onlyIfOwner) return false;   // don't clear someone else's card
    owners[side] = null;
    return true;
}

export function slotOwner(cardId) {
    return owners[sideOf(cardId)]?.owner ?? null;
}

/** Called from the operator's socket handlers: an empty selection is a clear. */
export function noteOperatorCard(cardSelected) {
    const id = cardSelected?.['card-id'];
    if (id == null) return;
    const name = cardSelected?.['card-selected'];
    if (name === '' || name == null) releaseSlot(id);
    else claimSlot(id, 'operator');
}

export function _reset() { owners.left = null; owners.right = null; }
