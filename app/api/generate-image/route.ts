import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { prompt, documentContext } = await req.json()

  const enhancedPrompt = `Create a small, clean inline illustration for a blog post/article. Style: minimal, modern, slightly whimsical. Context from the document: "${documentContext?.slice(0, 500)}". Image prompt: ${prompt}`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: enhancedPrompt }],
          },
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    console.error('[generate-image] API error:', err)
    return NextResponse.json({ error: err }, { status: res.status })
  }

  const data = await res.json()

  // Extract image from Gemini response — check both inlineData and file_data formats
  const parts = data.candidates?.[0]?.content?.parts ?? []
  const imagePart = parts.find((p: any) => p.inlineData || p.inline_data)

  if (!imagePart) {
    console.error('[generate-image] No image part in response:', JSON.stringify(parts.map((p: any) => Object.keys(p))))
    return NextResponse.json(
      { error: 'No image generated', parts: parts.map((p: any) => Object.keys(p)) },
      { status: 500 }
    )
  }

  const inlineData = imagePart.inlineData || imagePart.inline_data
  const { mimeType, data: b64 } = inlineData
  const dataUrl = `data:${mimeType};base64,${b64}`

  return NextResponse.json({ url: dataUrl })
}
