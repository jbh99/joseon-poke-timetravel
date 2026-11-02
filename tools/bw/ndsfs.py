"""Nintendo DS ROM file system (header, FNT, FAT) and NARC archives, read-only.

usage: python ndsfs.py <rom> [dir-prefix]   lists the files (id, path, size, magic)
"""
import struct, sys


class Rom:
    def __init__(self, path):
        self.data = open(path, 'rb').read()
        d = self.data
        self.title = d[0:12].decode('ascii', 'replace').rstrip('\0')
        self.code = d[12:16].decode('ascii', 'replace')
        self.fnt_off, self.fnt_len, self.fat_off, self.fat_len = struct.unpack_from('<IIII', d, 0x40)
        self.arm9 = struct.unpack_from('<IIII', d, 0x20)
        n = self.fat_len // 8
        self.fat = [struct.unpack_from('<II', d, self.fat_off + 8 * i) for i in range(n)]
        self.paths = {}
        self._walk(0xF000, '')

    def _walk(self, dir_id, prefix):
        d, base = self.data, self.fnt_off
        sub_off, first_id = struct.unpack_from('<IH', d, base + (dir_id & 0xFFF) * 8)
        p, fid = base + sub_off, first_id
        while True:
            t = d[p]; p += 1
            if t == 0: break
            name = d[p:p + (t & 0x7F)].decode('latin-1'); p += t & 0x7F
            if t & 0x80:
                sub = struct.unpack_from('<H', d, p)[0]; p += 2
                self._walk(sub, prefix + name + '/')
            else:
                self.paths[fid] = prefix + name; fid += 1

    def file(self, fid):
        a, b = self.fat[fid]
        return self.data[a:b]

    def find(self, path):
        for fid, p in self.paths.items():
            if p == path: return self.file(fid)
        raise KeyError(path)


def narc(blob):
    """Members of a NARC archive as a list of bytes."""
    assert blob[:4] == b'NARC', blob[:4]
    p = struct.unpack_from('<H', blob, 12)[0]
    assert blob[p:p + 4] == b'BTAF'
    btaf_len, n = struct.unpack_from('<II', blob, p + 4)
    spans = [struct.unpack_from('<II', blob, p + 12 + 8 * i) for i in range(n)]
    q = p + btaf_len
    assert blob[q:q + 4] == b'BTNF'
    q += struct.unpack_from('<I', blob, q + 4)[0]
    assert blob[q:q + 4] == b'GMIF'
    img = q + 8
    return [blob[img + a: img + b] for a, b in spans]


if __name__ == '__main__':
    rom = Rom(sys.argv[1])
    pre = sys.argv[2] if len(sys.argv) > 2 else ''
    print(rom.title, rom.code, 'files', len(rom.fat), 'named', len(rom.paths))
    for fid in sorted(rom.paths):
        p = rom.paths[fid]
        if not p.startswith(pre): continue
        b = rom.file(fid)
        extra = ''
        if b[:4] == b'NARC':
            try: extra = f' NARC x{len(narc(b))}'
            except Exception as e: extra = f' NARC? {e}'
        print(fid, p, len(b), b[:4], extra)
