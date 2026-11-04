#!/usr/bin/env python3
"""
make_preview.py  -  turn a screenshot or screen recording into a landing-page preview.

Writes to apps/landing/public/previews/ and keeps previews.json (the list the
landing page reads) up to date. Needs python3 and ffmpeg (sudo apt install ffmpeg).

  python3 make_preview.py --list                         every slot, filled or not
  python3 make_preview.py shot.png condensate-lab 1      screenshot -> condensate-lab-1.webp
  python3 make_preview.py clip.webm condensate-lab 1     recording  -> condensate-lab-1.mp4
                                                         (+ .webp poster if slot 1 has none)
  python3 make_preview.py clip.webm mag 2 --start 4 --duration 8
  python3 make_preview.py shot.png mag 1 --fit contain   letterbox instead of cropping
  python3 make_preview.py --scan                         rebuild previews.json from the folder
  python3 make_preview.py --remove mag 2                 delete slot 2's files

Slots are the slides in each card, in order (see --list for the captions). The slug
is the one the landing page uses, e.g. chromaloop-simulator, not chromaloop-sim.

Output: screenshots 1600x1000 WebP; clips 1280x800 H.264 MP4, silent, at most
--max-seconds long (default 10). Anything that is not 16:10 is centre-cropped,
or letterboxed with --fit contain.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys

PAGE = "apps/landing/app/page.tsx"
OUT_DIR = "apps/landing/public/previews"
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}
VIDEO_EXT = {".webm", ".mp4", ".mkv", ".mov", ".avi", ".gif"}
IMG_W, IMG_H = 1600, 1000
VID_W, VID_H = 1280, 800
WARN_IMG_KB, WARN_VID_KB = 300, 3000
BG = "0x030711"  # landing page background, used for letterboxing


def find_root(start):
    d = os.path.abspath(start)
    while True:
        if os.path.isfile(os.path.join(d, PAGE)):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            return None
        d = parent


def read_slots(root):
    """{slug: [caption, ...]} in page order, read from the landing page itself."""
    text = open(os.path.join(root, PAGE), encoding="utf-8").read()
    start = text.find("const PROJECTS")
    if start < 0:
        sys.exit("ERROR: could not find PROJECTS in apps/landing/app/page.tsx")
    body = text[start:text.find("\n];", start)]
    slots = {}
    for chunk in re.split(r"\n\s*slug: '", body)[1:]:
        slug = chunk.split("'", 1)[0]
        shots = chunk.split("screenshots:", 1)
        caps = re.findall(r"caption: '((?:[^'\\]|\\.)*)'", shots[1]) if len(shots) == 2 else []
        slots[slug] = caps
    if not slots:
        sys.exit("ERROR: found no projects in apps/landing/app/page.tsx")
    return slots


def scan(root):
    folder = os.path.join(root, OUT_DIR)
    os.makedirs(folder, exist_ok=True)
    names = sorted(f for f in os.listdir(folder)
                   if re.fullmatch(r"[a-z0-9-]+-\d+\.(webp|mp4)", f))
    with open(os.path.join(folder, "previews.json"), "w", encoding="utf-8") as f:
        json.dump({"files": names}, f, indent=2)
        f.write("\n")
    return names


def ffmpeg_ok():
    exe = shutil.which("ffmpeg")
    if not exe:
        sys.exit("ERROR: ffmpeg is not installed. On Ubuntu: sudo apt install ffmpeg")
    enc = subprocess.run([exe, "-hide_banner", "-encoders"], capture_output=True, text=True).stdout
    missing = [e for e in ("libwebp", "libx264") if f" {e} " not in enc]
    if missing:
        sys.exit(f"ERROR: this ffmpeg lacks {', '.join(missing)}. "
                 "The Ubuntu package has both: sudo apt install ffmpeg "
                 "(a conda ffmpeg may shadow it; try /usr/bin/ffmpeg).")
    return exe


def fit_filter(w, h, fit):
    if fit == "contain":
        return (f"scale={w}:{h}:force_original_aspect_ratio=decrease,"
                f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color={BG}")
    return f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}"


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit("ERROR: ffmpeg failed:\n" + r.stderr[-1500:])


def kb(path):
    return os.path.getsize(path) // 1024


def make_image(exe, src, out, fit, seek=None):
    cmd = [exe, "-hide_banner", "-loglevel", "error", "-y"]
    if seek is not None:
        cmd += ["-ss", str(seek)]
    cmd += ["-i", src, "-frames:v", "1", "-vf", fit_filter(IMG_W, IMG_H, fit),
            "-c:v", "libwebp", "-quality", "82", out]
    run(cmd)


def make_video(exe, src, out, fit, start, duration):
    run([exe, "-hide_banner", "-loglevel", "error", "-y",
         "-ss", str(start), "-t", str(duration), "-i", src,
         "-an", "-vf", f"fps=30,{fit_filter(VID_W, VID_H, fit)}",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "28",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", out])


def print_list(root, slots):
    folder = os.path.join(root, OUT_DIR)
    have = set(os.listdir(folder)) if os.path.isdir(folder) else set()
    filled = total = 0
    for slug, caps in slots.items():
        print(slug)
        for n, cap in enumerate(caps, 1):
            total += 1
            img, vid = f"{slug}-{n}.webp" in have, f"{slug}-{n}.mp4" in have
            filled += img
            mark = "screenshot + clip" if img and vid else "screenshot" if img else \
                   "clip only (needs a screenshot to show)" if vid else "empty"
            print(f"  {n}. {cap:<46} {mark}")
    print(f"\n{filled} of {total} slots have a screenshot.")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source", nargs="?", help="screenshot (png/jpg/webp) or recording (webm/mp4/mkv/mov)")
    ap.add_argument("slug", nargs="?", help="project slug, see --list")
    ap.add_argument("slot", nargs="?", type=int, help="slide number, 1-based")
    ap.add_argument("--path", help="repo root (default: found from the current folder)")
    ap.add_argument("--list", action="store_true", help="show every slot and what it has")
    ap.add_argument("--scan", action="store_true", help="rebuild previews.json from the folder")
    ap.add_argument("--remove", nargs=2, metavar=("SLUG", "SLOT"), help="delete a slot's files")
    ap.add_argument("--fit", choices=["cover", "contain"], default="cover",
                    help="cover = centre-crop to 16:10 (default); contain = letterbox")
    ap.add_argument("--start", type=float, default=0, help="recording: seconds to skip")
    ap.add_argument("--duration", type=float, help="recording: seconds to keep")
    ap.add_argument("--max-seconds", type=float, default=10, help="recording: hard cap (default 10)")
    ap.add_argument("--poster-at", type=float, default=1.0,
                    help="recording: seconds into the clip for the poster frame (default 1)")
    ap.add_argument("--force", action="store_true", help="overwrite existing files")
    a = ap.parse_args()

    root = find_root(a.path or os.getcwd())
    if not root:
        sys.exit(f"ERROR: could not find {PAGE}. Run inside the loguebio repo or pass --path.")
    slots = read_slots(root)
    folder = os.path.join(root, OUT_DIR)

    if a.list:
        print_list(root, slots)
        return 0
    if a.scan:
        names = scan(root)
        print(f"previews.json now lists {len(names)} file(s).")
        return 0
    if a.remove:
        slug, n = a.remove[0], int(a.remove[1])
        gone = [f for f in (f"{slug}-{n}.webp", f"{slug}-{n}.mp4") if os.path.exists(os.path.join(folder, f))]
        for f in gone:
            os.remove(os.path.join(folder, f))
        scan(root)
        print(f"Removed: {', '.join(gone) or 'nothing (slot was empty)'}")
        return 0

    if not (a.source and a.slug and a.slot):
        ap.error("give SOURCE SLUG SLOT, or one of --list / --scan / --remove")
    if a.slug not in slots:
        sys.exit(f"ERROR: unknown slug {a.slug!r}. Known: {', '.join(slots)}")
    if not 1 <= a.slot <= len(slots[a.slug]):
        sys.exit(f"ERROR: {a.slug} has slots 1-{len(slots[a.slug])}; got {a.slot}. See --list.")
    if not os.path.isfile(a.source):
        sys.exit(f"ERROR: no such file: {a.source}")
    ext = os.path.splitext(a.source)[1].lower()
    if ext not in IMAGE_EXT | VIDEO_EXT:
        sys.exit(f"ERROR: unsupported file type {ext}")

    exe = ffmpeg_ok()
    os.makedirs(folder, exist_ok=True)
    stem = os.path.join(folder, f"{a.slug}-{a.slot}")
    caption = slots[a.slug][a.slot - 1]
    made = []

    if ext in IMAGE_EXT and ext != ".gif":
        out = stem + ".webp"
        if os.path.exists(out) and not a.force:
            sys.exit(f"ERROR: {os.path.relpath(out, root)} exists; add --force to replace it.")
        make_image(exe, a.source, out, a.fit)
        made.append(out)
    else:
        out = stem + ".mp4"
        if os.path.exists(out) and not a.force:
            sys.exit(f"ERROR: {os.path.relpath(out, root)} exists; add --force to replace it.")
        dur = min(a.duration or a.max_seconds, a.max_seconds)
        make_video(exe, a.source, out, a.fit, a.start, dur)
        made.append(out)
        poster = stem + ".webp"
        if not os.path.exists(poster) or a.force:
            make_image(exe, a.source, poster, a.fit, seek=a.start + min(a.poster_at, dur))
            made.append(poster)
        else:
            print(f"Kept the existing screenshot {os.path.relpath(poster, root)} as the clip's poster.")

    scan(root)
    print(f"{a.slug} slot {a.slot}: {caption}")
    for p in made:
        size, limit = kb(p), WARN_IMG_KB if p.endswith(".webp") else WARN_VID_KB
        note = f"  <- larger than {limit} KB; consider a shorter clip or a calmer frame" if size > limit else ""
        print(f"  wrote {os.path.relpath(p, root)} ({size} KB){note}")
    print("previews.json updated. Reload the landing page to see it.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
