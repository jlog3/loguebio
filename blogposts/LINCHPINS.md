# The hard parts

Source material for writing. Each section is a problem where the obvious fix
was wrong, and where the thing that settled it was a measurement rather than an
argument. Numbers are from the actual runs.

---

## 1. Mains hum sits half a semitone from a 7-string low B

**The best story here.** A player reported three symptoms: the tuner sometimes
showed nothing when he plucked; it jumped around, occasionally claiming the 5th
string; and *when he stopped playing entirely it still read notes, bouncing
around B1*.

That last detail is what cracked it. Behaviour identical with signal and
without means the fault is not in the signal path.

```
7-string low B  61.74 Hz
mains hum       60.00 Hz
difference      −49 cents
```

Mains hum reads as **B1, half a semitone flat**. Exactly "bouncing around B1".

And it is not noise as far as a pitch detector is concerned. Measured through
an interface:

```
60 Hz hum, unfiltered   −53 dB   YIN clarity 0.81   reports 64.3 Hz
```

Clarity 0.81 is a *confident* reading. Hum is perfectly periodic, which is the
one thing a pitch detector is looking for. **Confidence cannot distinguish hum
from a note, because on the detector's own terms hum is a better note than a
note is.**

It also explains the other two symptoms. With a string ringing, the estimator
alternates between the string's period and the hum's; each swap exceeds the
filter's reset threshold, so the display drops out and re-acquires. And the low
B's second harmonic at 123.5 Hz lands two semitones from the open A — inside a
three-semitone "which string did you mean" window. Hence "it says 5th A".

### The trap

The obvious fix is a notch filter at 60 Hz. It measures beautifully:

```
four notches at 50/60/100/120 Hz, Q=30
  hum          ≈ −200 dB
  worst note   G2 loses 2.3 dB
```

Then check what it does to *accuracy*:

```
low B, no notch     −0.5 cents
low B, notched     +14.1 cents
```

A notch rotates phase steeply near its centre. YIN measures **period**, so
phase distortion moves the answer. A tuner 14 cents sharp on the exact string
being complained about is worse than the bug.

Sweeping Q settles it — there is no value that works:

```
Q        low B error     hum after
  30      14.1 cents      −54 dB
  60       7.5 cents      −52 dB
 120       3.5 cents      −52 dB
 300       1.3 cents      −51 dB
 800       0.9 cents      −51 dB      ← unfiltered is also −51 dB
```

Narrow enough to spare the note means an impulse response longer than the
85 ms analysis window, so the filter never settles and rejects nothing. The two
requirements are not merely in tension; they are mutually exclusive.

### The resolution

**Filter the conclusion, not the signal.**

A reading that sits on a mains multiple *and* is within 18 dB of the measured
room floor is hum. The same frequency louder than that is a person. Nobody
plucks a string at the noise floor.

```
60 Hz hum, nothing played   −49 dB   nothing shown
quieter hum                 −58 dB   nothing shown
low B played properly       −20 dB   7th B · B1 · in tune
low B, barely audible       −50 dB   7th B · B1 · in tune
```

Accuracy returns to −0.5 cents, because nothing touches the audio.

**The generalisable idea:** when two things are indistinguishable in the domain
you are filtering in, stop filtering and find a domain where they differ. Hum
and a note are indistinguishable in frequency and in periodicity. They are
trivially distinguishable in *level relative to the room*.

### The scope of it

A high-pass helps for instruments whose lowest note is above the hum. Checking
all of them:

> **17 of 33 tunings** — every bass, cello, double bass and drum kit — have
> their lowest note *below* mains hum. The filter has to sit under 50 Hz and
> the hum passes straight through.

Which is why the level-based rejection had to carry the weight.

---

## 2. The octave error that looked like a different string

A B string kept reading as "5th A, in tune". Two causes compounding.

**Period ambiguity.** A signal with period *T* also has period *2T*, *3T*. YIN
resolves this with a threshold that biases toward longer periods (lower
octaves), because for many timbres the sub-octave is the true fundamental. That
bias was set at 0.75 — strong. Plucked strings have powerful fundamentals and
do not need it.

**A wide search window.** Hunting for B3 with the window open from 61.7 to
493.9 Hz includes B2 at 123.5 Hz. B2 is two semitones from A2, inside the
string-claim window.

Neither fix works alone. Lowering the guard still leaves the sub-octave in
range; narrowing the range still leaves the bias. **The linchpin is that the
search range and the octave guard are one mechanism, not two settings.**

Fixed together: guard to 0.25, and locking a string narrows the window to a
tritone either side — which puts B2 outside it entirely. Claim window went
3 semitones → 2, so a second harmonic can no longer be attributed to a
neighbouring string.

---

