import { useState } from 'react'

interface SentenceProps {
    children: React.ReactNode
    translation?: string
}

export default function Sentence({
    children, 
    translation
} : SentenceProps) {
    const [isLocked, setIsLocked] = useState(false)
    const [isHovered, setIsHovered] = useState(false)

    const handleClick = () => {
        setIsLocked(!isLocked)
    }

    const showTranslation = isLocked || isHovered

    if (!translation) {
        return (
            <div className="flex flex-col">
                <h3 className="font-mono text-4xl text-center font-bold">
                    {children}
                </h3>
            </div>
        )
    }

    return (
        <div className="flex flex-col">
            <h3 className="font-mono text-4xl text-center font-bold">
                {children}
            </h3>
            <div 
                className="relative mt-4 text-center w-full p-1 cursor-pointer"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={handleClick}
            >
                <h5 
                    className={`italic transition-all duration-300 ${
                        showTranslation 
                            ? 'text-stone-950 blur-none' 
                            : 'text-stone-950 blur-sm select-none'
                    }`}
                >
                    {translation}
                </h5>
            </div>
        </div>
    )
}