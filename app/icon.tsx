import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// Route segment config
export const runtime = 'nodejs'

// Image metadata
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Image generation
export default async function Icon() {
  // Load the Modak font from the public directory
  const fontData = await readFile(
    join(process.cwd(), 'public/fonts/Modak-Regular.ttf')
  )

  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          fontSize: 39, // Size adjusted for circular container

          fontFamily: 'Modak',
          lineHeight: 1,
          borderRadius: '50%',
          color: '#ff3939',
          paddingTop: 2, // Fine-tuned centering
        }}
      >
        a!
      </div>
    ),
    // ImageResponse options
    {
      // For convenience, we can re-use the exported icons size metadata
      // config to also set the ImageResponse's width and height.
      ...size,
      fonts: [
        {
          name: 'Modak',
          data: fontData,
          style: 'normal',
          weight: 100,
        },
      ],
    }
  )
}