## 3. Steady *and* responsive, from one filter

The needle was visibly jittery. The naive fix is more smoothing, which makes it
sluggish when you turn a peg. A fixed exponential average has to choose once
between two settings that want to be opposite.

**One Euro filter**: make the cutoff frequency a function of how fast the value
is actually changing.

```
fc = fc_min + β · |dx/dt|
```

Held still, the cutoff drops and jitter is filtered away. Turn a peg, the
derivative jumps, the cutoff rises, and the filter effectively stops filtering.

**The counterintuitive part.** My first β was 1.6, which seemed a reasonable
coupling. It made the output *jitterier than the fixed average it replaced* —
2.19 cents versus 1.30. The jitter's own derivative was raising the cutoff and
cancelling the smoothing. A classic One Euro failure, and I would have shipped
it had I only looked at the lag number.

Sweeping both objectives across 24 combinations:

```
                  jitter at rest    catch-up after a 40-cent peg turn
raw tracker       5.94 cents        instant
fixed average     1.30 cents        650 ms
One Euro, β=0.3   0.90 cents         67 ms
```

Better at **both**. The test asserts exactly that, because an adaptive filter
that only wins on one axis is a different compromise wearing a longer name.

---

## 4. Acquire and hold are different questions

The marker appeared and disappeared while a note rang. One threshold was
deciding both *"is this a note"* and *"is this still the note"*, and six dropped
frames — a tenth of a second — discarded the reading.

A plucked string is loudest at the attack and fading from then on, and its
clarity falls as the upper harmonics die before the fundamental does. **So one
continuous note crosses a single threshold several times a second.**

Two thresholds instead: it takes more to *start* hearing a note than to keep
hearing one. This is how squelch has always worked, for the same reason. Plus a
half-second hold rather than a tenth.

Simulated on a real decay envelope, four seconds of one note:

```
              marker on screen    times it vanished
before        62% of the time     1
after        100% of the time     0
```

Worth noting: this also cured most of what was reported as "jitter". The marker
was not wobbling so much as **leaving and coming back**.

---

## 5. A control nobody can set correctly

The sensitivity slider said "listen below −62 dB". The player set it to −72,
reasoning that lower is more sensitive. Their actual noise floor was −53, so
the gate sat **nineteen decibels below the noise** and every frame of hum got
through.

That is not a user error. It is a control that requires a number nobody has.

**Measure it instead.** But a single probe on arming assumes people press Start
and then wait, which nobody reliably does. Play during it and the floor is set
from your playing.

A rolling low percentile, falling instantly and rising slowly:

```
2 s of room only                  floor −53 dB
then 3 s of playing               floor −53 dB   ← a held note can't drag it up
quiet again                       floor −53 dB   ← returns at once
playing immediately, then quiet   floor −53 dB   ← the case a probe gets backwards
```

**Fast down, slow up.** Silence should be recognised the moment it happens; a
sustained note must not be able to convince the tuner the room got louder.
Twentieth percentile rather than minimum, so one dropout does not define the
floor any more than one note should.

---

## 6. You cannot see the devices until you use one

Browsers hide audio input *labels* until a page has been granted microphone
access at least once. This creates a bootstrap problem with two bugs in it.

**Bug one.** The code read:

```js
if (list.length && list.every(d => !d.label)) { /* prompt to unlock names */ }
```

Chrome returns an **empty array** before permission — not unlabelled entries,
nothing at all. So `list.length` was 0, the unlock never ran, and it reported
"No inputs found" to somebody with an interface plugged in. *The one case the
function existed for was the one case it skipped.* An empty list is the
strongest possible signal that permission is missing.

**Bug two, worse.** The arming sequence was: open a stream with whatever device
is chosen (nothing, first time, so the system default) → enumerate → notice an
interface → save it as the chosen device.

But saving a setting does not move a stream that is already running. The picker
would show the Focusrite while the audio still came from a Blue Snowball. **A
wrong reading is bad; a wrong reading with the right device named beside it is
worse, because it removes the only clue.**

The fix has to be two-phase: take a stream to earn the labels, look, and if
there is a better input than the one you landed on, swap onto it *before
anything is measured*.

**Also worth a paragraph on its own:** there is exactly one browser permission
for all audio capture. It cannot distinguish a line input on an interface from
a built-in microphone, because at the OS level they are the same kind of
device. Blocking "microphone" blocks your guitar. Nothing in a web page can
work around that — but telling people *why* is the difference between a fixable
problem and a mysterious one.

---

## 7. Diagnosing four failures that all said "check your permission"

Every `getUserMedia` failure produced the same message. Four things actually go
wrong, and the message was right for one of them:

