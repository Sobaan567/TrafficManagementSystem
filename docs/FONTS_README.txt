╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                    🎨 FONTS INSTALLATION GUIDE 🎨                          ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

FONTS REQUIRED FOR TRAFFIC MANAGEMENT SYSTEM

The system uses 2 professional fonts for the Neo-Brutalist design:

1. DELA GOTHIC ONE (Display Font)
   - Used for: All headings, titles, large text
   - Weight: 400 (Regular)
   - License: Open Source (Free)
   - Download: https://fonts.google.com/specimen/Dela+Gothic+One

2. SPACE GROTESK (Body Font)
   - Used for: Body text, navigation, forms
   - Weights: 300, 400, 500, 600, 700
   - License: Open Source (Free)
   - Download: https://fonts.google.com/specimen/Space+Grotesk

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTALLATION OPTIONS:

OPTION 1: Google Fonts CDN (Recommended - Already Configured)
───────────────────────────────────────────────────────────────
The fonts are already imported via Google Fonts CDN in neo-brutalist.css:

@import url('https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

No additional setup needed! The fonts load automatically from Google's servers.


OPTION 2: Self-Hosted Fonts (For Offline Use)
───────────────────────────────────────────────────────────────
If you want to host fonts locally:

1. Download font files from Google Fonts
2. Create: frontend/src/assets/fonts/
3. Place font files in that folder
4. Update css imports:

@font-face {
  font-family: 'Dela Gothic One';
  src: url('/fonts/DelaGothicOne-Regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
}

@font-face {
  font-family: 'Space Grotesk';
  src: url('/fonts/SpaceGrotesk-Regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
}

@font-face {
  font-family: 'Space Grotesk';
  src: url('/fonts/SpaceGrotesk-Bold.ttf') format('truetype');
  font-weight: 700;
  font-style: normal;
}


OPTION 3: System Font Fallback
───────────────────────────────────────────────────────────────
If fonts don't load, the system falls back to:
- Display: Arial Black, sans-serif
- Body: Courier New, monospace

This maintains readability while fonts load.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FONT FILE STRUCTURE (If Self-Hosting):

frontend/src/assets/
├── fonts/
│   ├── DelaGothicOne-Regular.ttf ............. Display font
│   ├── SpaceGrotesk-Light.ttf ............... Body font (300)
│   ├── SpaceGrotesk-Regular.ttf ............. Body font (400)
│   ├── SpaceGrotesk-Medium.ttf .............. Body font (500)
│   ├── SpaceGrotesk-SemiBold.ttf ............ Body font (600)
│   └── SpaceGrotesk-Bold.ttf ................ Body font (700)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CURRENT CONFIGURATION (Default):

The system is configured to use Google Fonts CDN (OPTION 1).
Fonts load automatically with zero additional setup required.

Benefits:
✅ No local file storage needed
✅ Always latest version
✅ Cached by browsers
✅ Fast global CDN
✅ Zero maintenance

To verify fonts are loading:
1. Open browser DevTools (F12)
2. Go to Network tab
3. Search for "googleapis" or "gstatic"
4. You should see font requests loading

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BACKUP FONTS (If Google Fonts Unavailable):

If Google Fonts CDN is blocked or unavailable, the system gracefully falls back to:

For Display (Headings):
- Arial Black
- Impact
- Trebuchet MS
- sans-serif (system default)

For Body Text:
- Courier New
- Consolas
- Monaco
- monospace (system default)

The page will remain readable with fallback fonts while maintaining layout.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FONT LICENSING:

Both fonts are open source and free to use:

DELA GOTHIC ONE
License: Open Font License (OFL)
Designer: Panos Vassiliou
Free for: Personal & Commercial use

SPACE GROTESK
License: Open Font License (OFL)
Designer: Collin Ford
Free for: Personal & Commercial use

No attribution required, but appreciated.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CSS VARIABLE DEFINITIONS:

In neo-brutalist.css, fonts are defined as CSS variables:

:root {
  --font-display: 'Dela Gothic One', sans-serif;
  --font-body: 'Space Grotesk', monospace;
  --font-mono: 'Courier New', monospace;
}

Usage in CSS:
h1 { font-family: var(--font-display); }
p { font-family: var(--font-body); }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FONT WEIGHTS USED:

DELA GOTHIC ONE: 400 (Regular only)
SPACE GROTESK: 300, 400, 500, 600, 700
Fallback: 400 (Regular)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NO ADDITIONAL ACTION REQUIRED!

Fonts load automatically from Google Fonts CDN.
The system works out of the box.

If you want to self-host fonts for offline use, follow OPTION 2 above.

═══════════════════════════════════════════════════════════════════════════════
