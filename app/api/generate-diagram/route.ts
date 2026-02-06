import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { validateTldrawShapes, createTldrawSnapshot } from '@/lib/tldraw-shapes'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 60000,
})

const DIAGRAM_SYSTEM_PROMPT = `You are a diagram generation assistant. Given a prompt and document context, generate a tldraw-compatible diagram as JSON.

Output ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "shapes": [
    {
      "type": "geo",
      "x": 0,
      "y": 0,
      "props": {
        "geo": "rectangle",
        "w": 200,
        "h": 80,
        "text": "Label text",
        "color": "black",
        "fill": "none"
      }
    },
    {
      "type": "arrow",
      "x": 200,
      "y": 40,
      "props": {
        "start": { "x": 0, "y": 0 },
        "end": { "x": 100, "y": 0 },
        "text": "",
        "color": "black"
      }
    },
    {
      "type": "text",
      "x": 0,
      "y": -40,
      "props": {
        "text": "Title",
        "color": "black",
        "size": "l"
      }
    }
  ]
}

Shape types:
- geo: rectangles, ellipses, diamonds, etc. Props: geo (rectangle|ellipse|diamond|triangle|cloud), w (width), h (height), text (label), color, fill (none|solid|semi)
- arrow: connecting arrows. Props: start {x,y}, end {x,y}, text (label on arrow), color
- text: standalone text. Props: text, color, size (s|m|l|xl)

Colors: black, blue, green, red, orange, yellow, violet, grey, light-blue, light-green, light-red, light-violet

Guidelines:
- Position shapes with logical x,y coordinates (origin at top-left)
- Use spacing of 50-100 pixels between shapes
- For flowcharts: rectangles for processes, diamonds for decisions, arrows connecting them
- For hierarchies: arrange vertically with arrows
- For formulas: use text shapes with mathematical symbols
- Keep diagrams clean and readable
- Center content around (0,0) to (600,400) area`

export async function POST(req: NextRequest) {
  try {
    const { prompt, documentContext } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: 'No prompt provided' }, { status: 400 })
    }

    const userMessage = `Create a diagram for: "${prompt}"

${documentContext ? `Document context for reference:\n${documentContext.slice(0, 1500)}` : ''}

Generate appropriate shapes for this content. Output only the JSON, no markdown code blocks.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      system: DIAGRAM_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const resultText =
      response.content[0]?.type === 'text' ? response.content[0].text : ''

    // Parse and validate the JSON
    let diagramData
    try {
      // Extract JSON from response (may have markdown code blocks)
      const jsonMatch = resultText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      diagramData = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse diagram JSON:', parseError, resultText)
      return NextResponse.json(
        { error: 'Invalid diagram format' },
        { status: 500 }
      )
    }

    // Validate and convert to tldraw snapshot
    const validatedShapes = validateTldrawShapes(diagramData.shapes || [])
    const snapshot = createTldrawSnapshot(validatedShapes)

    return NextResponse.json({ snapshot })
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error'
    console.error('Diagram generation error:', error)
    return NextResponse.json({ error }, { status: 500 })
  }
}
