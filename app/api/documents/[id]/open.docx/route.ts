// app/api/documents/[id]/open.docx/route.ts
import { NextRequest, NextResponse } from 'next/server'

// Redirects to the OS Word handler using ms-word protocol.
// It points Word to fetch the file via our download endpoint.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Build absolute URL to our download endpoint
    const url = new URL(request.url)
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host
    const proto = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '') || 'http'
    const base = `${proto}://${host}`
    // Serve via a .docx-suffixed path which improves Office protocol recognition
    const fileUrl = `${base}/api/documents/${id}/file.docx`
    const returnUrl = url.searchParams.get('return') || '/direct-hire'

    // ms-word protocol to open in Microsoft Word if available
    const officeUrl = `ms-word:ofe|u|${encodeURI(fileUrl)}`

    // Some browsers block direct custom-protocol redirects. Return lightweight HTML
    // that tries the protocol and falls back to opening the HTTP URL.
    const html = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Opening in Word...</title></head>
  <body>
    <script>
      (function(){
        var officeUrl = ${JSON.stringify(officeUrl)};
        var httpUrl = ${JSON.stringify(fileUrl)};
        var returnUrl = ${JSON.stringify(returnUrl)};
        var opened = false;
        try {
          // Attempt to open via protocol handler
          window.location.href = officeUrl;
          opened = true;
        } catch (e) {}
        // After a brief delay, return to the app to avoid a blank page
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
  } catch (error) {
    return NextResponse.json({ error: 'Failed to open document' }, { status: 500 })
  }
}


