'use server';

import { JSONFilePreset } from 'lowdb/node';
import { v4 as uuidv4 } from 'uuid';

type Sentence = {
  id: string;
  sentence: string;
  translation: string;
  parts: any[];
};

export async function saveSentence(data: any) {
  const db = await JSONFilePreset<{sentences: Sentence[]}>('sentences_db.json', { sentences: [] });
  
  const { sentences } = db.data;
  
  // Check if sentence already exists
  if (!sentences.find((sentence) => sentence.sentence === data.sentence)) {
    data.id = uuidv4();
    db.data.sentences.push(data);
    await db.write();
    return { success: true, data };
  }
  
  return { success: false, message: 'Sentence already exists' };
}

export async function SentenceExists(text: any) {
  const db = await JSONFilePreset<{sentences: Sentence[]}>('sentences_db.json', { sentences: [] });
  
  const { sentences } = db.data;
  
  // Check if sentence already exists
  let f = sentences.find((sentence) => sentence.sentence === text)
  if (f) {
    return {found: true, id: f.id}
  }
  
  return {found: false, id: 0};
}

export async function GetEntry(id: any) {
    const db = await JSONFilePreset<{sentences: Sentence[]}>('sentences_db.json', { sentences: [] });
    const { sentences } = db.data
    let entry = sentences.find((sentence) => sentence.id === id)
    return entry
}

export async function GetList() {
  const db = await JSONFilePreset<{sentences: Sentence[]}>('sentences_db.json', { sentences: [] });
  const { sentences } = db.data
  return sentences
}