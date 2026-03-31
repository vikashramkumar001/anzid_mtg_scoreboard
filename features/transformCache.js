// Server-side transform cache — stores pre-transformed deck data for the current broadcast round.
// Keyed by `${matchID}-${sideID}`, value: { main, side }

let _cache = {
    roundId: null,
    transforms: {}
};

export function cacheTransform(roundId, matchID, sideID, mainResult, sideResult) {
    const key = `${matchID}-${sideID}`;
    _cache.roundId = roundId;
    if (!_cache.transforms[key]) _cache.transforms[key] = { main: null, side: null };
    if (mainResult) _cache.transforms[key].main = mainResult;
    if (sideResult) _cache.transforms[key].side = sideResult;
}

export function getCachedTransform(matchID, sideID) {
    const key = `${matchID}-${sideID}`;
    return _cache.transforms[key] || null;
}

export function getAllCachedTransforms() {
    return _cache.transforms;
}

export function getCachedRoundId() {
    return _cache.roundId;
}

export function invalidateCache() {
    _cache = { roundId: null, transforms: {} };
}

export function isCacheValid(roundId) {
    return _cache.roundId === roundId && Object.keys(_cache.transforms).length > 0;
}
