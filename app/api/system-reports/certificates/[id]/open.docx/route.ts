// app/api/system-reports/certificates/[id]/open.docx/route.ts
import { NextRequest, NextResponse } from 'next/server'

// Returns lightweight HTML that triggers the ms-word protocol to open the DOCX in Microsoft Word.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const url = new URL(request.url)
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host
    const proto = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '') || 'http'
    const base = `${proto}://${host}`

    // Serve via a .docx-suffixed path which improves Office protocol recognition
    const fileUrl = `${base}/api/system-reports/certificates/${id}/file.docx`
    const returnUrl = url.searchParams.get('return') || '/system-reports'

    const officeUrl = `ms-word:ofe|u|${encodeURI(fileUrl)}`

    const html = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Opening in Word...</title></head>
  <body>
    <script>
      (function(){
        var officeUrl = ${JSON.stringify(officeUrl)};
        var returnUrl = ${JSON.stringify(returnUrl)};
        try { window.location.href = officeUrl; } catch (e) {}
        setTimeout(function(){
          try { window.location.replace(returnUrl); } catch (e) { window.location.href = returnUrl; }
        }, 800);
      })();
    </script>
    <div style="font-family:sans-serif;padding:16px;">
      Attempting to open in Microsoft Word...
      <div style="margin-top:8px;font-size:12px;color:#555;">
        If nothing happens, <a href="${fileUrl}">click here</a> to open/download, or <a href="${returnUrl}">go back</a>.
      </div>
    </div>
  </body>
  </html>`

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    })
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to open document' }, { status: 500 })
  }
}









