import { useEffect, useRef } from 'react'

let htmlWarning: HTMLDivElement

export function showWarning(message: string) {
	htmlWarning.style.display = 'block'
	htmlWarning.innerText = message	
	setTimeout(()=>htmlWarning.style.display = 'none',3000)		
}

export default function Warning() {
	const refWarning = useRef<HTMLDivElement>(null)

	useEffect(() => {
		htmlWarning = refWarning.current!
	})

	return(
		<div ref={refWarning} id="warning"></div>
	)
}