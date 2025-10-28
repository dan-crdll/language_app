'use client'
import { GetEntry, saveGrammarCard, deleteGrammarCard } from "@/app/actions/sentences"
import Sentence from "@/app/components/Sentence"
import SentencePiece from "@/app/components/SentencePiece"
import { useParams } from "next/navigation"
import { useState, useEffect } from "react"
import { GoogleGenAI } from '@google/genai'
import ReactMarkdown from 'react-markdown'

interface SelectedPart {
    word: string
    variant: string
    speechPart: string
    translation: string
    phonetic: string
    index: number
}

interface GrammarCard {
    id?: string
    selectedText: string
    explanation: string
    parts: SelectedPart[]
}

function cleanJson(text: any) {
    try {
        // Rimuovi markdown code blocks
        let cleaned = text
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/```\s*$/g, '')
            .trim();

        // Rimuovi eventuali caratteri non stampabili
        cleaned = cleaned.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '');

        // Fix per newline non escaped correttamente
        // Sostituisci newline letterali all'interno delle stringhe JSON
        cleaned = cleaned.replace(/(?<!\\)\n(?=(?:[^"]*"[^"]*")*[^"]*"[^"]*$)/g, '\\n');
        
        // Fix per tab non escaped
        cleaned = cleaned.replace(/\t/g, '\\t');

        // Prova il parsing
        return JSON.parse(cleaned);
    } catch (error) {
        console.error("Errore nel primo tentativo di parsing:", error);
        
        // Secondo tentativo: cerca solo il JSON object
        try {
            const text_str = String(text);
            const jsonMatch = text_str.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                let jsonStr = jsonMatch[0];
                
                // Pulizia aggressiva
                jsonStr = jsonStr
                    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '')
                    .replace(/\r\n/g, '\\n')
                    .replace(/\r/g, '\\n')
                    .replace(/\n/g, '\\n')
                    .replace(/\t/g, '\\t');

                return JSON.parse(jsonStr);
            }
        } catch (error2) {
            console.error("Errore nel secondo tentativo di parsing:", error2);
        }

        throw new Error("Impossibile parsare la risposta JSON");
    }
}

async function requestGrammarExplanation(
    ai: GoogleGenAI, 
    sentence: string, 
    selectedParts: SelectedPart[],
    retryCount = 0
): Promise<{ explanation: string }> {
    const maxRetries = 2;
    
    const system_prompt = `
Sei un esperto insegnante di lingue. Analizza grammaticalmente le parti selezionate della seguente frase.

Frase completa: "${sentence}"

Parti selezionate:
${selectedParts.map(p => `- "${p.word}" (${p.speechPart}, ${p.variant})`).join('\n')}

Fornisci una spiegazione grammaticale in italiano che:
1. Spiega la grammatica principale dietro la parte evidenziata della frase
2. usa esempi se necessari per una migliore comprensione della frase
3. spiega come le varie parti evidenziate interagiscono tra di loro
4. usa uno stile chiaro e didattico senza troppa verbosità ma mantenendo una completezza e accuratezza

Usa la formattazione markdown per rendere la spiegazione più chiara (liste, grassetto, corsivo, ecc) non 
usare gli headings markdown.

La risposta deve avere la seguente struttura:
- introduzione alla frase selezionata, con significato e tipo di regola grammaticale (**Introduzione**)
- spiegazione della regola grammaticale complessiva in modo dettagliato e con esempi (**Grammatica**)
- spiegazione meno dettagliata delle singole parti, con una lista dove ogni elemento è una parte (**Singole Parti**)

IMPORTANTE: Rispondi SOLO con un JSON valido nel formato seguente, senza caratteri speciali non escaped:
{
    "explanation": "La tua spiegazione qui"
}

Assicurati di escapare correttamente tutti i caratteri speciali nel JSON (newline come \\n, quote come \\", backslash come \\\\).
`

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: system_prompt,
        });

        console.log("Risposta raw:", response.text);
        
        const result = cleanJson(response.text);
        
        // Verifica che abbiamo effettivamente una spiegazione
        if (!result || !result.explanation || result.explanation.trim().length === 0) {
            throw new Error("Spiegazione vuota ricevuta");
        }

        return result;
        
    } catch (error) {
        console.error(`Errore nel tentativo ${retryCount + 1}:`, error);
        
        if (retryCount < maxRetries) {
            console.log(`Riprovo... (tentativo ${retryCount + 2}/${maxRetries + 1})`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Aspetta 1 secondo
            return requestGrammarExplanation(ai, sentence, selectedParts, retryCount + 1);
        }
        
        // Se tutti i tentativi falliscono, lancia un errore user-friendly
        throw new Error(
            "Non è stato possibile generare la spiegazione grammaticale. " +
            "Per favore riprova."
        );
    }
}

export default function Entry() {
    const params = useParams()
    const [entry, setEntry] = useState<any>()
    const [showGrammarMode, setShowGrammarMode] = useState(false)
    const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([])
    const [grammarCards, setGrammarCards] = useState<GrammarCard[]>([])
    const [isGenerating, setIsGenerating] = useState(false)
    const [entryData, setEntryData] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    const api_key = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || ''
    const ai = new GoogleGenAI({ apiKey: api_key })

    useEffect(() => {
        GetEntry(params.id).then((val) => {
            if (val === undefined) return
            
            setEntryData(val)
            if (val.grammarCards) {
                setGrammarCards(val.grammarCards)
            }
            renderEntry(val)
        }).catch(err => {
            console.error("Errore nel caricamento dell'entry:", err)
            setError("Errore nel caricamento dei dati")
        })
    }, [params.id, showGrammarMode, selectedParts])

    const renderEntry = (val: any) => {
        const parts: any[] = []
        
        for(let i = 0; i < val.parts.length; i++) {
            const p = val.parts[i]
            const isSelected = showGrammarMode && selectedParts.some(sp => sp.index === i)
            
            const part = (
                <span 
                    key={i}
                    className={`inline-block transition-all duration-150 ${
                        showGrammarMode ? 'cursor-pointer hover:bg-gray-100 rounded-sm' : ''
                    } ${
                        isSelected ? 'bg-gray-200 rounded-sm' : ''
                    }`}
                    onClick={showGrammarMode ? () => handlePartClick(p, i) : undefined}
                >
                    <SentencePiece 
                        variant={p.variant} 
                        speechPart={p.speechPart}
                        translation={p.translation}
                        phonetic={p.phonetics}
                    >
                        { p.word }
                    </SentencePiece>
                </span>
            )
            parts.push(part)
        }
        
        const sentence = (
            <Sentence translation={val.translation}>
                { parts }
            </Sentence>
        )
        setEntry(sentence)
    }

    const handlePartClick = (part: any, index: number) => {
        const partData: SelectedPart = {
            word: part.word,
            variant: part.variant,
            speechPart: part.speechPart,
            translation: part.translation,
            phonetic: part.phonetics,
            index: index
        }

        setSelectedParts(prev => {
            const exists = prev.some(p => p.index === index)
            if (exists) {
                return prev.filter(p => p.index !== index)
            } else {
                return [...prev, partData]
            }
        })
    }

    const handleGenerateGrammar = async () => {
        if (selectedParts.length === 0) {
            alert("Seleziona almeno una parte della frase")
            return
        }

        setIsGenerating(true)
        setError(null)
        
        try {
            const result = await requestGrammarExplanation(
                ai, 
                entryData.sentence || entryData.translation, 
                selectedParts
            )

            console.log("Risultato finale:", result)
            
            const selectedText = selectedParts
                .sort((a, b) => a.index - b.index)
                .map(p => p.word)
                .join(' ')

            const newCard: Omit<GrammarCard, 'id'> = {
                selectedText,
                explanation: result.explanation,
                parts: [...selectedParts]
            }

            const saveResult = await saveGrammarCard(entryData.id, newCard)
            
            if (saveResult.success) {
                setGrammarCards(prev => [...prev, saveResult.data])
                setSelectedParts([])
                setShowGrammarMode(false)
            } else {
                throw new Error("Errore nel salvataggio")
            }
            
        } catch (error: any) {
            console.error("Errore nella generazione:", error)
            const errorMessage = error.message || "Errore nella generazione della spiegazione grammaticale"
            setError(errorMessage)
            alert(errorMessage)
        } finally {
            setIsGenerating(false)
        }
    }

    const handleCancelGrammarMode = () => {
        setShowGrammarMode(false)
        setSelectedParts([])
        setError(null)
    }

    const handleDeleteCard = async (cardId: string) => {
        if (!confirm("Sei sicuro di voler eliminare questa spiegazione?")) {
            return
        }

        try {
            const result = await deleteGrammarCard(entryData.id, cardId)
            
            if (result.success) {
                setGrammarCards(prev => prev.filter(card => card.id !== cardId))
            } else {
                throw new Error("Errore nell'eliminazione")
            }
        } catch (error: any) {
            console.error("Errore nell'eliminazione:", error)
            alert(error.message || "Errore nell'eliminazione della spiegazione")
        }
    }

    return (
        <main className="flex min-h-screen flex-col items-center p-8 md:p-24">
            <div className="w-full max-w-3xl">
                {entry}
                
                {error && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                        {error}
                    </div>
                )}
                
                {!showGrammarMode ? (
                    <button 
                        onClick={() => setShowGrammarMode(true)}
                        className="mt-8 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                    >
                        + Aggiungi analisi grammaticale
                    </button>
                ) : (
                    <div className="mt-8 p-4 bg-gray-50 rounded border border-gray-200">
                        <p className="text-sm text-gray-600 mb-4">
                            Seleziona le parti della frase da analizzare
                        </p>
                        
                        {selectedParts.length > 0 && (
                            <div className="mb-4 p-3 bg-white rounded border border-gray-200">
                                <div className="flex flex-wrap gap-2">
                                    {selectedParts
                                        .sort((a, b) => a.index - b.index)
                                        .map((part) => (
                                            <span 
                                                key={part.index}
                                                className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                                            >
                                                {part.word}
                                            </span>
                                        ))
                                    }
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button 
                                onClick={handleGenerateGrammar}
                                disabled={isGenerating || selectedParts.length === 0}
                                className="px-4 py-2 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isGenerating ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Generazione...
                                    </>
                                ) : "Genera"}
                            </button>
                            
                            <button 
                                onClick={handleCancelGrammarMode}
                                disabled={isGenerating}
                                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors disabled:bg-gray-200 disabled:cursor-not-allowed"
                            >
                                Annulla
                            </button>
                        </div>
                    </div>
                )}

                {grammarCards.length > 0 && (
                    <div className="mt-8 space-y-6">
                        {grammarCards.map((card) => (
                            <div 
                                key={card.id}
                                className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm relative group"
                            >
                                <button
                                    onClick={() => card.id && handleDeleteCard(card.id)}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Elimina"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                
                                <h3 className="text-base font-medium mb-4 text-gray-900 pr-8">
                                    {card.selectedText}
                                </h3>
                                
                                <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700">
                                    <ReactMarkdown
                                        components={{
                                            ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1" {...props} />,
                                            ol: ({node, ...props}) => <ol className="list-decimal pl-5 space-y-1" {...props} />,
                                            li: ({node, ...props}) => <li className="text-gray-700" {...props} />,
                                            p: ({node, ...props}) => <p className="mb-3 text-gray-700 leading-relaxed" {...props} />,
                                            strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                                            em: ({node, ...props}) => <em className="italic text-gray-800" {...props} />,
                                            h3: ({node, ...props}) => <h3 className="text-sm font-semibold text-gray-900 mt-4 mb-2" {...props} />,
                                            h4: ({node, ...props}) => <h4 className="text-sm font-medium text-gray-800 mt-3 mb-2" {...props} />,
                                        }}
                                    >
                                        {card.explanation}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    )
}