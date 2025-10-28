"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleGenAI } from '@google/genai';
import { GetList, saveSentence, SentenceExists } from '../actions/sentences';
import Sentence from "@/app/components/Sentence"

async function request(ai: GoogleGenAI, text: string) {
    const system_prompt = `
    "Your role is to provide important information about a sentence."
    "For each separate word in the sentence you must provide a json object with the following fields:"
    "word: the word you are referring to" 
    "variant?: 'noun' | 'verb' | 'adjective' | 'adverb' | 'other'"
    "speechPart?: 'subject' | 'object' | 'predicate' | 'other'"
    "translation?: string | null"
    "phonetics?: string | null"
    For each speechpart many words can be part of it e.g. my car is broken the subject is both my and car and is broken is the predicate.
    You only need to return the json list containing all the various json objects referring to each word or piece of the provided text.
    
    For translation provide the single best translation according to the context, only for translatable words in the user language.
    For phonetics provide the phonetic for the word if necessary, e.g. for japanese write furigana for kanji words or for chinese write pinyin. Do not write any phonetic for 
    alphabets.

    The returned json must be in the format:
    {
        "translation": string # a traslation of the full sentence in the user language
        "parts": [] # list of the aftermentioned json objects
    }
    
    user language: ITA - IT
    The provided text is: 
    `
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: system_prompt.concat(text)
    })
    return response.text
}

function cleanJson(text: any) {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  
  return JSON.parse(cleaned);
}

function YourComponent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [sentenceList, setSentenceList] = useState<any[]>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const api_key = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
  const ai = new GoogleGenAI({ apiKey: api_key });

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [text]);

  useEffect(() => {
    GetList().then((ls) => {
      let parts: any[] = []
      for(let i = 0; i < ls.length; i++) {
        const part = (
          <div 
            className="w-full p-3 m-2 bg-sky-50 rounded-md border-1 border-sky-950 text-center justify-center content-center font-mono cursor-pointer"
            onClick={(e) => router.push('/entry/'.concat(ls[i].id))}
          >
            <h3 className="inline-block align-middle">
              { ls[i].sentence }
            </h3>
          </div>
        )
        parts.push(part)
      }
      setSentenceList(parts)
    })
  }, [])

  const handleElabora = async () => {
    setLoading(true);
    console.log('Frase inserita:', text);
    
    try {
      const exist = await SentenceExists(text);
      
      if (!exist.found) {
        const result = await request(ai, text);
        let clean_result = cleanJson(result);
        clean_result['sentence'] = text;
        
        const saveResult = await saveSentence(clean_result);

        let res = await SentenceExists(text);
        router.push('/entry/' + String(res.id));
      } else {
        console.log("Sentence already exist in the dataset, id: ", exist.id);
        router.push('/entry/' + String(exist.id));
      }
    } catch (error) {
      console.log('error', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Inserisci una frase..."
        className="border-solid border-2 border-gray-700 rounded-lg text-xl p-3 m-15 w-full max-w-2xl resize-none overflow-hidden"
        style={{ minHeight: '60px' }}
      />
      <button
        onClick={handleElabora}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4"
        style={{
          visibility: loading ? 'hidden' : 'visible'
        }}
      >
        Elabora Frase
      </button>

      <div role="status" style={{
        visibility: loading ? 'visible' : 'hidden'
      }}>
        <svg aria-hidden="true" className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-gray-600 dark:fill-gray-300" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
          <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
        </svg>
        <span className="sr-only">Loading...</span>
      </div>

      <hr className='bg-stone-950 w-sm w-full m-5' />

      <div className="flex flex-col w-full">
        { sentenceList }
      </div>
    </main>
  );
}

export default YourComponent;