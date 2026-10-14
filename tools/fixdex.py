# Herbereken SHA-1 handtekening en Adler32 checksum in de dex-header
import sys, hashlib, zlib, struct
p=sys.argv[1]; d=bytearray(open(p,'rb').read())
d[12:32]=hashlib.sha1(d[32:]).digest()
d[8:12]=struct.pack('<I', zlib.adler32(bytes(d[12:])) & 0xffffffff)
open(p,'wb').write(d)
