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

    for (const name in data) {
        store.put({
            id: `${genre}::${name}`,
            genre,
            name,
            imageUrl: data[name]
        });
    }

    await new Promise((res, rej) => {
        tx.oncomplete = res;
        tx.onerror = rej;
    });

    localStorage.setItem(`cardsStored_${genre}`, "true");
    console.log(`IndexedDB initialized with ${genre} card data`);
}

export async function getCardByName(genre, name) {
    if (!dbInstance) dbInstance = await openDatabase();
    const id = `${genre}::${name}`;

    return new Promise((resolve, reject) => {
        const tx = dbInstance.transaction("cards", "readonly");
        const store = tx.objectStore("cards");
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject("Card not found");
    });
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



