'use client'
import { GetEntry } from "@/app/actions/sentences"
import Sentence from "@/app/components/Sentence"
import SentencePiece, { SentencePieceProps } from "@/app/components/SentencePiece"
import { useParams } from "next/navigation"
import { useState, useEffect } from "react"

export default function Entry() {
    const params = useParams()
    const [entry, setEntry] = useState<any>()
    console.log(params.id)
    useEffect(() => {
        GetEntry(params.id).then((val) => {
            console.log(val)
            
            if (val === undefined) {}
            else {
                let parts : any[] = []

                for(let i = 0; i < val.parts.length; i++) {
                    const p = val.parts[i]
                    const part = (
                        <SentencePiece 
                            variant={p.variant} 
                            speechPart={p.speechPart}
                            translation={p.translation}
                            phonetic={p.phonetics}
                        >
                            { p.word }
                        </SentencePiece>
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
        })
    }, [params.id])

    return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
        { entry }
    </main>
    )
}