import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { archetypeListPath } from '../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let archetypeList = [];

// Load archetype list from file
export async function loadArchetypeList() {
  try {
    const data = await fs.readFile(archetypeListPath, 'utf8');
    archetypeList = JSON.parse(data);
    console.log('Archetype list loaded.');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('No archetype list found. Starting fresh.');
      archetypeList = [];
    } else {
      console.error('Error loading archetype list:', err);
    }
  }
}

// Save archetype list to file
export async function saveArchetypeList() {
  try {
    await fs.writeFile(archetypeListPath, JSON.stringify(archetypeList, null, 2));
    console.log('Archetype list saved.');
  } catch (err) {
    console.error('Error saving archetype list:', err);
  }
}

// Sort helper
export function getSortedArchetypes() {
  return archetypeList.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}

// Route handler for archetype image upload
export async function handleArchetypeUpload(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const { archetypeName } = req.body;
  const imageUrl = '/assets/images/archetypes/' + req.file.filename;

  const index = archetypeList.findIndex(a => a.name === archetypeName);
  if (index !== -1) {
    archetypeList[index].imageUrl = imageUrl;
    try {
      await saveArchetypeList();
      return res.json({ success: true, imageUrl });
    } catch (err) {
      console.error('Failed to update archetype image:', err);
      return res.status(500).json({ success: false, message: 'Failed to save file' });
    }
  } else {
    // If no match found, delete the uploaded file
    await fs.unlink(req.file.path).catch(console.error);
    return res.status(404).json({ success: false, message: 'Archetype not found' });
  }
}

export function getArchetypes() {
  return archetypeList;
}

export function addArchetype(name) {
  if (!archetypeList.some(a => a.name === name)) {
    archetypeList.push({ name, imageUrl: null });
    return true;
  }
  return false;
}

export function addMultipleArchetypes(names) {
  let updated = false;
  names.forEach(name => {
    if (!archetypeList.some(a => a.name === name)) {
      archetypeList.push({ name, imageUrl: null });
      updated = true;
    }
  });
  return updated;
}

export function deleteArchetype(name) {
  const originalLength = archetypeList.length;
  archetypeList = archetypeList.filter(a => a.name !== name);
  return archetypeList.length < originalLength;
}

export function updateArchetypeImage(name, imageUrl) {
  const index = archetypeList.findIndex(a => a.name === name);
  if (index !== -1) {
    archetypeList[index].imageUrl = imageUrl;
    return true;
  }
  return false;
}


// Export list for external access if needed
export { archetypeList };
