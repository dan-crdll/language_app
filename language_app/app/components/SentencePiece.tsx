import { useState } from 'react'

export interface SentencePieceProps {
    children: React.ReactNode
    onClick?: () => void 
    variant?: 'noun' | 'verb' | 'adjective' | 'adverb' | 'other'
    speechPart?: 'subject' | 'object' | 'predicate' | 'other'
    hover?: boolean
    phonetic?: string | null
    translation?: string | null
}

export default function SentencePiece({
    children, 
    onClick, 
    variant, 
    speechPart,
    hover,
    phonetic,
    translation
} : SentencePieceProps) {
    const [showPhonetic, setShowPhonetic] = useState(false)
    
    let classes = "p-1 relative"
    
    switch(speechPart) {
        case 'subject': 
            classes = classes.concat(' bg-lime-50')
            break 
        case 'object':
            classes = classes.concat(' bg-amber-50')
            break 
        case 'predicate':
            classes = classes.concat(' bg-sky-50')
            break 
        default: break
    }
    
    const handleClick = () => {
        if (phonetic) {
            setShowPhonetic(!showPhonetic)
        }
        onClick?.()
    }
    
    return (
        <span
            className={`${classes} group cursor-pointer`}
            onClick={handleClick}
        >
            {phonetic && showPhonetic && (
                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-0.5 text-xs text-gray-600 whitespace-nowrap pointer-events-none">
                    {phonetic}
                </span>
            )}
            {children}
            {translation && (
                <span className="invisible group-hover:visible absolute left-0 top-full mt-1 bg-gray-800 text-white text-sm px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                    {translation}
                </span>
            )}
        </span>
    )
}