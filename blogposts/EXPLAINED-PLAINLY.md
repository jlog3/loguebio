# The hard parts, explained from scratch

A companion to LINCHPINS.md, for readers who don't play music and have never
thought about sound as numbers. Nothing here assumes you know what a semitone
is. Every problem below is real and every number is measured.

---

## First, three things you need

**A note is a speed.** Pluck a guitar string and it whips back and forth. Fast
whipping sounds high, slow whipping sounds low. That's the whole idea. Count
the back-and-forths in one second and you have a number: the A that orchestras
tune to is 440 of them. The lowest string on a bass is about 41. A note *is*
that number — everything else is naming conventions.

**A cent is a unit of "slightly out".** The smallest step in Western music —
one piano key to the next, black keys included — gets divided into 100 cents.
Five cents out is inaudible to almost everyone. Twenty cents sounds wrong.
Fifty cents is halfway to a different note and sounds actively bad.

**A tuner's whole job is one question:** *what speed is this, and how far is it
from the speed it should be?* It sounds like it should take an afternoon. Most
of what follows is why it doesn't.

---

## 1. The computer can be exactly wrong and think it's right

To find the speed, the software looks for repetition: how long until this
waveform looks like itself again?

Here's the trap. Suppose someone taps a steady rhythm:

```
tap  tap  tap  tap  tap  tap  tap  tap
```

Is that a pattern that repeats every tap? Or a pattern of *two* taps that
repeats every other tap? Or four? **Every one of those descriptions fits the
evidence perfectly.**

In sound, a pattern that repeats half as often is exactly one octave lower —
the "same" note, but deeper. So the software can land on an answer that is
precisely one octave off, and nothing about the sound itself says it's wrong.

This is not a bug anyone can remove. It's a real ambiguity in the data. The
best you can do is give the software a hint about which answers to prefer —
and getting that hint wrong is how a B string ends up being confidently
reported as an A.

---

## 2. There is a note coming out of your walls

The electricity in your house doesn't flow steadily. It reverses direction 60
times a second in North America, 50 in most of Europe. Anything with a cable
acts a little like an antenna and picks that up — which is why an electric
guitar amp hums when nothing is playing.

That hum is a real, steady tone. And here is where it gets unlucky:

```
electrical hum, North America   60 times per second
lowest string on a 7-string guitar   61.74 times per second
```

**They are almost the same note.** About half a semitone apart — close enough
that the tuner, hearing the hum, honestly reports "that's your low B string,
slightly flat."

So the player sets the guitar down, plays nothing at all, and the tuner sits
there reading a note. Not a glitch, not random: it is correctly identifying a
real sound that happens to be coming from the building.

---

## 3. Why you can't just filter the hum out

The obvious move is a filter that removes 60-per-second and leaves everything
else. Filters like that exist. It doesn't work, for a reason that took some
measuring to pin down.

**First problem: precision costs time.** A filter narrow enough to remove the
hum without touching the guitar string 1.74 units away is a very fussy filter,
and fussy filters need a long look at the sound before they do anything useful.
Ours gets 85 thousandths of a second before it has to answer. In that window
the precise filter hasn't got going — it removes essentially nothing.

Widen the filter so it acts fast, and now it's blunt enough to chew into the
note you were trying to protect.

**Second problem, and the surprising one: filters shift timing.** A filter
doesn't only make things quieter. It also delays what passes through, and
delays different parts by different amounts. That matters enormously here,
because the software works out the note by *timing the gaps between peaks*.
Move the peaks, move the answer.

Measured:

```
low B, no filter          0.5 cents off   (essentially perfect)
low B, filter applied    14 cents sharp   (clearly wrong)
```

Fourteen cents is audible. We'd have fixed the phantom note by making the real
one wrong — on precisely the string the player was complaining about.

Testing every filter setting from gentle to extreme confirmed there's no middle
ground. Gentle enough to spare the note = too slow to remove the hum. Fast
enough to remove the hum = wrecks the note.

---

## 4. The fix: stop trying to remove it

If you can't tell two things apart by *what note they are*, find something else
they differ in.

Hum is always faint. It's leakage from a wire, and it sits at the level of room
noise. A person playing a string is loud — that's the point of playing it.

So the rule became: **if this sounds like hum's note AND it's barely louder
than the background, it's hum. If it's the same note but clearly louder,
someone's playing.** Nobody plucks a string as quietly as a hum.

```
hum, nothing being played      shows nothing
hum, even quieter              shows nothing
low B played properly          shows the note
low B played very softly       shows the note
```

And because nothing is being filtered, the accuracy is untouched — back to half
a cent.

The general shape of this idea is worth keeping: *when two things are
impossible to tell apart in the way you're looking at them, look a different
way.*

---

## 5. The software was more confident about the hum than the guitar

This one is worth sitting with.

The pitch software reports how sure it is, from 0 to 1. You'd expect a fake
signal to score low. Measured on pure electrical hum: **0.81** — high
confidence.

Why? Because the score measures *regularity*, and hum is the most regular thing
in the room. It comes from a power station; it doesn't wobble. A real plucked
string is messy — it fades, it wavers, the tone changes as it rings.

**On the software's own terms, hum is a better note than a note is.**

So the confidence number, the one thing that looks like it should catch this,
is exactly no help. Any system that reports its own certainty deserves the
question: certain about *what*, precisely?

---

