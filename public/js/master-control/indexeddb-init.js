// scripts/indexeddb-init.js

let dbInstance = null;

async function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("CardDB", 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            db.createObjectStore("cards", {keyPath: "id"}); // id = genre::name
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

export async function initCardDB(genre, data) {
    const db = await openDatabase();
    const tx = db.transaction("cards", "readwrite");
    const store = tx.objectStore("cards");

    // Clear all cards of the same genre first
    const clearRequest = store.openCursor();
    clearRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
            if (cursor.value.genre === genre) {
                cursor.delete();
            }
            cursor.continue();
        }
    };

    await new Promise((res, rej) => {
        tx.oncomplete = res;
        tx.onerror = rej;
    });

    // Start a new transaction for adding new data
    const addTx = db.transaction("cards", "readwrite");
    const addStore = addTx.objectStore("cards");

    for (const name in data) {
        addStore.put({
            id: `${genre}::${name}`,
            genre,
            name,
            imageUrl: data[name]
        });
    }

    await new Promise((res, rej) => {
        addTx.oncomplete = res;
        addTx.onerror = rej;
    });

    localStorage.setItem(`cardsStored_${genre}`, "true");
    console.log(`IndexedDB updated with ${genre} card data`);
}

export async function getAllCardNamesByGenre(genre) {
    if (!dbInstance) dbInstance = await openDatabase();
    return new Promise((resolve, reject) => {
        const tx = dbInstance.transaction("cards", "readonly");
        const store = tx.objectStore("cards");

        const names = [];
        const request = store.openCursor();

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                if (cursor.value.genre === genre) {
                    names.push(cursor.value.name);
                }
                cursor.continue();
            } else {
                resolve(names);
            }
        };

        request.onerror = () => reject("Failed to get card names");
    });
}

export async function getAllCardsByGenre(genre) {
    if (!dbInstance) dbInstance = await openDatabase();
    return new Promise((resolve, reject) => {
        const tx = dbInstance.transaction("cards", "readonly");
        const store = tx.objectStore("cards");

        const cardMap = {};
        const request = store.openCursor();

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                if (cursor.value.genre === genre) {
                    cardMap[cursor.value.name] = cursor.value.imageUrl;
                }
                cursor.continue();
            } else {
                resolve(cardMap); // Return single object
            }
        };

        request.onerror = () => reject("Failed to get cards by genre");
    });
}