| `err.name` | what it really means |
|---|---|
| `NotAllowedError` | blocked — and this permission covers line inputs too |
| **`NotReadableError`** | **another application already has the device** |
| `NotFoundError` | the chosen input has disappeared |
| `SecurityError` | needs https |

The second one is the expensive one. On an interface it almost always means a
DAW left open in the background. Sending that person to their browser
permissions sends them to the wrong building.

Small lesson, disproportionate payoff: `err.name` was already there and was
being discarded by `catch (_) {}`.

---

## 8. Drums are tuned to pitches

Most tuners ignore them, which is a gap rather than a rule. A drum head has a
clear resonant pitch when tapped in the middle.

What makes drum tuning feel unlike guitar tuning is that you are chasing **even
tension across the lugs first and a pitch second** — an evenly tensioned head
at the wrong pitch sounds better than an uneven one at the right pitch.

And the genuinely useful thing a tuner adds is not the absolute note, which is
taste and shell size. It is **holding you to the same interval between toms**
once you have picked one you like. That is the part that is hard by ear and
trivial with a number.

```
Rock kit    Kick 22" F1 43.65 Hz · Floor 16" C2 65.41 · Mid 13" F2 87.31
            Rack 12" B♭2 116.54 · Snare 14" D3 146.83
```

---

# Beyond DSP

## 9. Two escape hatches in JSX that both print backslashes

`\u2014` renders as an em dash inside a JavaScript string. It renders as *six
literal characters* in two places:

```jsx
<p>a \u2014 b</p>          text child — not a string literal
hint="a \u2014 b"          attribute in quotes — also not a string literal
{"a \u2014 b"}             this one is a real string
```

Both shipped. The second is nastier because a scanner written to skip string
literals will skip it too — mine did, and reported the file clean while the
page showed `\u2014` on screen.

## 10. A passing build proves less than it looks

Wrapping a JSX element in a conditional, if the closing tag is matched by
counting angle brackets, can close **forty lines early inside a nested
element** — and still compile. JSX with a conditional around half a component
is valid syntax that renders the other half unconditionally.

Matching by *indentation* worked where bracket counting did not. The general
form: when a check can pass for a reason unrelated to the property you care
about, it is not a check.

Three more of the same family, all mine, all in one session:

- A patch script whose replacement string was never found: it reported success
  and changed nothing, because the edit was written as `rep(...) if cond else None`
  and the condition was false.
- A verification probe run with `>/dev/null 2>&1`, so thirteen scripts could
  have failed and the comparison afterwards would have looked authoritative.
- A **proof string that did not distinguish versions**: the installer checked
  for `export const FOCUS_MODES`, which existed in every version of that file
  ever shipped. It certified a stale file, then the build failed on a missing
  export. Fixed by checking every named import against what the target actually
  exports — a file existing is not the same as it having what was asked of it.

## 11. Perceiving music without hearing it

Rendering an arrangement as vibration needs an idiom, because a phone motor has
one dimension: duration. Kick long, snare medium, hat a short tick, melody
notes lengthening as they rise, and the first step of each bar extended so you
can count into it.

The harder decision was that perceiving is not enough — you have to be able to
**edit** from there. A braille line and keyboard stepping, so a pattern can be
changed without sight or hearing.

## 12. Adaptation only counts if it is honoured everywhere

The app had a "Simpler interface" switch that promised to hide advanced
controls. Everything built later checked only the *onboarding answer*, not the
live switch. So somebody who turned it on afterwards was ignored by three
panels.

No amount of new customisation would have helped, because **the control they
used was already the right one**. The bug was that nothing new listened to it.

Related: the app already asked "how do you want to make music?" at first run,
routed on the answer, and then **stored only that an answer had been given**.
Any later feature wanting to know what somebody came to do had no choice but to
ask again — which is how a product ends up with two questions that feel like
the same question.

---

# Threads worth pulling for a piece

1. **Confidence is not correctness.** The pitch detector's own certainty score
   was maximally confident about mains hum. Any system with a confidence output
   deserves the question: what is it confident *about*?

2. **When two things are inseparable in one domain, change domain.** Hum and a
   note are inseparable by frequency. They are trivially separable by level
   relative to the room.

3. **Acquire and hold are different questions** — and one threshold answering
   both is a recurring bug shape well beyond audio.

4. **Any control requiring a number the user cannot know is a broken control.**
   Measure it, and say what you measured.

5. **A test that cannot fail is not a test.** The most productive half hour of
   the whole project was deliberately breaking a working install to check the
   verifier noticed.

6. **Looking beats reasoning.** Every visual bug — the collided navigation, the
   transport eating 45% of a phone screen, the escape printing on screen — was
   found in the first ten minutes of actually opening the app in a browser,
   after hours of reasoning about the same code.