## 6. Walkie-talkie logic

Different bug, same tuner. The player plucks a string and the display flickers
in and out while the note is clearly still ringing.

The cause: one rule deciding two different questions.

A walkie-talkie has to decide "is someone talking, or is this just hiss?" If it
uses a single loudness line, then a person whose voice trails off at the end of
a sentence drops below the line and gets cut off — then comes back — chopping
them into fragments.

Real radios use **two** lines. It takes a fairly loud sound to open the
channel, but once open, a much quieter sound keeps it open.

Our tuner had one line. And a plucked string is loudest the instant you pluck
it and quieter every moment after — so a single continuous note crossed that
line over and over, and each crossing threw the reading away.

Two lines instead, plus a longer grace period:

```
              on screen        times it vanished
before        62% of the time  1
after        100% of the time  0
```

The nice part: this also cured most of what had been reported as "jitter". The
display wasn't wobbling so much as **leaving and coming back**.

---

## 7. The bathroom scale problem

The needle looked twitchy. The obvious fix is to smooth the readings — average
them out. But smoothing has a cost, and it's the same cost a bathroom scale
has.

Average a lot: rock steady, but when you step on it takes ages to settle.
Average a little: settles instantly, but the number never stops twitching.

With a fixed amount of averaging you must choose, and both choices are bad for
a tuner. You want it still when you're holding a note, and you want it to move
the instant you turn a tuning peg.

The trick is to make the amount of averaging depend on how fast the number is
actually changing. Barely moving → average heavily → rock steady. Moving fast →
stop averaging → instant response.

**And here's how I got it wrong first.** I made it too eager to notice
movement. The twitching itself counts as movement, so the system decided things
were moving and stopped averaging — *at exactly the moment it needed to
average*. The result was twitchier than the simple version it replaced.

Tuning that one sensitivity setting across two dozen values:

```
                    steadiness at rest   speed after a peg turn
raw readings        very twitchy         instant
simple averaging    good                 0.65 seconds  (visibly laggy)
final version       better               0.07 seconds  (feels instant)
```

Better at both, which is the only outcome that justifies the extra complexity.
Anything else is just a different compromise with a longer name.

---

## 8. A setting nobody could possibly get right

There was a slider labelled roughly "ignore sounds quieter than −62 dB".

The player set it to −72, reasoning perfectly sensibly that a lower number
means more sensitive. Their room's actual background level was around −53. So
the setting sat far below the noise, and every bit of room hum sailed straight
through.

That is not user error. **It's a control that requires a number the user has no
way of knowing.** Nobody can tell you how loud their own room is in decibels.

So the tuner measures it instead. But you can't just take one reading when it
starts — some people press start and immediately play, which would set the
"background level" from their guitar.

It now tracks the background continuously, with a deliberate asymmetry: it can
drop instantly, but it can only rise slowly. Silence registers the moment it
happens; a long held note can't convince it the room got louder.

---

## 9. You can't see the microphones until you use one

To let someone choose the right input, you need the list of inputs with their
names. Browsers won't give a website those names until the user has granted
microphone permission at least once — sensible, since names are identifying.

But to *ask* for permission you have to request a microphone, and you can't say
which one, because you can't see the list yet.

It's being shown into a dark room and only being able to find the light switch
once you're inside. The only way through is: accept whatever you're handed
first, look around now that the lights are on, and switch if you landed
somewhere wrong.

The version before this took the default microphone, then noticed the good
audio interface, then **updated the label without moving the audio**. So the
screen said "Focusrite 2i2" while it was recording a Blue Snowball across the
desk. That's worse than saying nothing: a wrong reading is bad, but a wrong
reading with the right equipment named beside it removes the only clue you had.

**One more thing worth knowing as a user:** browsers have exactly one
permission for all audio. They can't distinguish a guitar plugged into a box
from a built-in microphone, because to the computer both are just "sound coming
in". So if you block the microphone, you've blocked your guitar too, and no
website can work around that. It can only tell you why.

---

## 10. Four problems that all said "check your permission"

When the microphone fails to open, the browser says why — in a one-word code
most software throws away. Four genuinely different things happen:

- **Blocked.** You said no. (And this covers your guitar too, per above.)
- **Already in use.** Something else has the device — nearly always music
  software left running in another window.
- **Gone.** The thing you picked has been unplugged, or its USB port slept.
- **Insecure connection.** Browsers only allow this over a secure connection.

Every one of these used to produce "check the browser's permission for this
site". For the second one — by far the most common with an audio interface —
that sends you to the wrong building entirely, to check a setting that is
already correct, while a forgotten program quietly holds your soundcard.

The fix was almost free. The information was already there and was being
discarded.

---

## What generalises

Very little of this is really about music.

- **A confidence score is only as good as what it measures.** Ours measured
  regularity and was therefore most confident about the one signal we least
  wanted.
- **"Start paying attention" and "keep paying attention" are different
  questions.** One threshold answering both breaks whenever a signal naturally
  fades — voices, sensors, anything that decays.
- **Any setting that needs a number the user can't know is broken by design.**
  Measure it, then tell them what you measured.
- **When two things are inseparable in the way you're looking, change the way
  you're looking.** Hum and a note are inseparable by pitch. They're trivially
  separable by loudness relative to the room.
- **Removing an interference can damage the thing you're protecting.** The
  filter would have fixed a phantom note by making the real one wrong.
