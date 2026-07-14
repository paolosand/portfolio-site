// CHULOOPA case study — sources: AIMC 2026 paper ("Loops That Listen:
// A Voice-Controlled Dynamic Drum Looper with AI Variation") and
// interview with Paolo, 2026-07-08. Chapter layer added 2026-07-09 for the
// folding-deck layout; block content unchanged.

export default {
  id: 'chuloopa',
  chapters: [
    {
      kicker: 'problem',
      title: 'static loops are dead air',
      shape: 'poster',
      media: {
        type: 'image',
        src: '/work/chuloopa-active.png',
        fullSrc: '/work/chuloopa-active.png',
        alt: "CHULOOPA's live ChuGL interface: a glowing yellow icosahedron pulsing on the beat, with an ECHO/VAR header, a STATE: Var 2/5 readout, and a GTR | VOX indicator — polyhedron shape and color encode the current variation state",
        caption: 'the live chugl view — polyhedron and color track the variation state',
      },
      blocks: [
        {
          type: 'prose',
          heading: 'the itch',
          body: `
a loop's greatest strength is also its main constraint: once recorded, it never changes. i wanted more energy in my live sets than static loops could offer — the ability to quickly throw down a drum beat with my voice and have it play back in a way that's interesting and dynamic, the way a live drummer adds fills, varies dynamics, and shifts the groove to match the moment.

chuloopa (chuck-based loop operator for performance audio) is the answer: a voice-controlled drum looper that listens to the room and varies the loop in response.`,
        },
      ],
    },
    {
      kicker: 'process',
      title: 'beatbox in, variations out',
      shape: 'long',
      blocks: [
        {
          type: 'image',
          src: '/work/chuloopa-system-diagram.png',
          fullSrc: '/work/chuloopa-system-diagram.png',
          alt: 'CHULOOPA system architecture: variant generator (python), variant controller and main looper (chuck), with OSC and MIDI signal paths into Ableton Live',
          caption: 'the full system diagram, from the aimc 2026 paper',
        },
        {
          type: 'prose',
          heading: 'how it works',
          body: `
you beatbox a pattern. a knn classifier — trained on ten examples each of your own kick, snare, and hi-hat, in under two minutes — transcribes every onset in real time (~25 ms input-to-playback) and routes midi to a drum rack in ableton live.

the moment a loop is committed, a 4.8m-parameter grid transformer generates five variations in parallel at increasing sampling temperatures, then sorts them by deviation from the original into a predictable conservative-to-adventurous spectrum.

meanwhile a separate process measures the live audio energy every 500 ms and maps it to a value called spice (0.0–1.0). at each loop boundary, the current spice level drives a weighted draw from the variation bank — quiet passages favor the original pattern, building energy pulls toward wilder variations. no pedal, no menu, no manual toggle.`,
        },
      ],
    },
    {
      kicker: 'the hard parts',
      title: 'three processes, one groove',
      shape: 'long',
      detour: true,
      blocks: [
        {
          type: 'prose',
          body: `
getting chuck and python to cooperate in real time — three concurrent processes coordinated entirely over osc, with per-session ids validating every scheduled hit so nothing overlaps during transitions.

teaching the system my voice: generic drum-sound datasets don't survive contact with one person's beatboxing, so the classifier is personalized by design — you record your own kick, snare, and hat as a setup ritual, and it trains in under a second.

and the hardest question: how do you evaluate a variation? each variant has to keep the main groove intact while meaningfully departing from it. the answer became deviation sorting — density change first, new drum voices as tiebreaker — so slot 1 is always the most conservative take and slot 5 the most adventurous, no matter which temperature produced it.`,
        },
        {
          type: 'video',
          videoId: 'gqVEtp37bXs',
          orientation: 'portrait',
          caption: 'demo · spice-driven selection live',
        },
      ],
    },
    {
      kicker: 'solution',
      title: 'loops that listen',
      shape: 'text-poster',
      blocks: [
        {
          type: 'highlights',
          items: [
            '4.8m-param grid transformer · trained on 12,085 bar pairs (expanded groove midi dataset)',
            '~25 ms beatbox-to-playback latency · mfcc-13 knn trains in under a second',
            '82.5% of input hit positions preserved at low spice · 5.4 → 12.7 hits/bar across the spice axis',
            'full variation bank generated in 3–5 s, entirely offline, on consumer cpu',
            'accepted to aimc 2026 · berlin · september 2026',
          ],
        },
        {
          type: 'prose',
          heading: 'where it landed',
          body: `
built solo over about a year as my mfa thesis at calarts, advised by ajay kapur and jake cheng. the paper — "loops that listen: a voice-controlled dynamic drum looper with ai variation" — was accepted to aimc 2026 in berlin. the system holds up live: i've performed with it several times already, and the loop finally pushes back.`,
        },
      ],
    },
  ],
};
