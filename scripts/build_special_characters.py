"""Builds src/reference/special-characters-tables.js: everything the Special Characters
reference looks up rather than has a person type, so none of it can be mistyped.

- Official Unicode names, from Python's unicodedata.
- HTML entity names, from Python's html.entities (the classic HTML 4 set).
- Windows Alt codes: Alt+0NNN types byte NNN of Windows-1252; Alt+NNN types byte NNN of the
  OEM code page, 437 on US-English Windows. Both tables come from Python's codecs.
- Mac Option keys: asked of macOS itself (UCKeyTranslate on the US layout). Only possible on
  a Mac with the US layout active; anywhere else the recorded table is kept as it is.

Run after changing src/reference/special-characters-data.js:

    python3 scripts/build_special_characters.py
"""
import ctypes
import ctypes.util
import html.entities
import json
import os
import re
import subprocess
import sys
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "src", "reference", "special-characters-data.js")
OUT = os.path.join(ROOT, "src", "reference", "special-characters-tables.js")


def data_chars():
    """Every character in the data file, read by Node so the JavaScript is the single source."""
    script = f"import {{ SECTIONS }} from {json.dumps('file://' + DATA)}; console.log(JSON.stringify(SECTIONS.flatMap(s => s.chars.map(c => c.char))))"
    out = subprocess.run(["node", "--input-type=module", "-e", script], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def code_page(name):
    """Byte value -> character for bytes 128..255 of a code page (undefined bytes left out)."""
    table = {}
    for n in range(128, 256):
        try:
            table[n] = bytes([n]).decode(name)
        except UnicodeDecodeError:
            pass
    return table


# Virtual key codes of the ANSI keyboard (Carbon's kVK_ANSI_* constants), and the key's label.
MAC_KEYS = {
    "A": 0, "S": 1, "D": 2, "F": 3, "H": 4, "G": 5, "Z": 6, "X": 7, "C": 8, "V": 9, "B": 11, "Q": 12,
    "W": 13, "E": 14, "R": 15, "Y": 16, "T": 17, "1": 18, "2": 19, "3": 20, "4": 21, "6": 22, "5": 23,
    "=": 24, "9": 25, "7": 26, "-": 27, "8": 28, "0": 29, "]": 30, "O": 31, "U": 32, "[": 33, "I": 34,
    "P": 35, "L": 37, "J": 38, "'": 39, "K": 40, ";": 41, "\\": 42, ",": 43, "/": 44, "N": 45, "M": 46,
    ".": 47, "`": 50,
}


def mac_option_keys():
    """Character -> shortcut ("⌥8", "⌥⇧8") for every Option and Shift-Option key on the US
    layout, skipping dead keys (accents that wait for the next letter) and private-use characters. None if not possible."""
    if sys.platform != "darwin":
        return None
    carbon = ctypes.cdll.LoadLibrary(ctypes.util.find_library("Carbon"))
    cf = ctypes.cdll.LoadLibrary(ctypes.util.find_library("CoreFoundation"))
    carbon.TISCopyCurrentKeyboardLayoutInputSource.restype = ctypes.c_void_p
    carbon.TISGetInputSourceProperty.restype = ctypes.c_void_p
    carbon.TISGetInputSourceProperty.argtypes = [ctypes.c_void_p, ctypes.c_void_p]
    cf.CFDataGetBytePtr.restype = ctypes.c_void_p
    cf.CFDataGetBytePtr.argtypes = [ctypes.c_void_p]
    cf.CFStringGetCStringPtr.restype = ctypes.c_char_p
    cf.CFStringGetCStringPtr.argtypes = [ctypes.c_void_p, ctypes.c_uint32]
    carbon.LMGetKbdType.restype = ctypes.c_uint8
    source = carbon.TISCopyCurrentKeyboardLayoutInputSource()
    layout_id = cf.CFStringGetCStringPtr(carbon.TISGetInputSourceProperty(source, ctypes.c_void_p.in_dll(carbon, "kTISPropertyInputSourceID")), 0x08000100)
    if layout_id != b"com.apple.keylayout.US":
        print("Mac keys not rebuilt: the active keyboard layout is", layout_id)
        return None
    layout = cf.CFDataGetBytePtr(carbon.TISGetInputSourceProperty(source, ctypes.c_void_p.in_dll(carbon, "kTISPropertyUnicodeKeyLayoutData")))
    keyboard = carbon.LMGetKbdType()
    found = {}
    # Modifier bits as UCKeyTranslate wants them (the event modifiers shifted right by 8).
    for label, modifiers in (("⌥", 0x08), ("⌥⇧", 0x0A)):
        for key, code in MAC_KEYS.items():
            dead, length, buffer = ctypes.c_uint32(0), ctypes.c_ulong(0), (ctypes.c_uint16 * 4)()
            carbon.UCKeyTranslate(ctypes.c_void_p(layout), ctypes.c_uint16(code), ctypes.c_uint16(0), ctypes.c_uint32(modifiers),
                                  ctypes.c_uint32(keyboard), ctypes.c_uint32(0), ctypes.byref(dead), ctypes.c_ulong(4), ctypes.byref(length), buffer)
            text = "".join(chr(buffer[i]) for i in range(length.value))
            # Leave out dead keys, and private-use characters (⌥⇧K's Apple logo, U+F8FF, which
            # has no Unicode name and shows only on Apple systems).
            if dead.value or len(text) != 1 or text in found or unicodedata.category(text) == "Co":
                continue
            found[text] = label + key
    return found


def recorded_mac_keys():
    """The Mac table already in the output file, if any."""
    if not os.path.exists(OUT):
        return {}
    match = re.search(r"export const MAC_KEYS = (\{.*?\})\n", open(OUT, encoding="utf-8").read(), re.S)
    return json.loads(match.group(1)) if match else {}


def main():
    chars = data_chars()
    bad = [c for c in chars if len(c) != 1]
    if bad:
        sys.exit(f"Each entry must be exactly one code point: {bad}")
    cp1252, cp437 = code_page("cp1252"), code_page("cp437")
    mac = mac_option_keys()
    if mac is None:
        mac = recorded_mac_keys()
    everything = sorted(set(chars) | set(cp1252.values()) | set(cp437.values()) | set(mac))
    names, missing = {}, []
    for ch in everything:
        name = unicodedata.name(ch, None)
        if name is None:
            missing.append(f"U+{ord(ch):04X}")
        else:
            names[ch] = name
    if missing:
        sys.exit(f"No Unicode name for: {missing}")
    entities = {ch: html.entities.codepoint2name[ord(ch)] for ch in everything if ord(ch) in html.entities.codepoint2name}

    def dump(obj):
        return json.dumps(obj, ensure_ascii=False, indent=None, sort_keys=True)

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("// Generated by scripts/build_special_characters.py: don't edit by hand, run the script.\n")
        f.write(f"// Unicode names from Python {sys.version.split()[0]} (Unicode {unicodedata.unidata_version}).\n")
        f.write("// Mac keys: macOS US keyboard layout, Option and Shift-Option, dead keys left out.\n\n")
        f.write(f"export const NAMES = {dump(names)}\n\n")
        f.write(f"export const HTML_ENTITIES = {dump(entities)}\n\n")
        f.write(f"// Byte -> character. Alt+0NNN types WINDOWS_1252[NNN]; Alt+NNN types CP437[NNN].\n")
        f.write(f"export const WINDOWS_1252 = {dump({str(k): v for k, v in cp1252.items()})}\n\n")
        f.write(f"export const CP437 = {dump({str(k): v for k, v in cp437.items()})}\n\n")
        f.write(f"export const MAC_KEYS = {dump(mac)}\n")
    print(f"{len(chars)} entries, {len(names)} names, {len(entities)} HTML entities, {len(cp1252)} + {len(cp437)} Alt codes, {len(mac)} Mac keys")


if __name__ == "__main__":
    main()
