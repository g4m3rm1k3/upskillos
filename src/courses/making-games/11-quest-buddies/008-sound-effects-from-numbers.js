export default {
  chapter: 'making-games-11',
  order: 8,
  id: 'mg11-008',
  nextLesson: null,
  slug: 'sound-effects-from-numbers',
  title: 'Sound Effects from Numbers',
  subtitle: 'What a sound is, pitch in hertz and octaves, waves and envelopes; make sounds from a few numbers and play them.',
  tags: ['game-studio', 'rpg', 'audio', 'sound', 'synthesis', 'waves', 'audiostreamplayer'],
  aliases: 'sound effects sfx audio synthesis sfxr jsfxr chiptune square wave sine triangle saw sawtooth noise frequency hertz pitch octave semitone envelope attack decay volume wav file audiostreamplayer play stop loop music pitch scale',
  timeToComplete: 60,
  coreConcept: 'A sound is a list of samples, numbers from −1 to 1 taken thousands of times a second (22,050 here). A tone repeats a wave shape (square, triangle, sine, saw, or noise) some number of times a second: its frequency in hertz, its pitch. Doubling the frequency raises it an octave; twelve equal steps of 2^(1/12) make the octave. A slide that sounds even changes pitch exponentially. An envelope shapes loudness: a rise over the attack, then a fade. project.writeSound(path, { wave, from, to, length, attack, volume }) makes such a sound as an asset, and an AudioStreamPlayer node plays it with play().',
  prerequisites: ['mg11-007'],
  hook: {
    question: 'The coin\'s "ding", the door\'s "whoosh" and the save\'s chime in Quest Buddies are not recordings: each is about five numbers. What do those numbers mean, and how do five numbers become a sound?',
    realWorldContext: 'Retro games made all their sound this way, and indie developers still do with tools like sfxr and jsfxr. Underneath every game\'s audio, recorded or made, are the same ideas: samples, frequency, waves and envelopes.',
  },
  intuition: {
    prose: [
      '**Depth: build it, and go deep.** The Try it task makes a coin sound and a whoosh and plays them. The math section takes every formula apart.',
      '**A sound is samples.** A speaker moves back and forth; a sound file says where it should be, as a number from −1 to 1, thousands of times a second. Game Studio makes 22,050 samples a second, so the save chime\'s 0.6 seconds is 13,230 numbers, written into a .wav file of 26,504 bytes (cell 4).',
      '**Pitch is frequency.** A tone repeats the same shape over and over; how many times a second is its frequency, in hertz (Hz). 440 Hz is the A above middle C. Doubling the frequency gives the same note an octave higher, and music divides the octave into 12 equal steps, semitones, each multiplying the frequency by the twelfth root of 2, about 1.05946 (cell 1). The coin slides from 880 to 1760 Hz: exactly one octave up.',
      '**An even slide is exponential.** Ears hear octaves, not hertz. A slide from 220 to 880 Hz that adds equal hertz each moment covers 0.81 octaves in its first quarter and only 0.30 in its last: it sounds lopsided. Multiplying by the same factor each moment covers half an octave each quarter (cell 2): from · (to / from)^(t / length). That is what writeSound does.',
      '**The wave\'s shape is its colour.** Each wave is a rule from the phase, how far through one cycle it is (0 to 1), to a value (cell 3). A square is +1 for the first half and −1 for the second: bright and retro. A saw rises steadily and drops: buzzy. A triangle goes up and down in straight lines: soft. A sine is the smoothest: pure, like a whistle. Noise is a new random value each cycle: a hiss, for wind, explosions and footsteps, and its "pitch" sets how fast the random values change (low rumbles, high hisses).',
      '**The envelope is its shape in time.** A real sound swells and fades. The envelope rises from silence to full over the attack, then falls in a straight line to silence at the end (cell 4). Each sample is the wave × the envelope × the volume. A short attack clicks in like a coin; a long one swells like a wind.',
      '**Into the game.** project.writeSound(\'assets/sounds/coin.wav\', { wave: \'square\', from: 880, to: 1760, length: 0.15 }) puts a sound into the project: the project keeps the recipe, and the .wav is made from it. Or Files › New sound…: the recipe opens as text beside its waveform, with ▶ Hear it. An AudioStreamPlayer node plays a sound: its stream is the path, with volume, pitchScale (2 is an octave up and half as long), autoplay and loop. A script calls play(), stop() and reads playing; finished runs when a sound ends.',
      '**Where to put them.** Sounds that every map needs (the coin, the door) live in the HUD scene under a Node Sounds, so every map has them: scene.get(\'HUD/Sounds/Coin\').play(). A sound stops when its node goes, and a scene change frees every node, so the door\'s whoosh is played on arriving (in the hero\'s ready()), not on leaving.',
      '**Browsers wait for a click.** A browser does not start sound until the player has clicked or pressed a key on the page; sounds before that are silent. Games start on a title screen for this reason, among others.',
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: a sound effect',
        body: 'Step 1. Choose the wave: square (blips, coins), triangle (soft), sine (chimes), saw (buzz), noise (hits, wind). Step 2. Choose the pitch: up for good things (a coin), down for bad (a hit) or for falling. Step 3. Length and attack: short and sharp for a click, long and soft for a swell. Step 4. writeSound, or Files › New sound… and ▶ Hear it. Step 5. An AudioStreamPlayer with it as stream; play() when it happens.',
      },
      {
        type: 'warning',
        title: 'Sounds stop with their node',
        body: 'A sound on a node in the old scene is cut off by scene.change. Play the door\'s sound in the new scene.',
      },
      {
        type: 'insight',
        title: 'A little random pitch',
        body: 'The same sound a hundred times tires the ear. Set pitchScale to math.randRange(0.9, 1.1) before each play: no two coins sound quite the same.',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Sound from numbers',
        caption: 'The same formulas as core/sound.ts, which makes the .wav files.',
        props: {
          lesson: {
            title: 'Sound from numbers',
            subtitle: 'Hertz, octaves, slides, waves and envelopes.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. Hertz and octaves\nPredict first: 12 semitones above 440.',
                startCode: '// Pitch is how many times a second the air vibrates: hertz (Hz). 440 Hz is the A above middle C. Double the frequency\n// and the note sounds the same, only higher: an octave. Twelve equal steps make an octave, so one step (a semitone) is\n// the twelfth root of 2. Predict first: what is 12 semitones above 440?\nconst semitone = Math.pow(2, 1 / 12)\nconsole.log(\'one semitone multiplies the frequency by\', semitone.toFixed(5))\nconst names = [\'A\', \'A#\', \'B\', \'C\', \'C#\', \'D\', \'D#\', \'E\', \'F\', \'F#\', \'G\', \'G#\', \'A\']\nfor (let n = 0; n <= 12; n += 3) console.log(names[n].padEnd(2), n.toString().padStart(2), \'semitones above A4:\', (440 * Math.pow(semitone, n)).toFixed(1), \'Hz\')\nconsole.log(\'the coin sound slides from 880 to 1760 Hz:\', Math.log2(1760 / 880), \'octave up\')',
              },
              {
                type: 'js',
                instruction: '### 2. A slide that sounds even\nPredict first: halfway, in octaves.',
                startCode: '// A slide from one pitch to another. Linear (equal hertz each moment) sounds lopsided: most of the change in octaves\n// happens early. Exponential, f(t) = from · (to / from)^(t / length), climbs the same number of octaves each moment.\nconst from = 220, to = 880, length = 1\nconst lin = (t) => from + (to - from) * t / length\nconst exp = (t) => from * Math.pow(to / from, t / length)\nconst octaves = (f) => Math.log2(f / from)\nfor (const t of [0, 0.25, 0.5, 0.75, 1])\n  console.log(\'t =\', t.toFixed(2), \' linear\', lin(t).toFixed(0).padStart(4), \'Hz (\' + octaves(lin(t)).toFixed(2), \'oct)   exponential\', exp(t).toFixed(0).padStart(4), \'Hz (\' + octaves(exp(t)).toFixed(2), \'oct)\')',
              },
              {
                type: 'js',
                instruction: '### 3. The shapes of waves\nPredict first: the triangle at 0.5.',
                startCode: '// A wave is read off its phase: how far through one cycle it is, from 0 to 1. Each shape is a rule for phase → value.\nconst waves = {\n  square:   (p) => (p < 0.5 ? 1 : -1),\n  saw:      (p) => 2 * p - 1,\n  triangle: (p) => (p < 0.5 ? 4 * p - 1 : 3 - 4 * p),\n  sine:     (p) => Math.sin(2 * Math.PI * p),\n}\nconst phases = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]\nconsole.log(\'phase    \' + phases.map((p) => p.toFixed(3).padStart(7)).join(\'\'))\nfor (const [name, f] of Object.entries(waves)) console.log(name.padEnd(9) + phases.map((p) => f(p).toFixed(2).padStart(7)).join(\'\'))\n// A text picture of one cycle of each.\nfor (const [name, f] of Object.entries(waves)) {\n  const rows = []\n  for (let level = 1; level >= -1; level -= 0.5) rows.push([...Array(32).keys()].map((i) => (Math.abs(f(i / 32) - level) < 0.25 ? \'█\' : \'·\')).join(\'\'))\n  console.log(name + \'\\n\' + rows.join(\'\\n\'))\n}',
              },
              {
                type: 'js',
                instruction: '### 4. The envelope\nPredict first: loudness halfway through.',
                startCode: '// The envelope: loudness over the sound\'s life. It rises from silence over the attack, then falls in a straight line to\n// silence at the end. Each sample is wave × envelope × volume. Predict first: how loud is it halfway through?\nconst length = 0.6, attack = 0.02, volume = 0.45\nconst envelope = (t) => (t < attack ? t / attack : Math.max(0, (length - t) / (length - attack)))\nfor (const t of [0, 0.01, 0.02, 0.15, 0.3, 0.45, 0.6]) console.log(\'t =\', t.toFixed(2), \'s  envelope\', envelope(t).toFixed(3), \'  loudest sample\', (envelope(t) * volume).toFixed(3))\nconsole.log(\'samples in the save sound at 22050 a second:\', Math.round(length * 22050), \'→ a .wav of\', 44 + 2 * Math.round(length * 22050), \'bytes\')',
              },
              {
                type: 'challenge',
                instruction: '### 5. Challenge: pitch()\nThe check tries four slides.',
                startCode: '// Challenge: pitch(from, to, length, t) is the pitch t seconds into a sound that slides from \'from\' to \'to\' hertz over\n// \'length\' seconds, exponentially: the same number of octaves each moment.\nfunction pitch(from, to, length, t) {\n  return from + (to - from) * t / length   // linear: change it\n}\nconst close = (a, b) => Math.abs(a - b) < 0.01\nconst cases = [[220, 880, 1, 0.5, 440], [880, 1760, 0.15, 0.075, 1244.51], [1500, 300, 0.35, 0.35, 300], [440, 440, 2, 1, 440]]\nconst bad = cases.find(([f, to, l, t, want]) => !close(pitch(f, to, l, t), want))\nconsole.log(bad ? \'Sliding \' + bad[0] + \'→\' + bad[1] + \' Hz over \' + bad[2] + \' s, at \' + bad[3] + \' s it should be \' + bad[4] + \' Hz, not \' + pitch(bad[0], bad[1], bad[2], bad[3]).toFixed(2) + \'.\' : \'✓ An even slide: halfway in time is halfway in octaves.\')',
                solutionCode: '// Challenge: pitch(from, to, length, t) is the pitch t seconds into a sound that slides from \'from\' to \'to\' hertz over\n// \'length\' seconds, exponentially: the same number of octaves each moment.\nfunction pitch(from, to, length, t) {\n  return from * Math.pow(to / from, t / length)\n}\nconst close = (a, b) => Math.abs(a - b) < 0.01\nconst cases = [[220, 880, 1, 0.5, 440], [880, 1760, 0.15, 0.075, 1244.51], [1500, 300, 0.35, 0.35, 300], [440, 440, 2, 1, 440]]\nconst bad = cases.find(([f, to, l, t, want]) => !close(pitch(f, to, l, t), want))\nconsole.log(bad ? \'Sliding \' + bad[0] + \'→\' + bad[1] + \' Hz over \' + bad[2] + \' s, at \' + bad[3] + \' s it should be \' + bad[4] + \' Hz, not \' + pitch(bad[0], bad[1], bad[2], bad[3]).toFixed(2) + \'.\' : \'✓ An even slide: halfway in time is halfway in octaves.\')',
              },
              {
                type: 'markdown',
                instruction: '### 6. The code you wrote, line by line\n\nIn the order of the task\'s three steps.\n\n```js\nproject.writeSound(\'assets/sounds/coin.wav\', { wave: \'square\', from: 880, to: 1760, length: 0.15, attack: 0.005, volume: 0.35 })\n```\n\nA sound made from numbers and written as a .wav file: a square wave (bright, retro), sliding from 880 Hz to 1760 Hz (one octave up, cell 1), lasting 0.15 seconds, rising to full in 0.005 seconds (a click-in, cell 4), at 35% volume. Files › New sound… makes the same thing with sliders, and ▶ Hear it plays it.\n\n```js\nconst hud = project.scene(\'scenes/hud.scene\')\nhud.add(\'Node\', { name: \'Sounds\' })\nhud.add(\'AudioStreamPlayer\', { name: \'Coin\', parent: \'Sounds\', stream: \'assets/sounds/coin.wav\' })\n```\n\nA plain Node called Sounds, only to keep the players together, and an AudioStreamPlayer: a node that plays one sound file when told to. It lives in the HUD, which every map has.\n\n```js\n    scene.get(\'HUD/Sounds/Coin\').play();\n```\n\nIn coin.js, when the coin is taken. The coin cannot play its own sound: it frees itself in the same frame, and a freed node\'s sound stops. The HUD stays.\n\n```js\nproject.writeSound(\'assets/sounds/arrive.wav\', { wave: \'noise\', from: 1500, to: 300, length: 0.35, attack: 0.02, volume: 0.25, seed: 7 })\nproject.scene(\'scenes/hud.scene\').add(\'AudioStreamPlayer\', { name: \'Arrive\', parent: \'Sounds\', stream: \'assets/sounds/arrive.wav\' })\n```\n\nA whoosh: noise (random values, cell 3) whose "pitch", how fast the values change, falls from 1500 to 300, over 0.35 seconds, swelling in over 0.02. `seed: 7` fixes the random values, so the file is the same every time it is made.\n\n```js\n    scene.get(\'HUD/Sounds/Arrive\').play();\n```\n\nIn the hero\'s `ready()`, which runs each time a map is built: so it plays on arriving anywhere, through a door or from a save.',
              },
              {
                type: 'markdown',
                instruction: '### 7. Questions you might have\n\n**Why put the players in the HUD and not on the coin or the door?** A node\'s sound stops when the node is freed, and a scene change frees the whole map. The HUD is rebuilt too, but the arrive sound is started after it is built, by the new hero.\n\n**Why does the whoosh also play when a new game starts?** The hero\'s `ready()` runs then too. To skip it, play it only when `state.arriveAt` is a door\'s spawn point.\n\n**Why not just download sound files?** You can: an AudioStreamPlayer plays any .wav. Made sounds are tiny, can be changed with a number, and teach what a sound is (the math section).\n\n**Two coins taken in the same moment: one sound or two?** One player plays one sound at a time; `play()` again starts it over. For overlapping sounds, use more than one player.',
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'Sound effects from numbers',
        props: {
          task: 'qb-sounds',
          lesson: 'mg11-008',
          checkpoint: 'cp-mg11-008-5',
        },
      },
    ],
  },
  math: {
    prose: [
      '**The semitone.** $s = 2^{1/12} \\approx 1.05946$, read "the number that, multiplied by itself twelve times, gives 2". The note $n$ semitones above 440 Hz is $440 \\cdot s^{n} = 440 \\cdot 2^{n/12}$. With $n = 12$: $440 \\cdot 2 = 880$, an octave. In cell 1: semitone, n and the printed frequencies.',
      '**The slide.** $f(t) = f_0 \\left(\\frac{f_1}{f_0}\\right)^{t/L}$, read "start at $f_0$, and multiply by the whole ratio $f_1 / f_0$ spread evenly over the length $L$". At $t = 0$ the exponent is 0 and $f = f_0$; at $t = L$ it is 1 and $f = f_1$; halfway it is $\\tfrac12$, so $f$ is $f_0$ times the square root of the ratio: for 220 to 880, $220 \\cdot \\sqrt{4} = 440$. In octaves, $\\log_2(f/f_0) = \\frac{t}{L}\\log_2\\frac{f_1}{f_0}$ grows in a straight line: that is why it sounds even. In core/sound.ts: r.from, r.to, r.length and t.',
      '**The phase.** Each sample, the phase moves on by $f / R$ cycles, where $R = 22050$ samples a second, and wraps round at 1: $\\varphi \\leftarrow (\\varphi + f/R) \\bmod 1$, read "add how much of a cycle passes in one sample, and keep only the part past the last whole cycle". In the code: phase = (phase + f / SAMPLE_RATE) % 1.',
      '**A sample.** $x_i = w(\\varphi_i) \\cdot e(t_i) \\cdot v$, read "the wave\'s value at this phase, times how loud the envelope is now, times the volume", with $t_i = i / R$. The envelope $e(t)$ is $t / a$ during the attack $a$, then $\\frac{L - t}{L - a}$ down to 0 at the end. The sine wave is $w(\\varphi) = \\sin(2\\pi\\varphi)$: one full turn of the circle per cycle.',
    ],
    equations: [
      {
        label: 'A semitone, and n semitones above A',
        latex: 's = 2^{1/12},\\qquad f_n = 440\\cdot 2^{n/12}',
      },
      {
        label: 'An even slide',
        latex: 'f(t) = f_0\\left(\\frac{f_1}{f_0}\\right)^{t/L}',
      },
      {
        label: 'The phase, sample by sample',
        latex: '\\varphi \\leftarrow \\left(\\varphi + \\frac{f}{R}\\right) \\bmod 1',
      },
      {
        label: 'One sample',
        latex: 'x_i = w(\\varphi_i)\\cdot e(t_i)\\cdot v',
      },
    ],
    callouts: [],
    visualizations: [],
  },
  rigor: {
    prose: [
      'A square wave holds +1 and −1, so it is louder at the same volume than a sine, whose average size is smaller; that is one reason the recipes use a lower volume for squares. Very high pitches near half the sample rate (11,025 Hz) cannot be made faithfully at 22,050 samples a second, so writeSound allows 20 to 10,000 Hz.',
      'Where it goes: chapter 12 gives combat hits and level-ups their own sounds; music is the same nodes with loop on.',
    ],
    callouts: [],
    visualizations: [],
  },
  examples: [
    {
      id: 'mg11-008-ex1',
      title: 'An octave down',
      difficulty: 'easy',
      problem: 'What frequency is an octave below 660 Hz?',
      steps: [
        {
          expression: '660 / 2',
          annotation: 'An octave halves it.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: '330 Hz.',
    },
    {
      id: 'mg11-008-ex2',
      title: 'The coin, halfway',
      difficulty: 'medium',
      problem: 'The coin slides 880 to 1760 Hz over 0.15 s. Its pitch at 0.075 s?',
      steps: [
        {
          expression: '880\\cdot 2^{0.5}',
          annotation: 'Half the ratio\'s exponent.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: 'About 1244.5 Hz: half an octave up.',
    },
    {
      id: 'mg11-008-ex3',
      title: 'A hit',
      difficulty: 'hard',
      problem: 'Design a sound for the hero being hit.',
      steps: [
        {
          expression: '\\text{noise or square, falling}',
          annotation: 'Down feels bad.',
          strategyTitle: 'Step 1: shape and direction',
        },
        {
          expression: '\\text{short, sharp attack}',
          annotation: 'A hit is sudden.',
          strategyTitle: 'Step 2: time',
        },
      ],
      answer: 'For example { wave: \'noise\', from: 900, to: 150, length: 0.2, attack: 0.002, volume: 0.4 }: a short crunch falling in pitch.',
    },
  ],
  challenges: [
    {
      id: 'mg11-008-ch1',
      title: 'A level-up jingle',
      difficulty: 'easy',
      problem: 'Make a sound for levelling up.',
      hint: 'Rising, a sine or triangle, longer.',
      answer: '{ wave: \'triangle\', from: 523, to: 1046, length: 0.5, attack: 0.02 }: a smooth octave up.',
      walkthrough: [],
    },
    {
      id: 'mg11-008-ch2',
      title: 'Footsteps',
      difficulty: 'medium',
      problem: 'A footstep sound that plays while the hero walks, not too often.',
      hint: 'A short noise, and a timer.',
      answer: 'A short low noise (from 400 to 200, 0.05 s). In the hero, a timer: every 0.3 s while moving, set a random pitchScale and play().',
      walkthrough: [],
    },
    {
      id: 'mg11-008-ch3',
      title: 'Music',
      difficulty: 'hard',
      problem: 'Play a quiet hum for the forest that loops and stops when you leave.',
      hint: 'autoplay and loop.',
      answer: 'An AudioStreamPlayer in forest.scene with a long low sine, volume 0.2, autoplay and loop on: it starts with the scene, and the scene change frees it, which stops it.',
      walkthrough: [],
    },
  ],
  semantics: {
    core: [
      {
        symbol: 'Hz',
        meaning: 'Cycles a second: pitch.',
      },
      {
        symbol: 'octave',
        meaning: 'Double the frequency: the same note, higher.',
      },
      {
        symbol: 'semitone',
        meaning: '×2^(1/12): one of 12 equal steps in an octave.',
      },
      {
        symbol: 'envelope',
        meaning: 'Loudness over time: attack, then fade.',
      },
      {
        symbol: 'project.writeSound(path, recipe)',
        meaning: 'A sound asset made from numbers.',
      },
      {
        symbol: 'AudioStreamPlayer.play()',
        meaning: 'Play its stream from the start.',
      },
    ],
    rulesOfThumb: [
      'Up for good, down for bad.',
      'Short attack for clicks, long for swells.',
      'Slides are exponential.',
      'Play arrival sounds after the scene changes.',
    ],
  },
  misconceptions: [
    {
      falseBelief: 'Twice the hertz is twice as high in a way you hear as "double".',
      whyStudentsThinkIt: 'Numbers double.',
      correctionExample: 'It is one octave: the ear hears ratios, so 440→880 and 880→1760 sound like the same step.',
      contrastCase: '440→880 is 440 Hz; 880→1760 is 880 Hz; both are an octave.',
    },
    {
      falseBelief: 'A sound keeps playing after its scene changes.',
      whyStudentsThinkIt: 'Sound is not on the screen.',
      correctionExample: 'It belongs to a node; the scene change frees the node and stops it.',
      contrastCase: 'A sound in the new scene plays on.',
    },
  ],
  transferPrompts: [
    {
      situation: 'Many similar sounds (ten coins of different values).',
      competingTechniques: [
        'Ten recordings',
        'One recipe with a different "to", or one sound with pitchScale',
      ],
      whyThisTechniqueWins: 'One idea, changed by a number.',
    },
    {
      situation: 'A music app or synthesizer.',
      competingTechniques: [
        'Recorded notes',
        'Oscillators, envelopes and 2^(n/12)',
      ],
      whyThisTechniqueWins: 'The same few formulas make every note.',
    },
  ],
  debugging: [
    {
      commonError: 'No sound at all.',
      symptom: 'play() runs; nothing is heard.',
      whyItHappened: 'The browser has not had a click or key press on the game yet.',
      repairStrategy: 'Start with a title screen; sounds after the first press play.',
    },
    {
      commonError: 'The door sound is cut off.',
      symptom: 'A click instead of a whoosh.',
      whyItHappened: 'It was played on the node that the scene change freed.',
      repairStrategy: 'Play it in the new scene (the hero\'s ready()).',
    },
    {
      commonError: 'from below 20 or above 10,000.',
      symptom: 'writeSound refuses the recipe and says why.',
      whyItHappened: 'Outside what can be heard and made.',
      repairStrategy: 'Keep pitches between 20 and 10,000 Hz.',
    },
  ],
  mastery: {
    targetLevel: 3,
    solveIndependently: 'Make and play sound effects for a game.',
    explainVerbally: 'Explain hertz, octaves, the exponential slide, waves and envelopes.',
    detectIncorrectApplication: 'Spot linear slides, sounds cut off by scene changes, and silent starts.',
    transferToUnfamiliar: 'Design sounds for another game from their feel.',
  },
  assessment: {
    questions: [
      {
        id: 'mg11-008-assess-1',
        type: 'choice',
        text: 'An octave above 330 Hz is',
        options: ['660 Hz', '342 Hz', '440 Hz', '990 Hz'],
        answer: '660 Hz',
        hint: 'Cell 1.',
      },
    ],
  },
  quiz: [
    {
      id: 'mg11-008-quiz-1',
      type: 'choice',
      text: 'One semitone multiplies the frequency by about',
      options: ['1.05946', '1.5', '2', '1.1'],
      answer: '1.05946',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg11-008-quiz-2',
      type: 'choice',
      text: 'Halfway through an exponential slide from 220 to 880 Hz, the pitch is',
      options: ['440 Hz', '550 Hz', '660 Hz', '330 Hz'],
      answer: '440 Hz',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg11-008-quiz-3',
      type: 'choice',
      text: 'At phase 0.5 the triangle wave is',
      options: ['1', '0', '−1', '0.5'],
      answer: '1',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg11-008-quiz-4',
      type: 'choice',
      text: 'Halfway through the save chime (0.3 s), the envelope is about',
      options: ['0.517', '1', '0.5', '0'],
      answer: '0.517',
      hints: ['Cell 4.'],
      reviewSection: 'Cell 4',
    },
    {
      id: 'mg11-008-quiz-5',
      type: 'choice',
      text: 'pitchScale 2 plays a sound',
      options: [
        'An octave up, in half the time',
        'Twice as loud',
        'Twice',
        'An octave down',
      ],
      answer: 'An octave up, in half the time',
      hints: ['Into the game.'],
      reviewSection: 'Intuition — into the game',
    },
    {
      id: 'mg11-008-quiz-6',
      type: 'choice',
      text: 'The door\'s whoosh is played in the hero\'s ready() because',
      options: [
        'The scene change frees the old scene\'s nodes, stopping their sounds',
        'ready() is louder',
        'Doors cannot play sounds',
        'Browsers need it',
      ],
      answer: 'The scene change frees the old scene\'s nodes, stopping their sounds',
      hints: ['Where to put them.'],
      reviewSection: 'Intuition — where to put them',
    },
  ],
  checkpoints: [
    {
      id: 'cp-mg11-008-1',
      label: 'Read samples, hertz and octaves',
      type: 'read',
    },
    {
      id: 'cp-mg11-008-2',
      label: 'Read waves and envelopes',
      type: 'read',
    },
    {
      id: 'cp-mg11-008-3',
      label: 'Run the notebook: sound from numbers',
      type: 'read',
    },
    {
      id: 'cp-mg11-008-4',
      label: 'Read the math: every formula decoded',
      type: 'read',
    },
    {
      id: 'cp-mg11-008-5',
      label: 'Complete "Sound effects from numbers" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg11-008-6',
      label: 'Work through "A hit"',
      type: 'example',
    },
    {
      id: 'cp-mg11-008-7',
      label: 'Pass the pitch() challenge',
      type: 'challenge',
    },
  ],
}
