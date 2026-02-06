// Note: We generate shape IDs manually to avoid importing from tldraw
// which has React dependencies that can't run on the server

interface ShapeInput {
  type: 'geo' | 'arrow' | 'text'
  x: number
  y: number
  props: Record<string, unknown>
}

interface ValidatedShape {
  id: string
  typeName: 'shape'
  type: string
  x: number
  y: number
  rotation: number
  isLocked: boolean
  opacity: number
  props: Record<string, unknown>
  parentId: string
  index: string
  meta: Record<string, unknown>
}

// Generate a tldraw-compatible shape ID
function generateShapeId(index: number): string {
  // tldraw shape IDs are in the format "shape:xxx" where xxx is a random string
  const randomPart = Math.random().toString(36).substring(2, 15)
  return `shape:${randomPart}_${index}`
}

export function validateTldrawShapes(shapes: ShapeInput[]): ValidatedShape[] {
  return shapes.map((shape, index) => {
    const id = generateShapeId(index)

    const baseShape = {
      id,
      typeName: 'shape' as const,
      x: shape.x || 0,
      y: shape.y || 0,
      rotation: 0,
      isLocked: false,
      opacity: 1,
      parentId: 'page:page',
      index: `a${index}`,
      meta: {},
    }

    switch (shape.type) {
      case 'geo':
        return {
          ...baseShape,
          type: 'geo',
          props: {
            geo: shape.props?.geo || 'rectangle',
            w: shape.props?.w || 200,
            h: shape.props?.h || 100,
            color: shape.props?.color || 'black',
            fill: shape.props?.fill || 'none',
            dash: 'draw',
            size: 'm',
            text: shape.props?.text || '',
            align: 'middle',
            verticalAlign: 'middle',
            font: 'draw',
            labelColor: 'black',
            growY: 0,
            url: '',
            scale: 1,
          },
        }

      case 'arrow':
        return {
          ...baseShape,
          type: 'arrow',
          props: {
            color: shape.props?.color || 'black',
            fill: 'none',
            dash: 'draw',
            size: 'm',
            arrowheadStart: 'none',
            arrowheadEnd: 'arrow',
            text: shape.props?.text || '',
            labelColor: 'black',
            font: 'draw',
            start: shape.props?.start || { x: 0, y: 0 },
            end: shape.props?.end || { x: 100, y: 0 },
            bend: 0,
            scale: 1,
          },
        }

      case 'text':
        return {
          ...baseShape,
          type: 'text',
          props: {
            color: shape.props?.color || 'black',
            size: shape.props?.size || 'm',
            text: shape.props?.text || '',
            font: 'draw',
            textAlign: 'start',
            autoSize: true,
            scale: 1,
            w: 100,
          },
        }

      default:
        return {
          ...baseShape,
          type: 'geo',
          props: {
            geo: 'rectangle',
            w: 200,
            h: 100,
            color: 'black',
            fill: 'none',
            dash: 'draw',
            size: 'm',
            text: '',
            align: 'middle',
            verticalAlign: 'middle',
            font: 'draw',
            labelColor: 'black',
            growY: 0,
            url: '',
            scale: 1,
          },
        }
    }
  })
}

export function createTldrawSnapshot(shapes: ValidatedShape[]) {
  const store: Record<string, unknown> = {
    'document:document': {
      gridSize: 10,
      name: '',
      meta: {},
      id: 'document:document',
      typeName: 'document',
    },
    'page:page': {
      meta: {},
      id: 'page:page',
      name: 'Page 1',
      index: 'a1',
      typeName: 'page',
    },
  }

  for (const shape of shapes) {
    store[shape.id] = shape
  }

  return {
    store,
    schema: {
      schemaVersion: 2,
      sequences: {
        'com.tldraw.store': 4,
        'com.tldraw.asset': 1,
        'com.tldraw.camera': 1,
        'com.tldraw.document': 2,
        'com.tldraw.instance': 25,
        'com.tldraw.instance_page_state': 5,
        'com.tldraw.page': 1,
        'com.tldraw.instance_presence': 5,
        'com.tldraw.pointer': 1,
        'com.tldraw.shape': 4,
        'com.tldraw.asset.bookmark': 2,
        'com.tldraw.asset.image': 5,
        'com.tldraw.asset.video': 5,
        'com.tldraw.shape.arrow': 5,
        'com.tldraw.shape.bookmark': 2,
        'com.tldraw.shape.draw': 2,
        'com.tldraw.shape.embed': 4,
        'com.tldraw.shape.frame': 0,
        'com.tldraw.shape.geo': 9,
        'com.tldraw.shape.group': 0,
        'com.tldraw.shape.highlight': 1,
        'com.tldraw.shape.image': 4,
        'com.tldraw.shape.line': 5,
        'com.tldraw.shape.note': 8,
        'com.tldraw.shape.text': 2,
        'com.tldraw.shape.video': 2,
        'com.tldraw.binding.arrow': 0,
      },
    },
  }
}
