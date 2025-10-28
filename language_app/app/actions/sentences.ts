'use server';

import { JSONFilePreset } from 'lowdb/node';
import { v4 as uuidv4 } from 'uuid';

type GrammarCard = {
  id: string;
  selectedText: string;
  explanation: string;
  parts: {
    word: string;
    variant: string;
    speechPart: string;
    translation: string;
    phonetic: string;
    index: number;
  }[];
};

type Sentence = {
  id: string;
  sentence: string;
  translation: string;
  parts: any[];
  grammarCards?: GrammarCard[];
};

// Tipi di ritorno più specifici
type SaveGrammarCardSuccess = {
  success: true;
  data: GrammarCard;
};

type SaveGrammarCardError = {
  success: false;
  message: string;
};

type SaveGrammarCardResult = SaveGrammarCardSuccess | SaveGrammarCardError;

type DeleteGrammarCardSuccess = {
  success: true;
};

type DeleteGrammarCardError = {
  success: false;
  message: string;
};

type DeleteGrammarCardResult = DeleteGrammarCardSuccess | DeleteGrammarCardError;

export async function saveSentence(data: any) {
  const db = await JSONFilePreset<{sentences: Sentence[]}>('sentences_db.json', { sentences: [] });
  
  const { sentences } = db.data;
  
  // Check if sentence already exists
  if (!sentences.find((sentence) => sentence.sentence === data.sentence)) {
    data.id = uuidv4();
    data.grammarCards = [];
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

// Nuova funzione per salvare una grammar card
export async function saveGrammarCard(
  sentenceId: string, 
  grammarCard: Omit<GrammarCard, 'id'>
): Promise<SaveGrammarCardResult> {
  const db = await JSONFilePreset<{sentences: Sentence[]}>('sentences_db.json', { sentences: [] });
  
  const { sentences } = db.data;
  const sentenceIndex = sentences.findIndex((sentence) => sentence.id === sentenceId);
  
  if (sentenceIndex === -1) {
    return { success: false, message: 'Sentence not found' };
  }
  
  // Inizializza grammarCards se non esiste
  if (!sentences[sentenceIndex].grammarCards) {
    sentences[sentenceIndex].grammarCards = [];
  }
  
  // Crea la nuova card con un ID
  const newCard: GrammarCard = {
    id: uuidv4(),
    ...grammarCard
  };
  
  sentences[sentenceIndex].grammarCards!.push(newCard);
  
  await db.write();
  
  return { success: true, data: newCard };
}

// Nuova funzione per eliminare una grammar card
export async function deleteGrammarCard(
  sentenceId: string, 
  cardId: string
): Promise<DeleteGrammarCardResult> {
  const db = await JSONFilePreset<{sentences: Sentence[]}>('sentences_db.json', { sentences: [] });
  
  const { sentences } = db.data;
  const sentenceIndex = sentences.findIndex((sentence) => sentence.id === sentenceId);
  
  if (sentenceIndex === -1) {
    return { success: false, message: 'Sentence not found' };
  }
  
  if (!sentences[sentenceIndex].grammarCards) {
    return { success: false, message: 'No grammar cards found' };
  }
  
  sentences[sentenceIndex].grammarCards = sentences[sentenceIndex].grammarCards!.filter(
    (card) => card.id !== cardId
  );
  
  await db.write();
  
  return { success: true };
}