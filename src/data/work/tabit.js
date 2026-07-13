// tabIt case study — sources: tabIt repo README.md, PRODUCT.md, DESIGN.md
// (~/PortfolioProjects/tabIt) and Paolo's direction on the local-first
// backend decision. Hero clip is a self-hosted Cap recording of the real
// extension; the app and extension are both renderers of one chart JSON.

export default {
  id: 'tabit',
  chapters: [
    {
      kicker: 'problem',
      title: "the tab you want doesn't exist",
      shape: 'poster',
      media: {
        type: 'video',
        src: '/work/tabit-demo.mp4',
        poster: '/work/tabit-demo-poster.jpg',
        caption: 'the extension following "just a song" — click "♪ get chords", play along',
      },
      blocks: [
        {
          type: 'prose',
          heading: 'the itch',
          body: `
a song grabs you and you want to play along right now — but the tab is paywalled, wrong, or simply doesn't exist. chord sites can only offer what someone took the time to transcribe, and plenty of what you'd love to play has no tab anywhere: an unreleased song, a live take, a friend's demo, your own recording.

tabit lives inside that moment. paste a youtube url (or drop an audio file) and it detects the chords, key, and scales from the audio itself, then follows along under the video karaoke-style — guitar still in hand. because it reads the audio instead of a database, you can play along to practically anything.`,
        },
      ],
    },
    {
      kicker: 'process',
      title: 'three layers, one contract',
      shape: 'long',
      blocks: [
        {
          type: 'image',
          src: '/work/tabit-pipeline.png',
          fullSrc: '/work/tabit-pipeline.png',
          alt: 'tabIt processing pipeline: a YouTube URL or audio file is ingested, Demucs separates stems on the GPU, the crema chord model runs on the harmonic mix while CREPE tracks the isolated bass, and the two reconcile into slash chords like A/C#; librosa finds beats and tempo and Essentia the key; post-processing emits a chart JSON rendered by both a React web app and the Chrome extension',
          caption: 'audio in, chart json out — the web app and the extension are just renderers',
        },
        {
          type: 'prose',
          heading: 'the pipeline',
          body: `
three layers share one contract — the chart json — and the web app and the chrome extension are both just renderers of it.

the engine (python) turns audio into chords, key, suggested scales, and a beat grid. demucs splits the track into stems; the crema chord model runs on the drums-removed harmonic mix while a crepe pitch tracker follows the isolated bass. reconciling the two is what lets tabit emit slash chords like A/C# — inversions most tools skip entirely. librosa handles beats and tempo, essentia the key.

everything lands in one json file. the react web app renders it as a full paper sheet; the mv3 extension renders the same data as a beat ribbon that embeds under the youtube player.`,
        },
      ],
    },
    {
      kicker: 'the decision',
      title: 'your machine, not the cloud',
      shape: 'long',
      blocks: [
        {
          type: 'image',
          src: '/work/tabit-local-first.png',
          fullSrc: '/work/tabit-local-first.png',
          alt: 'two backend architectures compared. rejected — cloud backend: extension to a data-center API to yt-dlp, suffering a shared-queue that congests under load, YouTube blocking data-center IPs, and paid GPU scaling. chosen — local helper: extension to a localhost background login service, installed with one curl command, using a residential IP for clean YouTube pulls, running on the full local GPU with detection stages in parallel, and private, free, and queue-free',
          caption: "the backend runs on the listener's own machine, not a shared server",
        },
        {
          type: 'prose',
          heading: 'why local-first',
          body: `
the extension needs a heavy pipeline behind it — source separation plus two neural models. the reflexive answer is a cloud backend. tabit does the opposite: the backend runs on the listener's own machine, installed with a single curl command as a background service that starts at login.

it isn't just cheaper, it's better. there's no shared server to congest — each person's requests run on their own hardware, often faster than a shared box would allow. youtube throttles and blocks downloads coming from data-center ips, but a request from a residential machine pulls clean. and a modern laptop, especially an apple-silicon macbook, has a gpu for source separation and enough cores to run the detection stages in parallel, with models kept warm between songs.

the honest cost is install friction. tabit pays it down: one installer provisions everything, the service self-manages (tabit status / logs / restart), and when the helper is off the extension says so plainly and recovers on its own once it's back.`,
        },
      ],
    },
    {
      kicker: 'the hard parts',
      title: "honest about what it doesn't know",
      shape: 'long',
      detour: true,
      blocks: [
        {
          type: 'prose',
          heading: 'confidence, surfaced',
          body: `
chord detection is genuinely hard. the state of the art sits around 72% on seventh chords, and human experts only agree about 54% of the time on the complex ones. a tool that hides that uncertainty behind confident-looking output is quietly lying.

tabit doesn't. low-confidence chords render visibly softer, with a dotted underline — present, but flagged as a guess. nothing is hidden or faked. if a chord is wrong, click it and correct it; your edit persists locally. uncertainty is treated as information for the player, not a failure to paper over.`,
        },
        {
          type: 'image',
          src: '/work/tabit-extension.png',
          fullSrc: '/work/tabit-extension.png',
          alt: 'the tabIt sheet embedded under a youtube video: a wordmark, then a row of chord cells — Gmaj7/D#, C7, and a dimmed Dmaj7 — with an amber highlighter on the current beat, confidence pips beneath the current chord, and key, tempo, scale, and transpose controls above',
          caption: 'the beat ribbon under the player — a slash chord, the amber sweep, and a dimmed low-confidence chord',
        },
      ],
    },
    {
      kicker: 'solution',
      title: 'paste a song, play along',
      shape: 'text-poster',
      blocks: [
        {
          type: 'highlights',
          items: [
            'mir engine, react web app, and mv3 chrome extension — all rendering one shared chart json',
            'slash-chord inversions (A/C#) from harmonic-mix chords reconciled with isolated-bass pitch tracking',
            '~36s of compute for a 3.5-min song on apple silicon · instant on every repeat from disk cache',
            'one-line macos installer provisions python 3.11, a static ffmpeg, and model weights as a login service',
            'real-song chord-accuracy benchmark harness (mir_eval scorer) to track quality honestly',
          ],
        },
        {
          type: 'prose',
          heading: 'where it is',
          body: `
built end-to-end — engine, api, web app, and extension — as one play-along product. it's in active development, but already good enough to sit down and play with: paste a song, wait briefly the first time, and the chords follow you. it's the tool i wanted every time a song grabbed me and the tab wasn't there.`,
        },
      ],
    },
  ],
};
