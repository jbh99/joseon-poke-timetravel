"""Pokémon Black/White text banks (a/0/0/2 system text, a/0/0/3 story text), read-only.

A bank: u16 sections, u16 entries, u32 section size, u32 0, u32 section offsets; a section: u32 size, then per
entry (u32 offset from the section, u16 length in UTF-16 units, u16 flags), then the strings. Each string is
XOR-masked with a key that rotates by 3 bits per character, walking back from its 0xFFFF terminator.
Control codes: 0xFFFE line break, 0xF000 starts a variable/format command (its arguments follow), 0xFFFF end.

usage: python bwtext.py <bank> [grep]   prints the strings of a/0/0/2 member <bank>
"""
import struct


def strings(data):
    n_sec, n_ent = struct.unpack_from('<HH', data, 0)
    sec = struct.unpack_from('<I', data, 12)[0]
    out = []
    for i in range(n_ent):
        off, length, _ = struct.unpack_from('<IHH', data, sec + 4 + i * 8)
        enc = struct.unpack_from('<%dH' % length, data, sec + off)
        key = enc[-1] ^ 0xFFFF
        dec = [0] * length
        for j in range(length - 1, -1, -1):
            dec[j] = enc[j] ^ key
            key = ((key >> 3) | (key << 13)) & 0xFFFF
        out.append(render(dec))
    return out


def render(chars):
    s, i = [], 0
    while i < len(chars):
        c = chars[i]
        if c == 0xFFFF:
            break
        if c == 0xFFFE:
            s.append('\n')
        elif c == 0xF000:  # command: type, argument count, arguments
            if i + 2 < len(chars):
                kind, argc = chars[i + 1], chars[i + 2]
                s.append('{%04X%s}' % (kind, ''.join(',%d' % a for a in chars[i + 3:i + 3 + argc])))
                i += 2 + argc
        else:
            s.append(chr(c))
        i += 1
    return ''.join(s)


if __name__ == '__main__':
    import os, sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import ndsfs
    rom = ndsfs.Rom(os.environ.get('BLACK_ROM') or os.path.join(os.path.expanduser('~'), 'Downloads', 'claude skills', '포켓몬스터 블랙(K).nds'))
    bank = ndsfs.narc(rom.find(sys.argv[2] if len(sys.argv) > 2 and sys.argv[2].startswith('a/') else 'a/0/0/2'))[int(sys.argv[1])]
    for i, t in enumerate(strings(bank)):
        print(i, t.replace('\n', '/'))
